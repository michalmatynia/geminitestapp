import {
  type FilemakerEmailExtractionResult,
  type FilemakerEmailParserRule,
  type UpsertFilemakerPartyEmailsResult,
} from '@/shared/contracts/filemaker';

import { normalizeFilemakerDatabase } from '../filemaker-settings.database';
import { createFilemakerEmail } from '../filemaker-settings.entities';
import { ensureUniqueId, normalizeString, toIdToken } from '../filemaker-settings.helpers';
import { linkFilemakerEmailToParty } from '../filemaker-settings.links';
import { extractFilemakerEmailsFromText } from '../filemaker-settings.validation';
import {
  type FilemakerDatabase,
  type FilemakerEmail,
  type FilemakerEmailStatus,
  type FilemakerOrganization,
  type FilemakerPerson,
} from '../types';

type FilemakerPartyKind = 'person' | 'organization';

type UpsertEmailsInput = {
  partyKind: FilemakerPartyKind;
  partyId: string;
  emails: string[];
  status?: FilemakerEmailStatus | null | undefined;
};

type NormalizedEmailValues = {
  values: string[];
  invalidCount: number;
};

type EmailIndex = {
  idByValue: Map<string, string>;
  usedIds: Set<string>;
};

type EmailCreationResult = {
  database: FilemakerDatabase;
  idByValue: Map<string, string>;
  createdCount: number;
  existingCount: number;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createEmptyEmailUpsertResult = (
  database: FilemakerDatabase,
  input: UpsertEmailsInput,
  partyFound: boolean,
  invalidEmailCount: number
): UpsertFilemakerPartyEmailsResult => ({
  database,
  partyFound,
  createdEmailCount: 0,
  linkedEmailCount: 0,
  existingEmailCount: 0,
  invalidEmailCount,
  appliedEmails: [],
});

const hasFilemakerParty = (
  database: FilemakerDatabase,
  partyKind: FilemakerPartyKind,
  partyId: string
): boolean => {
  if (partyKind === 'person') {
    return database.persons.some((person: FilemakerPerson): boolean => person.id === partyId);
  }
  return database.organizations.some(
    (organization: FilemakerOrganization): boolean => organization.id === partyId
  );
};

const normalizeEmailValues = (input: UpsertEmailsInput): NormalizedEmailValues => {
  const unique = new Set<string>();
  const values: string[] = [];
  let invalidCount = 0;

  input.emails.forEach((value: string): void => {
    const normalizedEmail = normalizeString(value).toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      invalidCount += 1;
      return;
    }
    if (unique.has(normalizedEmail)) return;
    unique.add(normalizedEmail);
    values.push(normalizedEmail);
  });

  return { values, invalidCount };
};

const buildEmailIndex = (database: FilemakerDatabase): EmailIndex => {
  const idByValue = new Map<string, string>();
  database.emails.forEach((email: FilemakerEmail): void => {
    idByValue.set(email.email.toLowerCase(), email.id);
  });
  return {
    idByValue,
    usedIds: new Set(database.emails.map((email: FilemakerEmail): string => email.id)),
  };
};

const normalizeEmailStatus = (status: FilemakerEmailStatus | null | undefined): FilemakerEmailStatus => {
  const normalizedStatus = normalizeString(status).toLowerCase();
  return (normalizedStatus.length > 0 ? normalizedStatus : 'unverified') as FilemakerEmailStatus;
};

const buildEmailBaseId = (emailValue: string): string => {
  const token = toIdToken(emailValue);
  return `filemaker-email-${token.length > 0 ? token : 'entry'}`;
};

const createMissingEmails = (
  database: FilemakerDatabase,
  values: string[],
  status: FilemakerEmailStatus
): EmailCreationResult => {
  const { idByValue, usedIds } = buildEmailIndex(database);
  const nextEmails = [...database.emails];
  let createdCount = 0;
  let existingCount = 0;

  values.forEach((emailValue: string): void => {
    const existingId = idByValue.get(emailValue);
    if (existingId !== undefined) {
      existingCount += 1;
      return;
    }

    const baseId = buildEmailBaseId(emailValue);
    const id = ensureUniqueId(baseId, usedIds, baseId);
    usedIds.add(id);
    idByValue.set(emailValue, id);
    nextEmails.push(createFilemakerEmail({ id, email: emailValue, status }));
    createdCount += 1;
  });

  const nextDatabase =
    createdCount > 0 ? normalizeFilemakerDatabase({ ...database, emails: nextEmails }) : database;

  return { database: nextDatabase, idByValue, createdCount, existingCount };
};

const linkEmailsToParty = (
  database: FilemakerDatabase,
  values: string[],
  idByValue: Map<string, string>,
  input: Pick<UpsertEmailsInput, 'partyKind'> & { partyId: string }
): { database: FilemakerDatabase; linkedCount: number } => {
  let nextDatabase = database;
  let linkedCount = 0;

  values.forEach((emailValue: string): void => {
    const emailId = idByValue.get(emailValue);
    if (emailId === undefined) return;

    const result = linkFilemakerEmailToParty(nextDatabase, {
      emailId,
      partyKind: input.partyKind,
      partyId: input.partyId,
    });
    nextDatabase = result.database;
    if (result.created) {
      linkedCount += 1;
    }
  });

  return { database: nextDatabase, linkedCount };
};

export const upsertFilemakerEmailsForParty = (
  database: FilemakerDatabase,
  input: UpsertEmailsInput
): UpsertFilemakerPartyEmailsResult => {
  const normalizedDatabase = normalizeFilemakerDatabase(database);
  const normalizedPartyId = normalizeString(input.partyId);
  if (normalizedPartyId.length === 0) {
    return createEmptyEmailUpsertResult(normalizedDatabase, input, false, input.emails.length);
  }

  if (!hasFilemakerParty(normalizedDatabase, input.partyKind, normalizedPartyId)) {
    return createEmptyEmailUpsertResult(normalizedDatabase, input, false, input.emails.length);
  }

  const normalizedValues = normalizeEmailValues(input);
  if (normalizedValues.values.length === 0) {
    return createEmptyEmailUpsertResult(normalizedDatabase, input, true, normalizedValues.invalidCount);
  }

  const creation = createMissingEmails(
    normalizedDatabase,
    normalizedValues.values,
    normalizeEmailStatus(input.status)
  );
  const linked = linkEmailsToParty(creation.database, normalizedValues.values, creation.idByValue, {
    partyKind: input.partyKind,
    partyId: normalizedPartyId,
  });

  return {
    database: linked.database,
    partyFound: true,
    createdEmailCount: creation.createdCount,
    linkedEmailCount: linked.linkedCount,
    existingEmailCount: creation.existingCount,
    invalidEmailCount: normalizedValues.invalidCount,
    appliedEmails: normalizedValues.values,
  };
};

export const parseAndUpsertFilemakerEmailsForParty = (
  database: FilemakerDatabase,
  input: {
    partyKind: FilemakerPartyKind;
    partyId: string;
    text: string;
    parserRules?: FilemakerEmailParserRule[] | null | undefined;
    status?: FilemakerEmailStatus | null | undefined;
  }
): UpsertFilemakerPartyEmailsResult & FilemakerEmailExtractionResult => {
  const extraction = extractFilemakerEmailsFromText(input.text, {
    parserRules: input.parserRules,
  });
  const upsert = upsertFilemakerEmailsForParty(database, {
    partyKind: input.partyKind,
    partyId: input.partyId,
    emails: extraction.emails,
    status: input.status,
  });
  return {
    ...extraction,
    ...upsert,
  };
};
