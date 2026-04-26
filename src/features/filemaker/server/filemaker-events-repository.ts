/* eslint-disable complexity, max-lines, max-lines-per-function */
import 'server-only';

import type { Document, Filter } from 'mongodb';

import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { FilemakerEvent, FilemakerOrganization } from '../types';
import {
  normalizeEventPage,
  resolveEventListOptions,
  type FilemakerEventAddressFilter,
  type FilemakerEventOrganizationFilter,
  type FilemakerEventStatusFilter,
  type FilemakerEventsListInput,
  type FilemakerEventsListOptions,
} from './filemaker-events-list-options';
import {
  FILEMAKER_EVENT_ORGANIZATION_LINKS_COLLECTION,
  FILEMAKER_EVENTS_COLLECTION,
  getFilemakerEventsCollection,
  toMongoFilemakerEvent,
  type FilemakerEventMongoDocument,
  type MongoFilemakerEvent,
} from './filemaker-events-mongo';

export type FilemakerEventsListResult = {
  collectionCount: number;
  events: MongoFilemakerEvent[];
  filters: {
    address: FilemakerEventAddressFilter;
    organization: FilemakerEventOrganizationFilter;
    status: FilemakerEventStatusFilter;
    updatedBy: string;
  };
  limit: number;
  page: number;
  pageSize: number;
  query: string;
  totalCount: number;
  totalPages: number;
};

type EventAggregationResult = {
  documents?: FilemakerEventMongoDocument[];
  metadata?: Array<{ totalCount?: number }>;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasFieldValueFilter = (
  field: keyof FilemakerEventMongoDocument
): Filter<FilemakerEventMongoDocument> => ({
  [field]: { $exists: true, $nin: ['', null] },
});

const hasNoFieldValueFilter = (
  field: keyof FilemakerEventMongoDocument
): Filter<FilemakerEventMongoDocument> => ({
  $or: [{ [field]: { $exists: false } }, { [field]: '' }, { [field]: null }],
});

const buildAddressFilter = (
  filter: FilemakerEventAddressFilter
): Filter<FilemakerEventMongoDocument> => {
  if (filter === 'with_address') {
    return {
      $or: [
        hasFieldValueFilter('legacyDefaultAddressUuid'),
        hasFieldValueFilter('addressId'),
      ],
    };
  }
  if (filter === 'without_address') {
    return {
      $and: [
        hasNoFieldValueFilter('legacyDefaultAddressUuid'),
        hasNoFieldValueFilter('addressId'),
      ],
    };
  }
  return {};
};

const buildStatusFilter = (
  filter: FilemakerEventStatusFilter
): Filter<FilemakerEventMongoDocument> => {
  if (filter === 'discontinued') return { discontinued: true };
  if (filter === 'active') {
    return {
      $or: [
        { discontinued: { $exists: false } },
        { discontinued: false },
        { discontinued: null },
      ],
    };
  }
  return {};
};

const buildEventBaseFilter = (input: {
  addressFilter: FilemakerEventAddressFilter;
  statusFilter: FilemakerEventStatusFilter;
  updatedBy: string;
}): Filter<FilemakerEventMongoDocument> => {
  const clauses: Filter<FilemakerEventMongoDocument>[] = [];
  if (input.updatedBy.length > 0) {
    clauses.push({ updatedBy: new RegExp(escapeRegex(input.updatedBy), 'i') });
  }
  clauses.push(buildAddressFilter(input.addressFilter), buildStatusFilter(input.statusFilter));
  const activeClauses = clauses.filter((clause) => Object.keys(clause).length > 0);
  return activeClauses.length > 0 ? { $and: activeClauses } : {};
};

const buildAggregationPipeline = (input: {
  filter: Filter<FilemakerEventMongoDocument>;
  options: FilemakerEventsListOptions;
  page: number;
}): Document[] => {
  const pipeline: Document[] = [
    { $match: input.filter },
    {
      $lookup: {
        from: FILEMAKER_EVENT_ORGANIZATION_LINKS_COLLECTION,
        localField: 'id',
        foreignField: 'eventId',
        as: 'organizationLinks',
      },
    },
  ];
  if (input.options.organizationFilter === 'with_organizations') {
    pipeline.push({ $match: { 'organizationLinks.0': { $exists: true } } });
  }
  if (input.options.organizationFilter === 'without_organizations') {
    pipeline.push({ $match: { organizationLinks: { $size: 0 } } });
  }
  if (input.options.query.length > 0) {
    const regex = new RegExp(escapeRegex(input.options.query), 'i');
    pipeline.push({
      $match: {
        $or: [
          { eventName: regex },
          { eventStartDate: regex },
          { lastEventInstanceDate: regex },
          { currentDay: regex },
          { organizationFilter: regex },
          { street: regex },
          { streetNumber: regex },
          { city: regex },
          { postalCode: regex },
          { country: regex },
          { countryId: regex },
          { legacyUuid: regex },
          { legacyDefaultAddressUuid: regex },
          { legacyDisplayAddressUuid: regex },
          { 'organizationLinks.organizationName': regex },
          { 'organizationLinks.legacyOrganizationUuid': regex },
        ],
      },
    });
  }
  pipeline.push(
    { $sort: { eventName: 1, eventStartDate: 1, _id: 1 } },
    {
      $facet: {
        metadata: [{ $count: 'totalCount' }],
        documents: [
          { $skip: (input.page - 1) * input.options.pageSize },
          { $limit: input.options.pageSize },
        ],
      },
    }
  );
  return pipeline;
};

const buildListResult = (input: {
  collectionCount: number;
  documents: FilemakerEventMongoDocument[];
  options: FilemakerEventsListOptions;
  page: number;
  totalCount: number;
  totalPages: number;
}): FilemakerEventsListResult => ({
  collectionCount: input.collectionCount,
  events: input.documents.map(toMongoFilemakerEvent),
  filters: {
    address: input.options.addressFilter,
    organization: input.options.organizationFilter,
    status: input.options.statusFilter,
    updatedBy: input.options.updatedBy,
  },
  limit: input.options.pageSize,
  page: input.page,
  pageSize: input.options.pageSize,
  query: input.options.query,
  totalCount: input.totalCount,
  totalPages: input.totalPages,
});

export async function listMongoFilemakerEvents(
  input: FilemakerEventsListInput
): Promise<FilemakerEventsListResult> {
  const options = resolveEventListOptions(input);
  const filter = buildEventBaseFilter({
    addressFilter: options.addressFilter,
    statusFilter: options.statusFilter,
    updatedBy: options.updatedBy,
  });
  const db = await getMongoDb();
  const collection = db.collection<FilemakerEventMongoDocument>(FILEMAKER_EVENTS_COLLECTION);
  const collectionCount = await collection.estimatedDocumentCount();
  const firstResult = await collection
    .aggregate<EventAggregationResult>(buildAggregationPipeline({ filter, options, page: 1 }))
    .toArray();
  const first = firstResult[0] ?? { documents: [], metadata: [] };
  const totalCount =
    Array.isArray(first.metadata) && typeof first.metadata[0]?.totalCount === 'number'
      ? first.metadata[0].totalCount
      : 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / options.pageSize));
  const page = normalizeEventPage(options.requestedPage, totalPages);
  const documents =
    page === 1
      ? (first.documents ?? [])
      : ((await collection
          .aggregate<EventAggregationResult>(buildAggregationPipeline({ filter, options, page }))
          .toArray())[0]?.documents ?? []);

  return buildListResult({
    collectionCount,
    documents,
    options,
    page,
    totalCount,
    totalPages,
  });
}

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

const buildMongoFilemakerEventUpdate = (
  existing: FilemakerEventMongoDocument,
  patch: Partial<FilemakerEvent>,
  now: string
): Partial<FilemakerEventMongoDocument> =>
  stripUndefinedFields({
    city: patch.city ?? existing.city ?? '',
    country: patch.country ?? existing.country ?? '',
    countryId: patch.countryId ?? existing.countryId ?? '',
    eventName: patch.eventName ?? existing.eventName,
    postalCode: patch.postalCode ?? existing.postalCode ?? '',
    street: patch.street ?? existing.street ?? '',
    streetNumber: patch.streetNumber ?? existing.streetNumber ?? '',
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
    .aggregate([
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
