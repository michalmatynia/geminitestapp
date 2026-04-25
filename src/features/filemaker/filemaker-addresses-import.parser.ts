import Papa from 'papaparse';

import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const XLSX_HEADER_SCAN_LIMIT = 25;
const HEADER_SCAN_LIMIT = 25;
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;

const FIELDS = {
  city: 'Address_City',
  countryUuid: 'Country_UUID_FK',
  createdAt: 'DateAdded',
  category: 'Category',
  legacyParentUuid: 'Parent_UUID_FK',
  region: 'Address_Region',
  street: 'Address_Street',
  streetNumber: 'Address_No',
  updatedAt: 'DateModified',
  updatedBy: 'ModifiedBy',
  uuid: 'UUID',
  postalCode: 'Address_ZIP',
} as const;

const HEADERLESS_ADDRESS_FIELDS = [
  FIELDS.city,
  FIELDS.streetNumber,
  FIELDS.region,
  FIELDS.street,
  FIELDS.postalCode,
  FIELDS.category,
  FIELDS.countryUuid,
  FIELDS.createdAt,
  FIELDS.updatedAt,
  FIELDS.updatedBy,
  FIELDS.legacyParentUuid,
  FIELDS.uuid,
] as const;

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];
type LegacyAddressRowsFormat = 'CSV/TSV' | 'XLSX';

export type LegacyAddressRow = Record<string, string>;

export type ParsedLegacyAddress = {
  category?: string;
  city: string;
  createdAt?: string;
  legacyCountryUuid?: string;
  legacyParentUuid: string;
  legacyUuid: string;
  postalCode: string;
  region?: string;
  street: string;
  streetNumber: string;
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

const hasAddressHeader = (header: string[]): boolean =>
  header.includes(FIELDS.uuid) && header.includes(FIELDS.legacyParentUuid);

const buildMissingHeaderError = (format: LegacyAddressRowsFormat): Error =>
  new Error(`FileMaker address ${format} export is missing the UUID or Parent_UUID_FK header.`);

const rowToObject = (header: readonly string[], row: string[]): LegacyAddressRow =>
  Object.fromEntries(
    header.map((fieldName: string, index: number) => [fieldName, row[index] ?? ''])
  );

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const optionalLegacyUuid = (value: unknown): string | undefined => {
  const uuid = normalizeLegacyUuid(value);
  return uuid.length > 0 ? uuid : undefined;
};

const findHeaderRowIndex = (rows: string[][]): number =>
  rows.findIndex((row: string[], index: number): boolean => {
    if (index >= XLSX_HEADER_SCAN_LIMIT) return false;
    const fields = row.map((field: string): string => normalizeString(field));
    return hasAddressHeader(fields);
  });

const looksLikeHeaderlessAddressRows = (rows: string[][]): boolean =>
  rows.slice(0, HEADER_SCAN_LIMIT).some((row: string[]): boolean => {
    const legacyParentUuid = normalizeLegacyUuid(row[10]);
    const legacyUuid = normalizeLegacyUuid(row[11]);
    return (
      row.length >= HEADERLESS_ADDRESS_FIELDS.length &&
      legacyParentUuid.length > 0 &&
      legacyUuid.length > 0
    );
  });

const rowsToLegacyAddressRows = (
  matrix: unknown[][],
  input: { format: LegacyAddressRowsFormat }
): LegacyAddressRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeMatrixCell))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = findHeaderRowIndex(rows);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!hasAddressHeader(header)) {
    if (input.format === 'CSV/TSV' && looksLikeHeaderlessAddressRows(rows)) {
      return rows.map((row: string[]): LegacyAddressRow =>
        rowToObject(HEADERLESS_ADDRESS_FIELDS, row)
      );
    }
    throw buildMissingHeaderError(input.format);
  }

  return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyAddressRow =>
    rowToObject(header, row)
  );
};

export const parseFilemakerLegacyAddressRows = (text: string): LegacyAddressRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter: inferDelimiter(normalizedText),
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'parse error';
    throw new Error(`Invalid FileMaker address export: ${firstError}`);
  }
  return rowsToLegacyAddressRows(parsed.data, { format: 'CSV/TSV' });
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

export const parseFilemakerLegacyAddressWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyAddressRow[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), {
    type: 'array',
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error('FileMaker address XLSX export does not contain any worksheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`FileMaker address XLSX export is missing worksheet "${sheetName}".`);
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return rowsToLegacyAddressRows(matrix, { format: 'XLSX' });
};

export const parseAddressFromRow = (row: LegacyAddressRow): ParsedLegacyAddress | null => {
  const legacyUuid = normalizeLegacyUuid(row[FIELDS.uuid]);
  const legacyParentUuid = normalizeLegacyUuid(row[FIELDS.legacyParentUuid]);
  if (legacyUuid.length === 0 || legacyParentUuid.length === 0) return null;

  return {
    category: optionalString(row[FIELDS.category]),
    city: normalizeString(row[FIELDS.city]),
    createdAt: parseLegacyOrganiserTimestamp(row[FIELDS.createdAt]),
    legacyCountryUuid: optionalLegacyUuid(row[FIELDS.countryUuid]),
    legacyParentUuid,
    legacyUuid,
    postalCode: normalizeString(row[FIELDS.postalCode]),
    region: optionalString(row[FIELDS.region]),
    street: normalizeString(row[FIELDS.street]),
    streetNumber: normalizeString(row[FIELDS.streetNumber]),
    updatedAt: parseLegacyOrganiserTimestamp(row[FIELDS.updatedAt]),
    updatedBy: optionalString(row[FIELDS.updatedBy]),
  };
};
