import { normalizeFilemakerDatabase } from './filemaker-settings.database';
import { createFilemakerEventOrganizationLink } from './filemaker-settings.entities';
import { ensureUniqueId, normalizeString, toIdToken } from './filemaker-settings.helpers';
import type {
  FilemakerDatabase,
  FilemakerEvent,
  FilemakerEventOrganizationLink,
  FilemakerOrganization,
} from './types';

const linkIdToken = (value: string): string => {
  const token = toIdToken(value);
  return token.length > 0 ? token : 'entry';
};

const defaultEventOrganizationLinkIdForValues = (
  eventId: string,
  organizationId: string
): string =>
  `filemaker-event-organization-link-${linkIdToken(`${eventId}-${organizationId}`)}`;

const createEventOrganizationLinkId = (
  database: FilemakerDatabase,
  eventId: string,
  organizationId: string
): string => {
  const usedIds = new Set<string>(
    database.eventOrganizationLinks.map(
      (link: FilemakerEventOrganizationLink): string => link.id
    )
  );
  const baseId = defaultEventOrganizationLinkIdForValues(eventId, organizationId);
  return ensureUniqueId(baseId, usedIds, baseId);
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
  if (eventId.length === 0 || organizationId.length === 0) {
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
  if (alreadyLinked) return { database, created: false };

  return {
    database: normalizeFilemakerDatabase({
      ...database,
      eventOrganizationLinks: [
        ...database.eventOrganizationLinks,
        createFilemakerEventOrganizationLink({
          id: createEventOrganizationLinkId(database, eventId, organizationId),
          eventId,
          organizationId,
        }),
      ],
    }),
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
  if (eventId.length === 0 || organizationId.length === 0) return database;

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
