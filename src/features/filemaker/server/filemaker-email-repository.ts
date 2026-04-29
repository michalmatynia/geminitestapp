import 'server-only';

import { randomUUID } from 'node:crypto';

import type { Collection, Document, Filter } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { createFilemakerEmail } from '../filemaker-settings.entities';
import type {
  FilemakerEmail,
  FilemakerEmailStatus,
  FilemakerOrganization,
  FilemakerPartyKind,
  FilemakerPerson,
} from '../types';
import type { MxLookupOutcome } from './filemaker-email-mx-verifier';

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
  domainHasMx?: boolean;
  domainMxCheckedAt?: Date;
  domainMxLookupOutcome?: MxLookupOutcome;
  isRoleAccount?: boolean;
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
  legacyPersonUuid?: string;
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
    collections.links.createIndex(
      { partyKind: 1, partyId: 1 },
      { name: 'filemaker_email_links_party' }
    ),
  ]);
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PERSON_EMAIL_PARSER_IMPORT_SOURCE_KIND = 'filemaker-person-email-parser';
const PERSON_EMAIL_PARSER_UPDATED_BY = 'filemaker-person-email-parser';

const uniqueStrings = (values: Array<string | undefined>): string[] =>
  Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)));

const normalizeEmailAddress = (value: string): string => value.trim().toLowerCase();

const uniqueEmailAddresses = (values: string[]): string[] =>
  Array.from(new Set(values.map(normalizeEmailAddress).filter((value: string): boolean => EMAIL_RE.test(value))));

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
  const links = await collections.links
    .find(buildPersonEmailLinkFilter(person))
    .sort({ legacyEmailAddress: 1, emailId: 1 })
    .toArray();
  return listMongoFilemakerEmailsForLinks(links, collections);
};

export const upsertMongoFilemakerEmailsForPerson = async (
  person: FilemakerPerson & { legacyUuid?: string },
  emailAddresses: string[]
): Promise<{
  createdEmailCount: number;
  linkedEmailCount: number;
  emails: FilemakerEmail[];
}> => {
  const collections = await getMongoFilemakerEmailCollections();
  await ensureMongoFilemakerEmailIndexes(collections);

  const addresses = uniqueEmailAddresses(emailAddresses);
  let createdEmailCount = 0;
  let linkedEmailCount = 0;
  const now = new Date();
  const nowIso = now.toISOString();
  const legacyPersonUuid = person.legacyUuid?.trim() ?? '';

  for (const address of addresses) {
    let email = await collections.emails.findOne({ email: address });
    let emailId = email?.id ?? randomUUID();

    if (!email) {
      try {
        await collections.emails.insertOne({
          _id: emailId,
          email: address,
          id: emailId,
          importSourceKind: PERSON_EMAIL_PARSER_IMPORT_SOURCE_KIND,
          importedAt: now,
          legacyUuids: [],
          schemaVersion: 1,
          status: 'unverified',
          createdAt: nowIso,
          updatedAt: nowIso,
          updatedBy: PERSON_EMAIL_PARSER_UPDATED_BY,
        });
        createdEmailCount += 1;
      } catch (error) {
        const racedEmail = await collections.emails.findOne({ email: address });
        if (!racedEmail) throw error;
        email = racedEmail;
        emailId = racedEmail.id;
      }
    }

    const existingLink = await collections.links.findOne({
      emailId,
      partyKind: 'person',
      partyId: person.id,
    });
    if (existingLink) continue;

    const linkId = randomUUID();
    try {
      await collections.links.insertOne({
        _id: linkId,
        id: linkId,
        emailId,
        legacyEmailAddress: address,
        ...(legacyPersonUuid.length > 0 ? { legacyPersonUuid } : {}),
        partyId: person.id,
        partyKind: 'person',
        importSourceKind: PERSON_EMAIL_PARSER_IMPORT_SOURCE_KIND,
        importedAt: now,
        schemaVersion: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      linkedEmailCount += 1;
    } catch (error) {
      const racedLink = await collections.links.findOne({
        emailId,
        partyKind: 'person',
        partyId: person.id,
      });
      if (!racedLink) throw error;
    }
  }

  return {
    createdEmailCount,
    linkedEmailCount,
    emails: await listMongoFilemakerEmailsForPerson(person),
  };
};
