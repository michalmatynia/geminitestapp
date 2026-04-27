import Papa from 'papaparse';

import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;
const HEADER_SCAN_LIMIT = 25;

const FIELDS = {
  dateAdded: 'DateAdded',
  dateModified: 'DateModified',
  modifiedBy: 'ModifiedBy',
  parentUuid: 'Parent_UUID_FK',
  phoneNumber: 'PhoneNo',
  legacyUuid: 'UUID',
} as const;

const HEADERLESS_PHONEBOOK_FIELDS = [
  FIELDS.dateAdded,
  FIELDS.dateModified,
  FIELDS.modifiedBy,
  FIELDS.parentUuid,
  FIELDS.phoneNumber,
  FIELDS.legacyUuid,
] as const;

const LEGACY_PHONEBOOK_LINES = ['CSV/TSV', 'XLSX'] as const;
type LegacyPhonebookRowsFormat = (typeof LEGACY_PHONEBOOK_LINES)[number];

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];

type LegacyPhonebookRow = Record<string, string>;

export type ParsedLegacyPhonebook = {
  createdAt?: string;
  legacyParentUuid?: string;
  legacyUuid: string;
  modifiedBy?: string;
  phoneNumber: string;
  updatedAt?: string;
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
    score: lines.reduce((total: number, line: string): number => total + countDelimiter(line, delimiter), 0),
  }));

  const best = scores.reduce((left, right) => (right.score > left.score ? right : left));
  return best.score > 0 ? best.delimiter : ',';
};

const normalizeMatrixCell = (value: unknown): string => normalizeString(value);

const hasPhonebookHeader = (header: string[]): boolean =>
  header.includes(FIELDS.legacyUuid) && header.includes(FIELDS.phoneNumber);

const findHeaderRowIndex = (rows: string[][]): number =>
  rows.findIndex((row: string[], index: number): boolean => {
    if (index >= HEADER_SCAN_LIMIT) return false;
    return hasPhonebookHeader(row.map((field: string): string => normalizeString(field)));
  });

const looksLikeHeaderlessPhonebookRows = (rows: string[][]): boolean =>
  rows.slice(0, HEADER_SCAN_LIMIT).some((row: string[]): boolean => {
    const legacyUuid = normalizeLegacyUuid(row[5]);
    const phoneNumber = normalizeString(row[4]);
    return row.length >= HEADERLESS_PHONEBOOK_FIELDS.length && legacyUuid.length > 0 && phoneNumber.length > 0;
  });

const summarizeParsedColumnCounts = (rows: string[][]): string => {
  const counts = rows.slice(0, 5).map((row: string[]): number => row.length);
  return counts.length > 0 ? counts.join(', ') : 'none';
};

const buildMissingHeaderError = (format: LegacyPhonebookRowsFormat, rows: string[][]): Error =>
  new Error(
    `FileMaker phonebook ${format} export is missing the UUID or PhoneNo header and does not match the expected 6-column headered export format. Parsed column counts for the first rows: ${summarizeParsedColumnCounts(rows)}.`
  );

const rowToObject = (header: readonly string[], row: string[]): LegacyPhonebookRow =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

const rowsToLegacyPhonebookRows = (
  matrix: unknown[][],
  input: { format: LegacyPhonebookRowsFormat }
): LegacyPhonebookRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeMatrixCell))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));

  const headerRowIndex = findHeaderRowIndex(rows);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (hasPhonebookHeader(header)) {
    return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyPhonebookRow =>
      rowToObject(header, row)
    );
  }

  if (input.format === 'CSV/TSV' && looksLikeHeaderlessPhonebookRows(rows)) {
    return rows.map((row: string[]): LegacyPhonebookRow =>
      rowToObject(HEADERLESS_PHONEBOOK_FIELDS, row)
    );
  }

  throw buildMissingHeaderError(input.format, rows);
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const parsePhonebookDate = (value: unknown): string | undefined => {
  const parsed = parseLegacyOrganiserTimestamp(value);
  return parsed === undefined ? undefined : parsed.slice(0, 10);
};

export const parseFilemakerLegacyPhonebookRows = (text: string): LegacyPhonebookRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const delimiter = inferDelimiter(normalizedText);
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'parse error';
    throw new Error(`Invalid FileMaker phonebook export: ${firstError}`);
  }
  return rowsToLegacyPhonebookRows(parsed.data, { format: 'CSV/TSV' });
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

export const parseFilemakerLegacyPhonebookWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyPhonebookRow[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), {
    type: 'array',
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error('FileMaker phonebook XLSX export does not contain any worksheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`FileMaker phonebook XLSX export is missing worksheet "${sheetName}".`);
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });

  return rowsToLegacyPhonebookRows(matrix, { format: 'XLSX' });
};

export const parsePhonebookFromRow = (row: LegacyPhonebookRow): ParsedLegacyPhonebook | null => {
  const legacyUuid = normalizeLegacyUuid(row[FIELDS.legacyUuid]);
  if (legacyUuid.length === 0) return null;

  const phoneNumber = normalizeString(row[FIELDS.phoneNumber]);
  if (phoneNumber.length === 0) return null;

  return {
    createdAt: parsePhonebookDate(row[FIELDS.dateAdded]),
    legacyParentUuid: normalizeLegacyUuid(row[FIELDS.parentUuid]),
    legacyUuid,
    modifiedBy: optionalString(row[FIELDS.modifiedBy]),
    phoneNumber,
    updatedAt: parsePhonebookDate(row[FIELDS.dateModified]),
  };
};
