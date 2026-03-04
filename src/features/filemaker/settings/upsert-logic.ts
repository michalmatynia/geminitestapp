import {
  FilemakerDatabase,
  FilemakerPhoneNumber,
  FilemakerPerson,
  FilemakerOrganization,
  FilemakerEmail,
  FilemakerEmailStatus,
} from '../types';
import {
  FilemakerPhoneValidationRule,
  UpsertFilemakerPartyPhoneNumbersResult,
  UpsertFilemakerPartyEmailsResult,
  FilemakerEmailParserRule,
  FilemakerEmailExtractionResult,
} from '@/shared/contracts/filemaker';
import { normalizeFilemakerDatabase } from '../filemaker-settings.database';
import { normalizeString, toIdToken, ensureUniqueId } from '../filemaker-settings.helpers';
import {
  validateFilemakerPhoneNumber,
  extractFilemakerEmailsFromText,
} from '../filemaker-settings.validation';
import { createFilemakerPhoneNumber, createFilemakerEmail } from '../filemaker-settings.entities';
import {
  linkFilemakerPhoneNumberToParty,
  linkFilemakerEmailToParty,
} from '../filemaker-settings.links';

export const upsertFilemakerPhoneNumbersForParty = (
  database: FilemakerDatabase,
  input: {
    partyKind: 'person' | 'organization';
    partyId: string;
    phoneNumbers: string[];
    validationRules?: FilemakerPhoneValidationRule[] | null | undefined;
  }
): UpsertFilemakerPartyPhoneNumbersResult => {
  const normalizedDatabase = normalizeFilemakerDatabase(database);
  const normalizedPartyId = normalizeString(input.partyId);
  if (!normalizedPartyId) {
    return {
      database: normalizedDatabase,
      partyFound: false,
      createdPhoneNumberCount: 0,
      linkedPhoneNumberCount: 0,
      existingPhoneNumberCount: 0,
      invalidPhoneNumberCount: input.phoneNumbers.length,
      appliedPhoneNumbers: [],
    };
  }

  const partyFound =
    input.partyKind === 'person'
      ? normalizedDatabase.persons.some(
          (person: FilemakerPerson): boolean => person.id === normalizedPartyId
        )
      : normalizedDatabase.organizations.some(
          (organization: FilemakerOrganization): boolean => organization.id === normalizedPartyId
        );
  if (!partyFound) {
    return {
      database: normalizedDatabase,
      partyFound: false,
      createdPhoneNumberCount: 0,
      linkedPhoneNumberCount: 0,
      existingPhoneNumberCount: 0,
      invalidPhoneNumberCount: input.phoneNumbers.length,
      appliedPhoneNumbers: [],
    };
  }

  const unique = new Set<string>();
  const normalizedValues: string[] = [];
  let invalidPhoneNumberCount = 0;

  input.phoneNumbers.forEach((value: string): void => {
    const validation = validateFilemakerPhoneNumber(value, {
      validationRules: input.validationRules,
    });
    if (!validation.isValid) {
      invalidPhoneNumberCount += 1;
      return;
    }
    if (unique.has(validation.normalizedPhoneNumber)) return;
    unique.add(validation.normalizedPhoneNumber);
    normalizedValues.push(validation.normalizedPhoneNumber);
  });

  if (normalizedValues.length === 0) {
    return {
      database: normalizedDatabase,
      partyFound: true,
      createdPhoneNumberCount: 0,
      linkedPhoneNumberCount: 0,
      existingPhoneNumberCount: 0,
      invalidPhoneNumberCount,
      appliedPhoneNumbers: [],
    };
  }

  const phoneNumberIdByValue = new Map<string, string>();
  normalizedDatabase.phoneNumbers.forEach((phoneNumber: FilemakerPhoneNumber): void => {
    phoneNumberIdByValue.set(phoneNumber.phoneNumber, phoneNumber.id);
  });
  const usedPhoneNumberIds = new Set<string>(
    normalizedDatabase.phoneNumbers.map(
      (phoneNumber: FilemakerPhoneNumber): string => phoneNumber.id
    )
  );
  const nextPhoneNumbers = [...normalizedDatabase.phoneNumbers];
  let createdPhoneNumberCount = 0;
  let existingPhoneNumberCount = 0;

  normalizedValues.forEach((phoneNumberValue: string): void => {
    const existingId = phoneNumberIdByValue.get(phoneNumberValue);
    if (existingId) {
      existingPhoneNumberCount += 1;
      return;
    }

    const baseId = `filemaker-phone-number-${toIdToken(phoneNumberValue) || 'entry'}`;
    const id = ensureUniqueId(baseId, usedPhoneNumberIds, baseId);
    usedPhoneNumberIds.add(id);
    phoneNumberIdByValue.set(phoneNumberValue, id);
    nextPhoneNumbers.push(
      createFilemakerPhoneNumber({
        id,
        phoneNumber: phoneNumberValue,
      })
    );
    createdPhoneNumberCount += 1;
  });

  let nextDatabase = normalizedDatabase;
  if (createdPhoneNumberCount > 0) {
    nextDatabase = normalizeFilemakerDatabase({
      ...normalizedDatabase,
      phoneNumbers: nextPhoneNumbers,
    });
  }
  let linkedPhoneNumberCount = 0;

  normalizedValues.forEach((phoneNumberValue: string): void => {
    const phoneNumberId = phoneNumberIdByValue.get(phoneNumberValue);
    if (!phoneNumberId) return;
    const result = linkFilemakerPhoneNumberToParty(nextDatabase, {
      phoneNumberId,
      partyKind: input.partyKind,
      partyId: normalizedPartyId,
    });
    nextDatabase = result.database;
    if (result.created) {
      linkedPhoneNumberCount += 1;
    }
  });

  return {
    database: nextDatabase,
    partyFound: true,
    createdPhoneNumberCount,
    linkedPhoneNumberCount,
    existingPhoneNumberCount,
    invalidPhoneNumberCount,
    appliedPhoneNumbers: normalizedValues,
  };
};

export const upsertFilemakerEmailsForParty = (
  database: FilemakerDatabase,
  input: {
    partyKind: 'person' | 'organization';
    partyId: string;
    emails: string[];
    status?: FilemakerEmailStatus | null | undefined;
  }
): UpsertFilemakerPartyEmailsResult => {
  const normalizedDatabase = normalizeFilemakerDatabase(database);
  const normalizedPartyId = normalizeString(input.partyId);
  if (!normalizedPartyId) {
    return {
      database: normalizedDatabase,
      partyFound: false,
      createdEmailCount: 0,
      linkedEmailCount: 0,
      existingEmailCount: 0,
      invalidEmailCount: input.emails.length,
      appliedEmails: [],
    };
  }

  const partyFound =
    input.partyKind === 'person'
      ? normalizedDatabase.persons.some(
          (person: FilemakerPerson): boolean => person.id === normalizedPartyId
        )
      : normalizedDatabase.organizations.some(
          (organization: FilemakerOrganization): boolean => organization.id === normalizedPartyId
        );
  if (!partyFound) {
    return {
      database: normalizedDatabase,
      partyFound: false,
      createdEmailCount: 0,
      linkedEmailCount: 0,
      existingEmailCount: 0,
      invalidEmailCount: input.emails.length,
      appliedEmails: [],
    };
  }

  const unique = new Set<string>();
  const normalizedValues: string[] = [];
  let invalidEmailCount = 0;

  input.emails.forEach((value: string): void => {
    const normalizedEmail = normalizeString(value).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      invalidEmailCount += 1;
      return;
    }
    if (unique.has(normalizedEmail)) return;
    unique.add(normalizedEmail);
    normalizedValues.push(normalizedEmail);
  });

  if (normalizedValues.length === 0) {
    return {
      database: normalizedDatabase,
      partyFound: true,
      createdEmailCount: 0,
      linkedEmailCount: 0,
      existingEmailCount: 0,
      invalidEmailCount,
      appliedEmails: [],
    };
  }

  const emailIdByValue = new Map<string, string>();
  normalizedDatabase.emails.forEach((email: FilemakerEmail): void => {
    emailIdByValue.set(email.email.toLowerCase(), email.id);
  });
  const usedEmailIds = new Set<string>(
    normalizedDatabase.emails.map((email: FilemakerEmail): string => email.id)
  );
  const nextEmails = [...normalizedDatabase.emails];
  const normalizedStatus = (normalizeString(input.status).toLowerCase() ||
    'unverified') as FilemakerEmailStatus;
  let createdEmailCount = 0;
  let existingEmailCount = 0;

  normalizedValues.forEach((emailValue: string): void => {
    const existingId = emailIdByValue.get(emailValue);
    if (existingId) {
      existingEmailCount += 1;
      return;
    }

    const baseId = `filemaker-email-${toIdToken(emailValue) || 'entry'}`;
    const id = ensureUniqueId(baseId, usedEmailIds, baseId);
    usedEmailIds.add(id);
    emailIdByValue.set(emailValue, id);
    nextEmails.push(
      createFilemakerEmail({
        id,
        email: emailValue,
        status: normalizedStatus,
      })
    );
    createdEmailCount += 1;
  });

  let nextDatabase = normalizedDatabase;
  if (createdEmailCount > 0) {
    nextDatabase = normalizeFilemakerDatabase({
      ...normalizedDatabase,
      emails: nextEmails,
    });
  }
  let linkedEmailCount = 0;

  normalizedValues.forEach((emailValue: string): void => {
    const emailId = emailIdByValue.get(emailValue);
    if (!emailId) return;
    const result = linkFilemakerEmailToParty(nextDatabase, {
      emailId,
      partyKind: input.partyKind,
      partyId: normalizedPartyId,
    });
    nextDatabase = result.database;
    if (result.created) {
      linkedEmailCount += 1;
    }
  });

  return {
    database: nextDatabase,
    partyFound: true,
    createdEmailCount,
    linkedEmailCount,
    existingEmailCount,
    invalidEmailCount,
    appliedEmails: normalizedValues,
  };
};

export const parseAndUpsertFilemakerEmailsForParty = (
  database: FilemakerDatabase,
  input: {
    partyKind: 'person' | 'organization';
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
