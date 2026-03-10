import { normalizeFilemakerDatabase } from './filemaker-settings.database';
import {
  createFilemakerAddressLink,
  createFilemakerEmailLink,
  createFilemakerEventOrganizationLink,
  createFilemakerPhoneNumberLink,
} from './filemaker-settings.entities';
import { ensureUniqueId, normalizeString, toIdToken } from './filemaker-settings.helpers';
import {
  type FilemakerDatabase,
  type FilemakerAddressOwnerKind,
  type FilemakerAddressLink,
  type FilemakerAddress,
  type FilemakerPhoneNumber,
  type FilemakerPartyKind,
  type FilemakerPhoneNumberLink,
  type FilemakerPerson,
  type FilemakerOrganization,
  type FilemakerEmailLink,
  type FilemakerEmail,
  type FilemakerEvent,
  type FilemakerEventOrganizationLink,
} from './types';

const defaultAddressLinkIdForValues = (
  ownerKind: FilemakerAddressOwnerKind,
  ownerId: string,
  addressId: string
): string => {
  const joined = `${ownerKind}-${ownerId}-${addressId}`;
  return `filemaker-address-link-${toIdToken(joined) || 'entry'}`;
};

const defaultPhoneNumberLinkIdForValues = (
  phoneNumberId: string,
  partyKind: FilemakerPartyKind,
  partyId: string
): string => {
  const joined = `${phoneNumberId}-${partyKind}-${partyId}`;
  return `filemaker-phone-number-link-${toIdToken(joined) || 'entry'}`;
};

const defaultEmailLinkIdForValues = (
  emailId: string,
  partyKind: FilemakerPartyKind,
  partyId: string
): string => {
  const joined = `${emailId}-${partyKind}-${partyId}`;
  return `filemaker-email-link-${toIdToken(joined) || 'entry'}`;
};

const defaultEventOrganizationLinkIdForValues = (
  eventId: string,
  organizationId: string
): string => {
  const joined = `${eventId}-${organizationId}`;
  return `filemaker-event-organization-link-${toIdToken(joined) || 'entry'}`;
};

const isAddressOwnerPresentInDatabase = (
  database: FilemakerDatabase,
  ownerKind: FilemakerAddressOwnerKind,
  ownerId: string
): boolean => {
  if (ownerKind === 'person') {
    return database.persons.some((person): boolean => person.id === ownerId);
  }
  if (ownerKind === 'organization') {
    return database.organizations.some((organization): boolean => organization.id === ownerId);
  }
  return database.events.some((event): boolean => event.id === ownerId);
};

export const setFilemakerDefaultAddressForOwner = (
  database: FilemakerDatabase,
  input: {
    ownerKind: FilemakerAddressOwnerKind;
    ownerId: string;
    addressId: string;
  }
): FilemakerDatabase => {
  const ownerId = normalizeString(input.ownerId);
  const addressId = normalizeString(input.addressId);
  if (!ownerId || !addressId) return database;

  const hasLink = database.addressLinks.some(
    (link: FilemakerAddressLink): boolean =>
      link.ownerKind === input.ownerKind && link.ownerId === ownerId && link.addressId === addressId
  );
  if (!hasLink) return database;

  const nextLinks = database.addressLinks.map(
    (link: FilemakerAddressLink): FilemakerAddressLink => {
      if (link.ownerKind !== input.ownerKind || link.ownerId !== ownerId) return link;
      return {
        ...link,
        isDefault: link.addressId === addressId,
        updatedAt: new Date().toISOString(),
      };
    }
  );

  return normalizeFilemakerDatabase({
    ...database,
    addressLinks: nextLinks,
  });
};

export const linkFilemakerAddressToOwner = (
  database: FilemakerDatabase,
  input: {
    ownerKind: FilemakerAddressOwnerKind;
    ownerId: string;
    addressId: string;
    isDefault?: boolean;
  }
): { database: FilemakerDatabase; created: boolean } => {
  const ownerId = normalizeString(input.ownerId);
  const addressId = normalizeString(input.addressId);
  if (!ownerId || !addressId) {
    return { database, created: false };
  }
  if (!isAddressOwnerPresentInDatabase(database, input.ownerKind, ownerId)) {
    return { database, created: false };
  }
  const hasAddress = database.addresses.some(
    (address: FilemakerAddress): boolean => address.id === addressId
  );
  if (!hasAddress) return { database, created: false };

  const alreadyLinked = database.addressLinks.some(
    (link: FilemakerAddressLink): boolean =>
      link.ownerKind === input.ownerKind && link.ownerId === ownerId && link.addressId === addressId
  );
  if (alreadyLinked) {
    if (!input.isDefault) return { database, created: false };
    return {
      database: setFilemakerDefaultAddressForOwner(database, {
        ownerKind: input.ownerKind,
        ownerId,
        addressId,
      }),
      created: false,
    };
  }

  const usedIds = new Set<string>(
    database.addressLinks.map((link: FilemakerAddressLink): string => link.id)
  );
  const baseId = defaultAddressLinkIdForValues(input.ownerKind, ownerId, addressId);
  const id = ensureUniqueId(baseId, usedIds, baseId);
  const hasExistingOwnerLinks = database.addressLinks.some(
    (link: FilemakerAddressLink): boolean =>
      link.ownerKind === input.ownerKind && link.ownerId === ownerId
  );
  const shouldBeDefault = input.isDefault === true || !hasExistingOwnerLinks;

  let nextDatabase = normalizeFilemakerDatabase({
    ...database,
    addressLinks: [
      ...database.addressLinks,
      createFilemakerAddressLink({
        id,
        ownerKind: input.ownerKind,
        ownerId,
        addressId,
        isDefault: shouldBeDefault,
      }),
    ],
  });

  if (input.isDefault === true) {
    nextDatabase = setFilemakerDefaultAddressForOwner(nextDatabase, {
      ownerKind: input.ownerKind,
      ownerId,
      addressId,
    });
  }

  return {
    database: nextDatabase,
    created: true,
  };
};

export const unlinkFilemakerAddressFromOwner = (
  database: FilemakerDatabase,
  input: {
    ownerKind: FilemakerAddressOwnerKind;
    ownerId: string;
    addressId: string;
  }
): FilemakerDatabase => {
  const ownerId = normalizeString(input.ownerId);
  const addressId = normalizeString(input.addressId);
  if (!ownerId || !addressId) return database;

  const nextLinks = database.addressLinks.filter(
    (link: FilemakerAddressLink): boolean =>
      !(
        link.ownerKind === input.ownerKind &&
        link.ownerId === ownerId &&
        link.addressId === addressId
      )
  );
  if (nextLinks.length === database.addressLinks.length) return database;

  return normalizeFilemakerDatabase({
    ...database,
    addressLinks: nextLinks,
  });
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
  if (!phoneNumberId || !partyId) {
    return { database, created: false };
  }

  const hasPhoneNumber = database.phoneNumbers.some(
    (phoneNumber: FilemakerPhoneNumber): boolean => phoneNumber.id === phoneNumberId
  );
  if (!hasPhoneNumber) return { database, created: false };

  const hasParty =
    input.partyKind === 'person'
      ? database.persons.some((person: FilemakerPerson): boolean => person.id === partyId)
      : database.organizations.some(
        (organization: FilemakerOrganization): boolean => organization.id === partyId
      );
  if (!hasParty) return { database, created: false };

  const alreadyLinked = database.phoneNumberLinks.some(
    (link: FilemakerPhoneNumberLink): boolean =>
      link.phoneNumberId === phoneNumberId &&
      link.partyKind === input.partyKind &&
      link.partyId === partyId
  );
  if (alreadyLinked) {
    return { database, created: false };
  }

  const usedIds = new Set<string>(
    database.phoneNumberLinks.map((link: FilemakerPhoneNumberLink): string => link.id)
  );
  const id = ensureUniqueId(
    defaultPhoneNumberLinkIdForValues(phoneNumberId, input.partyKind, partyId),
    usedIds,
    defaultPhoneNumberLinkIdForValues(phoneNumberId, input.partyKind, partyId)
  );

  const nextDatabase = normalizeFilemakerDatabase({
    ...database,
    phoneNumberLinks: [
      ...database.phoneNumberLinks,
      createFilemakerPhoneNumberLink({
        id,
        phoneNumberId,
        partyKind: input.partyKind,
        partyId,
      }),
    ],
  });

  return {
    database: nextDatabase,
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
  if (!phoneNumberId || !partyId) return database;

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
  if (!emailId || !partyId) {
    return { database, created: false };
  }

  const hasEmail = database.emails.some((email: FilemakerEmail): boolean => email.id === emailId);
  if (!hasEmail) return { database, created: false };

  const hasParty =
    input.partyKind === 'person'
      ? database.persons.some((person: FilemakerPerson): boolean => person.id === partyId)
      : database.organizations.some(
        (organization: FilemakerOrganization): boolean => organization.id === partyId
      );
  if (!hasParty) return { database, created: false };

  const alreadyLinked = database.emailLinks.some(
    (link: FilemakerEmailLink): boolean =>
      link.emailId === emailId && link.partyKind === input.partyKind && link.partyId === partyId
  );
  if (alreadyLinked) {
    return { database, created: false };
  }

  const usedIds = new Set<string>(
    database.emailLinks.map((link: FilemakerEmailLink): string => link.id)
  );
  const id = ensureUniqueId(
    defaultEmailLinkIdForValues(emailId, input.partyKind, partyId),
    usedIds,
    defaultEmailLinkIdForValues(emailId, input.partyKind, partyId)
  );

  const nextDatabase = normalizeFilemakerDatabase({
    ...database,
    emailLinks: [
      ...database.emailLinks,
      createFilemakerEmailLink({
        id,
        emailId,
        partyKind: input.partyKind,
        partyId,
      }),
    ],
  });

  return {
    database: nextDatabase,
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
  if (!emailId || !partyId) return database;

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

export const linkFilemakerEventToOrganization = (
  database: FilemakerDatabase,
  input: {
    eventId: string;
    organizationId: string;
  }
): { database: FilemakerDatabase; created: boolean } => {
  const eventId = normalizeString(input.eventId);
  const organizationId = normalizeString(input.organizationId);
  if (!eventId || !organizationId) {
    return { database, created: false };
  }

  const hasEvent = database.events.some((event: FilemakerEvent): boolean => event.id === eventId);
  if (!hasEvent) return { database, created: false };

  const hasOrganization = database.organizations.some(
    (organization: FilemakerOrganization): boolean => organization.id === organizationId
  );
  if (!hasOrganization) return { database, created: false };

  const alreadyLinked = database.eventOrganizationLinks.some(
    (link: FilemakerEventOrganizationLink): boolean =>
      link.eventId === eventId && link.organizationId === organizationId
  );
  if (alreadyLinked) {
    return { database, created: false };
  }

  const usedIds = new Set<string>(
    database.eventOrganizationLinks.map((link: FilemakerEventOrganizationLink): string => link.id)
  );
  const id = ensureUniqueId(
    defaultEventOrganizationLinkIdForValues(eventId, organizationId),
    usedIds,
    defaultEventOrganizationLinkIdForValues(eventId, organizationId)
  );

  const nextDatabase = normalizeFilemakerDatabase({
    ...database,
    eventOrganizationLinks: [
      ...database.eventOrganizationLinks,
      createFilemakerEventOrganizationLink({
        id,
        eventId,
        organizationId,
      }),
    ],
  });

  return {
    database: nextDatabase,
    created: true,
  };
};

export const unlinkFilemakerEventFromOrganization = (
  database: FilemakerDatabase,
  input: {
    eventId: string;
    organizationId: string;
  }
): FilemakerDatabase => {
  const eventId = normalizeString(input.eventId);
  const organizationId = normalizeString(input.organizationId);
  if (!eventId || !organizationId) return database;

  const nextLinks = database.eventOrganizationLinks.filter(
    (link: FilemakerEventOrganizationLink): boolean =>
      !(link.eventId === eventId && link.organizationId === organizationId)
  );
  if (nextLinks.length === database.eventOrganizationLinks.length) return database;

  return normalizeFilemakerDatabase({
    ...database,
    eventOrganizationLinks: nextLinks,
  });
};
