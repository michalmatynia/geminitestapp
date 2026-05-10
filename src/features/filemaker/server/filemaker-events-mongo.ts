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

const optionalStringMetadata = (
  key: string,
  value: string | null | undefined
): Record<string, string> => {
  const normalized = optionalMetadataString(value ?? undefined);
  return normalized === undefined ? {} : { [key]: normalized };
};

const optionalNumberMetadata = (
  key: string,
  value: number | undefined
): Record<string, number> => (value === undefined ? {} : { [key]: value });

const optionalBooleanMetadata = (
  key: string,
  value: boolean | undefined
): Record<string, boolean> => (value === undefined ? {} : { [key]: value });

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

const toMongoFilemakerEventBooleans = (
  document: EventWithLinksDocument
): Record<string, boolean> => ({
  ...optionalBooleanMetadata('checked1', document.checked1),
  ...optionalBooleanMetadata('checked2', document.checked2),
  ...optionalBooleanMetadata('discontinued', document.discontinued),
});

const toMongoFilemakerEventNumbers = (
  document: EventWithLinksDocument
): Record<string, number> => ({
  ...optionalNumberMetadata('currentWeekNumber', document.currentWeekNumber),
  ...optionalNumberMetadata('lengthDay', document.lengthDay),
  ...optionalNumberMetadata('moveDay', document.moveDay),
  ...optionalNumberMetadata('organizationFilterCount', document.organizationFilterCount),
  ...optionalNumberMetadata('websiteFilterCount', document.websiteFilterCount),
});

const toMongoFilemakerEventStrings = (
  document: EventWithLinksDocument
): Record<string, string> => ({
  ...optionalStringMetadata('cooperationStatus', document.cooperationStatus),
  ...optionalStringMetadata('currentDay', document.currentDay),
  ...optionalStringMetadata('displayAddressId', document.displayAddressId),
  ...optionalStringMetadata('eventStartDate', document.eventStartDate),
  ...optionalStringMetadata('lastEventInstanceDate', document.lastEventInstanceDate),
  ...optionalStringMetadata('legacyDefaultAddressUuid', document.legacyDefaultAddressUuid),
  ...optionalStringMetadata('legacyDisplayAddressUuid', document.legacyDisplayAddressUuid),
  ...optionalStringMetadata('legacyHowOftenUuid', document.legacyHowOftenUuid),
  ...optionalStringMetadata('legacyLastEventInstanceUuid', document.legacyLastEventInstanceUuid),
  ...optionalStringMetadata('legacyParentUuid', document.legacyParentUuid),
  ...optionalStringMetadata('legacyUuid', document.legacyUuid),
  ...optionalStringMetadata('organizationFilter', document.organizationFilter),
  ...optionalStringMetadata('registrationMonth', document.registrationMonth),
  ...optionalStringMetadata('updatedBy', document.updatedBy),
  ...optionalStringMetadata('websiteFilter', document.websiteFilter),
});

const countUnresolvedOrganizationLinks = (
  organizationLinks: FilemakerEventOrganizationLinkMongoDocument[]
): number =>
  organizationLinks.filter(
    (link: FilemakerEventOrganizationLinkMongoDocument): boolean =>
      optionalMetadataString(link.organizationId) === undefined
  ).length;

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
    ...toMongoFilemakerEventBooleans(document),
    ...toMongoFilemakerEventNumbers(document),
    ...toMongoFilemakerEventStrings(document),
    linkedOrganizations: organizationLinks.map(toOrganizationLink),
    organizationLinkCount: organizationLinks.length,
    unresolvedOrganizationLinkCount: countUnresolvedOrganizationLinks(organizationLinks),
  };
}
