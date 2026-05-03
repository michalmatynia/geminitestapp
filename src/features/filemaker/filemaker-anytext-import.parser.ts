import Papa from 'papaparse';

import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const HEADER_SCAN_LIMIT = 25;
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;

const FIELDS = {
  createdAt: 'DateAdded',
  legacyOwnerUuid: 'Parent_UUID_FK',
  legacyUuid: 'UUID',
  text: 'anytext',
  updatedAt: 'DateModified',
  updatedBy: 'ModifiedBy',
} as const;

const HEADERLESS_ANYTEXT_FIELDS = [
  FIELDS.text,
  FIELDS.createdAt,
  FIELDS.updatedAt,
  FIELDS.updatedBy,
  FIELDS.legacyOwnerUuid,
  FIELDS.legacyUuid,
] as const;

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];
type LegacyAnyTextRowsFormat = 'CSV/TSV' | 'XLSX';

export type LegacyAnyTextRow = Record<string, string>;

export type ParsedLegacyAnyText = {
  createdAt?: string;
  legacyOwnerUuid: string;
  legacyUuid: string;
  text: string;
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

const hasAnyTextHeader = (header: string[]): boolean =>
  header.includes(FIELDS.legacyUuid) && header.includes(FIELDS.legacyOwnerUuid);

const buildMissingHeaderError = (format: LegacyAnyTextRowsFormat): Error =>
  new Error(`FileMaker anytext ${format} export is missing the UUID or Parent_UUID_FK header.`);

const rowToObject = (header: readonly string[], row: string[]): LegacyAnyTextRow =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

const findHeaderRowIndex = (rows: string[][]): number =>
  rows.findIndex((row: string[], index: number): boolean => {
    if (index >= HEADER_SCAN_LIMIT) return false;
    return hasAnyTextHeader(row.map((field: string): string => normalizeString(field)));
  });

const looksLikeHeaderlessAnyTextRows = (rows: string[][]): boolean =>
  rows.slice(0, HEADER_SCAN_LIMIT).some((row: string[]): boolean => {
    const legacyOwnerUuid = normalizeLegacyUuid(row[4]);
    const legacyUuid = normalizeLegacyUuid(row[5]);
    return (
      row.length >= HEADERLESS_ANYTEXT_FIELDS.length &&
      legacyOwnerUuid.length > 0 &&
      legacyUuid.length > 0
    );
  });

const rowsToLegacyAnyTextRows = (
  matrix: unknown[][],
  input: { format: LegacyAnyTextRowsFormat }
): LegacyAnyTextRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeString))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = findHeaderRowIndex(rows);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!hasAnyTextHeader(header)) {
    if (input.format === 'CSV/TSV' && looksLikeHeaderlessAnyTextRows(rows)) {
      return rows.map((row: string[]): LegacyAnyTextRow =>
        rowToObject(HEADERLESS_ANYTEXT_FIELDS, row)
      );
    }
    throw buildMissingHeaderError(input.format);
  }

  return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyAnyTextRow =>
    rowToObject(header, row)
  );
};

export const parseFilemakerLegacyAnyTextRows = (text: string): LegacyAnyTextRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const delimiter = inferDelimiter(normalizedText);
  if (delimiter === '\t') {
    const rows = normalizedText
      .split(FILEMAKER_LINE_BREAK_PATTERN)
      .map((line: string): string[] => line.split('\t'));
    return rowsToLegacyAnyTextRows(rows, { format: 'CSV/TSV' });
  }
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'parse error';
    throw new Error(`Invalid FileMaker anytext export: ${firstError}`);
  }
  return rowsToLegacyAnyTextRows(parsed.data, { format: 'CSV/TSV' });
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

export const parseFilemakerLegacyAnyTextWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyAnyTextRow[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), {
    type: 'array',
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error('FileMaker anytext XLSX export does not contain any worksheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`FileMaker anytext XLSX export is missing worksheet "${sheetName}".`);
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return rowsToLegacyAnyTextRows(matrix, { format: 'XLSX' });
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

export const parseAnyTextFromRow = (row: LegacyAnyTextRow): ParsedLegacyAnyText | null => {
  const legacyOwnerUuid = normalizeLegacyUuid(row[FIELDS.legacyOwnerUuid]);
  const legacyUuid = normalizeLegacyUuid(row[FIELDS.legacyUuid]);
  const text = normalizeString(row[FIELDS.text]);
  if (legacyOwnerUuid.length === 0 || legacyUuid.length === 0 || text.length === 0) return null;

  return {
    createdAt: parseLegacyOrganiserTimestamp(row[FIELDS.createdAt]),
    legacyOwnerUuid,
    legacyUuid,
    text,
    updatedAt: parseLegacyOrganiserTimestamp(row[FIELDS.updatedAt]),
    updatedBy: optionalString(row[FIELDS.updatedBy]),
  };
};
