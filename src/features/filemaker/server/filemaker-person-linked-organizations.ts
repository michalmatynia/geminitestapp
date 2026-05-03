import 'server-only';

import type { Filter } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  FILEMAKER_PERSON_ORGANIZATION_LINKS_COLLECTION,
  type FilemakerPersonOrganizationLinkMongoDocument,
} from './filemaker-persons-mongo';

export type FilemakerLinkedOrganizationIdentity = {
  legacyOrganizationUuid?: string;
  organizationId?: string;
};

type PersonWithOrganizationLinks = {
  id: string;
  legacyUuid?: string;
  linkedOrganizations?: FilemakerLinkedOrganizationIdentity[];
};

const optionalString = (value: string | undefined): string | undefined => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : undefined;
};

const uniqueIdentities = (
  identities: FilemakerLinkedOrganizationIdentity[]
): FilemakerLinkedOrganizationIdentity[] => {
  const seen = new Set<string>();
  return identities.filter((identity: FilemakerLinkedOrganizationIdentity): boolean => {
    const organizationId = optionalString(identity.organizationId);
    const legacyOrganizationUuid = optionalString(identity.legacyOrganizationUuid);
    if (organizationId === undefined && legacyOrganizationUuid === undefined) return false;
    const key = `${organizationId ?? ''}:${legacyOrganizationUuid ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildPersonOrganizationLinkFilter = (
  person: PersonWithOrganizationLinks
): Filter<FilemakerPersonOrganizationLinkMongoDocument> => {
  const clauses: Filter<FilemakerPersonOrganizationLinkMongoDocument>[] = [{ personId: person.id }];
  const legacyUuid = optionalString(person.legacyUuid);
  if (legacyUuid !== undefined) clauses.push({ legacyPersonUuid: legacyUuid });
  return { $or: clauses };
};

export const listLinkedOrganizationIdentitiesForPerson = async (
  person: PersonWithOrganizationLinks
): Promise<FilemakerLinkedOrganizationIdentity[]> => {
  if (Array.isArray(person.linkedOrganizations)) {
    return uniqueIdentities(person.linkedOrganizations);
  }

  const db = await getMongoDb();
  const documents = await db
    .collection<FilemakerPersonOrganizationLinkMongoDocument>(
      FILEMAKER_PERSON_ORGANIZATION_LINKS_COLLECTION
    )
    .find(buildPersonOrganizationLinkFilter(person), {
      projection: {
        _id: 0,
        legacyOrganizationUuid: 1,
        organizationId: 1,
      },
    })
    .toArray();

  return uniqueIdentities(documents);
};
