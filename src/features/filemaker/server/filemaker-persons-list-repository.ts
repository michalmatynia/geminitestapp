import 'server-only';

import type { Collection, Document, Filter } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  normalizePersonPage,
  resolvePersonListOptions,
  type FilemakerPersonAddressFilter,
  type FilemakerPersonBankFilter,
  type FilemakerPersonOrganizationFilter,
  type FilemakerPersonSortOption,
  type FilemakerPersonsListInput,
  type FilemakerPersonsListOptions,
} from './filemaker-persons-list-options';
import {
  FILEMAKER_PERSON_ORGANIZATION_LINKS_COLLECTION,
  FILEMAKER_PERSONS_COLLECTION,
  toMongoFilemakerPerson,
  type FilemakerPersonMongoDocument,
  type MongoFilemakerPerson,
} from './filemaker-persons-mongo';

export type FilemakerPersonsListResult = {
  collectionCount: number;
  filters: {
    address: FilemakerPersonAddressFilter;
    bank: FilemakerPersonBankFilter;
    organization: FilemakerPersonOrganizationFilter;
    updatedBy: string;
  };
  limit: number;
  page: number;
  pageSize: number;
  persons: MongoFilemakerPerson[];
  query: string;
  sort: FilemakerPersonSortOption;
  totalCount: number;
  totalCountIsExact: boolean;
  totalPages: number;
};

type PersonAggregationResult = {
  documents?: FilemakerPersonMongoDocument[];
  metadata?: Array<{ totalCount?: number }>;
};

type PersonCollection = Collection<FilemakerPersonMongoDocument>;

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasFieldValueFilter = (
  field: keyof FilemakerPersonMongoDocument
): Filter<FilemakerPersonMongoDocument> => ({
  [field]: { $exists: true, $nin: ['', null] },
});

const hasNoFieldValueFilter = (
  field: keyof FilemakerPersonMongoDocument
): Filter<FilemakerPersonMongoDocument> => ({
  $or: [{ [field]: { $exists: false } }, { [field]: '' }, { [field]: null }],
});

const buildAddressFilter = (
  filter: FilemakerPersonAddressFilter
): Filter<FilemakerPersonMongoDocument> => {
  if (filter === 'with_address') {
    return {
      $or: [
        hasFieldValueFilter('legacyDefaultAddressUuid'),
        hasFieldValueFilter('legacyDisplayAddressUuid'),
      ],
    };
  }
  if (filter === 'without_address') {
    return {
      $and: [
        hasNoFieldValueFilter('legacyDefaultAddressUuid'),
        hasNoFieldValueFilter('legacyDisplayAddressUuid'),
      ],
    };
  }
  return {};
};

const buildBankFilter = (
  filter: FilemakerPersonBankFilter
): Filter<FilemakerPersonMongoDocument> => {
  if (filter === 'with_bank') return hasFieldValueFilter('legacyDefaultBankAccountUuid');
  if (filter === 'without_bank') return hasNoFieldValueFilter('legacyDefaultBankAccountUuid');
  return {};
};

const buildTextSearchFilter = (query: string): Filter<FilemakerPersonMongoDocument> => {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length === 0) return {};

  const regex = new RegExp(escapeRegex(normalizedQuery), 'i');
  return {
    $or: [
      { firstName: regex },
      { lastName: regex },
      { fullName: regex },
      { legacyUuid: regex },
      { legacyParentUuid: regex },
      { legacyDefaultAddressUuid: regex },
      { legacyDefaultBankAccountUuid: regex },
      { legacyOrganizationUuids: regex },
    ],
  };
};

const buildUpdatedByFilter = (updatedBy: string): Filter<FilemakerPersonMongoDocument> =>
  updatedBy.length > 0 ? { updatedBy: new RegExp(escapeRegex(updatedBy), 'i') } : {};

const buildPersonBaseFilter = (input: {
  addressFilter: FilemakerPersonAddressFilter;
  bankFilter: FilemakerPersonBankFilter;
  query: string;
  updatedBy: string;
}): Filter<FilemakerPersonMongoDocument> => {
  const clauses = [
    buildTextSearchFilter(input.query),
    buildUpdatedByFilter(input.updatedBy),
    buildAddressFilter(input.addressFilter),
    buildBankFilter(input.bankFilter),
  ].filter((clause): boolean => Object.keys(clause).length > 0);
  return clauses.length > 0 ? { $and: clauses } : {};
};

const buildPersonSort = (sort: FilemakerPersonSortOption): Document => {
  if (sort === 'createdAt_desc') {
    return { createdAt: -1, updatedAt: -1, lastName: 1, firstName: 1, fullName: 1, _id: 1 };
  }
  if (sort === 'createdAt_asc') {
    return { createdAt: 1, updatedAt: 1, lastName: 1, firstName: 1, fullName: 1, _id: 1 };
  }
  if (sort === 'updatedAt_asc') {
    return { updatedAt: 1, createdAt: 1, lastName: 1, firstName: 1, fullName: 1, _id: 1 };
  }
  if (sort === 'organizationLinkCount_desc') {
    return { organizationLinkCount: -1, lastName: 1, firstName: 1, fullName: 1, _id: 1 };
  }
  if (sort === 'organizationLinkCount_asc') {
    return { organizationLinkCount: 1, lastName: 1, firstName: 1, fullName: 1, _id: 1 };
  }
  if (sort === 'name_desc') return { lastName: -1, firstName: -1, fullName: -1, _id: 1 };
  if (sort === 'name_asc') return { lastName: 1, firstName: 1, fullName: 1, _id: 1 };
  return { updatedAt: -1, createdAt: -1, lastName: 1, firstName: 1, fullName: 1, _id: 1 };
};

const buildOrganizationLinkFilterStages = (
  organizationFilter: FilemakerPersonOrganizationFilter
): Document[] => {
  if (organizationFilter === 'with_organizations') {
    return [{ $match: { 'organizationLinks.0': { $exists: true } } }];
  }
  if (organizationFilter === 'without_organizations') {
    return [{ $match: { organizationLinks: { $size: 0 } } }];
  }
  return [];
};

const buildOrganizationLinkSearchStages = (query: string): Document[] => {
  if (query.length === 0) return [];

  const regex = new RegExp(escapeRegex(query), 'i');
  return [
    {
      $match: {
        $or: [
          { firstName: regex },
          { lastName: regex },
          { fullName: regex },
          { legacyUuid: regex },
          { legacyOrganizationUuids: regex },
          { 'organizationLinks.organizationName': regex },
          { 'organizationLinks.legacyOrganizationUuid': regex },
        ],
      },
    },
  ];
};

const buildAggregationPipeline = (input: {
  filter: Filter<FilemakerPersonMongoDocument>;
  options: FilemakerPersonsListOptions;
  page: number;
}): Document[] => [
  { $match: input.filter },
  {
    $lookup: {
      from: FILEMAKER_PERSON_ORGANIZATION_LINKS_COLLECTION,
      localField: 'id',
      foreignField: 'personId',
      as: 'organizationLinks',
    },
  },
  ...buildOrganizationLinkFilterStages(input.options.organizationFilter),
  ...buildOrganizationLinkSearchStages(input.options.query),
  { $addFields: { organizationLinkCount: { $size: '$organizationLinks' } } },
  { $sort: buildPersonSort(input.options.sort) },
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
  documents: FilemakerPersonMongoDocument[];
  options: FilemakerPersonsListOptions;
  page: number;
  totalCount: number;
  totalPages: number;
}): FilemakerPersonsListResult => ({
  collectionCount: input.collectionCount,
  filters: {
    address: input.options.addressFilter,
    bank: input.options.bankFilter,
    organization: input.options.organizationFilter,
    updatedBy: input.options.updatedBy,
  },
  limit: input.options.pageSize,
  page: input.page,
  pageSize: input.options.pageSize,
  persons: input.documents.map(toMongoFilemakerPerson),
  query: input.options.query,
  sort: input.options.sort,
  totalCount: input.totalCount,
  totalCountIsExact: true,
  totalPages: input.totalPages,
});

const resolveAggregationTotalCount = (result: PersonAggregationResult): number => {
  const totalCount = result.metadata?.[0]?.totalCount;
  return typeof totalCount === 'number' ? totalCount : 0;
};

const readAggregationPage = async (
  collection: PersonCollection,
  filter: Filter<FilemakerPersonMongoDocument>,
  options: FilemakerPersonsListOptions,
  page: number
): Promise<PersonAggregationResult> => {
  const pipeline = buildAggregationPipeline({ filter, options, page });
  return (await collection.aggregate<PersonAggregationResult>(pipeline).toArray())[0] ?? {};
};

const resolveAggregationDocuments = async (input: {
  collection: PersonCollection;
  filter: Filter<FilemakerPersonMongoDocument>;
  firstResult: PersonAggregationResult;
  options: FilemakerPersonsListOptions;
  page: number;
}): Promise<FilemakerPersonMongoDocument[]> => {
  if (input.page === 1) return input.firstResult.documents ?? [];

  const pageResult = await readAggregationPage(
    input.collection,
    input.filter,
    input.options,
    input.page
  );
  return pageResult.documents ?? [];
};

export async function listMongoFilemakerPersons(
  input: FilemakerPersonsListInput
): Promise<FilemakerPersonsListResult> {
  const options = resolvePersonListOptions(input);
  const filter = buildPersonBaseFilter({
    addressFilter: options.addressFilter,
    bankFilter: options.bankFilter,
    query: '',
    updatedBy: options.updatedBy,
  });
  const db = await getMongoDb();
  const collection = db.collection<FilemakerPersonMongoDocument>(FILEMAKER_PERSONS_COLLECTION);
  const collectionCount = await collection.estimatedDocumentCount();
  const firstResult = await readAggregationPage(collection, filter, options, 1);
  const totalCount = resolveAggregationTotalCount(firstResult);
  const totalPages = Math.max(1, Math.ceil(totalCount / options.pageSize));
  const page = normalizePersonPage(options.requestedPage, totalPages);
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
