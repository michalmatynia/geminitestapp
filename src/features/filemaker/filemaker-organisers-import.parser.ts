import * as Papa from 'papaparse';

import { normalizeString } from './filemaker-settings.helpers';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_TIMESTAMP_PATTERN =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i;
const XLSX_HEADER_SCAN_LIMIT = 25;

const FIELDS = {
  cooperationStatus: 'Coop_Status',
  createdAt: 'DateAdded',
  defaultAddressUuid: 'DefaultAddress_UUID',
  defaultBankAccountUuid: 'DefaultBankAccount_UUID',
  displayAddressUuid: 'DisplayAddress_UUID',
  displayBankAccountUuid: 'DisplayBankAccount_UUID',
  establishedDate: 'DATE_Established',
  legacyParentUuid: 'Parent_UUID_FK',
  name: 'Name',
  updatedAt: 'DateModified',
  updatedBy: 'ModifiedBy',
  uuid: 'UUID',
} as const;
const HEADERLESS_ORGANISER_FIELDS = [
  FIELDS.cooperationStatus,
  FIELDS.establishedDate,
  FIELDS.createdAt,
  FIELDS.updatedAt,
  FIELDS.defaultAddressUuid,
  FIELDS.defaultBankAccountUuid,
  FIELDS.displayAddressUuid,
  FIELDS.displayBankAccountUuid,
  FIELDS.updatedBy,
  FIELDS.name,
  FIELDS.legacyParentUuid,
  FIELDS.uuid,
] as const;

export const FILEMAKER_ORGANISER_OMITTED_FIELDS = new Set<string>([
  'ema_FILTER',
  'Email Parser',
  'eve_FILTER',
  'gro_FILTER',
  'key_ema.PORTALFILTER',
  'key_eve.PORTALFILTER',
  'key_pho.PORTALFILTER',
  'key_prs.PORTALFILTER',
  'key_www.PORTALFILTER',
  'pho_FILTER',
  'prs_FILTER',
  'www_FILTER',
]);

type LegacyOrganiserRowsFormat = 'CSV/TSV' | 'XLSX';
type Delimiter = ',' | '\t' | ';';

export type LegacyOrganiserRow = Record<string, string>;

export type ParsedLegacyOrganiser = {
  cooperationStatus?: string;
  createdAt?: string;
  establishedDate?: string;
  legacyDefaultAddressUuid?: string;
  legacyDefaultBankAccountUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyDisplayBankAccountUuid?: string;
  legacyParentUuid?: string;
  legacyUuid: string;
  name: string;
  updatedAt?: string;
  updatedBy?: string;
};

const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;

const countDelimiter = (line: string, delimiter: Delimiter): number =>
  line.split(delimiter).length - 1;

const inferDelimiter = (text: string): Delimiter => {
  const lines = text
    .split(/\r?\n/)
    .filter((line: string): boolean => line.trim().length > 0)
    .slice(0, XLSX_HEADER_SCAN_LIMIT);
  const delimiterScores = DELIMITER_CANDIDATES.map((delimiter: Delimiter) => ({
    delimiter,
    score: lines.reduce(
      (total: number, line: string): number => total + countDelimiter(line, delimiter),
      0
    ),
  }));
  const bestDelimiter = delimiterScores.reduce((best, candidate) =>
    candidate.score > best.score ? candidate : best
  );
  return bestDelimiter.score > 0 ? bestDelimiter.delimiter : ',';
};

const normalizeMatrixCell = (value: unknown): string => normalizeString(value);

const findHeaderRowIndex = (rows: string[][], scanForHeader: boolean): number => {
  if (!scanForHeader) return 0;
  return rows.findIndex((row: string[], index: number): boolean => {
    if (index >= XLSX_HEADER_SCAN_LIMIT) return false;
    const fields = row.map((field: string): string => normalizeString(field));
    return fields.includes(FIELDS.uuid) && fields.includes(FIELDS.name);
  });
};

const summarizeParsedColumnCounts = (rows: string[][]): string => {
  const counts = rows.slice(0, 5).map((row: string[]): number => row.length);
  return counts.length > 0 ? counts.join(', ') : 'none';
};

const buildMissingHeaderError = (format: LegacyOrganiserRowsFormat, rows: string[][]): Error =>
  new Error(
    `FileMaker organiser ${format} export is missing the UUID or Name header and does not match the 12-column headerless organiser export format. Expected headerless rows to have Name in column 10 and UUID in column 12. Parsed column counts for the first rows: ${summarizeParsedColumnCounts(rows)}.`
  );

const hasOrganiserHeader = (header: string[]): boolean =>
  header.includes(FIELDS.uuid) && header.includes(FIELDS.name);

const isHeaderlessOrganiserDataRow = (row: string[]): boolean => {
  const name = normalizeString(row[9]);
  const uuid = normalizeLegacyUuid(row[11]);
  return row.length >= HEADERLESS_ORGANISER_FIELDS.length && name.length > 0 && uuid.length > 0;
};

const findHeaderlessOrganiserDataStartIndex = (rows: string[][]): number =>
  rows.findIndex((row: string[], index: number): boolean => {
    if (index >= XLSX_HEADER_SCAN_LIMIT) return false;
    return isHeaderlessOrganiserDataRow(row);
  });

const headerlessRowsToLegacyOrganiserRows = (rows: string[][]): LegacyOrganiserRow[] =>
  rows.map((row: string[]): LegacyOrganiserRow =>
    Object.fromEntries(
      HEADERLESS_ORGANISER_FIELDS.map((fieldName: string, index: number) => [
        fieldName,
        row[index] ?? '',
      ])
    )
  );

const rowsToLegacyOrganiserRows = (
  matrix: unknown[][],
  input: { format: LegacyOrganiserRowsFormat; scanForHeader?: boolean }
): LegacyOrganiserRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeMatrixCell))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = findHeaderRowIndex(rows, input.scanForHeader ?? false);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (hasOrganiserHeader(header)) {
    return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyOrganiserRow =>
      Object.fromEntries(
        header.map((fieldName: string, index: number) => [fieldName, row[index] ?? ''])
      )
    );
  }
  const headerlessStartIndex = findHeaderlessOrganiserDataStartIndex(rows);
  if (headerlessStartIndex >= 0) {
    return headerlessRowsToLegacyOrganiserRows(rows.slice(headerlessStartIndex));
  }

  throw buildMissingHeaderError(input.format, rows);
};

const toIsoTimestamp = (input: {
  day: number;
  hour: number;
  meridiem: string;
  minute: number;
  month: number;
  second: number;
  year: number;
}): string | undefined => {
  let hour = input.hour;
  if (input.meridiem === 'PM' && hour < 12) hour += 12;
  if (input.meridiem === 'AM' && hour === 12) hour = 0;
  const parsed = new Date(
    Date.UTC(input.year, input.month - 1, input.day, hour, input.minute, input.second)
  );
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const parseFilemakerDateMatch = (match: RegExpMatchArray): string | undefined =>
  toIsoTimestamp({
    month: Number.parseInt(match[1] ?? '1', 10),
    day: Number.parseInt(match[2] ?? '1', 10),
    year: Number.parseInt(match[3] ?? '1970', 10),
    hour: Number.parseInt(match[4] ?? '0', 10),
    minute: Number.parseInt(match[5] ?? '0', 10),
    second: Number.parseInt(match[6] ?? '0', 10),
    meridiem: (match[7] ?? '').toUpperCase(),
  });

const parseNativeTimestamp = (value: string): string | undefined => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
};

export const parseLegacyOrganiserTimestamp = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  if (normalized.length === 0) return undefined;
  const match = normalized.match(FILEMAKER_TIMESTAMP_PATTERN);
  return match === null ? parseNativeTimestamp(normalized) : parseFilemakerDateMatch(match);
};

const parseLegacyOrganiserDate = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  if (normalized.length === 0) return undefined;
  const parsed = parseLegacyOrganiserTimestamp(normalized);
  if (parsed !== undefined) return parsed.slice(0, 10);
  return normalized;
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const optionalLegacyUuid = (value: unknown): string | undefined => {
  const uuid = normalizeLegacyUuid(value);
  return uuid.length > 0 ? uuid : undefined;
};

export const parseFilemakerLegacyOrganiserRows = (text: string): LegacyOrganiserRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const delimiter = inferDelimiter(normalizedText);
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'parse error';
    throw new Error(`Invalid FileMaker organiser export: ${firstError}`);
  }

  return rowsToLegacyOrganiserRows(parsed.data, { format: 'CSV/TSV' });
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

export const parseFilemakerLegacyOrganiserWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyOrganiserRow[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), {
    type: 'array',
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error('FileMaker organiser XLSX export does not contain any worksheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`FileMaker organiser XLSX export is missing worksheet "${sheetName}".`);
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return rowsToLegacyOrganiserRows(matrix, { format: 'XLSX', scanForHeader: true });
};

export const parseOrganiserFromRow = (
  row: LegacyOrganiserRow
): ParsedLegacyOrganiser | null => {
  const legacyUuid = normalizeLegacyUuid(row[FIELDS.uuid]);
  if (legacyUuid.length === 0) return null;
  const rowName = normalizeString(row[FIELDS.name]);
  const name = rowName.length > 0 ? rowName : legacyUuid;

  return {
    cooperationStatus: optionalString(row[FIELDS.cooperationStatus]),
    createdAt: parseLegacyOrganiserTimestamp(row[FIELDS.createdAt]),
    establishedDate: parseLegacyOrganiserDate(row[FIELDS.establishedDate]),
    legacyDefaultAddressUuid: optionalLegacyUuid(row[FIELDS.defaultAddressUuid]),
    legacyDefaultBankAccountUuid: optionalLegacyUuid(row[FIELDS.defaultBankAccountUuid]),
    legacyDisplayAddressUuid: optionalLegacyUuid(row[FIELDS.displayAddressUuid]),
    legacyDisplayBankAccountUuid: optionalLegacyUuid(row[FIELDS.displayBankAccountUuid]),
    legacyParentUuid: optionalLegacyUuid(row[FIELDS.legacyParentUuid]),
    legacyUuid,
    name,
    updatedAt: parseLegacyOrganiserTimestamp(row[FIELDS.updatedAt]),
    updatedBy: optionalString(row[FIELDS.updatedBy]),
  };
};

export const getIgnoredOrganiserImportColumnNames = (
  rows: LegacyOrganiserRow[]
): string[] => {
  const names = new Set<string>();
  rows.forEach((row: LegacyOrganiserRow): void => {
    Object.keys(row).forEach((fieldName: string): void => {
      if (fieldName.includes('::') || FILEMAKER_ORGANISER_OMITTED_FIELDS.has(fieldName)) {
        names.add(fieldName);
      }
    });
  });
  return Array.from(names).sort((left: string, right: string): number =>
    left.localeCompare(right)
  );
};
