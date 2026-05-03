import {
  type FilemakerPhoneValidationRule,
  type UpsertFilemakerPartyPhoneNumbersResult,
} from '@/shared/contracts/filemaker';

import { normalizeFilemakerDatabase } from '../filemaker-settings.database';
import { createFilemakerPhoneNumber } from '../filemaker-settings.entities';
import { ensureUniqueId, normalizeString, toIdToken } from '../filemaker-settings.helpers';
import { linkFilemakerPhoneNumberToParty } from '../filemaker-settings.links';
import { validateFilemakerPhoneNumber } from '../filemaker-settings.validation';
import {
  type FilemakerDatabase,
  type FilemakerOrganization,
  type FilemakerPerson,
  type FilemakerPhoneNumber,
} from '../types';

type FilemakerPartyKind = 'person' | 'organization';

type UpsertPhoneNumbersInput = {
  partyKind: FilemakerPartyKind;
  partyId: string;
  phoneNumbers: string[];
  validationRules?: FilemakerPhoneValidationRule[] | null | undefined;
};

type NormalizedPhoneValues = {
  values: string[];
  invalidCount: number;
};

type PhoneNumberIndex = {
  idByValue: Map<string, string>;
  usedIds: Set<string>;
};

type PhoneCreationResult = {
  database: FilemakerDatabase;
  idByValue: Map<string, string>;
  createdCount: number;
  existingCount: number;
};

const createEmptyPhoneUpsertResult = (
  database: FilemakerDatabase,
  _input: UpsertPhoneNumbersInput,
  partyFound: boolean,
  invalidPhoneNumberCount: number
): UpsertFilemakerPartyPhoneNumbersResult => ({
  database,
  partyFound,
  createdPhoneNumberCount: 0,
  linkedPhoneNumberCount: 0,
  existingPhoneNumberCount: 0,
  invalidPhoneNumberCount,
  appliedPhoneNumbers: [],
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

const normalizePhoneValues = (input: UpsertPhoneNumbersInput): NormalizedPhoneValues => {
  const unique = new Set<string>();
  const values: string[] = [];
  let invalidCount = 0;

  input.phoneNumbers.forEach((value: string): void => {
    const validation = validateFilemakerPhoneNumber(value, {
      validationRules: input.validationRules,
    });
    if (!validation.isValid) {
      invalidCount += 1;
      return;
    }
    if (unique.has(validation.normalizedPhoneNumber)) return;
    unique.add(validation.normalizedPhoneNumber);
    values.push(validation.normalizedPhoneNumber);
  });

  return { values, invalidCount };
};

const buildPhoneNumberIndex = (database: FilemakerDatabase): PhoneNumberIndex => {
  const idByValue = new Map<string, string>();
  database.phoneNumbers.forEach((phoneNumber: FilemakerPhoneNumber): void => {
    idByValue.set(phoneNumber.phoneNumber, phoneNumber.id);
  });
  return {
    idByValue,
    usedIds: new Set(
      database.phoneNumbers.map((phoneNumber: FilemakerPhoneNumber): string => phoneNumber.id)
    ),
  };
};

const buildPhoneNumberBaseId = (phoneNumberValue: string): string => {
  const token = toIdToken(phoneNumberValue);
  return `filemaker-phone-number-${token.length > 0 ? token : 'entry'}`;
};

const createMissingPhoneNumbers = (
  database: FilemakerDatabase,
  values: string[]
): PhoneCreationResult => {
  const { idByValue, usedIds } = buildPhoneNumberIndex(database);
  const nextPhoneNumbers = [...database.phoneNumbers];
  let createdCount = 0;
  let existingCount = 0;

  values.forEach((phoneNumberValue: string): void => {
    const existingId = idByValue.get(phoneNumberValue);
    if (existingId !== undefined) {
      existingCount += 1;
      return;
    }

    const baseId = buildPhoneNumberBaseId(phoneNumberValue);
    const id = ensureUniqueId(baseId, usedIds, baseId);
    usedIds.add(id);
    idByValue.set(phoneNumberValue, id);
    nextPhoneNumbers.push(createFilemakerPhoneNumber({ id, phoneNumber: phoneNumberValue }));
    createdCount += 1;
  });

  const nextDatabase =
    createdCount > 0 ? normalizeFilemakerDatabase({ ...database, phoneNumbers: nextPhoneNumbers }) : database;

  return { database: nextDatabase, idByValue, createdCount, existingCount };
};

const linkPhoneNumbersToParty = (
  database: FilemakerDatabase,
  values: string[],
  idByValue: Map<string, string>,
  input: Pick<UpsertPhoneNumbersInput, 'partyKind'> & { partyId: string }
): { database: FilemakerDatabase; linkedCount: number } => {
  let nextDatabase = database;
  let linkedCount = 0;

  values.forEach((phoneNumberValue: string): void => {
    const phoneNumberId = idByValue.get(phoneNumberValue);
    if (phoneNumberId === undefined) return;

    const result = linkFilemakerPhoneNumberToParty(nextDatabase, {
      phoneNumberId,
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

export const upsertFilemakerPhoneNumbersForParty = (
  database: FilemakerDatabase,
  input: UpsertPhoneNumbersInput
): UpsertFilemakerPartyPhoneNumbersResult => {
  const normalizedDatabase = normalizeFilemakerDatabase(database);
  const normalizedPartyId = normalizeString(input.partyId);
  if (normalizedPartyId.length === 0) {
    return createEmptyPhoneUpsertResult(normalizedDatabase, input, false, input.phoneNumbers.length);
  }

  if (!hasFilemakerParty(normalizedDatabase, input.partyKind, normalizedPartyId)) {
    return createEmptyPhoneUpsertResult(normalizedDatabase, input, false, input.phoneNumbers.length);
  }

  const normalizedValues = normalizePhoneValues(input);
  if (normalizedValues.values.length === 0) {
    return createEmptyPhoneUpsertResult(normalizedDatabase, input, true, normalizedValues.invalidCount);
  }

  const creation = createMissingPhoneNumbers(normalizedDatabase, normalizedValues.values);
  const linked = linkPhoneNumbersToParty(creation.database, normalizedValues.values, creation.idByValue, {
    partyKind: input.partyKind,
    partyId: normalizedPartyId,
  });

  return {
    database: linked.database,
    partyFound: true,
    createdPhoneNumberCount: creation.createdCount,
    linkedPhoneNumberCount: linked.linkedCount,
    existingPhoneNumberCount: creation.existingCount,
    invalidPhoneNumberCount: normalizedValues.invalidCount,
    appliedPhoneNumbers: normalizedValues.values,
  };
};
