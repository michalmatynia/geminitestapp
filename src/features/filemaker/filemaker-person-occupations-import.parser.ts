import Papa from 'papaparse';

import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const HEADER_SCAN_LIMIT = 25;
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;

const FIELDS = {
  createdAt: 'creationTimestamp',
  createdBy: 'creationAccountName',
  creationHostTimestamp: 'creationHostTimestamp',
  legacyPersonUuid: 'UUID_Related',
  legacyUuid: 'UUID',
  modificationHostTimestamp: 'modificationHostTimestamp',
  updatedAt: 'modificationTimestamp',
  updatedBy: 'modificationAccountName',
} as const;

const OPTION_FIELDS = ['option1', 'option2', 'option3'] as const;

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];
type LegacyPersonOccupationRowsFormat = 'CSV/TSV' | 'XLSX';

export type LegacyPersonOccupationRow = Record<string, string>;

export type ParsedLegacyPersonOccupation = {
  createdAt?: string;
  createdBy?: string;
  legacyPersonUuid: string;
  legacyUuid: string;
  legacyValueUuids: string[];
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

const hasOccupationHeader = (header: string[]): boolean =>
  header.includes(FIELDS.legacyUuid) && header.includes(FIELDS.legacyPersonUuid);

const buildMissingHeaderError = (format: LegacyPersonOccupationRowsFormat): Error =>
  new Error(
    `FileMaker person occupation ${format} export is missing the UUID or UUID_Related header.`
  );

const rowToObject = (header: readonly string[], row: string[]): LegacyPersonOccupationRow =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

const findHeaderRowIndex = (rows: string[][]): number =>
  rows.findIndex((row: string[], index: number): boolean => {
    if (index >= HEADER_SCAN_LIMIT) return false;
    return hasOccupationHeader(row.map((field: string): string => normalizeString(field)));
  });

const rowsToLegacyPersonOccupationRows = (
  matrix: unknown[][],
  input: { format: LegacyPersonOccupationRowsFormat }
): LegacyPersonOccupationRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeString))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = findHeaderRowIndex(rows);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!hasOccupationHeader(header)) throw buildMissingHeaderError(input.format);

  return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyPersonOccupationRow =>
    rowToObject(header, row)
  );
};

export const parseFilemakerLegacyPersonOccupationRows = (
  text: string
): LegacyPersonOccupationRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const delimiter = inferDelimiter(normalizedText);
  if (delimiter === '\t') {
    const rows = normalizedText
      .split(FILEMAKER_LINE_BREAK_PATTERN)
      .map((line: string): string[] => line.split('\t'));
    return rowsToLegacyPersonOccupationRows(rows, { format: 'CSV/TSV' });
  }
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'parse error';
    throw new Error(`Invalid FileMaker person occupation export: ${firstError}`);
  }
  return rowsToLegacyPersonOccupationRows(parsed.data, { format: 'CSV/TSV' });
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

export const parseFilemakerLegacyPersonOccupationWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyPersonOccupationRow[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), {
    type: 'array',
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error('FileMaker person occupation XLSX export does not contain any worksheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`FileMaker person occupation XLSX export is missing worksheet "${sheetName}".`);
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return rowsToLegacyPersonOccupationRows(matrix, { format: 'XLSX' });
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

export const parsePersonOccupationFromRow = (
  row: LegacyPersonOccupationRow
): ParsedLegacyPersonOccupation | null => {
  const legacyUuid = normalizeLegacyUuid(row[FIELDS.legacyUuid]);
  const legacyPersonUuid = normalizeLegacyUuid(row[FIELDS.legacyPersonUuid]);
  if (legacyUuid.length === 0 || legacyPersonUuid.length === 0) return null;

  const legacyValueUuids = OPTION_FIELDS.map((field: string): string =>
    normalizeLegacyUuid(row[field])
  ).filter((valueUuid: string): boolean => valueUuid.length > 0);
  if (legacyValueUuids.length === 0) return null;

  return {
    createdAt: parseLegacyOrganiserTimestamp(row[FIELDS.createdAt]),
    createdBy: optionalString(row[FIELDS.createdBy]),
    legacyPersonUuid,
    legacyUuid,
    legacyValueUuids,
    updatedAt: parseLegacyOrganiserTimestamp(row[FIELDS.updatedAt]),
    updatedBy: optionalString(row[FIELDS.updatedBy]),
  };
};
