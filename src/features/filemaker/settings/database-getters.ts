import { validationError } from '@/shared/errors/app-error';
import { 
  FilemakerDatabase, 
  FilemakerAddress, 
  FilemakerAddressOwnerKind, 
  FilemakerAddressLink,
  FilemakerPhoneNumber,
  FilemakerPhoneNumberLink,
  FilemakerEmail,
  FilemakerEmailLink,
  FilemakerEvent,
  FilemakerEventOrganizationLink,
  FilemakerOrganization,
  FilemakerPerson
} from '../types';
import { normalizeString } from '../filemaker-settings.helpers';
import { normalizeFilemakerDatabase } from '../filemaker-settings.database';

const parseFilemakerDatabasePayload = (raw: string | null | undefined): FilemakerDatabase | null => {
  if (typeof raw !== 'string') return null;
  const trimmedRaw = raw.trim();
  if (!trimmedRaw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmedRaw);
  } catch {
    throw validationError('Invalid Filemaker database JSON payload.', {
      reason: 'invalid_json',
    });
  }

  if (parsed === null) return null;
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw validationError('Invalid Filemaker database payload.', {
      reason: 'invalid_root_type',
    });
  }

  return parsed as FilemakerDatabase;
};

export const parseFilemakerDatabase = (raw: string | null | undefined): FilemakerDatabase => {
  const parsed = parseFilemakerDatabasePayload(raw);
  return normalizeFilemakerDatabase(parsed, {
    rejectLegacyInlinePayloads: true,
  });
};

export const parseFilemakerDatabaseForCaseResolver = (
  raw: string | null | undefined
): FilemakerDatabase => {
  const parsed = parseFilemakerDatabasePayload(raw);
  return normalizeFilemakerDatabase(parsed, {
    rejectLegacyInlinePayloads: true,
    stripCompatibilityFields: true,
  });
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
  partyKind: 'person' | 'organization',
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
  partyKind: 'person' | 'organization',
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
  partyKind: 'person' | 'organization',
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
  partyKind: 'person' | 'organization',
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
