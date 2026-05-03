import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const HEADER_SCAN_LIMIT = 25;

const FIELDS = {
  createdAt: 'DateAdded',
  email: 'EmailBook::Email',
  emailUuid: 'Email_UUID_FK',
  legacyUuid: 'UUID',
  organizationName: 'NameOrganisation::Name',
  organizationUuid: 'Organisation_UUID_FK',
  organizationUuidDuplicate: 'NameOrganisation::UUID',
  status: 'EmailBook::Status',
  updatedAt: 'DateModified',
  updatedBy: 'ModifiedBy',
} as const;

const HEADERLESS_HEADERS = [
  FIELDS.createdAt,
  FIELDS.emailUuid,
  FIELDS.updatedBy,
  'ModificationTimestamp_Empty',
  FIELDS.updatedAt,
  FIELDS.organizationUuid,
  FIELDS.legacyUuid,
  FIELDS.email,
  FIELDS.status,
  FIELDS.organizationName,
  FIELDS.organizationUuidDuplicate,
] as const;

export type LegacyEmailOrganizationJoinRow = Record<string, string>;

export type ParsedLegacyEmailOrganizationJoin = {
  createdAt?: string;
  legacyEmailAddress?: string;
  legacyEmailUuid: string;
  legacyJoinUuid?: string;
  legacyOrganizationName?: string;
  legacyOrganizationUuid: string;
  legacyStatusUuid?: string;
  updatedAt?: string;
  updatedBy?: string;
};

const rowToObject = (header: readonly string[], row: string[]): Record<string, string> =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

const stripOuterQuotes = (value: string): string => {
  const normalized = normalizeString(value);
  if (normalized.length >= 2 && normalized.startsWith('"') && normalized.endsWith('"')) {
    return normalized.slice(1, -1).replaceAll('""', '"');
  }
  return normalized;
};

const parseFilemakerTabMatrix = (text: string): string[][] =>
  text
    .replace(/^\uFEFF/, '')
    .replaceAll('\u0000', '')
    .split(FILEMAKER_LINE_BREAK_PATTERN)
    .map((line: string): string[] => line.split('\t').map(stripOuterQuotes))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));

const looksLikeHeaderlessJoinRows = (rows: string[][]): boolean =>
  rows.slice(0, HEADER_SCAN_LIMIT).some((row: string[]): boolean => {
    const legacyEmailUuid = normalizeLegacyUuid(row[1]);
    const legacyOrganizationUuid = normalizeLegacyUuid(row[5]);
    const legacyJoinUuid = normalizeLegacyUuid(row[6]);
    return (
      legacyEmailUuid.length > 0 &&
      legacyOrganizationUuid.length > 0 &&
      legacyJoinUuid.length > 0
    );
  });

export const parseFilemakerLegacyEmailOrganizationJoinRows = (
  text: string
): LegacyEmailOrganizationJoinRow[] => {
  const rows = parseFilemakerTabMatrix(text);
  if (rows.length === 0) return [];
  if (looksLikeHeaderlessJoinRows(rows)) {
    return rows.map((row: string[]): LegacyEmailOrganizationJoinRow =>
      rowToObject(HEADERLESS_HEADERS, row)
    );
  }
  const header = rows[0]?.map((field: string): string => normalizeString(field)) ?? [];
  return rows
    .slice(1)
    .map((row: string[]): LegacyEmailOrganizationJoinRow => rowToObject(header, row));
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const getOrganizationUuid = (row: LegacyEmailOrganizationJoinRow): string => {
  const primary = normalizeLegacyUuid(row[FIELDS.organizationUuid]);
  if (primary.length > 0) return primary;
  return normalizeLegacyUuid(row[FIELDS.organizationUuidDuplicate]);
};

const getOptionalUuid = (
  row: LegacyEmailOrganizationJoinRow,
  field: keyof typeof FIELDS
): string | undefined => {
  const uuid = normalizeLegacyUuid(row[FIELDS[field]]);
  return uuid.length > 0 ? uuid : undefined;
};

export const parseEmailOrganizationJoinFromRow = (
  row: LegacyEmailOrganizationJoinRow
): ParsedLegacyEmailOrganizationJoin | null => {
  const legacyEmailUuid = normalizeLegacyUuid(row[FIELDS.emailUuid]);
  const legacyOrganizationUuid = getOrganizationUuid(row);
  if (legacyEmailUuid.length === 0 || legacyOrganizationUuid.length === 0) return null;

  const legacyEmailAddress = optionalString(row[FIELDS.email])?.toLowerCase();
  const legacyOrganizationName = optionalString(row[FIELDS.organizationName]);

  return {
    createdAt: parseLegacyOrganiserTimestamp(row[FIELDS.createdAt]),
    ...(legacyEmailAddress !== undefined ? { legacyEmailAddress } : {}),
    legacyEmailUuid,
    ...(getOptionalUuid(row, 'legacyUuid') !== undefined
      ? { legacyJoinUuid: getOptionalUuid(row, 'legacyUuid') }
      : {}),
    ...(legacyOrganizationName !== undefined ? { legacyOrganizationName } : {}),
    legacyOrganizationUuid,
    ...(getOptionalUuid(row, 'status') !== undefined
      ? { legacyStatusUuid: getOptionalUuid(row, 'status') }
      : {}),
    updatedAt: parseLegacyOrganiserTimestamp(row[FIELDS.updatedAt]),
    updatedBy: optionalString(row[FIELDS.updatedBy]),
  };
};
