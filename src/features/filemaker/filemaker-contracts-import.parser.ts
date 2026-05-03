import Papa from 'papaparse';

import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const HEADER_SCAN_LIMIT = 25;
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;

const DISPLAY_FIELDS = {
  city: 'NameEvent.Display Con » Address Default::Address_City',
  endDate: 'NameEvent_Inst.Join Con::EndDate',
  eventName: 'NameEvent.Display_Con::Name',
  legacyCountryUuid: 'NameEvent.Display Con » Address Default::Country_UUID_FK',
  legacyEventUuid: 'NameEvent.Display_Con::UUID',
  legacyOnBehalfUuid: 'On_Behalf_UUID_FK',
  legacyParticipantStatusUuid: 'JOIN_ContractBook_TO_NamePerson_Participant::Status_UUID_FK',
  legacyParticipantUuid: 'JOIN_ContractBook_TO_NamePerson_Participant::NamePerson_UUID_FK',
  startDate: 'NameEvent_Inst.Join Con::StartDate',
} as const;

const EVENT_JOIN_FIELDS = {
  createdAt: 'creationTimestamp',
  createdBy: 'creationAccountName',
  legacyContractUuid: 'ContractBook_UUID_FK',
  legacyEventInstanceUuid: 'NameEvent_Inst_UUID_FK',
  legacyEventUuid: 'NameEvent_UUID_FK',
  legacyUuid: 'UUID',
  updatedAt: 'modificationTimestamp',
  updatedBy: 'modificationAccountName',
  eventName: 'NameEvent.Display_Con::Name',
} as const;

const PERSON_JOIN_FIELDS = {
  createdAt: 'creationTimestamp',
  createdBy: 'creationAccountName',
  legacyContractUuid: 'ContractBook_UUID_FK',
  legacyPersonUuid: 'NamePerson_UUID_FK',
  legacyUuid: 'UUID',
  updatedAt: 'modificationTimestamp',
  updatedBy: 'modificationAccountName',
} as const;

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];
type LegacyContractRowsFormat = 'CSV/TSV' | 'XLSX';

export type LegacyContractRow = Record<string, string>;

export type ParsedLegacyContractDisplay = {
  city?: string;
  endDate?: string;
  eventName?: string;
  legacyCountryUuid?: string;
  legacyEventUuid: string;
  legacyOnBehalfUuid?: string;
  legacyParticipantStatusUuid?: string;
  legacyParticipantUuid?: string;
  startDate?: string;
};

export type ParsedLegacyContractEventLink = {
  city?: string;
  createdAt?: string;
  createdBy?: string;
  endDate?: string;
  eventName?: string;
  legacyContractUuid: string;
  legacyCountryUuid?: string;
  legacyEventInstanceUuid?: string;
  legacyEventUuid: string;
  legacyOnBehalfUuid?: string;
  legacyUuid?: string;
  startDate?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type ParsedLegacyContractPersonLink = {
  createdAt?: string;
  createdBy?: string;
  legacyContractUuid: string;
  legacyPersonUuid: string;
  legacyStatusUuid?: string;
  legacyUuid?: string;
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

const rowToObject = (header: readonly string[], row: string[]): LegacyContractRow =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

const hasHeader = (header: string[], requiredFields: string[]): boolean =>
  requiredFields.every((field: string): boolean => header.includes(field));

const rowsToLegacyContractRows = (
  matrix: unknown[][],
  input: { format: LegacyContractRowsFormat; requiredFields: string[]; tableName: string }
): LegacyContractRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeString))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = rows.findIndex((row: string[], index: number): boolean => {
    if (index >= HEADER_SCAN_LIMIT) return false;
    return hasHeader(row.map((field: string): string => normalizeString(field)), input.requiredFields);
  });
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!hasHeader(header, input.requiredFields)) {
    throw new Error(
      `FileMaker ${input.tableName} ${input.format} export is missing required headers.`
    );
  }
  return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyContractRow =>
    rowToObject(header, row)
  );
};

export const parseFilemakerLegacyContractRows = (
  text: string,
  input: { requiredFields: string[]; tableName: string }
): LegacyContractRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const delimiter = inferDelimiter(normalizedText);
  if (delimiter === '\t') {
    const rows = normalizedText
      .split(FILEMAKER_LINE_BREAK_PATTERN)
      .map((line: string): string[] => line.split('\t'));
    return rowsToLegacyContractRows(rows, { ...input, format: 'CSV/TSV' });
  }
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'parse error';
    throw new Error(`Invalid FileMaker ${input.tableName} export: ${firstError}`);
  }
  return rowsToLegacyContractRows(parsed.data, { ...input, format: 'CSV/TSV' });
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

export const parseFilemakerLegacyContractWorkbookRows = async (
  input: ArrayBuffer | Uint8Array,
  options: { requiredFields: string[]; tableName: string }
): Promise<LegacyContractRow[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error(`FileMaker ${options.tableName} XLSX export does not contain any worksheets.`);
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`FileMaker ${options.tableName} XLSX export is missing worksheet "${sheetName}".`);
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return rowsToLegacyContractRows(matrix, { ...options, format: 'XLSX' });
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const optionalLegacyUuid = (value: unknown): string | undefined => {
  const normalized = normalizeLegacyUuid(value);
  return normalized.length > 0 ? normalized : undefined;
};

export const parseContractDisplayFromRow = (
  row: LegacyContractRow
): ParsedLegacyContractDisplay | null => {
  const legacyEventUuid = normalizeLegacyUuid(row[DISPLAY_FIELDS.legacyEventUuid]);
  if (legacyEventUuid.length === 0) return null;
  return {
    city: optionalString(row[DISPLAY_FIELDS.city]),
    endDate: parseLegacyOrganiserTimestamp(row[DISPLAY_FIELDS.endDate]),
    eventName: optionalString(row[DISPLAY_FIELDS.eventName]),
    legacyCountryUuid: optionalLegacyUuid(row[DISPLAY_FIELDS.legacyCountryUuid]),
    legacyEventUuid,
    legacyOnBehalfUuid: optionalLegacyUuid(row[DISPLAY_FIELDS.legacyOnBehalfUuid]),
    legacyParticipantStatusUuid: optionalLegacyUuid(row[DISPLAY_FIELDS.legacyParticipantStatusUuid]),
    legacyParticipantUuid: optionalLegacyUuid(row[DISPLAY_FIELDS.legacyParticipantUuid]),
    startDate: parseLegacyOrganiserTimestamp(row[DISPLAY_FIELDS.startDate]),
  };
};

export const parseContractEventLinkFromRow = (
  row: LegacyContractRow
): ParsedLegacyContractEventLink | null => {
  const legacyContractUuid = normalizeLegacyUuid(row[EVENT_JOIN_FIELDS.legacyContractUuid]);
  const legacyEventUuid = normalizeLegacyUuid(row[EVENT_JOIN_FIELDS.legacyEventUuid]);
  if (legacyContractUuid.length === 0 || legacyEventUuid.length === 0) return null;
  return {
    createdAt: parseLegacyOrganiserTimestamp(row[EVENT_JOIN_FIELDS.createdAt]),
    createdBy: optionalString(row[EVENT_JOIN_FIELDS.createdBy]),
    eventName: optionalString(row[EVENT_JOIN_FIELDS.eventName]),
    legacyContractUuid,
    legacyEventInstanceUuid: optionalLegacyUuid(row[EVENT_JOIN_FIELDS.legacyEventInstanceUuid]),
    legacyEventUuid,
    legacyUuid: optionalLegacyUuid(row[EVENT_JOIN_FIELDS.legacyUuid]),
    updatedAt: parseLegacyOrganiserTimestamp(row[EVENT_JOIN_FIELDS.updatedAt]),
    updatedBy: optionalString(row[EVENT_JOIN_FIELDS.updatedBy]),
  };
};

export const parseContractPersonLinkFromRow = (
  row: LegacyContractRow
): ParsedLegacyContractPersonLink | null => {
  const legacyContractUuid = normalizeLegacyUuid(row[PERSON_JOIN_FIELDS.legacyContractUuid]);
  const legacyPersonUuid = normalizeLegacyUuid(row[PERSON_JOIN_FIELDS.legacyPersonUuid]);
  if (legacyContractUuid.length === 0 || legacyPersonUuid.length === 0) return null;
  return {
    createdAt: parseLegacyOrganiserTimestamp(row[PERSON_JOIN_FIELDS.createdAt]),
    createdBy: optionalString(row[PERSON_JOIN_FIELDS.createdBy]),
    legacyContractUuid,
    legacyPersonUuid,
    legacyUuid: optionalLegacyUuid(row[PERSON_JOIN_FIELDS.legacyUuid]),
    updatedAt: parseLegacyOrganiserTimestamp(row[PERSON_JOIN_FIELDS.updatedAt]),
    updatedBy: optionalString(row[PERSON_JOIN_FIELDS.updatedBy]),
  };
};

export const CONTRACT_DISPLAY_REQUIRED_FIELDS = [
  DISPLAY_FIELDS.legacyEventUuid,
  DISPLAY_FIELDS.legacyOnBehalfUuid,
] as const;

export const CONTRACT_EVENT_LINK_REQUIRED_FIELDS = [
  EVENT_JOIN_FIELDS.legacyContractUuid,
  EVENT_JOIN_FIELDS.legacyEventUuid,
] as const;

export const CONTRACT_PERSON_LINK_REQUIRED_FIELDS = [
  PERSON_JOIN_FIELDS.legacyContractUuid,
  PERSON_JOIN_FIELDS.legacyPersonUuid,
] as const;
