import Papa from 'papaparse';

import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { extractLegacyUuids, normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const HEADER_SCAN_LIMIT = 25;
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;

const FIELDS = {
  emailFilterCount: 'c_ema.FilterCount',
  fullName: 'c_FullName',
  organizationFilterCount: 'c_org.FilterCount',
  phoneFilterCount: 'c_pho.FilterCount',
  websiteFilterCount: 'c_www.FilterCount',
  checked1: 'Checked_1',
  checked2: 'Checked_2',
  dateOfBirth: 'Date of Birth',
  createdAt: 'DateAdded',
  updatedAt: 'DateModified',
  defaultAddressUuid: 'DefaultAddress_UUID',
  defaultBankAccountUuid: 'DefaultBankAccount_UUID',
  displayAddressUuid: 'DisplayAddress_UUID',
  displayBankAccountUuid: 'DisplayBankAccount_UUID',
  emailFilter: 'ema_FILTER',
  emailParser: 'Email Parser',
  firstName: 'FirstName',
  emailPortalFilter: 'key_ema.PORTALFILTER',
  organizationPortalFilter: 'key_org.PORTALFILTER',
  phonePortalFilter: 'key_pho.PORTALFILTER',
  websitePortalFilter: 'key_www.PORTALFILTER',
  lastName: 'LastName',
  updatedBy: 'ModifiedBy',
  organizationFilter: 'org_FILTER',
  legacyParentUuid: 'Parent_UUID_FK',
  phoneFilter: 'pho_FILTER',
  legacyUuid: 'UUID',
  websiteFilter: 'www_FILTER',
} as const;

const HEADERLESS_PERSON_FIELDS = [
  FIELDS.emailFilterCount,
  FIELDS.fullName,
  FIELDS.organizationFilterCount,
  FIELDS.phoneFilterCount,
  FIELDS.websiteFilterCount,
  FIELDS.checked1,
  FIELDS.checked2,
  FIELDS.dateOfBirth,
  FIELDS.createdAt,
  FIELDS.updatedAt,
  FIELDS.defaultAddressUuid,
  FIELDS.defaultBankAccountUuid,
  FIELDS.displayAddressUuid,
  FIELDS.displayBankAccountUuid,
  FIELDS.emailFilter,
  FIELDS.emailParser,
  FIELDS.firstName,
  FIELDS.emailPortalFilter,
  FIELDS.organizationPortalFilter,
  FIELDS.phonePortalFilter,
  FIELDS.websitePortalFilter,
  FIELDS.lastName,
  FIELDS.updatedBy,
  FIELDS.organizationFilter,
  FIELDS.legacyParentUuid,
  FIELDS.phoneFilter,
  FIELDS.legacyUuid,
  FIELDS.websiteFilter,
] as const;

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];
type LegacyPersonRowsFormat = 'CSV/TSV' | 'XLSX';

export type LegacyPersonRow = Record<string, string>;

export type ParsedLegacyPerson = {
  checked1?: boolean;
  checked2?: boolean;
  createdAt?: string;
  dateOfBirth?: string;
  firstName: string;
  fullName: string;
  lastName: string;
  legacyDefaultAddressUuid?: string;
  legacyDefaultBankAccountUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyDisplayBankAccountUuid?: string;
  legacyOrganizationUuids: string[];
  legacyParentUuid?: string;
  legacyUuid: string;
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

const hasPersonHeader = (header: string[]): boolean =>
  header.includes(FIELDS.legacyUuid) &&
  (header.includes(FIELDS.fullName) ||
    (header.includes(FIELDS.firstName) && header.includes(FIELDS.lastName)));

const summarizeParsedColumnCounts = (rows: string[][]): string => {
  const counts = rows.slice(0, 5).map((row: string[]): number => row.length);
  return counts.length > 0 ? counts.join(', ') : 'none';
};

const buildMissingHeaderError = (format: LegacyPersonRowsFormat, rows: string[][]): Error =>
  new Error(
    `FileMaker person ${format} export is missing the UUID/name headers and does not match the 28-column headerless person export format. Parsed column counts for the first rows: ${summarizeParsedColumnCounts(rows)}.`
  );

const rowToObject = (header: readonly string[], row: string[]): LegacyPersonRow =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

const findHeaderRowIndex = (rows: string[][]): number =>
  rows.findIndex((row: string[], index: number): boolean => {
    if (index >= HEADER_SCAN_LIMIT) return false;
    return hasPersonHeader(row.map((field: string): string => normalizeString(field)));
  });

const looksLikeHeaderlessPersonRows = (rows: string[][]): boolean =>
  rows.slice(0, HEADER_SCAN_LIMIT).some((row: string[]): boolean => {
    const fullName = normalizeString(row[1]);
    const firstName = normalizeString(row[16]);
    const lastName = normalizeString(row[21]);
    const legacyUuid = normalizeLegacyUuid(row[26]);
    return (
      row.length >= HEADERLESS_PERSON_FIELDS.length &&
      legacyUuid.length > 0 &&
      (fullName.length > 0 || firstName.length > 0 || lastName.length > 0)
    );
  });

const rowsToLegacyPersonRows = (
  matrix: unknown[][],
  input: { format: LegacyPersonRowsFormat }
): LegacyPersonRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeMatrixCell))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = findHeaderRowIndex(rows);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!hasPersonHeader(header)) {
    if (input.format === 'CSV/TSV' && looksLikeHeaderlessPersonRows(rows)) {
      return rows.map((row: string[]): LegacyPersonRow => rowToObject(HEADERLESS_PERSON_FIELDS, row));
    }
    throw buildMissingHeaderError(input.format, rows);
  }

  return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyPersonRow =>
    rowToObject(header, row)
  );
};

export const parseFilemakerLegacyPersonRows = (text: string): LegacyPersonRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const delimiter = inferDelimiter(normalizedText);
  if (delimiter === '\t') {
    const rows = normalizedText
      .split(FILEMAKER_LINE_BREAK_PATTERN)
      .map((line: string): string[] => line.split('\t'));
    return rowsToLegacyPersonRows(rows, { format: 'CSV/TSV' });
  }
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'parse error';
    throw new Error(`Invalid FileMaker person export: ${firstError}`);
  }
  return rowsToLegacyPersonRows(parsed.data, { format: 'CSV/TSV' });
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

export const parseFilemakerLegacyPersonWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyPersonRow[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), {
    type: 'array',
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error('FileMaker person XLSX export does not contain any worksheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`FileMaker person XLSX export is missing worksheet "${sheetName}".`);
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return rowsToLegacyPersonRows(matrix, { format: 'XLSX' });
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const optionalLegacyUuid = (value: unknown): string | undefined => {
  const normalized = normalizeLegacyUuid(value);
  return normalized.length > 0 ? normalized : undefined;
};

const parseLegacyDate = (value: unknown): string | undefined => {
  const parsed = parseLegacyOrganiserTimestamp(value);
  return parsed === undefined ? undefined : parsed.slice(0, 10);
};

const parseLegacyBoolean = (value: unknown): boolean | undefined => {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized.length === 0) return undefined;
  if (['1', 'true', 'yes', 'y', 'x', 'checked'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'unchecked'].includes(normalized)) return false;
  return undefined;
};

const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0] ?? '', lastName: '' };
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
};

const buildFullName = (firstName: string, lastName: string, explicitFullName: string): string => {
  if (explicitFullName.length > 0) return explicitFullName;
  return [firstName, lastName].filter((part: string): boolean => part.length > 0).join(' ');
};

export const parsePersonFromRow = (row: LegacyPersonRow): ParsedLegacyPerson | null => {
  const legacyUuid = normalizeLegacyUuid(row[FIELDS.legacyUuid]);
  if (legacyUuid.length === 0) return null;

  const explicitFullName = normalizeString(row[FIELDS.fullName]).replace(/\s+/g, ' ');
  const fallbackName = splitFullName(explicitFullName);
  const explicitFirstName = normalizeString(row[FIELDS.firstName]);
  const explicitLastName = normalizeString(row[FIELDS.lastName]);
  const firstName = explicitFirstName.length > 0 ? explicitFirstName : fallbackName.firstName;
  const lastName = explicitLastName.length > 0 ? explicitLastName : fallbackName.lastName;
  const builtFullName = buildFullName(firstName, lastName, explicitFullName);
  const fullName = builtFullName.length > 0 ? builtFullName : legacyUuid;

  return {
    checked1: parseLegacyBoolean(row[FIELDS.checked1]),
    checked2: parseLegacyBoolean(row[FIELDS.checked2]),
    createdAt: parseLegacyOrganiserTimestamp(row[FIELDS.createdAt]),
    dateOfBirth: parseLegacyDate(row[FIELDS.dateOfBirth]),
    firstName,
    fullName,
    lastName,
    legacyDefaultAddressUuid: optionalLegacyUuid(row[FIELDS.defaultAddressUuid]),
    legacyDefaultBankAccountUuid: optionalLegacyUuid(row[FIELDS.defaultBankAccountUuid]),
    legacyDisplayAddressUuid: optionalLegacyUuid(row[FIELDS.displayAddressUuid]),
    legacyDisplayBankAccountUuid: optionalLegacyUuid(row[FIELDS.displayBankAccountUuid]),
    legacyOrganizationUuids: extractLegacyUuids(row[FIELDS.organizationPortalFilter]),
    legacyParentUuid: optionalLegacyUuid(row[FIELDS.legacyParentUuid]),
    legacyUuid,
    updatedAt: parseLegacyOrganiserTimestamp(row[FIELDS.updatedAt]),
    updatedBy: optionalString(row[FIELDS.updatedBy]),
  };
};
