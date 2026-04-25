import { createFilemakerOrganization } from './filemaker-settings.entities';
import { normalizeFilemakerDatabase } from './filemaker-settings.database';
import {
  getIgnoredOrganiserImportColumnNames,
  parseFilemakerLegacyOrganiserRows,
  parseOrganiserFromRow,
  type LegacyOrganiserRow,
  type ParsedLegacyOrganiser,
} from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';
import type { FilemakerDatabase, FilemakerOrganization } from './types';

export { parseFilemakerLegacyOrganiserRows } from './filemaker-organisers-import.parser';

export type FilemakerLegacyOrganiserImportIdKind = 'organization';

export type FilemakerLegacyOrganiserImportOptions = {
  createId?: (kind: FilemakerLegacyOrganiserImportIdKind, legacyKey: string) => string;
};

export type FilemakerLegacyOrganisersImportResult = {
  database: FilemakerDatabase;
  ignoredColumnNames: string[];
  importedOrganizationCount: number;
  organizationLegacyUuidToId: Record<string, string>;
  skippedRowCount: number;
};

const createRandomModernId = (kind: FilemakerLegacyOrganiserImportIdKind): string =>
  `filemaker-${kind}-${globalThis.crypto.randomUUID()}`;

const createModernId = (
  kind: FilemakerLegacyOrganiserImportIdKind,
  legacyKey: string,
  options: FilemakerLegacyOrganiserImportOptions
): string => options.createId?.(kind, legacyKey) ?? createRandomModernId(kind);

const buildExistingOrganizationIdMap = (database: FilemakerDatabase): Map<string, string> =>
  new Map(
    database.organizations
      .map((organization: FilemakerOrganization): [string, string] => [
        normalizeLegacyUuid(organization.legacyUuid),
        organization.id,
      ])
      .filter(([legacyUuid]: [string, string]): boolean => legacyUuid.length > 0)
  );

const collectLegacyOrganisers = (
  rows: LegacyOrganiserRow[]
): { organisers: Map<string, ParsedLegacyOrganiser>; skippedRowCount: number } => {
  const organisers = new Map<string, ParsedLegacyOrganiser>();
  let skippedRowCount = 0;

  rows.forEach((row: LegacyOrganiserRow): void => {
    const organiser = parseOrganiserFromRow(row);
    if (organiser === null) {
      skippedRowCount += 1;
      return;
    }
    organisers.set(organiser.legacyUuid, organiser);
  });

  return { organisers, skippedRowCount };
};

const ensureModernOrganizationIds = (
  organisers: Map<string, ParsedLegacyOrganiser>,
  organizationIdByLegacyUuid: Map<string, string>,
  options: FilemakerLegacyOrganiserImportOptions
): void => {
  organisers.forEach((organiser: ParsedLegacyOrganiser): void => {
    if (!organizationIdByLegacyUuid.has(organiser.legacyUuid)) {
      organizationIdByLegacyUuid.set(
        organiser.legacyUuid,
        createModernId('organization', organiser.legacyUuid, options)
      );
    }
  });
};

const findExistingOrganization = (
  normalizedDatabase: FilemakerDatabase,
  organizationId: string
): FilemakerOrganization | undefined =>
  normalizedDatabase.organizations.find(
    (organization: FilemakerOrganization): boolean => organization.id === organizationId
  );

const resolveParentOrganizationId = (
  organiser: ParsedLegacyOrganiser,
  organizationIdByLegacyUuid: Map<string, string>,
  existingOrganization: FilemakerOrganization | undefined
): string | null | undefined => {
  if (existingOrganization?.parentOrganizationId !== undefined) {
    return existingOrganization.parentOrganizationId;
  }
  if (organiser.legacyParentUuid === undefined) return undefined;
  return organizationIdByLegacyUuid.get(organiser.legacyParentUuid) ?? null;
};

type OrganizationField = keyof FilemakerOrganization;

const getExistingOrganizationField = (
  organization: FilemakerOrganization | undefined,
  field: OrganizationField
): string | undefined => {
  if (organization === undefined) return undefined;
  const value = organization[field];
  return typeof value === 'string' ? value : undefined;
};

const getExistingOrganizationFieldOrEmpty = (
  organization: FilemakerOrganization | undefined,
  field: OrganizationField
): string => getExistingOrganizationField(organization, field) ?? '';

const preferImportedField = (
  importedValue: string | undefined,
  organization: FilemakerOrganization | undefined,
  field: OrganizationField
): string | undefined =>
  importedValue ?? getExistingOrganizationField(organization, field);

const toImportedOrganization = (
  organiser: ParsedLegacyOrganiser,
  normalizedDatabase: FilemakerDatabase,
  organizationIdByLegacyUuid: Map<string, string>
): FilemakerOrganization => {
  const id = organizationIdByLegacyUuid.get(organiser.legacyUuid) ?? '';
  const existingOrganization = findExistingOrganization(normalizedDatabase, id);

  return createFilemakerOrganization({
    id,
    name: organiser.name,
    addressId: getExistingOrganizationFieldOrEmpty(existingOrganization, 'addressId'),
    displayAddressId: getExistingOrganizationField(existingOrganization, 'displayAddressId'),
    street: getExistingOrganizationFieldOrEmpty(existingOrganization, 'street'),
    streetNumber: getExistingOrganizationFieldOrEmpty(existingOrganization, 'streetNumber'),
    city: getExistingOrganizationFieldOrEmpty(existingOrganization, 'city'),
    postalCode: getExistingOrganizationFieldOrEmpty(existingOrganization, 'postalCode'),
    country: getExistingOrganizationFieldOrEmpty(existingOrganization, 'country'),
    countryId: getExistingOrganizationFieldOrEmpty(existingOrganization, 'countryId'),
    taxId: getExistingOrganizationField(existingOrganization, 'taxId'),
    krs: getExistingOrganizationField(existingOrganization, 'krs'),
    tradingName: getExistingOrganizationField(existingOrganization, 'tradingName'),
    cooperationStatus: organiser.cooperationStatus,
    establishedDate: organiser.establishedDate,
    parentOrganizationId: resolveParentOrganizationId(
      organiser,
      organizationIdByLegacyUuid,
      existingOrganization
    ),
    defaultBankAccountId: getExistingOrganizationField(existingOrganization, 'defaultBankAccountId'),
    displayBankAccountId: getExistingOrganizationField(existingOrganization, 'displayBankAccountId'),
    legacyUuid: organiser.legacyUuid,
    legacyParentUuid: organiser.legacyParentUuid,
    legacyDefaultAddressUuid: organiser.legacyDefaultAddressUuid,
    legacyDisplayAddressUuid: organiser.legacyDisplayAddressUuid,
    legacyDefaultBankAccountUuid: organiser.legacyDefaultBankAccountUuid,
    legacyDisplayBankAccountUuid: organiser.legacyDisplayBankAccountUuid,
    updatedBy: organiser.updatedBy,
    createdAt: preferImportedField(organiser.createdAt, existingOrganization, 'createdAt'),
    updatedAt: preferImportedField(organiser.updatedAt, existingOrganization, 'updatedAt'),
  });
};

const mergeImportedOrganizations = (input: {
  importedOrganizations: FilemakerOrganization[];
  normalizedDatabase: FilemakerDatabase;
}): FilemakerDatabase => {
  const importedOrganizationIds = new Set(
    input.importedOrganizations.map((organization: FilemakerOrganization): string => organization.id)
  );
  return normalizeFilemakerDatabase({
    ...input.normalizedDatabase,
    organizations: [
      ...input.normalizedDatabase.organizations.filter(
        (organization: FilemakerOrganization): boolean =>
          !importedOrganizationIds.has(organization.id)
      ),
      ...input.importedOrganizations,
    ],
  });
};

export const importFilemakerLegacyOrganiserRows = (
  database: FilemakerDatabase | null | undefined,
  rows: LegacyOrganiserRow[],
  options: FilemakerLegacyOrganiserImportOptions = {}
): FilemakerLegacyOrganisersImportResult => {
  const normalizedDatabase = normalizeFilemakerDatabase(database);
  const collected = collectLegacyOrganisers(rows);
  const organizationIdByLegacyUuid = buildExistingOrganizationIdMap(normalizedDatabase);
  ensureModernOrganizationIds(collected.organisers, organizationIdByLegacyUuid, options);

  const importedOrganizations = Array.from(collected.organisers.values()).map(
    (organiser: ParsedLegacyOrganiser): FilemakerOrganization =>
      toImportedOrganization(organiser, normalizedDatabase, organizationIdByLegacyUuid)
  );

  return {
    database: mergeImportedOrganizations({
      importedOrganizations,
      normalizedDatabase,
    }),
    ignoredColumnNames: getIgnoredOrganiserImportColumnNames(rows),
    importedOrganizationCount: importedOrganizations.length,
    organizationLegacyUuidToId: Object.fromEntries(organizationIdByLegacyUuid.entries()),
    skippedRowCount: collected.skippedRowCount,
  };
};

export const importFilemakerLegacyOrganisersExport = (
  database: FilemakerDatabase | null | undefined,
  text: string,
  options: FilemakerLegacyOrganiserImportOptions = {}
): FilemakerLegacyOrganisersImportResult =>
  importFilemakerLegacyOrganiserRows(
    database,
    parseFilemakerLegacyOrganiserRows(text),
    options
  );
