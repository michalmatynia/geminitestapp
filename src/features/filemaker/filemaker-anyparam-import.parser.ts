import Papa from 'papaparse';

import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const HEADER_SCAN_LIMIT = 25;
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;

const FIELDS = {
  createdBy: 'creationAccountName',
  creationHostTimestamp: 'creationHostTimestamp',
  createdAt: 'creationTimestamp',
  updatedBy: 'modificationAccountName',
  modificationHostTimestamp: 'modificationHostTimestamp',
  updatedAt: 'modificationTimestamp',
  legacyUuid: 'UUID',
  legacyOwnerUuid: 'UUID_Related',
} as const;

const OPTION_FIELDS = ['option1', 'option2', 'option3', 'option4'] as const;
const TEXT_FIELDS = ['text1', 'text2', 'text3', 'text4'] as const;

const HEADERLESS_ANYPARAM_FIELDS = [
  FIELDS.createdBy,
  FIELDS.creationHostTimestamp,
  FIELDS.createdAt,
  FIELDS.updatedBy,
  FIELDS.modificationHostTimestamp,
  FIELDS.updatedAt,
  ...OPTION_FIELDS,
  ...TEXT_FIELDS,
  FIELDS.legacyUuid,
  FIELDS.legacyOwnerUuid,
] as const;

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];
type LegacyAnyParamRowsFormat = 'CSV/TSV' | 'XLSX';

export type LegacyAnyParamRow = Record<string, string>;

export type ParsedLegacyAnyParamText = {
  field: (typeof TEXT_FIELDS)[number];
  slot: number;
  value: string;
};

export type ParsedLegacyAnyParam = {
  createdAt?: string;
  createdBy?: string;
  legacyOwnerUuid: string;
  legacyUuid: string;
  legacyValueUuids: string[];
  textValues: ParsedLegacyAnyParamText[];
  updatedAt?: string;
  updatedBy?: string;
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

const hasAnyParamHeader = (header: string[]): boolean =>
  header.includes(FIELDS.legacyUuid) && header.includes(FIELDS.legacyOwnerUuid);

const buildMissingHeaderError = (format: LegacyAnyParamRowsFormat): Error =>
  new Error(`FileMaker anyparam ${format} export is missing the UUID or UUID_Related header.`);

const rowToObject = (header: readonly string[], row: string[]): LegacyAnyParamRow =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

const findHeaderRowIndex = (rows: string[][]): number =>
  rows.findIndex((row: string[], index: number): boolean => {
    if (index >= HEADER_SCAN_LIMIT) return false;
    return hasAnyParamHeader(row.map((field: string): string => normalizeString(field)));
  });

const looksLikeHeaderlessAnyParamRows = (rows: string[][]): boolean =>
  rows.slice(0, HEADER_SCAN_LIMIT).some((row: string[]): boolean => {
    const legacyUuid = normalizeLegacyUuid(row[14]);
    const legacyOwnerUuid = normalizeLegacyUuid(row[15]);
    return (
      row.length >= HEADERLESS_ANYPARAM_FIELDS.length &&
      legacyUuid.length > 0 &&
      legacyOwnerUuid.length > 0
    );
  });

const rowsToLegacyAnyParamRows = (
  matrix: unknown[][],
  input: { format: LegacyAnyParamRowsFormat }
): LegacyAnyParamRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeMatrixCell))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = findHeaderRowIndex(rows);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!hasAnyParamHeader(header)) {
    if (input.format === 'CSV/TSV' && looksLikeHeaderlessAnyParamRows(rows)) {
      return rows.map((row: string[]): LegacyAnyParamRow =>
        rowToObject(HEADERLESS_ANYPARAM_FIELDS, row)
      );
    }
    throw buildMissingHeaderError(input.format);
  }

  return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyAnyParamRow =>
    rowToObject(header, row)
  );
};

export const parseFilemakerLegacyAnyParamRows = (text: string): LegacyAnyParamRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const delimiter = inferDelimiter(normalizedText);
  if (delimiter === '\t') {
    const rows = normalizedText
      .split(FILEMAKER_LINE_BREAK_PATTERN)
      .map((line: string): string[] => line.split('\t'));
    return rowsToLegacyAnyParamRows(rows, { format: 'CSV/TSV' });
  }
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'parse error';
    throw new Error(`Invalid FileMaker anyparam export: ${firstError}`);
  }
  return rowsToLegacyAnyParamRows(parsed.data, { format: 'CSV/TSV' });
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

export const parseFilemakerLegacyAnyParamWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyAnyParamRow[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), {
    type: 'array',
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error('FileMaker anyparam XLSX export does not contain any worksheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`FileMaker anyparam XLSX export is missing worksheet "${sheetName}".`);
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return rowsToLegacyAnyParamRows(matrix, { format: 'XLSX' });
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const parseTextValues = (row: LegacyAnyParamRow): ParsedLegacyAnyParamText[] =>
  TEXT_FIELDS.flatMap((field: (typeof TEXT_FIELDS)[number], index: number) => {
    const value = normalizeString(row[field]);
    if (value.length === 0) return [];
    return [{ field, slot: index + 1, value }];
  });

export const parseAnyParamFromRow = (row: LegacyAnyParamRow): ParsedLegacyAnyParam | null => {
  const legacyUuid = normalizeLegacyUuid(row[FIELDS.legacyUuid]);
  const legacyOwnerUuid = normalizeLegacyUuid(row[FIELDS.legacyOwnerUuid]);
  if (legacyUuid.length === 0 || legacyOwnerUuid.length === 0) return null;

  const legacyValueUuids = OPTION_FIELDS.map((field: string): string => normalizeLegacyUuid(row[field]))
    .filter((valueUuid: string): boolean => valueUuid.length > 0);
  const textValues = parseTextValues(row);
  if (legacyValueUuids.length === 0 && textValues.length === 0) return null;

  return {
    createdAt: parseLegacyOrganiserTimestamp(row[FIELDS.createdAt]),
    createdBy: optionalString(row[FIELDS.createdBy]),
    legacyOwnerUuid,
    legacyUuid,
    legacyValueUuids,
    textValues,
    updatedAt: parseLegacyOrganiserTimestamp(row[FIELDS.updatedAt]),
    updatedBy: optionalString(row[FIELDS.updatedBy]),
  };
};
