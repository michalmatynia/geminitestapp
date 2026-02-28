import { parseJsonSetting } from '@/shared/utils/settings-json';

import type {
  FilemakerAddress,
  FilemakerAddressLink,
  FilemakerAddressOwnerKind,
  FilemakerDatabase,
  FilemakerEmail,
  FilemakerEmailLink,
  FilemakerEmailStatus,
  FilemakerEntityKind,
  FilemakerEvent,
  FilemakerEventOrganizationLink,
  FilemakerOrganization,
  FilemakerPartyKind,
  FilemakerPartyOption,
  FilemakerPartyReference,
  FilemakerPhoneNumber,
  FilemakerPhoneNumberLink,
  FilemakerPerson,
} from './types';

import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_REFERENCE_NONE,
  FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY,
  FILEMAKER_EMAIL_PARSER_RULE_PREFIX,
  FILEMAKER_PHONE_VALIDATION_RULE_PREFIX,
} from './settings-constants';

import { ensureUniqueId, normalizeString, toIdToken } from './filemaker-settings.helpers';

import {
  type FilemakerEmailParserRule,
  type FilemakerEmailExtractionResult,
  type FilemakerPhoneValidationRule,
  type FilemakerPhoneValidationResult,
} from './filemaker-settings.extraction';

import {
  createFilemakerAddress,
  createFilemakerAddressLink,
  createFilemakerEmail,
  createFilemakerEmailLink,
  createFilemakerEvent,
  createFilemakerEventOrganizationLink,
  createFilemakerOrganization,
  createFilemakerPerson,
  createFilemakerPhoneNumber,
  createFilemakerPhoneNumberLink,
  formatFilemakerAddress,
} from './filemaker-settings.entities';

import {
  normalizeFilemakerDatabase,
  createDefaultFilemakerDatabase,
} from './filemaker-settings.database';

import {
  extractFilemakerEmailsFromText,
  parseFilemakerEmailParserRulesFromPromptSettings,
  validateFilemakerPhoneNumber,
} from './filemaker-settings.validation';

import {
  linkFilemakerAddressToOwner,
  linkFilemakerEmailToParty,
  linkFilemakerEventToOrganization,
  linkFilemakerPhoneNumberToParty,
  setFilemakerDefaultAddressForOwner,
  unlinkFilemakerAddressFromOwner,
  unlinkFilemakerEmailFromParty,
  unlinkFilemakerEventFromOrganization,
  unlinkFilemakerPhoneNumberFromParty,
} from './filemaker-settings.links';

export {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_REFERENCE_NONE,
  FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY,
  FILEMAKER_EMAIL_PARSER_RULE_PREFIX,
  FILEMAKER_PHONE_VALIDATION_RULE_PREFIX,
};

export type {
  FilemakerEmailParserRule,
  FilemakerEmailExtractionResult,
  FilemakerPhoneValidationRule,
  FilemakerPhoneValidationResult,
};

export type UpsertFilemakerPartyEmailsResult = {
  database: FilemakerDatabase;
  partyFound: boolean;
  createdEmailCount: number;
  linkedEmailCount: number;
  existingEmailCount: number;
  invalidEmailCount: number;
  appliedEmails: string[];
};

export type UpsertFilemakerPartyPhoneNumbersResult = {
  database: FilemakerDatabase;
  partyFound: boolean;
  createdPhoneNumberCount: number;
  linkedPhoneNumberCount: number;
  existingPhoneNumberCount: number;
  invalidPhoneNumberCount: number;
  appliedPhoneNumbers: string[];
};

export const parseFilemakerDatabase = (raw: string | null | undefined): FilemakerDatabase => {
  const parsed = parseJsonSetting<FilemakerDatabase | null>(raw, null);
  return normalizeFilemakerDatabase(parsed);
};

export const getFilemakerAddressById = (
  database: FilemakerDatabase,
  addressId: string | null | undefined
): FilemakerAddress | null => {
  const normalizedAddressId = normalizeString(addressId);
  if (!normalizedAddressId) return null;
  return (
    database.addresses.find((address: FilemakerAddress) => address.id === normalizedAddressId) ??
    null
  );
};

export const getFilemakerAddressLinksForOwner = (
  database: FilemakerDatabase,
  ownerKind: FilemakerAddressOwnerKind,
  ownerId: string
): FilemakerAddressLink[] => {
  const normalizedOwnerId = normalizeString(ownerId);
  if (!normalizedOwnerId) return [];
  return database.addressLinks.filter(
    (link: FilemakerAddressLink): boolean =>
      link.ownerKind === ownerKind && link.ownerId === normalizedOwnerId
  );
};

export const getFilemakerAddressesForOwner = (
  database: FilemakerDatabase,
  ownerKind: FilemakerAddressOwnerKind,
  ownerId: string
): FilemakerAddress[] => {
  const links = getFilemakerAddressLinksForOwner(database, ownerKind, ownerId);
  if (links.length === 0) return [];

  const orderedLinks = links
    .slice()
    .sort((left: FilemakerAddressLink, right: FilemakerAddressLink) => {
      if (left.isDefault === right.isDefault) return 0;
      return left.isDefault ? -1 : 1;
    });

  return orderedLinks
    .map((link: FilemakerAddressLink): FilemakerAddress | null =>
      getFilemakerAddressById(database, link.addressId)
    )
    .filter((address: FilemakerAddress | null): address is FilemakerAddress => Boolean(address));
};

export const getFilemakerDefaultAddressForOwner = (
  database: FilemakerDatabase,
  ownerKind: FilemakerAddressOwnerKind,
  ownerId: string
): FilemakerAddress | null => {
  const links = getFilemakerAddressLinksForOwner(database, ownerKind, ownerId);
  if (links.length === 0) return null;
  const defaultLink =
    links.find((link: FilemakerAddressLink): boolean => link.isDefault) ?? links[0];
  if (!defaultLink) return null;
  return getFilemakerAddressById(database, defaultLink.addressId);
};

export const getFilemakerPhoneNumberById = (
  database: FilemakerDatabase,
  phoneNumberId: string | null | undefined
): FilemakerPhoneNumber | null => {
  const normalizedPhoneNumberId = normalizeString(phoneNumberId);
  if (!normalizedPhoneNumberId) return null;
  return (
    database.phoneNumbers.find(
      (phoneNumber: FilemakerPhoneNumber): boolean => phoneNumber.id === normalizedPhoneNumberId
    ) ?? null
  );
};

export const getFilemakerPhoneNumberLinksForParty = (
  database: FilemakerDatabase,
  partyKind: FilemakerPartyKind,
  partyId: string
): FilemakerPhoneNumberLink[] => {
  const normalizedPartyId = normalizeString(partyId);
  if (!normalizedPartyId) return [];
  return database.phoneNumberLinks.filter(
    (link: FilemakerPhoneNumberLink): boolean =>
      link.partyKind === partyKind && link.partyId === normalizedPartyId
  );
};

export const getFilemakerPhoneNumbersForParty = (
  database: FilemakerDatabase,
  partyKind: FilemakerPartyKind,
  partyId: string
): FilemakerPhoneNumber[] => {
  const phoneNumberIds = new Set(
    getFilemakerPhoneNumberLinksForParty(database, partyKind, partyId).map(
      (link: FilemakerPhoneNumberLink): string => link.phoneNumberId
    )
  );
  if (phoneNumberIds.size === 0) return [];
  return database.phoneNumbers.filter((phoneNumber: FilemakerPhoneNumber): boolean =>
    phoneNumberIds.has(phoneNumber.id)
  );
};

export const getFilemakerPartiesForPhoneNumber = (
  database: FilemakerDatabase,
  phoneNumberId: string
): { persons: FilemakerPerson[]; organizations: FilemakerOrganization[] } => {
  const normalizedPhoneNumberId = normalizeString(phoneNumberId);
  if (!normalizedPhoneNumberId) {
    return { persons: [], organizations: [] };
  }

  const personIds = new Set<string>();
  const organizationIds = new Set<string>();
  database.phoneNumberLinks.forEach((link: FilemakerPhoneNumberLink): void => {
    if (link.phoneNumberId !== normalizedPhoneNumberId) return;
    if (link.partyKind === 'person') {
      personIds.add(link.partyId);
      return;
    }
    organizationIds.add(link.partyId);
  });

  return {
    persons: database.persons.filter((person: FilemakerPerson): boolean =>
      personIds.has(person.id)
    ),
    organizations: database.organizations.filter((organization: FilemakerOrganization): boolean =>
      organizationIds.has(organization.id)
    ),
  };
};

export const upsertFilemakerPhoneNumbersForParty = (
  database: FilemakerDatabase,
  input: {
    partyKind: FilemakerPartyKind;
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

export const removeFilemakerPhoneNumber = (
  database: FilemakerDatabase,
  phoneNumberId: string
): FilemakerDatabase => {
  const normalizedPhoneNumberId = normalizeString(phoneNumberId);
  if (!normalizedPhoneNumberId) return database;

  const nextPhoneNumbers = database.phoneNumbers.filter(
    (phoneNumber: FilemakerPhoneNumber): boolean => phoneNumber.id !== normalizedPhoneNumberId
  );
  const nextLinks = database.phoneNumberLinks.filter(
    (link: FilemakerPhoneNumberLink): boolean => link.phoneNumberId !== normalizedPhoneNumberId
  );

  if (
    nextPhoneNumbers.length === database.phoneNumbers.length &&
    nextLinks.length === database.phoneNumberLinks.length
  ) {
    return database;
  }

  return normalizeFilemakerDatabase({
    ...database,
    phoneNumbers: nextPhoneNumbers,
    phoneNumberLinks: nextLinks,
  });
};

export const removeFilemakerPartyPhoneNumberLinks = (
  database: FilemakerDatabase,
  partyKind: FilemakerPartyKind,
  partyId: string
): FilemakerDatabase => {
  const normalizedPartyId = normalizeString(partyId);
  if (!normalizedPartyId) return database;

  const nextLinks = database.phoneNumberLinks.filter(
    (link: FilemakerPhoneNumberLink): boolean =>
      !(link.partyKind === partyKind && link.partyId === normalizedPartyId)
  );
  if (nextLinks.length === database.phoneNumberLinks.length) return database;

  return normalizeFilemakerDatabase({
    ...database,
    phoneNumberLinks: nextLinks,
  });
};

export const getFilemakerEmailById = (
  database: FilemakerDatabase,
  emailId: string | null | undefined
): FilemakerEmail | null => {
  const normalizedEmailId = normalizeString(emailId);
  if (!normalizedEmailId) return null;
  return database.emails.find((email: FilemakerEmail) => email.id === normalizedEmailId) ?? null;
};

export const getFilemakerEmailLinksForParty = (
  database: FilemakerDatabase,
  partyKind: FilemakerPartyKind,
  partyId: string
): FilemakerEmailLink[] => {
  const normalizedPartyId = normalizeString(partyId);
  if (!normalizedPartyId) return [];
  return database.emailLinks.filter(
    (link: FilemakerEmailLink): boolean =>
      link.partyKind === partyKind && link.partyId === normalizedPartyId
  );
};

export const getFilemakerEmailsForParty = (
  database: FilemakerDatabase,
  partyKind: FilemakerPartyKind,
  partyId: string
): FilemakerEmail[] => {
  const emailIds = new Set(
    getFilemakerEmailLinksForParty(database, partyKind, partyId).map(
      (link: FilemakerEmailLink): string => link.emailId
    )
  );
  if (emailIds.size === 0) return [];
  return database.emails.filter((email: FilemakerEmail): boolean => emailIds.has(email.id));
};

export const getFilemakerPartiesForEmail = (
  database: FilemakerDatabase,
  emailId: string
): { persons: FilemakerPerson[]; organizations: FilemakerOrganization[] } => {
  const normalizedEmailId = normalizeString(emailId);
  if (!normalizedEmailId) {
    return { persons: [], organizations: [] };
  }

  const personIds = new Set<string>();
  const organizationIds = new Set<string>();
  database.emailLinks.forEach((link: FilemakerEmailLink): void => {
    if (link.emailId !== normalizedEmailId) return;
    if (link.partyKind === 'person') {
      personIds.add(link.partyId);
      return;
    }
    organizationIds.add(link.partyId);
  });

  return {
    persons: database.persons.filter((person: FilemakerPerson): boolean =>
      personIds.has(person.id)
    ),
    organizations: database.organizations.filter((organization: FilemakerOrganization): boolean =>
      organizationIds.has(organization.id)
    ),
  };
};

export const getFilemakerOrganizationsForEvent = (
  database: FilemakerDatabase,
  eventId: string
): FilemakerOrganization[] => {
  const normalizedEventId = normalizeString(eventId);
  if (!normalizedEventId) return [];
  const organizationIds = new Set<string>();
  database.eventOrganizationLinks.forEach((link: FilemakerEventOrganizationLink): void => {
    if (link.eventId !== normalizedEventId) return;
    organizationIds.add(link.organizationId);
  });
  if (organizationIds.size === 0) return [];
  return database.organizations.filter((organization: FilemakerOrganization): boolean =>
    organizationIds.has(organization.id)
  );
};

export const getFilemakerEventsForOrganization = (
  database: FilemakerDatabase,
  organizationId: string
): FilemakerEvent[] => {
  const normalizedOrganizationId = normalizeString(organizationId);
  if (!normalizedOrganizationId) return [];
  const eventIds = new Set<string>();
  database.eventOrganizationLinks.forEach((link: FilemakerEventOrganizationLink): void => {
    if (link.organizationId !== normalizedOrganizationId) return;
    eventIds.add(link.eventId);
  });
  if (eventIds.size === 0) return [];
  return database.events.filter((event: FilemakerEvent): boolean => eventIds.has(event.id));
};

export const upsertFilemakerEmailsForParty = (
  database: FilemakerDatabase,
  input: {
    partyKind: FilemakerPartyKind;
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

export const removeFilemakerEmail = (
  database: FilemakerDatabase,
  emailId: string
): FilemakerDatabase => {
  const normalizedEmailId = normalizeString(emailId);
  if (!normalizedEmailId) return database;

  const nextEmails = database.emails.filter(
    (email: FilemakerEmail): boolean => email.id !== normalizedEmailId
  );
  const nextLinks = database.emailLinks.filter(
    (link: FilemakerEmailLink): boolean => link.emailId !== normalizedEmailId
  );

  if (
    nextEmails.length === database.emails.length &&
    nextLinks.length === database.emailLinks.length
  ) {
    return database;
  }

  return normalizeFilemakerDatabase({
    ...database,
    emails: nextEmails,
    emailLinks: nextLinks,
  });
};

export const removeFilemakerPartyEmailLinks = (
  database: FilemakerDatabase,
  partyKind: FilemakerPartyKind,
  partyId: string
): FilemakerDatabase => {
  const normalizedPartyId = normalizeString(partyId);
  if (!normalizedPartyId) return database;

  const nextLinks = database.emailLinks.filter(
    (link: FilemakerEmailLink): boolean =>
      !(link.partyKind === partyKind && link.partyId === normalizedPartyId)
  );
  if (nextLinks.length === database.emailLinks.length) return database;

  return normalizeFilemakerDatabase({
    ...database,
    emailLinks: nextLinks,
  });
};

export const removeFilemakerEvent = (
  database: FilemakerDatabase,
  eventId: string
): FilemakerDatabase => {
  const normalizedEventId = normalizeString(eventId);
  if (!normalizedEventId) return database;

  const nextEvents = database.events.filter(
    (event: FilemakerEvent): boolean => event.id !== normalizedEventId
  );
  const nextLinks = database.eventOrganizationLinks.filter(
    (link: FilemakerEventOrganizationLink): boolean => link.eventId !== normalizedEventId
  );

  if (
    nextEvents.length === database.events.length &&
    nextLinks.length === database.eventOrganizationLinks.length
  ) {
    return database;
  }

  return normalizeFilemakerDatabase({
    ...database,
    events: nextEvents,
    eventOrganizationLinks: nextLinks,
  });
};

export const removeFilemakerOrganizationEventLinks = (
  database: FilemakerDatabase,
  organizationId: string
): FilemakerDatabase => {
  const normalizedOrganizationId = normalizeString(organizationId);
  if (!normalizedOrganizationId) return database;

  const nextLinks = database.eventOrganizationLinks.filter(
    (link: FilemakerEventOrganizationLink): boolean =>
      link.organizationId !== normalizedOrganizationId
  );
  if (nextLinks.length === database.eventOrganizationLinks.length) return database;

  return normalizeFilemakerDatabase({
    ...database,
    eventOrganizationLinks: nextLinks,
  });
};

const sanitizeReference = (value: unknown): FilemakerPartyReference | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const kind = normalizeString(record['kind']) as FilemakerEntityKind;
  if (kind !== 'person' && kind !== 'organization') return null;
  const id = normalizeString(record['id']);
  if (!id) return null;
  return { kind, id };
};

export const encodeFilemakerPartyReference = (
  value: FilemakerPartyReference | null | undefined
): string => {
  const sanitized = sanitizeReference(value);
  if (!sanitized) return FILEMAKER_REFERENCE_NONE;
  return `${sanitized.kind}:${sanitized.id}`;
};

export const decodeFilemakerPartyReference = (
  value: string,
  database?: FilemakerDatabase | null
): FilemakerPartyReference | null => {
  const normalized = normalizeString(value);
  if (!normalized || normalized === FILEMAKER_REFERENCE_NONE) return null;
  const [kindRaw, idRaw] = normalized.split(':', 2);
  const kind = normalizeString(kindRaw) as FilemakerEntityKind;
  const id = normalizeString(idRaw);
  if (!id) return null;
  if (kind !== 'person' && kind !== 'organization') return null;

  let name = '';
  if (database) {
    if (kind === 'person') {
      const person = database.persons.find((p) => p.id === id);
      name = person ? `${person.firstName} ${person.lastName}`.trim() : '';
    } else {
      const org = database.organizations.find((o) => o.id === id);
      name = org?.name || '';
    }
  }

  return { kind, id, name: name || id };
};

export const resolveFilemakerPartyLabel = (
  database: FilemakerDatabase,
  reference: FilemakerPartyReference | null | undefined
): string | null => {
  const sanitized = sanitizeReference(reference);
  if (!sanitized) return null;

  if (sanitized.kind === 'person') {
    const person = database.persons.find((entry: FilemakerPerson) => entry.id === sanitized.id);
    if (!person) return null;
    const name = `${person.firstName} ${person.lastName}`.trim();
    return name || person.id;
  }

  const organization = database.organizations.find(
    (entry: FilemakerOrganization) => entry.id === sanitized.id
  );
  if (!organization) return null;
  return organization.name || organization.id;
};

export const buildFilemakerPartyOptions = (database: FilemakerDatabase): FilemakerPartyOption[] => {
  const personOptions = database.persons.map((person: FilemakerPerson) => {
    const label = `${person.firstName} ${person.lastName}`.trim() || person.id;
    const address = formatFilemakerAddress(person);
    const detail: string[] = [];
    if (person.nip) detail.push(`NIP: ${person.nip}`);
    if (person.regon) detail.push(`REGON: ${person.regon}`);
    return {
      value: `person:${person.id}`,
      label,
      kind: 'person' as const,
      description: detail.join(' | ') || address,
    };
  });

  const organizationOptions = database.organizations.map((organization: FilemakerOrganization) => ({
    value: `organization:${organization.id}`,
    label: organization.name || organization.id,
    kind: 'organization' as const,
    description: formatFilemakerAddress(organization),
  }));

  return [
    { value: FILEMAKER_REFERENCE_NONE, label: 'None' },
    ...personOptions,
    ...organizationOptions,
  ];
};

export {
  linkFilemakerAddressToOwner,
  linkFilemakerEmailToParty,
  linkFilemakerEventToOrganization,
  linkFilemakerPhoneNumberToParty,
  setFilemakerDefaultAddressForOwner,
  unlinkFilemakerAddressFromOwner,
  unlinkFilemakerEmailFromParty,
  unlinkFilemakerEventFromOrganization,
  unlinkFilemakerPhoneNumberFromParty,
  normalizeFilemakerDatabase,
  createDefaultFilemakerDatabase,
  createFilemakerAddress,
  createFilemakerAddressLink,
  createFilemakerEmail,
  createFilemakerEmailLink,
  createFilemakerEvent,
  createFilemakerEventOrganizationLink,
  createFilemakerOrganization,
  createFilemakerPerson,
  createFilemakerPhoneNumber,
  createFilemakerPhoneNumberLink,
  formatFilemakerAddress,
  extractFilemakerEmailsFromText,
  parseFilemakerEmailParserRulesFromPromptSettings,
  validateFilemakerPhoneNumber,
};
