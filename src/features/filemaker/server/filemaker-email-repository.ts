import 'server-only';

import type { Filter } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { createFilemakerEmail } from '../filemaker-settings.entities';
import type {
  FilemakerEmail,
  FilemakerOrganization,
  FilemakerPerson,
} from '../types';
import {
  FILEMAKER_EMAILS_COLLECTION,
  FILEMAKER_EMAIL_LINKS_COLLECTION,
  type MongoFilemakerEmailCollections,
  type MongoFilemakerEmailDocument,
  type MongoFilemakerEmailLinkDocument,
} from './filemaker-email-repository.types';
import {
  listLinkedOrganizationIdentitiesForPerson,
  type FilemakerLinkedOrganizationIdentity,
} from './filemaker-person-linked-organizations';

export {
  FILEMAKER_EMAILS_COLLECTION,
  FILEMAKER_EMAIL_LINKS_COLLECTION,
} from './filemaker-email-repository.types';
export type {
  MongoFilemakerEmailCollections,
  MongoFilemakerEmailDocument,
  MongoFilemakerEmailLinkDocument,
} from './filemaker-email-repository.types';

export const getMongoFilemakerEmailCollections = async (): Promise<MongoFilemakerEmailCollections> => {
  const db = await getMongoDb();
  return {
    emails: db.collection<MongoFilemakerEmailDocument>(FILEMAKER_EMAILS_COLLECTION),
    links: db.collection<MongoFilemakerEmailLinkDocument>(FILEMAKER_EMAIL_LINKS_COLLECTION),
  };
};

export const ensureMongoFilemakerEmailIndexes = async (
  collections: MongoFilemakerEmailCollections
): Promise<void> => {
  await Promise.all([
    collections.emails.createIndex({ email: 1 }, { name: 'filemaker_emails_email_unique', unique: true }),
    collections.emails.createIndex(
      { legacyUuids: 1 },
      {
        name: 'filemaker_emails_legacy_uuids',
        partialFilterExpression: { legacyUuids: { $type: 'array' } },
      }
    ),
    collections.links.createIndex(
      { emailId: 1, partyKind: 1, partyId: 1 },
      { name: 'filemaker_email_links_party_unique', unique: true }
    ),
    collections.links.createIndex(
      { legacyOrganizationUuid: 1 },
      {
        name: 'filemaker_email_links_legacy_organization_uuid',
        partialFilterExpression: { legacyOrganizationUuid: { $type: 'string' } },
      }
    ),
    collections.links.createIndex({ organizationId: 1 }, { name: 'filemaker_email_links_organization' }),
    collections.links.createIndex(
      { partyKind: 1, partyId: 1 },
      { name: 'filemaker_email_links_party' }
    ),
  ]);
};

const uniqueStrings = (values: Array<string | undefined>): string[] =>
  Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)));

const mongoEmailToFilemakerEmail = (document: MongoFilemakerEmailDocument): FilemakerEmail =>
  createFilemakerEmail({
    id: document.id,
    email: document.email,
    status: document.status,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  });

const emailLinkToFallbackFilemakerEmail = (
  document: MongoFilemakerEmailLinkDocument
): FilemakerEmail | null => {
  if (document.legacyEmailAddress === undefined || document.legacyEmailAddress.length === 0) {
    return null;
  }
  return createFilemakerEmail({
    id: document.emailId,
    email: document.legacyEmailAddress,
    status: 'unverified',
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  });
};

const buildOrganizationEmailLinkFilter = (
  organization: FilemakerOrganization
): Filter<MongoFilemakerEmailLinkDocument> => {
  const organizationIds = uniqueStrings([organization.id]);
  const legacyOrganizationUuids = uniqueStrings([organization.legacyUuid]);
  const clauses: Filter<MongoFilemakerEmailLinkDocument>[] = [
    { organizationId: { $in: organizationIds } },
    { partyId: { $in: organizationIds } },
  ];
  if (legacyOrganizationUuids.length > 0) {
    clauses.push({ legacyOrganizationUuid: { $in: legacyOrganizationUuids } });
  }
  return { partyKind: 'organization', $or: clauses };
};

const buildPersonEmailLinkFilter = (
  person: FilemakerPerson & { legacyUuid?: string }
): Filter<MongoFilemakerEmailLinkDocument> => {
  const personIds = uniqueStrings([person.id]);
  const legacyPersonUuids = uniqueStrings([person.legacyUuid]);
  const clauses: Filter<MongoFilemakerEmailLinkDocument>[] = [{ partyId: { $in: personIds } }];
  if (legacyPersonUuids.length > 0) {
    clauses.push({ legacyPersonUuid: { $in: legacyPersonUuids } });
  }
  return { partyKind: 'person', $or: clauses };
};

const buildLinkedOrganizationEmailLinkFilter = (
  organizations: FilemakerLinkedOrganizationIdentity[]
): Filter<MongoFilemakerEmailLinkDocument> | null => {
  const organizationIds = uniqueStrings(
    organizations.map((organization) => organization.organizationId)
  );
  const legacyOrganizationUuids = uniqueStrings(
    organizations.map((organization) => organization.legacyOrganizationUuid)
  );
  const clauses: Filter<MongoFilemakerEmailLinkDocument>[] = [];
  if (organizationIds.length > 0) {
    clauses.push({ organizationId: { $in: organizationIds } }, { partyId: { $in: organizationIds } });
  }
  if (legacyOrganizationUuids.length > 0) {
    clauses.push({ legacyOrganizationUuid: { $in: legacyOrganizationUuids } });
  }
  return clauses.length > 0 ? { partyKind: 'organization', $or: clauses } : null;
};

const buildEmailDocumentFilter = (
  links: MongoFilemakerEmailLinkDocument[]
): Filter<MongoFilemakerEmailDocument> => {
  const emailIds = uniqueStrings(links.map((link: MongoFilemakerEmailLinkDocument) => link.emailId));
  const legacyEmailUuids = uniqueStrings(
    links.map((link: MongoFilemakerEmailLinkDocument) => link.legacyEmailUuid)
  );
  const clauses: Filter<MongoFilemakerEmailDocument>[] = [
    { _id: { $in: emailIds } },
    { id: { $in: emailIds } },
  ];
  if (legacyEmailUuids.length > 0) {
    clauses.push({ legacyUuid: { $in: legacyEmailUuids } }, { legacyUuids: { $in: legacyEmailUuids } });
  }
  return { $or: clauses };
};

const listMongoFilemakerEmailsForLinks = async (
  links: MongoFilemakerEmailLinkDocument[],
  collections: MongoFilemakerEmailCollections
): Promise<FilemakerEmail[]> => {
  if (links.length === 0) return [];

  const emailDocuments = await collections.emails
    .find(buildEmailDocumentFilter(links))
    .sort({ email: 1 })
    .toArray();
  const emailsById = new Map<string, FilemakerEmail>();
  emailDocuments.forEach((document: MongoFilemakerEmailDocument): void => {
    emailsById.set(document.id, mongoEmailToFilemakerEmail(document));
  });
  links.forEach((link: MongoFilemakerEmailLinkDocument): void => {
    if (emailsById.has(link.emailId)) return;
    const fallback = emailLinkToFallbackFilemakerEmail(link);
    if (fallback !== null) emailsById.set(fallback.id, fallback);
  });

  return Array.from(emailsById.values()).sort((left: FilemakerEmail, right: FilemakerEmail) =>
    left.email.localeCompare(right.email)
  );
};

export const listMongoFilemakerEmailsForOrganization = async (
  organization: FilemakerOrganization
): Promise<FilemakerEmail[]> => {
  const collections = await getMongoFilemakerEmailCollections();
  const links = await collections.links
    .find(buildOrganizationEmailLinkFilter(organization))
    .sort({ legacyEmailAddress: 1, emailId: 1 })
    .toArray();
  return listMongoFilemakerEmailsForLinks(links, collections);
};

export const listMongoFilemakerEmailsForPerson = async (
  person: FilemakerPerson & { legacyUuid?: string }
): Promise<FilemakerEmail[]> => {
  const collections = await getMongoFilemakerEmailCollections();
  const organizationFilter = buildLinkedOrganizationEmailLinkFilter(
    await listLinkedOrganizationIdentitiesForPerson(person)
  );
  const personFilter = buildPersonEmailLinkFilter(person);
  const filter =
    organizationFilter === null ? personFilter : { $or: [personFilter, organizationFilter] };
  const links = await collections.links
    .find(filter)
    .sort({ legacyEmailAddress: 1, emailId: 1 })
    .toArray();
  return listMongoFilemakerEmailsForLinks(links, collections);
};
