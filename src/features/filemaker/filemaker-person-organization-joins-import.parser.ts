import { normalizeString } from './filemaker-settings.helpers';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const HEADER_SCAN_LIMIT = 25;

const FIELDS = {
  legacyOrganizationUuid: 'NameOrganisation_UUID_FK',
  legacyPersonUuid: 'NamePerson_UUID_FK',
  organizationRole: 'OrganisationRole',
  legacyUuid: 'UUID',
} as const;

const HEADERLESS_JOIN_FIELDS = [
  FIELDS.legacyOrganizationUuid,
  FIELDS.legacyPersonUuid,
  FIELDS.organizationRole,
  FIELDS.legacyUuid,
] as const;

export type LegacyPersonOrganizationJoinRow = Record<string, string>;

export type ParsedLegacyPersonOrganizationJoin = {
  legacyOrganizationUuid: string;
  legacyPersonUuid: string;
  legacyRoleUuid?: string;
  legacyUuid?: string;
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

const normalizeMatrixCell = (value: unknown): string => normalizeString(value);

const rowToObject = (
  header: readonly string[],
  row: string[]
): LegacyPersonOrganizationJoinRow =>
  Object.fromEntries(
    header.map((fieldName: string, index: number) => [fieldName, row[index] ?? ''])
  );

const hasJoinHeader = (header: string[]): boolean =>
  header.includes(FIELDS.legacyOrganizationUuid) && header.includes(FIELDS.legacyPersonUuid);

const findHeaderRowIndex = (rows: string[][]): number =>
  rows.findIndex((row: string[], index: number): boolean => {
    if (index >= HEADER_SCAN_LIMIT) return false;
    return hasJoinHeader(row.map((field: string): string => normalizeString(field)));
  });

const looksLikeHeaderlessJoinRows = (rows: string[][]): boolean =>
  rows.slice(0, HEADER_SCAN_LIMIT).some((row: string[]): boolean => {
    const legacyOrganizationUuid = normalizeLegacyUuid(row[0]);
    const legacyPersonUuid = normalizeLegacyUuid(row[1]);
    return legacyOrganizationUuid.length > 0 && legacyPersonUuid.length > 0;
  });

const rowsToLegacyPersonOrganizationJoinRows = (
  matrix: unknown[][]
): LegacyPersonOrganizationJoinRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeMatrixCell))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = findHeaderRowIndex(rows);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!hasJoinHeader(header)) {
    if (looksLikeHeaderlessJoinRows(rows)) {
      return rows.map((row: string[]): LegacyPersonOrganizationJoinRow =>
        rowToObject(HEADERLESS_JOIN_FIELDS, row)
      );
    }
    throw new Error(
      'FileMaker person-organization join XLSX export is missing the NameOrganisation_UUID_FK or NamePerson_UUID_FK header.'
    );
  }

  return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyPersonOrganizationJoinRow =>
    rowToObject(header, row)
  );
};

export const parseFilemakerLegacyPersonOrganizationJoinWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyPersonOrganizationJoinRow[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), {
    type: 'array',
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error(
      'FileMaker person-organization join XLSX export does not contain any worksheets.'
    );
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(
      `FileMaker person-organization join XLSX export is missing worksheet "${sheetName}".`
    );
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return rowsToLegacyPersonOrganizationJoinRows(matrix);
};

const optionalLegacyUuid = (value: unknown): string | undefined => {
  const normalized = normalizeLegacyUuid(value);
  return normalized.length > 0 ? normalized : undefined;
};

export const parsePersonOrganizationJoinFromRow = (
  row: LegacyPersonOrganizationJoinRow
): ParsedLegacyPersonOrganizationJoin | null => {
  const legacyOrganizationUuid = normalizeLegacyUuid(row[FIELDS.legacyOrganizationUuid]);
  const legacyPersonUuid = normalizeLegacyUuid(row[FIELDS.legacyPersonUuid]);
  if (legacyOrganizationUuid.length === 0 || legacyPersonUuid.length === 0) return null;
  const legacyRoleUuid = optionalLegacyUuid(row[FIELDS.organizationRole]);
  const legacyUuid = optionalLegacyUuid(row[FIELDS.legacyUuid]);

  return {
    legacyOrganizationUuid,
    legacyPersonUuid,
    ...(legacyRoleUuid !== undefined ? { legacyRoleUuid } : {}),
    ...(legacyUuid !== undefined ? { legacyUuid } : {}),
  };
};
