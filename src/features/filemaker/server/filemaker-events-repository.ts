import 'server-only';

import type { Document } from 'mongodb';

import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { FilemakerEvent, FilemakerOrganization } from '../types';
import {
  FILEMAKER_EVENT_ORGANIZATION_LINKS_COLLECTION,
  FILEMAKER_EVENTS_COLLECTION,
  getFilemakerEventsCollection,
  toMongoFilemakerEvent,
  type FilemakerEventMongoDocument,
  type MongoFilemakerEvent,
} from './filemaker-events-mongo';

export { listMongoFilemakerEvents } from './filemaker-events-list-repository';
export type { FilemakerEventsListResult } from './filemaker-events-list-repository';

export const getMongoFilemakerEventById = async (
  eventId: string
): Promise<MongoFilemakerEvent | null> => {
  const collection = await getFilemakerEventsCollection();
  const documents = await collection
    .aggregate([
      {
        $match: {
          $or: [{ _id: eventId }, { id: eventId }, { legacyUuid: eventId }],
        },
      },
      { $limit: 1 },
      {
        $lookup: {
          from: FILEMAKER_EVENT_ORGANIZATION_LINKS_COLLECTION,
          localField: 'id',
          foreignField: 'eventId',
          as: 'organizationLinks',
        },
      },
    ])
    .toArray();
  const document = documents[0] as FilemakerEventMongoDocument | undefined;
  return document ? toMongoFilemakerEvent(document) : null;
};

const stripUndefinedFields = <T extends Record<string, unknown>>(input: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(input).filter((entry: [string, unknown]): boolean => entry[1] !== undefined)
  ) as Partial<T>;

const resolveEventPatchString = (
  patchValue: string | undefined,
  existingValue: string | undefined,
  fallback = ''
): string => patchValue ?? existingValue ?? fallback;

const buildMongoFilemakerEventUpdate = (
  existing: FilemakerEventMongoDocument,
  patch: Partial<FilemakerEvent>,
  now: string
): Partial<FilemakerEventMongoDocument> =>
  stripUndefinedFields({
    city: resolveEventPatchString(patch.city, existing.city),
    country: resolveEventPatchString(patch.country, existing.country),
    countryId: resolveEventPatchString(patch.countryId, existing.countryId),
    eventName: resolveEventPatchString(patch.eventName, existing.eventName),
    postalCode: resolveEventPatchString(patch.postalCode, existing.postalCode),
    street: resolveEventPatchString(patch.street, existing.street),
    streetNumber: resolveEventPatchString(patch.streetNumber, existing.streetNumber),
    updatedAt: now,
  });

export const updateMongoFilemakerEvent = async (
  eventId: string,
  patch: Partial<FilemakerEvent>
): Promise<MongoFilemakerEvent> => {
  const collection = await getFilemakerEventsCollection();
  const existing = await collection.findOne({
    $or: [{ _id: eventId }, { id: eventId }, { legacyUuid: eventId }],
  });
  if (!existing) {
    throw notFoundError('Filemaker event was not found.');
  }
  const now = new Date().toISOString();
  const setFields = buildMongoFilemakerEventUpdate(existing, patch, now);
  await collection.updateOne({ _id: existing._id }, { $set: setFields });
  const updated = await getMongoFilemakerEventById(existing._id);
  if (!updated) {
    throw notFoundError('Filemaker event was not found after update.');
  }
  return updated;
};

export const listMongoFilemakerEventsForOrganization = async (
  organization: FilemakerOrganization
): Promise<MongoFilemakerEvent[]> => {
  const db = await getMongoDb();
  const linkFilter: Document = {
    $or: [
      { organizationId: organization.id },
      ...(organization.legacyUuid !== undefined && organization.legacyUuid.trim().length > 0
        ? [{ legacyOrganizationUuid: organization.legacyUuid }]
        : []),
    ],
  };
  const links = await db
    .collection(FILEMAKER_EVENT_ORGANIZATION_LINKS_COLLECTION)
    .find(linkFilter, { projection: { _id: 0, eventId: 1 } })
    .toArray();
  const eventIds = Array.from(
    new Set(
      links
        .map((link: Document): string => (typeof link['eventId'] === 'string' ? link['eventId'] : ''))
        .filter((eventId: string): boolean => eventId.length > 0)
    )
  );
  if (eventIds.length === 0) return [];

  const documents = await db
    .collection<FilemakerEventMongoDocument>(FILEMAKER_EVENTS_COLLECTION)
    .aggregate<FilemakerEventMongoDocument>([
      { $match: { id: { $in: eventIds } } },
      {
        $lookup: {
          from: FILEMAKER_EVENT_ORGANIZATION_LINKS_COLLECTION,
          localField: 'id',
          foreignField: 'eventId',
          as: 'organizationLinks',
        },
      },
      { $sort: { eventName: 1, eventStartDate: 1, _id: 1 } },
    ])
    .toArray();

  return documents.map(toMongoFilemakerEvent);
};
