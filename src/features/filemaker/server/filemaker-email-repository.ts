import 'server-only';

import type { Collection, Document, Filter } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { createFilemakerEmail } from '../filemaker-settings.entities';
import type { FilemakerEmail, FilemakerEmailStatus, FilemakerOrganization, FilemakerPartyKind } from '../types';

export const FILEMAKER_EMAILS_COLLECTION = 'filemaker_emails';
export const FILEMAKER_EMAIL_LINKS_COLLECTION = 'filemaker_email_links';

export type MongoFilemakerEmailDocument = Document & {
  _id: string;
  createdAt?: string;
  domainCountry?: string;
  email: string;
  id: string;
  importBatchId?: string;
  importSourceKind?: string;
  importedAt?: Date;
  legacyStatusRaw?: string;
  legacyStatusUuid?: string;
  legacyUuid?: string;
  legacyUuids: string[];
  schemaVersion: 1;
  status: FilemakerEmailStatus;
  updatedAt?: string;
  updatedBy?: string;
};

export type MongoFilemakerEmailLinkDocument = Document & {
  _id: string;
  createdAt?: string;
  emailId: string;
  id: string;
  importBatchId?: string;
  importSourceKind?: string;
  importedAt?: Date;
  legacyEmailAddress?: string;
  legacyEmailUuid?: string;
  legacyJoinUuid?: string;
  legacyJoinUuids?: string[];
  legacyOrganizationName?: string;
  legacyOrganizationUuid?: string;
  legacyStatusUuid?: string;
  legacyStatusUuids?: string[];
  organizationId?: string;
  partyId?: string;
  partyKind: FilemakerPartyKind;
  schemaVersion: 1;
  updatedAt?: string;
};

export type MongoFilemakerEmailCollections = {
  emails: Collection<MongoFilemakerEmailDocument>;
  links: Collection<MongoFilemakerEmailLinkDocument>;
};

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

export const listMongoFilemakerEmailsForOrganization = async (
  organization: FilemakerOrganization
): Promise<FilemakerEmail[]> => {
  const collections = await getMongoFilemakerEmailCollections();
  const links = await collections.links
    .find(buildOrganizationEmailLinkFilter(organization))
    .sort({ legacyEmailAddress: 1, emailId: 1 })
    .toArray();
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
