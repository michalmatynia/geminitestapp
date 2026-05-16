import 'server-only';

import type { Collection, Document, Filter } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

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

type EventCollection = Collection<FilemakerEventMongoDocument>;

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
  if (filter === 'active') return { discontinued: { $ne: true } };
  return {};
};

const buildUpdatedByFilter = (updatedBy: string): Filter<FilemakerEventMongoDocument> =>
  updatedBy.length > 0 ? { updatedBy: new RegExp(escapeRegex(updatedBy), 'i') } : {};

const buildEventBaseFilter = (input: {
  addressFilter: FilemakerEventAddressFilter;
  statusFilter: FilemakerEventStatusFilter;
  updatedBy: string;
}): Filter<FilemakerEventMongoDocument> => {
  const clauses = [
    buildUpdatedByFilter(input.updatedBy),
    buildAddressFilter(input.addressFilter),
    buildStatusFilter(input.statusFilter),
  ].filter((clause): boolean => Object.keys(clause).length > 0);
  return clauses.length > 0 ? { $and: clauses } : {};
};

const buildOrganizationLinkFilterStages = (
  organizationFilter: FilemakerEventOrganizationFilter
): Document[] => {
  if (organizationFilter === 'with_organizations') {
    return [{ $match: { 'organizationLinks.0': { $exists: true } } }];
  }
  if (organizationFilter === 'without_organizations') {
    return [{ $match: { organizationLinks: { $size: 0 } } }];
  }
  return [];
};

const buildQueryFilterStages = (query: string): Document[] => {
  if (query.length === 0) return [];

  const regex = new RegExp(escapeRegex(query), 'i');
  return [
    {
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
    },
  ];
};

const buildAggregationPipeline = (input: {
  filter: Filter<FilemakerEventMongoDocument>;
  options: FilemakerEventsListOptions;
  page: number;
}): Document[] => [
  { $match: input.filter },
  {
    $lookup: {
      from: FILEMAKER_EVENT_ORGANIZATION_LINKS_COLLECTION,
      localField: 'id',
      foreignField: 'eventId',
      as: 'organizationLinks',
    },
  },
  ...buildOrganizationLinkFilterStages(input.options.organizationFilter),
  ...buildQueryFilterStages(input.options.query),
  { $sort: { eventName: 1, eventStartDate: 1, _id: 1 } },
  {
    $facet: {
      metadata: [{ $count: 'totalCount' }],
      documents: [
        { $skip: (input.page - 1) * input.options.pageSize },
        { $limit: input.options.pageSize },
      ],
    },
  },
];

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

const resolveAggregationTotalCount = (result: EventAggregationResult): number => {
  const totalCount = result.metadata?.[0]?.totalCount;
  return typeof totalCount === 'number' ? totalCount : 0;
};

const readAggregationPage = async (
  collection: EventCollection,
  filter: Filter<FilemakerEventMongoDocument>,
  options: FilemakerEventsListOptions,
  page: number
): Promise<EventAggregationResult> => {
  const pipeline = buildAggregationPipeline({ filter, options, page });
  return (await collection.aggregate<EventAggregationResult>(pipeline).toArray())[0] ?? {};
};

const resolveAggregationDocuments = async (input: {
  collection: EventCollection;
  filter: Filter<FilemakerEventMongoDocument>;
  firstResult: EventAggregationResult;
  options: FilemakerEventsListOptions;
  page: number;
}): Promise<FilemakerEventMongoDocument[]> => {
  if (input.page === 1) return input.firstResult.documents ?? [];

  const pageResult = await readAggregationPage(
    input.collection,
    input.filter,
    input.options,
    input.page
  );
  return pageResult.documents ?? [];
};

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
  const firstResult = await readAggregationPage(collection, filter, options, 1);
  const totalCount = resolveAggregationTotalCount(firstResult);
  const totalPages = Math.max(1, Math.ceil(totalCount / options.pageSize));
  const page = normalizeEventPage(options.requestedPage, totalPages);
  const documents = await resolveAggregationDocuments({
    collection,
    filter,
    firstResult,
    options,
    page,
  });

  return buildListResult({
    collectionCount,
    documents,
    options,
    page,
    totalCount,
    totalPages,
  });
}
