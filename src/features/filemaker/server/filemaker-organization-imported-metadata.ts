import 'server-only';

import type { Document } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  FilemakerOrganizationDemandValue,
  FilemakerOrganizationHarvestProfile,
  FilemakerOrganizationImportedDemand,
} from '../filemaker-organization-imported-metadata';
import type { FilemakerOrganization } from '../types';

const FILEMAKER_ORGANIZATION_DEMANDS_COLLECTION = 'filemaker_organization_demands';
const FILEMAKER_ORGANIZATION_HARVEST_COLLECTION = 'filemaker_organization_harvest_profiles';

type FilemakerOrganizationDemandMongoDocument = Document & FilemakerOrganizationImportedDemand;

type FilemakerOrganizationHarvestMongoDocument = Document & FilemakerOrganizationHarvestProfile;

const optionalDocumentString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const documentStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry: unknown): entry is string => typeof entry === 'string')
    : [];

const buildOrganizationImportMetadataFilter = (
  organization: FilemakerOrganization
): Document => {
  const clauses: Document[] = [{ organizationId: organization.id }];
  if (organization.legacyUuid !== undefined && organization.legacyUuid.trim().length > 0) {
    clauses.push({ legacyOrganizationUuid: organization.legacyUuid });
  }
  return { $or: clauses };
};

const optionalStringProp = <TKey extends string>(
  key: TKey,
  value: unknown
): Partial<Record<TKey, string>> => {
  const normalized = optionalDocumentString(value);
  if (normalized === undefined) return {};
  const output: Partial<Record<TKey, string>> = {};
  output[key] = normalized;
  return output;
};

const toImportedDemandValue = (value: unknown): FilemakerOrganizationDemandValue | null => {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const legacyValueUuid = optionalDocumentString(record['legacyValueUuid']);
  if (legacyValueUuid === undefined) return null;
  const level = typeof record['level'] === 'number' ? record['level'] : 0;
  return {
    legacyValueUuid,
    level,
    ...optionalStringProp('label', record['label']),
    ...optionalStringProp('parentId', record['parentId']),
    ...optionalStringProp('valueId', record['valueId']),
  };
};

const toImportedDemand = (
  document: FilemakerOrganizationDemandMongoDocument
): FilemakerOrganizationImportedDemand => {
  const values = Array.isArray(document.values)
    ? document.values
        .map(toImportedDemandValue)
        .filter((value): value is FilemakerOrganizationDemandValue => value !== null)
    : [];
  return {
    id: document.id,
    legacyOrganizationUuid: document.legacyOrganizationUuid,
    legacyUuid: document.legacyUuid,
    legacyValueUuids: documentStringArray(document.legacyValueUuids),
    valueIds: documentStringArray(document.valueIds),
    values,
    ...optionalStringProp('organizationId', document.organizationId),
    ...optionalStringProp('organizationName', document.organizationName),
    ...optionalStringProp('createdAt', document.createdAt),
    ...optionalStringProp('createdBy', document.createdBy),
    ...optionalStringProp('updatedAt', document.updatedAt),
    ...optionalStringProp('updatedBy', document.updatedBy),
  };
};

const toHarvestProfile = (
  document: FilemakerOrganizationHarvestMongoDocument
): FilemakerOrganizationHarvestProfile => ({
  id: document.id,
  legacyOrganizationUuid: document.legacyOrganizationUuid,
  legacyUuid: document.legacyUuid,
  ...optionalStringProp('organizationId', document.organizationId),
  ...optionalStringProp('organizationName', document.organizationName),
  ...optionalStringProp('owner', document.owner),
  ...optionalStringProp('pageTitle', document.pageTitle),
  ...optionalStringProp('pageDescription', document.pageDescription),
  ...optionalStringProp('pageKeywords', document.pageKeywords),
  ...optionalStringProp('createdAt', document.createdAt),
  ...optionalStringProp('createdBy', document.createdBy),
  ...optionalStringProp('updatedAt', document.updatedAt),
  ...optionalStringProp('updatedBy', document.updatedBy),
});

export const listMongoFilemakerDemandsForOrganization = async (
  organization: FilemakerOrganization
): Promise<FilemakerOrganizationImportedDemand[]> => {
  const db = await getMongoDb();
  const documents = await db
    .collection<FilemakerOrganizationDemandMongoDocument>(
      FILEMAKER_ORGANIZATION_DEMANDS_COLLECTION
    )
    .find(buildOrganizationImportMetadataFilter(organization))
    .sort({ updatedAt: -1, createdAt: -1, id: 1 })
    .toArray();
  return documents.map(toImportedDemand);
};

export const listMongoFilemakerHarvestProfilesForOrganization = async (
  organization: FilemakerOrganization
): Promise<FilemakerOrganizationHarvestProfile[]> => {
  const db = await getMongoDb();
  const documents = await db
    .collection<FilemakerOrganizationHarvestMongoDocument>(
      FILEMAKER_ORGANIZATION_HARVEST_COLLECTION
    )
    .find(buildOrganizationImportMetadataFilter(organization))
    .sort({ updatedAt: -1, createdAt: -1, id: 1 })
    .toArray();
  return documents.map(toHarvestProfile);
};
