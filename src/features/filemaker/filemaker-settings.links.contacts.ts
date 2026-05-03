import { normalizeFilemakerDatabase } from './filemaker-settings.database';
import { createFilemakerEmailLink, createFilemakerPhoneNumberLink } from './filemaker-settings.entities';
import { ensureUniqueId, normalizeString, toIdToken } from './filemaker-settings.helpers';
import type {
  FilemakerDatabase,
  FilemakerEmail,
  FilemakerEmailLink,
  FilemakerOrganization,
  FilemakerPartyKind,
  FilemakerPerson,
  FilemakerPhoneNumber,
  FilemakerPhoneNumberLink,
} from './types';

const linkIdToken = (value: string): string => {
  const token = toIdToken(value);
  return token.length > 0 ? token : 'entry';
};

const defaultPhoneNumberLinkIdForValues = (
  phoneNumberId: string,
  partyKind: FilemakerPartyKind,
  partyId: string
): string =>
  `filemaker-phone-number-link-${linkIdToken(`${phoneNumberId}-${partyKind}-${partyId}`)}`;

const defaultEmailLinkIdForValues = (
  emailId: string,
  partyKind: FilemakerPartyKind,
  partyId: string
): string => `filemaker-email-link-${linkIdToken(`${emailId}-${partyKind}-${partyId}`)}`;

const isPartyPresentInDatabase = (
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

const createPhoneNumberLinkId = (
  database: FilemakerDatabase,
  phoneNumberId: string,
  partyKind: FilemakerPartyKind,
  partyId: string
): string => {
  const usedIds = new Set<string>(
    database.phoneNumberLinks.map((link: FilemakerPhoneNumberLink): string => link.id)
  );
  const baseId = defaultPhoneNumberLinkIdForValues(phoneNumberId, partyKind, partyId);
  return ensureUniqueId(baseId, usedIds, baseId);
};

const createEmailLinkId = (
  database: FilemakerDatabase,
  emailId: string,
  partyKind: FilemakerPartyKind,
  partyId: string
): string => {
  const usedIds = new Set<string>(
    database.emailLinks.map((link: FilemakerEmailLink): string => link.id)
  );
  const baseId = defaultEmailLinkIdForValues(emailId, partyKind, partyId);
  return ensureUniqueId(baseId, usedIds, baseId);
};

export const linkFilemakerPhoneNumberToParty = (
  database: FilemakerDatabase,
  input: {
    phoneNumberId: string;
    partyKind: FilemakerPartyKind;
    partyId: string;
  }
): { database: FilemakerDatabase; created: boolean } => {
  const phoneNumberId = normalizeString(input.phoneNumberId);
  const partyId = normalizeString(input.partyId);
  if (phoneNumberId.length === 0 || partyId.length === 0) {
    return { database, created: false };
  }

  const hasPhoneNumber = database.phoneNumbers.some(
    (phoneNumber: FilemakerPhoneNumber): boolean => phoneNumber.id === phoneNumberId
  );
  if (!hasPhoneNumber) return { database, created: false };
  if (!isPartyPresentInDatabase(database, input.partyKind, partyId)) {
    return { database, created: false };
  }

  const alreadyLinked = database.phoneNumberLinks.some(
    (link: FilemakerPhoneNumberLink): boolean =>
      link.phoneNumberId === phoneNumberId &&
      link.partyKind === input.partyKind &&
      link.partyId === partyId
  );
  if (alreadyLinked) return { database, created: false };

  return {
    database: normalizeFilemakerDatabase({
      ...database,
      phoneNumberLinks: [
        ...database.phoneNumberLinks,
        createFilemakerPhoneNumberLink({
          id: createPhoneNumberLinkId(database, phoneNumberId, input.partyKind, partyId),
          phoneNumberId,
          partyKind: input.partyKind,
          partyId,
        }),
      ],
    }),
    created: true,
  };
};

export const unlinkFilemakerPhoneNumberFromParty = (
  database: FilemakerDatabase,
  input: {
    phoneNumberId: string;
    partyKind: FilemakerPartyKind;
    partyId: string;
  }
): FilemakerDatabase => {
  const phoneNumberId = normalizeString(input.phoneNumberId);
  const partyId = normalizeString(input.partyId);
  if (phoneNumberId.length === 0 || partyId.length === 0) return database;

  const nextPhoneNumberLinks = database.phoneNumberLinks.filter(
    (link: FilemakerPhoneNumberLink): boolean =>
      !(
        link.phoneNumberId === phoneNumberId &&
        link.partyKind === input.partyKind &&
        link.partyId === partyId
      )
  );
  if (nextPhoneNumberLinks.length === database.phoneNumberLinks.length) {
    return database;
  }

  const nextPersons =
    nextPhoneNumberLinks.length === 0
      ? database.persons.map(
          (person: FilemakerPerson): FilemakerPerson => ({
            ...person,
            phoneNumbers: [],
          })
        )
      : database.persons;

  return normalizeFilemakerDatabase({
    ...database,
    persons: nextPersons,
    phoneNumberLinks: nextPhoneNumberLinks,
  });
};

export const linkFilemakerEmailToParty = (
  database: FilemakerDatabase,
  input: {
    emailId: string;
    partyKind: FilemakerPartyKind;
    partyId: string;
  }
): { database: FilemakerDatabase; created: boolean } => {
  const emailId = normalizeString(input.emailId);
  const partyId = normalizeString(input.partyId);
  if (emailId.length === 0 || partyId.length === 0) {
    return { database, created: false };
  }

  const hasEmail = database.emails.some((email: FilemakerEmail): boolean => email.id === emailId);
  if (!hasEmail) return { database, created: false };
  if (!isPartyPresentInDatabase(database, input.partyKind, partyId)) {
    return { database, created: false };
  }

  const alreadyLinked = database.emailLinks.some(
    (link: FilemakerEmailLink): boolean =>
      link.emailId === emailId && link.partyKind === input.partyKind && link.partyId === partyId
  );
  if (alreadyLinked) return { database, created: false };

  return {
    database: normalizeFilemakerDatabase({
      ...database,
      emailLinks: [
        ...database.emailLinks,
        createFilemakerEmailLink({
          id: createEmailLinkId(database, emailId, input.partyKind, partyId),
          emailId,
          partyKind: input.partyKind,
          partyId,
        }),
      ],
    }),
    created: true,
  };
};

export const unlinkFilemakerEmailFromParty = (
  database: FilemakerDatabase,
  input: {
    emailId: string;
    partyKind: FilemakerPartyKind;
    partyId: string;
  }
): FilemakerDatabase => {
  const emailId = normalizeString(input.emailId);
  const partyId = normalizeString(input.partyId);
  if (emailId.length === 0 || partyId.length === 0) return database;

  const nextEmailLinks = database.emailLinks.filter(
    (link: FilemakerEmailLink): boolean =>
      !(link.emailId === emailId && link.partyKind === input.partyKind && link.partyId === partyId)
  );
  if (nextEmailLinks.length === database.emailLinks.length) return database;

  return normalizeFilemakerDatabase({
    ...database,
    emailLinks: nextEmailLinks,
  });
};
