/* eslint-disable complexity, max-lines, max-lines-per-function */
import { spawn } from 'node:child_process';

import Papa from 'papaparse';
import { SaxesParser, type SaxesTag } from 'saxes';

import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const HEADER_SCAN_LIMIT = 25;
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;
const EXCEL_DATE_EPOCH_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SHARED_STRINGS_ENTRY = 'xl/sharedStrings.xml';
const DEFAULT_WORKSHEET_ENTRY = 'xl/worksheets/sheet1.xml';

export const FILEMAKER_CONTACT_LOG_FIELDS = {
  comment: 'Comment',
  contactTypeUuid: 'Contact_Type_UUID_FK',
  dateEntered: 'Date Entered',
  dateModified: 'Date Modified',
  filemakerId: 'Id',
  mailCampaignUuid: 'MailCampaign_UUID_FK',
  mailServerUuid: 'MailServer_UUID_FK',
  organizationUuid: 'NameOrganisation::UUID',
  parentUuid: 'Parent_UUID_FK',
  updatedBy: 'Modified By',
  uuid: 'UUID',
  onBehalfUuid: 'On_Behalf_UUID_FK',
  yearProspectUuid: 'YearProspect_UUID_FK',
} as const;

const VALUE_FIELDS = [
  { field: FILEMAKER_CONTACT_LOG_FIELDS.contactTypeUuid, kind: 'contactType' },
  { field: FILEMAKER_CONTACT_LOG_FIELDS.mailCampaignUuid, kind: 'mailCampaign' },
  { field: FILEMAKER_CONTACT_LOG_FIELDS.mailServerUuid, kind: 'mailServer' },
  { field: FILEMAKER_CONTACT_LOG_FIELDS.onBehalfUuid, kind: 'onBehalf' },
  { field: FILEMAKER_CONTACT_LOG_FIELDS.yearProspectUuid, kind: 'yearProspect' },
] as const;

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];
type LegacyContactLogRowsFormat = 'CSV/TSV' | 'XLSX';
type ContactLogValueKind = (typeof VALUE_FIELDS)[number]['kind'];

export type LegacyContactLogRow = Record<string, string>;

export type ParsedLegacyContactLogValue = {
  kind: ContactLogValueKind;
  legacyValueUuid: string;
};

export type ParsedLegacyContactLog = {
  comment?: string;
  contactTypeUuid?: string;
  createdAt?: string;
  dateEntered?: string;
  legacyFilemakerId?: string;
  legacyOrganizationUuid?: string;
  legacyOwnerUuids: string[];
  legacyParentUuid?: string;
  legacyUuid: string;
  mailCampaignUuid?: string;
  mailServerUuid?: string;
  onBehalfUuid?: string;
  updatedAt?: string;
  updatedBy?: string;
  values: ParsedLegacyContactLogValue[];
  yearProspectUuid?: string;
};

const countDelimiter = (line: string, delimiter: Delimiter): number =>
  line.split(delimiter).length - 1;

const inferDelimiter = (text: string): Delimiter => {
  const lines = text
    .split(FILEMAKER_LINE_BREAK_PATTERN)
    .filter((line: string): boolean => line.trim().length > 0)
    .slice(0, HEADER_SCAN_LIMIT);
  const scores = DELIMITER_CANDIDATES.map((delimiter: Delimiter) => ({
    delimiter,
    score: lines.reduce(
      (total: number, line: string): number => total + countDelimiter(line, delimiter),
      0
    ),
  }));
  const best = scores.reduce((left, right) => (right.score > left.score ? right : left));
  return best.score > 0 ? best.delimiter : ',';
};

const normalizeMatrixCell = (value: unknown): string => normalizeString(value);

const hasContactLogHeader = (header: string[]): boolean =>
  header.includes(FILEMAKER_CONTACT_LOG_FIELDS.uuid) &&
  header.includes(FILEMAKER_CONTACT_LOG_FIELDS.parentUuid);

const buildMissingHeaderError = (format: LegacyContactLogRowsFormat): Error =>
  new Error(
    `FileMaker contact log ${format} export is missing the UUID or Parent_UUID_FK header.`
  );

const rowToObject = (header: readonly string[], row: readonly string[]): LegacyContactLogRow =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

const rowsToLegacyContactLogRows = (
  matrix: unknown[][],
  input: { format: LegacyContactLogRowsFormat }
): LegacyContactLogRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeMatrixCell))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = rows.findIndex((row: string[], index: number): boolean => {
    if (index >= HEADER_SCAN_LIMIT) return false;
    return hasContactLogHeader(row.map((field: string): string => normalizeString(field)));
  });
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!hasContactLogHeader(header)) throw buildMissingHeaderError(input.format);

  return rows
    .slice(headerRowIndex + 1)
    .map((row: string[]): LegacyContactLogRow => rowToObject(header, row));
};

export const parseFilemakerLegacyContactLogRows = (text: string): LegacyContactLogRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter: inferDelimiter(normalizedText),
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'parse error';
    throw new Error(`Invalid FileMaker contact log export: ${firstError}`);
  }
  return rowsToLegacyContactLogRows(parsed.data, { format: 'CSV/TSV' });
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

export const streamFilemakerLegacyContactLogWorkbookRows = async (
  inputPath: string,
  onRow: (row: LegacyContactLogRow, dataRowIndex: number) => void | Promise<void>
): Promise<{ dataRowCount: number; header: string[] }> => {
  const sharedStrings = await readWorkbookSharedStrings(inputPath);
  const parser = new SaxesParser();
  const state: { header?: string[] } = {};
  let dataRowCount = 0;
  let currentRow: string[] | null = null;
  let currentCellIndex = 0;
  let currentCellType = '';
  let currentCellValueParts: string[] = [];
  let inCellValue = false;
  let inInlineString = false;
  let pendingRowHandlers: Promise<unknown>[] = [];

  const enqueueRow = (row: LegacyContactLogRow): void => {
    const maybePromise = onRow(row, dataRowCount);
    if (isPromiseLike(maybePromise)) pendingRowHandlers.push(Promise.resolve(maybePromise));
  };

  const drainRowHandlers = async (): Promise<void> => {
    if (pendingRowHandlers.length === 0) return;
    const handlers = pendingRowHandlers;
    pendingRowHandlers = [];
    await Promise.all(handlers);
  };

  parser.on('opentag', (tag: SaxesTag): void => {
    const name = localName(tag.name);
    if (name === 'row') {
      currentRow = [];
      return;
    }
    if (currentRow === null) return;
    if (name === 'c') {
      currentCellIndex = columnIndexFromCellReference(getAttribute(tag, 'r'));
      currentCellType = getAttribute(tag, 't') ?? '';
      currentCellValueParts = [];
      return;
    }
    if (name === 'v') inCellValue = true;
    if (currentCellType === 'inlineStr' && name === 't') inInlineString = true;
  });

  parser.on('text', (text: string): void => {
    if (inCellValue || inInlineString) currentCellValueParts.push(text);
  });

  parser.on('closetag', (tag: SaxesTag): void => {
    const name = localName(tag.name);
    if (name === 'v') {
      inCellValue = false;
      return;
    }
    if (name === 't') {
      inInlineString = false;
      return;
    }
    if (name === 'c' && currentRow !== null) {
      const rawValue = currentCellValueParts.join('');
      const cellValue =
        currentCellType === 's'
          ? sharedStrings[Number.parseInt(rawValue, 10)] ?? ''
          : rawValue;
      currentRow[currentCellIndex] = normalizeMatrixCell(cellValue);
      currentCellValueParts = [];
      currentCellType = '';
      return;
    }
    if (name !== 'row' || currentRow === null) return;
    if (!currentRow.some((value: string | undefined): boolean => (value ?? '').length > 0)) {
      currentRow = null;
      return;
    }
    if (state.header === undefined) {
      state.header = currentRow.map((field: string | undefined): string => normalizeString(field));
      if (!hasContactLogHeader(state.header)) throw buildMissingHeaderError('XLSX');
      currentRow = null;
      return;
    }
    dataRowCount += 1;
    enqueueRow(rowToObject(state.header, currentRow));
    currentRow = null;
  });

  await streamZipXmlEntry(
    inputPath,
    DEFAULT_WORKSHEET_ENTRY,
    parser,
    drainRowHandlers
  );
  await drainRowHandlers();

  if (state.header === undefined) throw buildMissingHeaderError('XLSX');
  return { dataRowCount, header: state.header };
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

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const optionalLegacyUuid = (value: unknown): string | undefined => {
  const uuid = normalizeLegacyUuid(value);
  return uuid.length > 0 ? uuid : undefined;
};

const parseExcelSerialTimestamp = (value: string): string | undefined => {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return undefined;
  const serial = Number.parseFloat(value);
  if (!Number.isFinite(serial) || serial <= 0) return undefined;
  const timestamp = new Date(Math.round(EXCEL_DATE_EPOCH_MS + serial * DAY_MS));
  return Number.isNaN(timestamp.getTime()) ? undefined : timestamp.toISOString();
};

const parseLegacyContactLogTimestamp = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  if (normalized.length === 0) return undefined;
  return parseExcelSerialTimestamp(normalized) ?? parseLegacyOrganiserTimestamp(normalized);
};

const uniqueStrings = (values: Array<string | undefined>): string[] =>
  Array.from(new Set(values.filter((value): value is string => value !== undefined)));

export const parseContactLogFromRow = (
  row: LegacyContactLogRow
): ParsedLegacyContactLog | null => {
  const legacyUuid = normalizeLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.uuid]);
  if (legacyUuid.length === 0) return null;

  const contactTypeUuid = optionalLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.contactTypeUuid]);
  const mailCampaignUuid = optionalLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.mailCampaignUuid]);
  const mailServerUuid = optionalLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.mailServerUuid]);
  const onBehalfUuid = optionalLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.onBehalfUuid]);
  const yearProspectUuid = optionalLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.yearProspectUuid]);
  const legacyOrganizationUuid = optionalLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.organizationUuid]);
  const legacyParentUuid = optionalLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.parentUuid]);
  const values = VALUE_FIELDS.map((valueField): ParsedLegacyContactLogValue | null => {
    const legacyValueUuid = optionalLegacyUuid(row[valueField.field]);
    return legacyValueUuid === undefined ? null : { kind: valueField.kind, legacyValueUuid };
  }).filter((value): value is ParsedLegacyContactLogValue => value !== null);
  const dateEntered = parseLegacyContactLogTimestamp(row[FILEMAKER_CONTACT_LOG_FIELDS.dateEntered]);
  const updatedAt = parseLegacyContactLogTimestamp(row[FILEMAKER_CONTACT_LOG_FIELDS.dateModified]);
  const comment = optionalString(row[FILEMAKER_CONTACT_LOG_FIELDS.comment]);
  const legacyFilemakerId = optionalString(row[FILEMAKER_CONTACT_LOG_FIELDS.filemakerId]);
  const updatedBy = optionalString(row[FILEMAKER_CONTACT_LOG_FIELDS.updatedBy]);

  return {
    ...(comment !== undefined ? { comment } : {}),
    ...(contactTypeUuid !== undefined ? { contactTypeUuid } : {}),
    ...(dateEntered !== undefined ? { createdAt: dateEntered, dateEntered } : {}),
    ...(legacyFilemakerId !== undefined ? { legacyFilemakerId } : {}),
    ...(legacyOrganizationUuid !== undefined ? { legacyOrganizationUuid } : {}),
    legacyOwnerUuids: uniqueStrings([legacyParentUuid, legacyOrganizationUuid]),
    ...(legacyParentUuid !== undefined ? { legacyParentUuid } : {}),
    legacyUuid,
    ...(mailCampaignUuid !== undefined ? { mailCampaignUuid } : {}),
    ...(mailServerUuid !== undefined ? { mailServerUuid } : {}),
    ...(onBehalfUuid !== undefined ? { onBehalfUuid } : {}),
    ...(updatedAt !== undefined ? { updatedAt } : {}),
    ...(updatedBy !== undefined ? { updatedBy } : {}),
    values,
    ...(yearProspectUuid !== undefined ? { yearProspectUuid } : {}),
  };
};
