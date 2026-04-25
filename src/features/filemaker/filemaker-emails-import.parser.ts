import Papa from 'papaparse';

import type { FilemakerEmailStatus } from './types';
import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const HEADER_SCAN_LIMIT = 25;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELDS = {
  createdAt: 'DateAdded',
  domainCountry: 'Domain_Country',
  email: 'Email',
  legacyUuid: 'UUID',
  organizationName: 'NameOrganisation::Name',
  status: 'Status',
  updatedAt: 'DateModified',
  updatedBy: 'ModifiedBy',
} as const;

const HEADERLESS_EMAIL_HEADERS = [
  FIELDS.createdAt,
  FIELDS.updatedAt,
  FIELDS.domainCountry,
  FIELDS.email,
  FIELDS.updatedBy,
  FIELDS.status,
  FIELDS.legacyUuid,
  FIELDS.organizationName,
] as const;

const ORGANIZATION_LEGACY_UUID_FIELDS = [
  'NameOrganisation::UUID',
  'NameOrganisation::UUID_FK',
  'NameOrganisation::Parent_UUID_FK',
  'NameOrganisation::Name',
  'Parent_UUID_FK',
  'Organisation_UUID',
  'Organization_UUID',
] as const;

const EMAIL_STATUSES: FilemakerEmailStatus[] = ['active', 'inactive', 'bounced', 'unverified'];
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];
type LegacyEmailRowsFormat = 'CSV/TSV' | 'XLSX';

export type LegacyEmailRow = Record<string, string>;

export type ParsedLegacyEmail = {
  createdAt?: string;
  domainCountry?: string;
  email: string;
  legacyOrganizationName?: string;
  legacyOrganizationUuid?: string;
  legacyStatusRaw?: string;
  legacyStatusUuid?: string;
  legacyUuid?: string;
  status: FilemakerEmailStatus;
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

const hasEmailHeader = (header: string[]): boolean =>
  header.includes(FIELDS.email) && header.includes(FIELDS.legacyUuid);

const buildMissingHeaderError = (format: LegacyEmailRowsFormat): Error =>
  new Error(`FileMaker email ${format} export is missing the Email or UUID header.`);

const findHeaderRowIndex = (rows: string[][], scanForHeader: boolean): number => {
  const index = rows.findIndex((row: string[], rowIndex: number): boolean => {
    if (!scanForHeader && rowIndex > 0) return false;
    if (rowIndex >= HEADER_SCAN_LIMIT) return false;
    return hasEmailHeader(row.map(normalizeString));
  });
  return index;
};

const looksLikeHeaderlessEmailRows = (rows: string[][]): boolean =>
  rows.slice(0, HEADER_SCAN_LIMIT).some((row: string[]): boolean => {
    const email = normalizeString(row[3]).toLowerCase();
    const legacyUuid = normalizeLegacyUuid(row[6]);
    return EMAIL_PATTERN.test(email) && legacyUuid.length > 0;
  });

const rowToObject = (header: readonly string[], row: string[]): Record<string, string> =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

const rowsToLegacyEmailRows = (
  matrix: unknown[][],
  input: { format: LegacyEmailRowsFormat; scanForHeader?: boolean }
): LegacyEmailRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeMatrixCell))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = findHeaderRowIndex(rows, input.scanForHeader ?? false);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!hasEmailHeader(header)) {
    if (input.format === 'CSV/TSV' && looksLikeHeaderlessEmailRows(rows)) {
      return rows.map((row: string[]): LegacyEmailRow => rowToObject(HEADERLESS_EMAIL_HEADERS, row));
    }
    throw buildMissingHeaderError(input.format);
  }
  return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyEmailRow =>
    rowToObject(header, row)
  );
};

export const parseFilemakerLegacyEmailRows = (text: string): LegacyEmailRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter: inferDelimiter(normalizedText),
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    throw new Error(`Invalid FileMaker email export: ${parsed.errors[0]?.message ?? 'parse error'}`);
  }
  return rowsToLegacyEmailRows(parsed.data, { format: 'CSV/TSV', scanForHeader: true });
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

export const parseFilemakerLegacyEmailWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyEmailRow[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error('FileMaker email XLSX export does not contain any worksheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`FileMaker email XLSX export is missing worksheet "${sheetName}".`);
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    blankrows: false,
    defval: '',
    header: 1,
    raw: false,
  });
  return rowsToLegacyEmailRows(matrix, { format: 'XLSX', scanForHeader: true });
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeEmailStatus = (
  value: unknown
): Pick<ParsedLegacyEmail, 'legacyStatusRaw' | 'legacyStatusUuid' | 'status'> => {
  const normalized = normalizeString(value);
  const status = normalized.toLowerCase();
  if (EMAIL_STATUSES.includes(status as FilemakerEmailStatus)) {
    return { status: status as FilemakerEmailStatus };
  }
  const legacyStatusUuid = normalizeLegacyUuid(normalized);
  return {
    ...(normalized.length > 0 ? { legacyStatusRaw: normalized } : {}),
    ...(legacyStatusUuid.length > 0 ? { legacyStatusUuid } : {}),
    status: 'unverified',
  };
};

const getLegacyOrganizationValue = (row: LegacyEmailRow): string | undefined =>
  ORGANIZATION_LEGACY_UUID_FIELDS.map((field: string): string => normalizeString(row[field])).find(
    (value: string): boolean => value.length > 0
  );

const getLegacyOrganizationReference = (
  row: LegacyEmailRow
): Pick<ParsedLegacyEmail, 'legacyOrganizationName' | 'legacyOrganizationUuid'> => {
  const value = getLegacyOrganizationValue(row);
  const legacyOrganizationUuid = normalizeLegacyUuid(value);
  if (legacyOrganizationUuid.length > 0) return { legacyOrganizationUuid };
  return value !== undefined ? { legacyOrganizationName: value } : {};
};

export const parseEmailFromRow = (row: LegacyEmailRow): ParsedLegacyEmail | null => {
  const email = normalizeString(row[FIELDS.email]).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return null;
  const legacyUuid = normalizeLegacyUuid(row[FIELDS.legacyUuid]);
  return {
    createdAt: parseLegacyOrganiserTimestamp(row[FIELDS.createdAt]),
    domainCountry: optionalString(row[FIELDS.domainCountry]),
    email,
    legacyUuid: legacyUuid.length > 0 ? legacyUuid : undefined,
    ...getLegacyOrganizationReference(row),
    ...normalizeEmailStatus(row[FIELDS.status]),
    updatedAt: parseLegacyOrganiserTimestamp(row[FIELDS.updatedAt]),
    updatedBy: optionalString(row[FIELDS.updatedBy]),
  };
};
