import { normalizeFilemakerDatabase } from '../filemaker-settings.database';
import { normalizeString } from '../filemaker-settings.helpers';
import {
  type FilemakerDatabase,
  type FilemakerEvent,
  type FilemakerPhoneNumber,
  type FilemakerPerson,
  type FilemakerPhoneNumberLink,
  type FilemakerEmail,
  type FilemakerEmailLink,
  type FilemakerEventOrganizationLink,
} from '../types';

export const removeFilemakerPhoneNumber = (
  database: FilemakerDatabase,
  phoneNumberId: string
): FilemakerDatabase => {
  const normalizedPhoneNumberId = normalizeString(phoneNumberId);
  if (normalizedPhoneNumberId.length === 0) return database;

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

  const nextPersons =
    nextLinks.length === 0
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
    phoneNumbers: nextPhoneNumbers,
    phoneNumberLinks: nextLinks,
  });
};

export const removeFilemakerPartyPhoneNumberLinks = (
  database: FilemakerDatabase,
  partyKind: 'person' | 'organization',
  partyId: string
): FilemakerDatabase => {
  const normalizedPartyId = normalizeString(partyId);
  if (normalizedPartyId.length === 0) return database;

  const nextLinks = database.phoneNumberLinks.filter(
    (link: FilemakerPhoneNumberLink): boolean =>
      !(link.partyKind === partyKind && link.partyId === normalizedPartyId)
  );
  if (nextLinks.length === database.phoneNumberLinks.length) return database;

  const nextPersons =
    nextLinks.length === 0
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
    phoneNumberLinks: nextLinks,
  });
};

export const removeFilemakerEmail = (
  database: FilemakerDatabase,
  emailId: string
): FilemakerDatabase => {
  const normalizedEmailId = normalizeString(emailId);
  if (normalizedEmailId.length === 0) return database;

  const nextEmails = database.emails.filter(
    (email: FilemakerEmail) => email.id !== normalizedEmailId
  );
  const nextLinks = database.emailLinks.filter(
    (link: FilemakerEmailLink) => link.emailId !== normalizedEmailId
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
  partyKind: 'person' | 'organization',
  partyId: string
): FilemakerDatabase => {
  const normalizedPartyId = normalizeString(partyId);
  if (normalizedPartyId.length === 0) return database;

  const nextLinks = database.emailLinks.filter(
    (link: FilemakerEmailLink) =>
      !(link.partyKind === partyKind && link.partyId === normalizedPartyId)
  );
  if (nextLinks.length === database.emailLinks.length) return database;

  return normalizeFilemakerDatabase({
    ...database,
    emailLinks: nextLinks,
  });
};

export const removeFilemakerEventOrganizationLinks = (
  database: FilemakerDatabase,
  eventId: string
): FilemakerDatabase => {
  const normalizedEventId = normalizeString(eventId);
  if (normalizedEventId.length === 0) return database;

  const nextLinks = database.eventOrganizationLinks.filter(
    (link: FilemakerEventOrganizationLink) => link.eventId !== normalizedEventId
  );
  if (nextLinks.length === database.eventOrganizationLinks.length) return database;

  return normalizeFilemakerDatabase({
    ...database,
    eventOrganizationLinks: nextLinks,
  });
};

export const removeFilemakerOrganizationEventLinks = (
  database: FilemakerDatabase,
  organizationId: string
): FilemakerDatabase => {
  const normalizedOrganizationId = normalizeString(organizationId);
  if (normalizedOrganizationId.length === 0) return database;

  const nextLinks = database.eventOrganizationLinks.filter(
    (link: FilemakerEventOrganizationLink) => link.organizationId !== normalizedOrganizationId
  );
  if (nextLinks.length === database.eventOrganizationLinks.length) return database;

  return normalizeFilemakerDatabase({
    ...database,
    eventOrganizationLinks: nextLinks,
  });
};

export const removeFilemakerEvent = (
  database: FilemakerDatabase,
  eventId: string
): FilemakerDatabase => {
  const normalizedEventId = normalizeString(eventId);
  if (normalizedEventId.length === 0) return database;

  const nextEvents = database.events.filter(
    (event: FilemakerEvent): boolean => event.id !== normalizedEventId
  );
  const nextEventOrganizationLinks = database.eventOrganizationLinks.filter(
    (link: FilemakerEventOrganizationLink): boolean => link.eventId !== normalizedEventId
  );
  const nextAddressLinks = database.addressLinks.filter(
    (link): boolean => !(link.ownerKind === 'event' && link.ownerId === normalizedEventId)
  );

  if (
    nextEvents.length === database.events.length &&
    nextEventOrganizationLinks.length === database.eventOrganizationLinks.length &&
    nextAddressLinks.length === database.addressLinks.length
  ) {
    return database;
  }

  return normalizeFilemakerDatabase({
    ...database,
    events: nextEvents,
    eventOrganizationLinks: nextEventOrganizationLinks,
    addressLinks: nextAddressLinks,
  });
};
