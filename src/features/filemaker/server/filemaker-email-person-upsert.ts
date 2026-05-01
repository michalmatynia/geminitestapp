import 'server-only';

import { randomUUID } from 'node:crypto';

import type { FilemakerEmail, FilemakerPerson } from '../types';
import {
  ensureMongoFilemakerEmailIndexes,
  getMongoFilemakerEmailCollections,
  listMongoFilemakerEmailsForPerson,
  type MongoFilemakerEmailCollections,
} from './filemaker-email-repository';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PERSON_EMAIL_PARSER_IMPORT_SOURCE_KIND = 'filemaker-person-email-parser';
const PERSON_EMAIL_PARSER_UPDATED_BY = 'filemaker-person-email-parser';

const normalizeEmailAddress = (value: string): string => value.trim().toLowerCase();

const uniqueEmailAddresses = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .map(normalizeEmailAddress)
        .filter((value: string): boolean => EMAIL_RE.test(value))
    )
  );

const ensureMongoFilemakerEmailForAddress = async (input: {
  address: string;
  collections: MongoFilemakerEmailCollections;
  now: Date;
  nowIso: string;
}): Promise<{ created: boolean; emailId: string }> => {
  const existingEmail = await input.collections.emails.findOne({ email: input.address });
  if (existingEmail !== null) return { created: false, emailId: existingEmail.id };

  const emailId = randomUUID();
  try {
    await input.collections.emails.insertOne({
      _id: emailId,
      email: input.address,
      id: emailId,
      importSourceKind: PERSON_EMAIL_PARSER_IMPORT_SOURCE_KIND,
      importedAt: input.now,
      legacyUuids: [],
      schemaVersion: 1,
      status: 'unverified',
      createdAt: input.nowIso,
      updatedAt: input.nowIso,
      updatedBy: PERSON_EMAIL_PARSER_UPDATED_BY,
    });
    return { created: true, emailId };
  } catch (error: unknown) {
    const racedEmail = await input.collections.emails.findOne({ email: input.address });
    if (racedEmail === null) throw error;
    return { created: false, emailId: racedEmail.id };
  }
};

const ensureMongoFilemakerEmailPersonLink = async (input: {
  address: string;
  collections: MongoFilemakerEmailCollections;
  emailId: string;
  legacyPersonUuid: string;
  now: Date;
  nowIso: string;
  personId: string;
}): Promise<boolean> => {
  const linkFilter = {
    emailId: input.emailId,
    partyKind: 'person' as const,
    partyId: input.personId,
  };
  const existingLink = await input.collections.links.findOne(linkFilter);
  if (existingLink !== null) return false;

  const linkId = randomUUID();
  try {
    await input.collections.links.insertOne({
      _id: linkId,
      id: linkId,
      emailId: input.emailId,
      legacyEmailAddress: input.address,
      ...(input.legacyPersonUuid.length > 0 ? { legacyPersonUuid: input.legacyPersonUuid } : {}),
      partyId: input.personId,
      partyKind: 'person',
      importSourceKind: PERSON_EMAIL_PARSER_IMPORT_SOURCE_KIND,
      importedAt: input.now,
      schemaVersion: 1,
      createdAt: input.nowIso,
      updatedAt: input.nowIso,
    });
    return true;
  } catch (error: unknown) {
    const racedLink = await input.collections.links.findOne(linkFilter);
    if (racedLink === null) throw error;
    return false;
  }
};

const upsertMongoFilemakerEmailForPersonAddress = async (input: {
  address: string;
  collections: MongoFilemakerEmailCollections;
  legacyPersonUuid: string;
  now: Date;
  nowIso: string;
  personId: string;
}): Promise<{ created: boolean; linked: boolean }> => {
  const email = await ensureMongoFilemakerEmailForAddress(input);
  const linked = await ensureMongoFilemakerEmailPersonLink({
    ...input,
    emailId: email.emailId,
  });
  return { created: email.created, linked };
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
  const now = new Date();
  const nowIso = now.toISOString();
  const legacyPersonUuid = person.legacyUuid?.trim() ?? '';
  const results = await Promise.all(
    addresses.map((address: string) =>
      upsertMongoFilemakerEmailForPersonAddress({
        address,
        collections,
        legacyPersonUuid,
        now,
        nowIso,
        personId: person.id,
      })
    )
  );

  return {
    createdEmailCount: results.filter((result) => result.created).length,
    linkedEmailCount: results.filter((result) => result.linked).length,
    emails: await listMongoFilemakerEmailsForPerson(person),
  };
};
