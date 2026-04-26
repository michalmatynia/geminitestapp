/* eslint-disable complexity, max-lines-per-function */
import 'server-only';

import type { Collection, Document } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { createFilemakerEvent } from '../filemaker-settings.entities';
import type { FilemakerEvent } from '../types';

export const FILEMAKER_EVENTS_COLLECTION = 'filemaker_events';
export const FILEMAKER_EVENT_ORGANIZATION_LINKS_COLLECTION =
  'filemaker_event_organization_links';

export type MongoFilemakerEventOrganizationLink = {
  id: string;
  legacyOrganizationUuid: string;
  organizationId?: string;
  organizationName?: string;
};

export type MongoFilemakerEvent = FilemakerEvent & {
  checked1?: boolean;
  checked2?: boolean;
  cooperationStatus?: string;
  currentDay?: string;
  currentWeekNumber?: number;
  discontinued?: boolean;
  displayAddressId?: string | null;
  eventStartDate?: string;
  lastEventInstanceDate?: string;
  legacyDefaultAddressUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyHowOftenUuid?: string;
  legacyLastEventInstanceUuid?: string;
  legacyParentUuid?: string;
  legacyUuid?: string;
  lengthDay?: number;
  linkedOrganizations: MongoFilemakerEventOrganizationLink[];
  moveDay?: number;
  organizationFilter?: string;
  organizationFilterCount?: number;
  organizationLinkCount: number;
  registrationMonth?: string;
  unresolvedOrganizationLinkCount: number;
  updatedBy?: string;
  websiteFilter?: string;
  websiteFilterCount?: number;
};

export type FilemakerEventMongoDocument = Document & {
  _id: string;
  addressId?: string;
  checked1?: boolean;
  checked2?: boolean;
  city?: string;
  cooperationStatus?: string;
  country?: string;
  countryId?: string;
  createdAt?: string;
  currentDay?: string;
  currentWeekNumber?: number;
  discontinued?: boolean;
  displayAddressId?: string | null;
  eventName: string;
  eventStartDate?: string;
  id: string;
  lastEventInstanceDate?: string;
  legacyDefaultAddressUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyHowOftenUuid?: string;
  legacyLastEventInstanceUuid?: string;
  legacyParentUuid?: string;
  legacyUuid?: string;
  lengthDay?: number;
  moveDay?: number;
  organizationFilter?: string;
  organizationFilterCount?: number;
  postalCode?: string;
  registrationMonth?: string;
  street?: string;
  streetNumber?: string;
  updatedAt?: string;
  updatedBy?: string;
  websiteFilter?: string;
  websiteFilterCount?: number;
};

export type FilemakerEventOrganizationLinkMongoDocument = Document & {
  _id: string;
  eventId: string;
  eventName?: string;
  id: string;
  legacyEventUuid: string;
  legacyOrganizationUuid: string;
  legacyUuid?: string;
  organizationId?: string;
  organizationName?: string;
};

type EventWithLinksDocument = FilemakerEventMongoDocument & {
  organizationLinks?: FilemakerEventOrganizationLinkMongoDocument[];
};

const optionalMetadataString = (value: string | undefined): string | undefined => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : undefined;
};

export const getFilemakerEventsCollection = async (): Promise<
  Collection<FilemakerEventMongoDocument>
> => {
  const db = await getMongoDb();
  return db.collection<FilemakerEventMongoDocument>(FILEMAKER_EVENTS_COLLECTION);
};

const toOrganizationLink = (
  link: FilemakerEventOrganizationLinkMongoDocument
): MongoFilemakerEventOrganizationLink => ({
  id: link.id,
  legacyOrganizationUuid: link.legacyOrganizationUuid,
  ...(optionalMetadataString(link.organizationId) !== undefined
    ? { organizationId: optionalMetadataString(link.organizationId) }
    : {}),
  ...(optionalMetadataString(link.organizationName) !== undefined
    ? { organizationName: optionalMetadataString(link.organizationName) }
    : {}),
});

export function toMongoFilemakerEvent(document: EventWithLinksDocument): MongoFilemakerEvent {
  const organizationLinks = document.organizationLinks ?? [];
  return {
    ...createFilemakerEvent({
      id: document.id,
      eventName: document.eventName,
      addressId: document.addressId,
      street: document.street,
      streetNumber: document.streetNumber,
      city: document.city,
      postalCode: document.postalCode,
      country: document.country,
      countryId: document.countryId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    }),
    ...(document.checked1 !== undefined ? { checked1: document.checked1 } : {}),
    ...(document.checked2 !== undefined ? { checked2: document.checked2 } : {}),
    ...(optionalMetadataString(document.cooperationStatus) !== undefined
      ? { cooperationStatus: optionalMetadataString(document.cooperationStatus) }
      : {}),
    ...(optionalMetadataString(document.currentDay) !== undefined
      ? { currentDay: optionalMetadataString(document.currentDay) }
      : {}),
    ...(document.currentWeekNumber !== undefined
      ? { currentWeekNumber: document.currentWeekNumber }
      : {}),
    ...(document.discontinued !== undefined ? { discontinued: document.discontinued } : {}),
    ...(optionalMetadataString(document.displayAddressId ?? undefined) !== undefined
      ? { displayAddressId: optionalMetadataString(document.displayAddressId ?? undefined) }
      : {}),
    ...(optionalMetadataString(document.eventStartDate) !== undefined
      ? { eventStartDate: optionalMetadataString(document.eventStartDate) }
      : {}),
    ...(optionalMetadataString(document.lastEventInstanceDate) !== undefined
      ? { lastEventInstanceDate: optionalMetadataString(document.lastEventInstanceDate) }
      : {}),
    ...(optionalMetadataString(document.legacyDefaultAddressUuid) !== undefined
      ? { legacyDefaultAddressUuid: optionalMetadataString(document.legacyDefaultAddressUuid) }
      : {}),
    ...(optionalMetadataString(document.legacyDisplayAddressUuid) !== undefined
      ? { legacyDisplayAddressUuid: optionalMetadataString(document.legacyDisplayAddressUuid) }
      : {}),
    ...(optionalMetadataString(document.legacyHowOftenUuid) !== undefined
      ? { legacyHowOftenUuid: optionalMetadataString(document.legacyHowOftenUuid) }
      : {}),
    ...(optionalMetadataString(document.legacyLastEventInstanceUuid) !== undefined
      ? { legacyLastEventInstanceUuid: optionalMetadataString(document.legacyLastEventInstanceUuid) }
      : {}),
    ...(optionalMetadataString(document.legacyParentUuid) !== undefined
      ? { legacyParentUuid: optionalMetadataString(document.legacyParentUuid) }
      : {}),
    ...(optionalMetadataString(document.legacyUuid) !== undefined
      ? { legacyUuid: optionalMetadataString(document.legacyUuid) }
      : {}),
    ...(document.lengthDay !== undefined ? { lengthDay: document.lengthDay } : {}),
    linkedOrganizations: organizationLinks.map(toOrganizationLink),
    ...(document.moveDay !== undefined ? { moveDay: document.moveDay } : {}),
    ...(optionalMetadataString(document.organizationFilter) !== undefined
      ? { organizationFilter: optionalMetadataString(document.organizationFilter) }
      : {}),
    ...(document.organizationFilterCount !== undefined
      ? { organizationFilterCount: document.organizationFilterCount }
      : {}),
    organizationLinkCount: organizationLinks.length,
    ...(optionalMetadataString(document.registrationMonth) !== undefined
      ? { registrationMonth: optionalMetadataString(document.registrationMonth) }
      : {}),
    unresolvedOrganizationLinkCount: organizationLinks.filter(
      (link: FilemakerEventOrganizationLinkMongoDocument): boolean =>
        optionalMetadataString(link.organizationId) === undefined
    ).length,
    ...(optionalMetadataString(document.updatedBy) !== undefined
      ? { updatedBy: optionalMetadataString(document.updatedBy) }
      : {}),
    ...(optionalMetadataString(document.websiteFilter) !== undefined
      ? { websiteFilter: optionalMetadataString(document.websiteFilter) }
      : {}),
    ...(document.websiteFilterCount !== undefined
      ? { websiteFilterCount: document.websiteFilterCount }
      : {}),
  };
}
