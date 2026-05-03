/* eslint-disable max-lines */
import Papa from 'papaparse';

import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const HEADER_SCAN_LIMIT = 25;
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;

const EVENT_FIELDS = {
  lastEventInstanceDate: 'c_LastDate_Event_Inst',
  lastEventInstanceUuid: 'c_LastID_Event_Inst',
  organizationFilterCount: 'c_org.FilterCount',
  websiteFilterCount: 'c_www.FilterCount',
  checked1: 'Checked_1',
  checked2: 'Checked_2',
  cooperationStatus: 'Coop_Status',
  currentDay: 'Current_Day',
  currentWeekNumber: 'Current_Week No.',
  createdAt: 'DateAdded',
  updatedAt: 'DateModified',
  defaultAddressUuid: 'DefaultAddress_UUID',
  discontinued: 'Discontinued',
  displayAddressUuid: 'DisplayAddress_UUID',
  eventStart: 'EventStart',
  howOften: 'HowOften',
  organizationPortalFilter: 'key_org.PORTALFILTER',
  websitePortalFilter: 'key_www.PORTALFILTER',
  lengthDay: 'Length_Day',
  updatedBy: 'ModifiedBy',
  moveDay: 'Move_day',
  name: 'Name',
  organizationFilter: 'org_FILTER',
  legacyParentUuid: 'Parent_UUID_FK',
  registrationMonth: 'Registration_Month',
  legacyUuid: 'UUID',
  websiteFilter: 'www_FILTER',
  websiteFilterCountDuplicate: 'www_FILTERCount',
} as const;

const EVENT_JOIN_FIELDS = {
  eventUuid: 'NameEvent_UUID_FK',
  organizationUuid: 'NameOrganisation_UUID_FK',
  legacyUuid: 'UUID',
} as const;

const HEADERLESS_EVENT_FIELDS = [
  EVENT_FIELDS.lastEventInstanceDate,
  EVENT_FIELDS.lastEventInstanceUuid,
  EVENT_FIELDS.organizationFilterCount,
  EVENT_FIELDS.websiteFilterCount,
  EVENT_FIELDS.checked1,
  EVENT_FIELDS.checked2,
  EVENT_FIELDS.cooperationStatus,
  EVENT_FIELDS.currentDay,
  EVENT_FIELDS.currentWeekNumber,
  EVENT_FIELDS.createdAt,
  EVENT_FIELDS.updatedAt,
  EVENT_FIELDS.defaultAddressUuid,
  EVENT_FIELDS.discontinued,
  EVENT_FIELDS.displayAddressUuid,
  EVENT_FIELDS.eventStart,
  EVENT_FIELDS.howOften,
  EVENT_FIELDS.organizationPortalFilter,
  EVENT_FIELDS.websitePortalFilter,
  EVENT_FIELDS.lengthDay,
  EVENT_FIELDS.updatedBy,
  EVENT_FIELDS.moveDay,
  EVENT_FIELDS.name,
  EVENT_FIELDS.organizationFilter,
  EVENT_FIELDS.legacyParentUuid,
  EVENT_FIELDS.registrationMonth,
  EVENT_FIELDS.legacyUuid,
  EVENT_FIELDS.websiteFilter,
  EVENT_FIELDS.websiteFilterCountDuplicate,
] as const;

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];
type LegacyEventRowsFormat = 'CSV/TSV' | 'XLSX';

export type LegacyEventRow = Record<string, string>;
export type LegacyEventOrganizationJoinRow = Record<string, string>;

export type ParsedLegacyEvent = {
  checked1?: boolean;
  checked2?: boolean;
  cooperationStatus?: string;
  createdAt?: string;
  currentDay?: string;
  currentWeekNumber?: number;
  discontinued?: boolean;
  eventName: string;
  eventStartDate?: string;
  lastEventInstanceDate?: string;
  legacyDefaultAddressUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyHowOftenUuid?: string;
  legacyLastEventInstanceUuid?: string;
  legacyParentUuid?: string;
  legacyUuid: string;
  lengthDay?: number;
  moveDay?: number;
  organizationFilter?: string;
  organizationFilterCount?: number;
  registrationMonth?: string;
  updatedAt?: string;
  updatedBy?: string;
  websiteFilter?: string;
  websiteFilterCount?: number;
};

export type ParsedLegacyEventOrganizationJoin = {
  legacyEventUuid: string;
  legacyOrganizationUuid: string;
  legacyUuid?: string;
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

const rowToObject = (header: readonly string[], row: string[]): LegacyEventRow =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

const hasEventHeader = (header: string[]): boolean =>
  header.includes(EVENT_FIELDS.legacyUuid) && header.includes(EVENT_FIELDS.name);

const hasEventJoinHeader = (header: string[]): boolean =>
  header.includes(EVENT_JOIN_FIELDS.eventUuid) &&
  header.includes(EVENT_JOIN_FIELDS.organizationUuid);

const summarizeParsedColumnCounts = (rows: string[][]): string => {
  const counts = rows.slice(0, 5).map((row: string[]): number => row.length);
  return counts.length > 0 ? counts.join(', ') : 'none';
};

const buildMissingEventHeaderError = (format: LegacyEventRowsFormat, rows: string[][]): Error =>
  new Error(
    `FileMaker event ${format} export is missing the UUID or Name header and does not match the 28-column headerless event export format. Parsed column counts for the first rows: ${summarizeParsedColumnCounts(rows)}.`
  );

const buildMissingJoinHeaderError = (format: LegacyEventRowsFormat, rows: string[][]): Error =>
  new Error(
    `FileMaker event-organisation join ${format} export is missing the NameEvent_UUID_FK or NameOrganisation_UUID_FK header. Parsed column counts for the first rows: ${summarizeParsedColumnCounts(rows)}.`
  );

const findHeaderRowIndex = (
  rows: string[][],
  predicate: (header: string[]) => boolean
): number =>
  rows.findIndex((row: string[], index: number): boolean => {
    if (index >= HEADER_SCAN_LIMIT) return false;
    return predicate(row.map((field: string): string => normalizeString(field)));
  });

const looksLikeHeaderlessEventRows = (rows: string[][]): boolean =>
  rows.slice(0, HEADER_SCAN_LIMIT).some((row: string[]): boolean => {
    const name = normalizeString(row[21]);
    const legacyUuid = normalizeLegacyUuid(row[25]);
    return row.length >= HEADERLESS_EVENT_FIELDS.length && name.length > 0 && legacyUuid.length > 0;
  });

const rowsToLegacyEventRows = (
  matrix: unknown[][],
  input: { format: LegacyEventRowsFormat }
): LegacyEventRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeMatrixCell))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = findHeaderRowIndex(rows, hasEventHeader);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (hasEventHeader(header)) {
    return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyEventRow =>
      rowToObject(header, row)
    );
  }
  if (input.format === 'CSV/TSV' && looksLikeHeaderlessEventRows(rows)) {
    return rows.map((row: string[]): LegacyEventRow => rowToObject(HEADERLESS_EVENT_FIELDS, row));
  }
  throw buildMissingEventHeaderError(input.format, rows);
};

const rowsToLegacyEventOrganizationJoinRows = (
  matrix: unknown[][],
  input: { format: LegacyEventRowsFormat }
): LegacyEventOrganizationJoinRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeMatrixCell))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = findHeaderRowIndex(rows, hasEventJoinHeader);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!hasEventJoinHeader(header)) throw buildMissingJoinHeaderError(input.format, rows);

  return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyEventOrganizationJoinRow =>
    Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']))
  );
};

const parseDelimitedRows = (text: string, delimiter: Delimiter): string[][] => {
  if (delimiter === '\t') {
    return text
      .split(FILEMAKER_LINE_BREAK_PATTERN)
      .filter((line: string): boolean => line.trim().length > 0)
      .map((line: string): string[] => line.split('\t'));
  }
  const parsed = Papa.parse<string[]>(text, {
    delimiter,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'parse error';
    throw new Error(`Invalid FileMaker event export: ${firstError}`);
  }
  return parsed.data;
};

export const parseFilemakerLegacyEventRows = (text: string): LegacyEventRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  return rowsToLegacyEventRows(parseDelimitedRows(normalizedText, inferDelimiter(normalizedText)), {
    format: 'CSV/TSV',
  });
};

export const parseFilemakerLegacyEventOrganizationJoinRows = (
  text: string
): LegacyEventOrganizationJoinRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  return rowsToLegacyEventOrganizationJoinRows(
    parseDelimitedRows(normalizedText, inferDelimiter(normalizedText)),
    { format: 'CSV/TSV' }
  );
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

const workbookToMatrix = async (input: ArrayBuffer | Uint8Array): Promise<unknown[][]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), {
    type: 'array',
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error('FileMaker event XLSX export does not contain any worksheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`FileMaker event XLSX export is missing worksheet "${sheetName}".`);
  }
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
};

export const parseFilemakerLegacyEventWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyEventRow[]> =>
  rowsToLegacyEventRows(await workbookToMatrix(input), { format: 'XLSX' });

export const parseFilemakerLegacyEventOrganizationJoinWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyEventOrganizationJoinRow[]> =>
  rowsToLegacyEventOrganizationJoinRows(await workbookToMatrix(input), { format: 'XLSX' });

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const optionalLegacyUuid = (value: unknown): string | undefined => {
  const normalized = normalizeLegacyUuid(value);
  return normalized.length > 0 ? normalized : undefined;
};

const parseInteger = (value: unknown): number | undefined => {
  const normalized = normalizeString(value);
  if (normalized.length === 0) return undefined;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
};

const parseLegacyBoolean = (value: unknown): boolean | undefined => {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized.length === 0) return undefined;
  if (['1', 'true', 'yes', 'y', 'x', 'checked'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'unchecked'].includes(normalized)) return false;
  return undefined;
};

const parseLegacyDate = (value: unknown): string | undefined => {
  const parsed = parseLegacyOrganiserTimestamp(value);
  return parsed === undefined ? optionalString(value) : parsed.slice(0, 10);
};

export const parseEventFromRow = (row: LegacyEventRow): ParsedLegacyEvent | null => {
  const legacyUuid = normalizeLegacyUuid(row[EVENT_FIELDS.legacyUuid]);
  if (legacyUuid.length === 0) return null;
  const normalizedEventName = normalizeString(row[EVENT_FIELDS.name]).replace(/\s+/g, ' ');
  const eventName = normalizedEventName.length > 0 ? normalizedEventName : legacyUuid;

  return {
    checked1: parseLegacyBoolean(row[EVENT_FIELDS.checked1]),
    checked2: parseLegacyBoolean(row[EVENT_FIELDS.checked2]),
    cooperationStatus: optionalString(row[EVENT_FIELDS.cooperationStatus]),
    createdAt: parseLegacyOrganiserTimestamp(row[EVENT_FIELDS.createdAt]),
    currentDay: optionalString(row[EVENT_FIELDS.currentDay]),
    currentWeekNumber: parseInteger(row[EVENT_FIELDS.currentWeekNumber]),
    discontinued: parseLegacyBoolean(row[EVENT_FIELDS.discontinued]),
    eventName,
    eventStartDate: parseLegacyDate(row[EVENT_FIELDS.eventStart]),
    lastEventInstanceDate: parseLegacyDate(row[EVENT_FIELDS.lastEventInstanceDate]),
    legacyDefaultAddressUuid: optionalLegacyUuid(row[EVENT_FIELDS.defaultAddressUuid]),
    legacyDisplayAddressUuid: optionalLegacyUuid(row[EVENT_FIELDS.displayAddressUuid]),
    legacyHowOftenUuid: optionalLegacyUuid(row[EVENT_FIELDS.howOften]),
    legacyLastEventInstanceUuid: optionalLegacyUuid(row[EVENT_FIELDS.lastEventInstanceUuid]),
    legacyParentUuid: optionalLegacyUuid(row[EVENT_FIELDS.legacyParentUuid]),
    legacyUuid,
    lengthDay: parseInteger(row[EVENT_FIELDS.lengthDay]),
    moveDay: parseInteger(row[EVENT_FIELDS.moveDay]),
    organizationFilter: optionalString(row[EVENT_FIELDS.organizationFilter]),
    organizationFilterCount: parseInteger(row[EVENT_FIELDS.organizationFilterCount]),
    registrationMonth: optionalLegacyUuid(row[EVENT_FIELDS.registrationMonth]),
    updatedAt: parseLegacyOrganiserTimestamp(row[EVENT_FIELDS.updatedAt]),
    updatedBy: optionalString(row[EVENT_FIELDS.updatedBy]),
    websiteFilter: optionalString(row[EVENT_FIELDS.websiteFilter]),
    websiteFilterCount:
      parseInteger(row[EVENT_FIELDS.websiteFilterCount]) ??
      parseInteger(row[EVENT_FIELDS.websiteFilterCountDuplicate]),
  };
};

export const parseEventOrganizationJoinFromRow = (
  row: LegacyEventOrganizationJoinRow
): ParsedLegacyEventOrganizationJoin | null => {
  const legacyEventUuid = normalizeLegacyUuid(row[EVENT_JOIN_FIELDS.eventUuid]);
  const legacyOrganizationUuid = normalizeLegacyUuid(row[EVENT_JOIN_FIELDS.organizationUuid]);
  if (legacyEventUuid.length === 0 || legacyOrganizationUuid.length === 0) return null;
  return {
    legacyEventUuid,
    legacyOrganizationUuid,
    legacyUuid: optionalLegacyUuid(row[EVENT_JOIN_FIELDS.legacyUuid]),
  };
};
