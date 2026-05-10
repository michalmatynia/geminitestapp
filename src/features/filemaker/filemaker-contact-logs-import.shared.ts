import { normalizeString } from './filemaker-settings.helpers';

const HEADER_SCAN_LIMIT = 25;

export const FILEMAKER_CONTACT_LOG_FIELDS = {
  comment: 'Comment',
  contactTypeUuid: 'Contact_Type_UUID_FK',
  dateEntered: 'Date Entered',
  dateModified: 'Date Modified',
  filemakerId: 'Id',
  mailCampaignUuid: 'MailCampaign_UUID_FK',
  mailServerUuid: 'MailServer_UUID_FK',
  organizationUuid: 'NameOrganisation::UUID',
  parentUuid: 'Parent_UUID_FK',
  updatedBy: 'Modified By',
  uuid: 'UUID',
  onBehalfUuid: 'On_Behalf_UUID_FK',
  yearProspectUuid: 'YearProspect_UUID_FK',
} as const;

export type LegacyContactLogRowsFormat = 'CSV/TSV' | 'XLSX';

export type LegacyContactLogRow = Record<string, string>;

export const normalizeMatrixCell = (value: unknown): string => normalizeString(value);

export const hasContactLogHeader = (header: string[]): boolean =>
  header.includes(FILEMAKER_CONTACT_LOG_FIELDS.uuid) &&
  header.includes(FILEMAKER_CONTACT_LOG_FIELDS.parentUuid);

export const buildMissingHeaderError = (format: LegacyContactLogRowsFormat): Error =>
  new Error(
    `FileMaker contact log ${format} export is missing the UUID or Parent_UUID_FK header.`
  );

export const rowToObject = (
  header: readonly string[],
  row: readonly string[]
): LegacyContactLogRow =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

export const rowsToLegacyContactLogRows = (
  matrix: unknown[][],
  input: { format: LegacyContactLogRowsFormat }
): LegacyContactLogRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeMatrixCell))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = rows.findIndex((row: string[], index: number): boolean => {
    if (index >= HEADER_SCAN_LIMIT) return false;
    return hasContactLogHeader(row.map((field: string): string => normalizeString(field)));
  });
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!hasContactLogHeader(header)) throw buildMissingHeaderError(input.format);

  return rows
    .slice(headerRowIndex + 1)
    .map((row: string[]): LegacyContactLogRow => rowToObject(header, row));
};
