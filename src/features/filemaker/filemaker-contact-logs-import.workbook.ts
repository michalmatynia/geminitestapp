import { spawn } from 'node:child_process';

import { SaxesParser, type SaxesTag } from 'saxes';

import { normalizeString } from './filemaker-settings.helpers';
import {
  buildMissingHeaderError,
  hasContactLogHeader,
  normalizeMatrixCell,
  rowToObject,
  type LegacyContactLogRow,
} from './filemaker-contact-logs-import.shared';

const DEFAULT_SHARED_STRINGS_ENTRY = 'xl/sharedStrings.xml';
const DEFAULT_WORKSHEET_ENTRY = 'xl/worksheets/sheet1.xml';

type RowHandler = (row: LegacyContactLogRow, dataRowIndex: number) => void | Promise<void>;

type WorkbookParserState = {
  currentCellIndex: number;
  currentCellType: string;
  currentCellValueParts: string[];
  currentRow: string[] | null;
  dataRowCount: number;
  header?: string[];
  inCellValue: boolean;
  inInlineString: boolean;
  pendingRowHandlers: Promise<unknown>[];
};

const createWorkbookParserState = (): WorkbookParserState => ({
  currentCellIndex: 0,
  currentCellType: '',
  currentCellValueParts: [],
  currentRow: null,
  dataRowCount: 0,
  inCellValue: false,
  inInlineString: false,
  pendingRowHandlers: [],
});

const updateWorkbookParserState = (
  state: WorkbookParserState,
  patch: Partial<WorkbookParserState>
): void => {
  Object.assign(state, patch);
};

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  'then' in value &&
  typeof (value as { then?: unknown }).then === 'function';

const localName = (name: string): string =>
  name.includes(':') ? name.split(':').at(-1) ?? name : name;

const getAttribute = (tag: SaxesTag, name: string): string | undefined => {
  const value = tag.attributes[name];
  return typeof value === 'string' ? value : undefined;
};

const columnIndexFromCellReference = (reference: string | undefined): number => {
  const letters = reference?.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? 'A';
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }
  return Math.max(0, index - 1);
};

const streamZipXmlEntry = async (
  inputPath: string,
  entryName: string,
  parser: SaxesParser,
  afterChunk?: () => Promise<void>
): Promise<void> => {
  const child = spawn('unzip', ['-p', inputPath, entryName], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string): void => {
    stderr += chunk;
  });
  const exitCode = new Promise<number>((resolve, reject): void => {
    child.once('error', reject);
    child.once('close', (code: number | null): void => resolve(code ?? 0));
  });

  try {
    child.stdout.setEncoding('utf8');
    const stdout = child.stdout as AsyncIterable<string>;
    for await (const chunk of stdout) {
      parser.write(chunk);
      await afterChunk?.();
    }
    parser.close();
  } catch (error: unknown) {
    child.kill();
    throw error;
  }

  const code = await exitCode;
  if (code !== 0) {
    throw new Error(
      `Unable to read ${entryName} from ${inputPath}. unzip exited with ${code}: ${stderr.trim()}`
    );
  }
};

const readWorkbookSharedStrings = async (inputPath: string): Promise<string[]> => {
  const sharedStrings: string[] = [];
  const parser = new SaxesParser();
  let inSharedString = false;
  let inText = false;
  let currentTextParts: string[] = [];

  parser.on('opentag', (tag: SaxesTag): void => {
    const name = localName(tag.name);
    if (name === 'si') {
      inSharedString = true;
      currentTextParts = [];
      return;
    }
    if (inSharedString && name === 't') inText = true;
  });

  parser.on('text', (text: string): void => {
    if (inText) currentTextParts.push(text);
  });

  parser.on('closetag', (tag: SaxesTag): void => {
    const name = localName(tag.name);
    if (name === 't') {
      inText = false;
      return;
    }
    if (name === 'si') {
      sharedStrings.push(currentTextParts.join(''));
      inSharedString = false;
      currentTextParts = [];
    }
  });

  await streamZipXmlEntry(inputPath, DEFAULT_SHARED_STRINGS_ENTRY, parser);
  return sharedStrings;
};

const enqueueRow = (
  state: WorkbookParserState,
  onRow: RowHandler,
  row: LegacyContactLogRow
): void => {
  const maybePromise = onRow(row, state.dataRowCount);
  if (isPromiseLike(maybePromise)) {
    updateWorkbookParserState(state, {
      pendingRowHandlers: [...state.pendingRowHandlers, Promise.resolve(maybePromise)],
    });
  }
};

const drainRowHandlers = async (state: WorkbookParserState): Promise<void> => {
  if (state.pendingRowHandlers.length === 0) return;
  const handlers = state.pendingRowHandlers;
  updateWorkbookParserState(state, { pendingRowHandlers: [] });
  await Promise.all(handlers);
};

const openWorksheetTag = (state: WorkbookParserState, tag: SaxesTag): void => {
  const name = localName(tag.name);
  if (name === 'row') {
    updateWorkbookParserState(state, { currentRow: [] });
    return;
  }
  if (state.currentRow === null) return;
  if (name === 'c') {
    updateWorkbookParserState(state, {
      currentCellIndex: columnIndexFromCellReference(getAttribute(tag, 'r')),
      currentCellType: getAttribute(tag, 't') ?? '',
      currentCellValueParts: [],
    });
    return;
  }
  if (name === 'v') updateWorkbookParserState(state, { inCellValue: true });
  if (state.currentCellType === 'inlineStr' && name === 't') {
    updateWorkbookParserState(state, { inInlineString: true });
  }
};

const closeCell = (state: WorkbookParserState, sharedStrings: string[]): void => {
  if (state.currentRow === null) return;
  const rawValue = state.currentCellValueParts.join('');
  const cellValue =
    state.currentCellType === 's' ? sharedStrings[Number.parseInt(rawValue, 10)] ?? '' : rawValue;
  const nextRow = [...state.currentRow];
  nextRow[state.currentCellIndex] = normalizeMatrixCell(cellValue);
  updateWorkbookParserState(state, {
    currentCellType: '',
    currentCellValueParts: [],
    currentRow: nextRow,
  });
};

const currentRowHasValues = (state: WorkbookParserState): boolean =>
  state.currentRow?.some((value: string | undefined): boolean => (value ?? '').length > 0) === true;

const closeWorksheetRow = (state: WorkbookParserState, onRow: RowHandler): void => {
  if (state.currentRow === null) return;
  if (!currentRowHasValues(state)) {
    updateWorkbookParserState(state, { currentRow: null });
    return;
  }
  if (state.header === undefined) {
    const header = state.currentRow.map((field: string | undefined): string => normalizeString(field));
    if (!hasContactLogHeader(header)) throw buildMissingHeaderError('XLSX');
    updateWorkbookParserState(state, { currentRow: null, header });
    return;
  }
  updateWorkbookParserState(state, { dataRowCount: state.dataRowCount + 1 });
  enqueueRow(state, onRow, rowToObject(state.header, state.currentRow));
  updateWorkbookParserState(state, { currentRow: null });
};

const closeWorksheetTag = (
  state: WorkbookParserState,
  sharedStrings: string[],
  onRow: RowHandler,
  tag: SaxesTag
): void => {
  const name = localName(tag.name);
  if (name === 'v') {
    updateWorkbookParserState(state, { inCellValue: false });
    return;
  }
  if (name === 't') {
    updateWorkbookParserState(state, { inInlineString: false });
    return;
  }
  if (name === 'c') {
    closeCell(state, sharedStrings);
    return;
  }
  if (name === 'row') closeWorksheetRow(state, onRow);
};

const createWorksheetParser = (
  sharedStrings: string[],
  onRow: RowHandler
): { drain: () => Promise<void>; parser: SaxesParser; state: WorkbookParserState } => {
  const parser = new SaxesParser();
  const state = createWorkbookParserState();
  parser.on('opentag', (tag: SaxesTag): void => openWorksheetTag(state, tag));
  parser.on('text', (text: string): void => {
    if (state.inCellValue || state.inInlineString) state.currentCellValueParts.push(text);
  });
  parser.on('closetag', (tag: SaxesTag): void => {
    closeWorksheetTag(state, sharedStrings, onRow, tag);
  });
  return {
    drain: async (): Promise<void> => drainRowHandlers(state),
    parser,
    state,
  };
};

export const streamFilemakerLegacyContactLogWorkbookRows = async (
  inputPath: string,
  onRow: RowHandler
): Promise<{ dataRowCount: number; header: string[] }> => {
  const sharedStrings = await readWorkbookSharedStrings(inputPath);
  const worksheet = createWorksheetParser(sharedStrings, onRow);
  await streamZipXmlEntry(
    inputPath,
    DEFAULT_WORKSHEET_ENTRY,
    worksheet.parser,
    worksheet.drain
  );
  await worksheet.drain();

  if (worksheet.state.header === undefined) throw buildMissingHeaderError('XLSX');
  return { dataRowCount: worksheet.state.dataRowCount, header: worksheet.state.header };
};

export const parseFilemakerLegacyContactLogWorkbookRows = async (
  inputPath: string
): Promise<LegacyContactLogRow[]> => {
  const rows: LegacyContactLogRow[] = [];
  await streamFilemakerLegacyContactLogWorkbookRows(inputPath, (row: LegacyContactLogRow): void => {
    rows.push(row);
  });
  return rows;
};
