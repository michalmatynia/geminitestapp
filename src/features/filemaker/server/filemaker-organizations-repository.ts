import 'server-only';
/* eslint-disable complexity, max-lines */

import type { Collection, Document, Filter, Sort } from 'mongodb';

import { notFoundError } from '@/shared/errors/app-error';
import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';

import type { FilemakerEvent, FilemakerJobListing, FilemakerOrganization } from '../types';
import { resolveJobBoardOriginLabel } from '../job-board-origin';
import { parseFilemakerDatabase } from '../settings';
import { FILEMAKER_DATABASE_KEY } from '../settings-constants';
import { readFilemakerCampaignSettingValue } from './campaign-settings-store';
import { buildOrganizationAdvancedFilter } from './filemaker-organization-advanced-filter-query';
import {
  normalizeOrganizationPage,
  resolveOrganizationListOptions,
  type FilemakerOrganizationAddressFilter,
  type FilemakerOrganizationBankFilter,
  type FilemakerOrganizationParentFilter,
  type FilemakerOrganizationSortOption,
  type FilemakerOrganizationsListInput,
  type FilemakerOrganizationsListOptions,
} from './filemaker-organizations-list-options';
import {
  getFilemakerOrganizationsCollection,
  toFilemakerOrganization,
  type FilemakerOrganizationMongoDocument,
} from './filemaker-organizations-mongo';
import { listMongoFilemakerEventsForOrganization } from './filemaker-events-repository';
import { FILEMAKER_EVENT_ORGANIZATION_LINKS_COLLECTION } from './filemaker-events-mongo';

export type FilemakerOrganizationsListResult = {
  collectionCount: number;
  filters: {
    address: FilemakerOrganizationAddressFilter;
    advancedFilter: string;
    bank: FilemakerOrganizationBankFilter;
    parent: FilemakerOrganizationParentFilter;
    updatedBy: string;
  };
  limit: number;
  linkedEventsByOrganizationId: Record<string, FilemakerEvent[]>;
  linkedJobListingsByOrganizationId: Record<string, FilemakerJobListing[]>;
  organizations: FilemakerOrganization[];
  page: number;
  pageSize: number;
  query: string;
  sort: FilemakerOrganizationSortOption;
  totalCount: number;
  totalCountIsExact: boolean;
  totalPages: number;
};

type OrganizationAggregationResult = {
  documents?: FilemakerOrganizationMongoDocument[];
  metadata?: Array<{ totalCount?: number }>;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ORGANIZATION_LIST_PROJECTION = {
  _id: 1,
  addressId: 1,
  city: 1,
  cooperationStatus: 1,
  country: 1,
  countryId: 1,
  createdAt: 1,
  defaultBankAccountId: 1,
  displayAddressId: 1,
  displayBankAccountId: 1,
  establishedDate: 1,
  id: 1,
  jobBoardCompanyAddress: 1,
  jobBoardCompanyEmail: 1,
  jobBoardCompanyIndustry: 1,
  jobBoardCompanyLogoUrl: 1,
  jobBoardCompanyPhone: 1,
  jobBoardCompanyProfile: 1,
  jobBoardCompanyProfileScrapedAt: 1,
  jobBoardCompanyProfileUrl: 1,
  jobBoardCompanyRegion: 1,
  jobBoardCompanySize: 1,
  jobBoardCompanyWebsiteUrl: 1,
  jobBoardScrapedAt: 1,
  jobBoardSourceLabel: 1,
  jobBoardSourceSite: 1,
  jobBoardSourceUrl: 1,
  krs: 1,
  legacyDefaultAddressUuid: 1,
  legacyDefaultBankAccountUuid: 1,
  legacyDisplayAddressUuid: 1,
  legacyDisplayBankAccountUuid: 1,
  legacyParentUuid: 1,
  legacyUuid: 1,
  name: 1,
  parentOrganizationId: 1,
  postalCode: 1,
  regon: 1,
  street: 1,
  streetNumber: 1,
  taxId: 1,
  tradingName: 1,
  updatedAt: 1,
  updatedBy: 1,
} as const;

const hasFieldValueFilter = (
  field: keyof FilemakerOrganizationMongoDocument
): Filter<FilemakerOrganizationMongoDocument> => {
  const filter: Filter<FilemakerOrganizationMongoDocument> = {
    [field]: { $exists: true, $nin: ['', null] },
  };
  return filter;
};

const hasNoFieldValueFilter = (
  field: keyof FilemakerOrganizationMongoDocument
): Filter<FilemakerOrganizationMongoDocument> => {
  const filter: Filter<FilemakerOrganizationMongoDocument> = {
    $or: [{ [field]: { $exists: false } }, { [field]: '' }, { [field]: null }],
  };
  return filter;
};

const buildAddressFilter = (
  filter: FilemakerOrganizationAddressFilter
): Filter<FilemakerOrganizationMongoDocument> => {
  if (filter === 'with_address') {
    return { $or: [hasFieldValueFilter('legacyDefaultAddressUuid'), hasFieldValueFilter('addressId')] };
  }
  if (filter === 'without_address') {
    return {
      $and: [hasNoFieldValueFilter('legacyDefaultAddressUuid'), hasNoFieldValueFilter('addressId')],
    };
  }
  return {};
};

const buildBankFilter = (
  filter: FilemakerOrganizationBankFilter
): Filter<FilemakerOrganizationMongoDocument> => {
  if (filter === 'with_bank') return hasFieldValueFilter('legacyDefaultBankAccountUuid');
  if (filter === 'without_bank') return hasNoFieldValueFilter('legacyDefaultBankAccountUuid');
  return {};
};

const buildParentFilter = (
  filter: FilemakerOrganizationParentFilter
): Filter<FilemakerOrganizationMongoDocument> => {
  if (filter === 'child') {
    return {
      $or: [hasFieldValueFilter('legacyParentUuid'), hasFieldValueFilter('parentOrganizationId')],
    };
  }
  if (filter === 'root') {
    return {
      $and: [hasNoFieldValueFilter('legacyParentUuid'), hasNoFieldValueFilter('parentOrganizationId')],
    };
  }
  return {};
};

const buildOrganizationFilter = (input: {
  addressFilter: FilemakerOrganizationAddressFilter;
  advancedFilter: string;
  bankFilter: FilemakerOrganizationBankFilter;
  parentFilter: FilemakerOrganizationParentFilter;
  query: string;
  updatedBy: string;
}): Filter<FilemakerOrganizationMongoDocument> => {
  const clauses: Filter<FilemakerOrganizationMongoDocument>[] = [];
  const { addressFilter, advancedFilter, bankFilter, parentFilter, query, updatedBy } = input;
  const normalizedQuery = query.trim();
  if (normalizedQuery.length > 0) {
    const regex = new RegExp(escapeRegex(normalizedQuery), 'i');
    clauses.push({
      $or: [
        { name: regex },
        { tradingName: regex },
        { taxId: regex },
        { krs: regex },
        { regon: regex },
        { jobBoardCompanyWebsiteUrl: regex },
        { jobBoardCompanyEmail: regex },
        { jobBoardCompanyPhone: regex },
        { jobBoardCompanyIndustry: regex },
        { jobBoardCompanySize: regex },
        { jobBoardCompanyAddress: regex },
        { jobBoardCompanyRegion: regex },
        { jobBoardCompanyProfileUrl: regex },
        { jobBoardCompanyProfile: regex },
        { jobBoardSourceLabel: regex },
        { jobBoardSourceSite: regex },
        { jobBoardSourceUrl: regex },
        { city: regex },
        { street: regex },
        { streetNumber: regex },
        { postalCode: regex },
        { country: regex },
        { countryId: regex },
        { legacyUuid: regex },
        { legacyDefaultAddressUuid: regex },
        { legacyDefaultBankAccountUuid: regex },
      ],
    });
  }
  if (updatedBy.length > 0) {
    clauses.push({ updatedBy: new RegExp(escapeRegex(updatedBy), 'i') });
  }
  clauses.push(
    buildAddressFilter(addressFilter),
    buildBankFilter(bankFilter),
    buildParentFilter(parentFilter),
    buildOrganizationAdvancedFilter({
      advancedFilter,
      escapeRegex,
      hasFieldValueFilter,
      hasNoFieldValueFilter,
    })
  );
  const activeClauses = clauses.filter((clause) => Object.keys(clause).length > 0);
  return activeClauses.length > 0 ? { $and: activeClauses } : {};
};

const buildOrganizationSort = (sort: FilemakerOrganizationSortOption): Sort => {
  if (sort === 'createdAt_desc') return { createdAt: -1, updatedAt: -1, name: 1, _id: 1 };
  if (sort === 'createdAt_asc') return { createdAt: 1, name: 1, _id: 1 };
  if (sort === 'updatedAt_asc') return { updatedAt: 1, name: 1, _id: 1 };
  if (sort === 'updatedAt_desc') return { updatedAt: -1, createdAt: -1, name: 1, _id: 1 };
  if (sort === 'eventCount_asc') return { eventCount: 1, name: 1, _id: 1 };
  if (sort === 'eventCount_desc') return { eventCount: -1, name: 1, _id: 1 };
  if (sort === 'jobListingCount_asc') return { jobListingCount: 1, name: 1, _id: 1 };
  if (sort === 'jobListingCount_desc') return { jobListingCount: -1, name: 1, _id: 1 };
  if (sort === 'name_asc') return { name: 1, _id: 1 };
  return { name: -1, _id: 1 };
};

const isRelationCountSort = (sort: FilemakerOrganizationSortOption): boolean =>
  sort === 'eventCount_asc' ||
  sort === 'eventCount_desc' ||
  sort === 'jobListingCount_asc' ||
  sort === 'jobListingCount_desc';

const buildEventCountAggregationStages = (): Document[] => [
  {
    $lookup: {
      as: 'eventCountLookup',
      from: FILEMAKER_EVENT_ORGANIZATION_LINKS_COLLECTION,
      let: {
        legacyUuid: '$legacyUuid',
        organizationId: '$id',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $or: [
                { $eq: ['$organizationId', '$$organizationId'] },
                {
                  $and: [
                    { $ne: ['$$legacyUuid', null] },
                    { $ne: ['$$legacyUuid', ''] },
                    { $eq: ['$legacyOrganizationUuid', '$$legacyUuid'] },
                  ],
                },
              ],
            },
          },
        },
        { $group: { _id: '$eventId' } },
        { $count: 'count' },
      ],
    },
  },
  {
    $addFields: {
      eventCount: { $ifNull: [{ $arrayElemAt: ['$eventCountLookup.count', 0] }, 0] },
    },
  },
  { $project: { eventCountLookup: 0 } },
];

const loadSettingsJobListings = async (): Promise<FilemakerJobListing[]> => {
  const storedValue = await readFilemakerCampaignSettingValue(FILEMAKER_DATABASE_KEY);
  if (storedValue === null) return [];
  try {
    const database = parseFilemakerDatabase(
      decodeSettingValue(FILEMAKER_DATABASE_KEY, storedValue)
    );
    return database.jobListings;
  } catch {
    return [];
  }
};

export const listSettingsFilemakerJobListingsForOrganizationIds = async (
  organizationIds: ReadonlyArray<string | null | undefined>
): Promise<FilemakerJobListing[]> => {
  const ownerIds = new Set(
    organizationIds
      .map((organizationId: string | null | undefined): string => organizationId?.trim() ?? '')
      .filter((organizationId: string): boolean => organizationId.length > 0)
  );
  if (ownerIds.size === 0) return [];

  const listingsById = new Map<string, FilemakerJobListing>();
  (await loadSettingsJobListings()).forEach((listing: FilemakerJobListing): void => {
    if (!ownerIds.has(listing.organizationId.trim())) return;
    listingsById.set(listing.id, listing);
  });
  return Array.from(listingsById.values());
};

export const getSettingsFilemakerJobListingById = async (
  jobListingId: string
): Promise<FilemakerJobListing | null> => {
  const normalizedJobListingId = jobListingId.trim();
  if (normalizedJobListingId.length === 0) return null;
  return (
    (await loadSettingsJobListings()).find(
      (listing: FilemakerJobListing): boolean => listing.id === normalizedJobListingId
    ) ?? null
  );
};

const loadJobListingCountByOrganizationId = async (): Promise<Map<string, number>> =>
  (await loadSettingsJobListings()).reduce<Map<string, number>>((counts, listing) => {
    const organizationId = listing.organizationId.trim();
    if (organizationId.length === 0) return counts;
    counts.set(organizationId, (counts.get(organizationId) ?? 0) + 1);
    return counts;
  }, new Map());

const buildJobListingCountAggregationStage = (
  countsByOrganizationId: ReadonlyMap<string, number>
): Document => {
  const branches = Array.from(countsByOrganizationId.entries()).map(
    ([organizationId, count]: [string, number]): Document => ({
      case: { $eq: ['$id', organizationId] },
      then: count,
    })
  );
  if (branches.length === 0) return { $addFields: { jobListingCount: 0 } };
  return {
    $addFields: {
      jobListingCount: {
        $switch: {
          branches,
          default: 0,
        },
      },
    },
  };
};

const buildRelationCountAggregationStages = async (
  sort: FilemakerOrganizationSortOption
): Promise<Document[]> => {
  if (sort === 'eventCount_asc' || sort === 'eventCount_desc') {
    return buildEventCountAggregationStages();
  }
  if (sort === 'jobListingCount_asc' || sort === 'jobListingCount_desc') {
    return [buildJobListingCountAggregationStage(await loadJobListingCountByOrganizationId())];
  }
  return [];
};

const buildListResult = (input: {
  collectionCount: number;
  documents: FilemakerOrganizationMongoDocument[];
  linkedEventsByOrganizationId: Record<string, FilemakerEvent[]>;
  linkedJobListingsByOrganizationId: Record<string, FilemakerJobListing[]>;
  options: FilemakerOrganizationsListOptions;
  page: number;
  totalCount: number;
  totalCountIsExact: boolean;
  totalPages: number;
}): FilemakerOrganizationsListResult => {
  const organizations = input.documents.map(toFilemakerOrganization).map(
    (organization: FilemakerOrganization): FilemakerOrganization => {
      if (
        (organization.jobBoardSourceSite ?? '').trim().length > 0 ||
        (organization.jobBoardSourceUrl ?? '').trim().length > 0
      ) {
        return organization;
      }
      const listing = (input.linkedJobListingsByOrganizationId[organization.id] ?? []).find(
        (candidate: FilemakerJobListing): boolean =>
          (candidate.sourceSite ?? '').trim().length > 0 ||
          (candidate.sourceUrl ?? '').trim().length > 0
      );
      if (listing === undefined) return organization;
      return {
        ...organization,
        jobBoardSourceLabel: resolveJobBoardOriginLabel({
          sourceSite: listing.sourceSite,
          sourceUrl: listing.sourceUrl,
        }),
        jobBoardSourceSite: listing.sourceSite,
        jobBoardSourceUrl: listing.sourceUrl,
      };
    }
  );
  return {
  collectionCount: input.collectionCount,
  filters: {
    address: input.options.addressFilter,
    advancedFilter: input.options.advancedFilter,
    bank: input.options.bankFilter,
    parent: input.options.parentFilter,
    updatedBy: input.options.updatedBy,
  },
  limit: input.options.pageSize,
  linkedEventsByOrganizationId: input.linkedEventsByOrganizationId,
  linkedJobListingsByOrganizationId: input.linkedJobListingsByOrganizationId,
  organizations,
  page: input.page,
  pageSize: input.options.pageSize,
  query: input.options.query,
  sort: input.options.sort,
  totalCount: input.totalCount,
  totalCountIsExact: input.totalCountIsExact,
  totalPages: input.totalPages,
  };
};

const buildRelationCountSortPipeline = async (input: {
  filter: Filter<FilemakerOrganizationMongoDocument>;
  options: FilemakerOrganizationsListOptions;
  page: number;
}): Promise<Document[]> => [
  { $match: input.filter },
  ...(await buildRelationCountAggregationStages(input.options.sort)),
  { $sort: buildOrganizationSort(input.options.sort) },
  {
    $facet: {
      metadata: [{ $count: 'totalCount' }],
      documents: [
        { $skip: (input.page - 1) * input.options.pageSize },
        { $limit: input.options.pageSize },
        { $project: ORGANIZATION_LIST_PROJECTION },
      ],
    },
  },
];

const readRelationCountSortedPage = async (input: {
  collection: Collection<FilemakerOrganizationMongoDocument>;
  filter: Filter<FilemakerOrganizationMongoDocument>;
  options: FilemakerOrganizationsListOptions;
  page: number;
}): Promise<OrganizationAggregationResult> => {
  const [result] = await input.collection
    .aggregate<OrganizationAggregationResult>(await buildRelationCountSortPipeline(input))
    .toArray();
  return result ?? { documents: [], metadata: [] };
};

const listOrganizationsWithRelationCountSort = async (input: {
  collection: Collection<FilemakerOrganizationMongoDocument>;
  filter: Filter<FilemakerOrganizationMongoDocument>;
  options: FilemakerOrganizationsListOptions;
}): Promise<{
  documents: FilemakerOrganizationMongoDocument[];
  page: number;
  totalCount: number;
  totalPages: number;
}> => {
  const requestedPage = normalizeOrganizationPage(
    input.options.requestedPage,
    Number.MAX_SAFE_INTEGER
  );
  const first = await readRelationCountSortedPage({ ...input, page: requestedPage });
  const totalCount =
    Array.isArray(first.metadata) && typeof first.metadata[0]?.totalCount === 'number'
      ? first.metadata[0].totalCount
      : 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / input.options.pageSize));
  const page = normalizeOrganizationPage(input.options.requestedPage, totalPages);
  if (page === requestedPage) {
    return {
      documents: first.documents ?? [],
      page,
      totalCount,
      totalPages,
    };
  }
  const next = await readRelationCountSortedPage({ ...input, page });
  return {
    documents: next.documents ?? [],
    page,
    totalCount,
    totalPages,
  };
};

const loadLinkedEventsByOrganizationDocuments = async (
  documents: FilemakerOrganizationMongoDocument[]
): Promise<Record<string, FilemakerEvent[]>> => {
  const organizations = documents.map(toFilemakerOrganization);
  const linkedEventEntries = await Promise.all(
    organizations.map(
      async (organization: FilemakerOrganization): Promise<[string, FilemakerEvent[]]> => [
        organization.id,
        await listMongoFilemakerEventsForOrganization(organization),
      ]
    )
  );
  return Object.fromEntries(
    linkedEventEntries.filter(
      (entry: [string, FilemakerEvent[]]): boolean => entry[1].length > 0
    )
  );
};

const loadLinkedJobListingsByOrganizationDocuments = async (
  documents: FilemakerOrganizationMongoDocument[]
): Promise<Record<string, FilemakerJobListing[]>> => {
  if (documents.length === 0) return {};
  const organizationIds = new Set(
    documents.map((document: FilemakerOrganizationMongoDocument): string => document.id)
  );
  const entries = (await loadSettingsJobListings()).reduce<
    Record<string, FilemakerJobListing[]>
  >((byOrganizationId, listing) => {
    const organizationId = listing.organizationId.trim();
    if (!organizationIds.has(organizationId)) return byOrganizationId;
    return {
      ...byOrganizationId,
      [organizationId]: [...(byOrganizationId[organizationId] ?? []), listing],
    };
  }, {});
  return entries;
};

const listOrganizationsWithStandardSort = async (input: {
  collection: Collection<FilemakerOrganizationMongoDocument>;
  collectionCount: number;
  filter: Filter<FilemakerOrganizationMongoDocument>;
  hasActiveFilter: boolean;
  options: FilemakerOrganizationsListOptions;
}): Promise<{
  documents: FilemakerOrganizationMongoDocument[];
  page: number;
  totalCount: number;
  totalCountIsExact: boolean;
  totalPages: number;
}> => {
  const exactTotalPages = Math.max(1, Math.ceil(input.collectionCount / input.options.pageSize));
  const page = input.hasActiveFilter
    ? normalizeOrganizationPage(input.options.requestedPage, Number.MAX_SAFE_INTEGER)
    : normalizeOrganizationPage(input.options.requestedPage, exactTotalPages);
  const requestedLimit = input.hasActiveFilter
    ? input.options.pageSize + 1
    : input.options.pageSize;
  const rawDocuments = await input.collection
    .find(input.filter, { projection: ORGANIZATION_LIST_PROJECTION })
    .sort(buildOrganizationSort(input.options.sort))
    .skip((page - 1) * input.options.pageSize)
    .limit(requestedLimit)
    .toArray();
  const hasNextPage = input.hasActiveFilter && rawDocuments.length > input.options.pageSize;
  const documents = input.hasActiveFilter
    ? rawDocuments.slice(0, input.options.pageSize)
    : rawDocuments;
  return {
    documents,
    page,
    totalCount: input.hasActiveFilter
      ? (page - 1) * input.options.pageSize + documents.length + (hasNextPage ? 1 : 0)
      : input.collectionCount,
    totalCountIsExact: !input.hasActiveFilter,
    totalPages: input.hasActiveFilter ? Math.max(1, page + (hasNextPage ? 1 : 0)) : exactTotalPages,
  };
};

export const listMongoFilemakerOrganizations = async (
  input: FilemakerOrganizationsListInput
): Promise<FilemakerOrganizationsListResult> => {
  const options = resolveOrganizationListOptions(input);
  const filter = buildOrganizationFilter({
    addressFilter: options.addressFilter,
    advancedFilter: options.advancedFilter,
    bankFilter: options.bankFilter,
    parentFilter: options.parentFilter,
    query: options.query,
    updatedBy: options.updatedBy,
  });
  const collection = await getFilemakerOrganizationsCollection();
  const hasActiveFilter = Object.keys(filter).length > 0;
  const collectionCount = await collection.estimatedDocumentCount();
  const pageResult = isRelationCountSort(options.sort)
    ? {
        ...(await listOrganizationsWithRelationCountSort({ collection, filter, options })),
        totalCountIsExact: true,
      }
    : await listOrganizationsWithStandardSort({
        collection,
        collectionCount,
        filter,
        hasActiveFilter,
        options,
      });
  const linkedEventsByOrganizationId = await loadLinkedEventsByOrganizationDocuments(
    pageResult.documents
  );
  const linkedJobListingsByOrganizationId = await loadLinkedJobListingsByOrganizationDocuments(
    pageResult.documents
  );

  return buildListResult({
    collectionCount,
    documents: pageResult.documents,
    linkedEventsByOrganizationId,
    linkedJobListingsByOrganizationId,
    options,
    page: pageResult.page,
    totalCount: pageResult.totalCount,
    totalCountIsExact: pageResult.totalCountIsExact,
    totalPages: pageResult.totalPages,
  });
};

export const listMongoFilemakerOrganizationIds = async (
  input: FilemakerOrganizationsListInput
): Promise<string[]> => {
  const options = resolveOrganizationListOptions(input);
  const filter = buildOrganizationFilter({
    addressFilter: options.addressFilter,
    advancedFilter: options.advancedFilter,
    bankFilter: options.bankFilter,
    parentFilter: options.parentFilter,
    query: options.query,
    updatedBy: options.updatedBy,
  });
  const collection = await getFilemakerOrganizationsCollection();
  if (isRelationCountSort(options.sort)) {
    const documents = await collection
      .aggregate<{ id?: string }>([
        { $match: filter },
        ...(await buildRelationCountAggregationStages(options.sort)),
        { $sort: buildOrganizationSort(options.sort) },
        { $project: { _id: 0, id: 1 } },
      ])
      .toArray();
    return documents
      .map((document: { id?: string }): string => document.id ?? '')
      .filter((id: string): boolean => id.length > 0);
  }
  const documents = await collection
    .find(filter, { projection: { _id: 0, id: 1 } })
    .sort(buildOrganizationSort(options.sort))
    .toArray();
  return documents
    .map((document: FilemakerOrganizationMongoDocument): string => document.id)
    .filter((id: string): boolean => id.length > 0);
};

export const getMongoFilemakerOrganizationById = async (
  organizationId: string
): Promise<FilemakerOrganization | null> => {
  const collection = await getFilemakerOrganizationsCollection();
  const document = await findMongoFilemakerOrganizationDocument(collection, organizationId);
  return document ? toFilemakerOrganization(document) : null;
};

const findMongoFilemakerOrganizationDocument = async (
  collection: Collection<FilemakerOrganizationMongoDocument>,
  organizationId: string
): Promise<FilemakerOrganizationMongoDocument | null> =>
  collection.findOne({
    $or: [{ _id: organizationId }, { id: organizationId }, { legacyUuid: organizationId }],
  });

const stripUndefinedFields = <T extends Record<string, unknown>>(input: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(input).filter((entry: [string, unknown]): boolean => entry[1] !== undefined)
  ) as Partial<T>;

const buildMongoFilemakerOrganizationUpdate = (
  existing: FilemakerOrganizationMongoDocument,
  patch: Partial<FilemakerOrganization>,
  now: string
): Partial<FilemakerOrganizationMongoDocument> =>
  stripUndefinedFields({
    addressId: patch.addressId ?? '',
    city: patch.city ?? '',
    cooperationStatus: patch.cooperationStatus,
    country: patch.country ?? '',
    countryId: patch.countryId ?? '',
    establishedDate: patch.establishedDate,
    jobBoardCompanyAddress: patch.jobBoardCompanyAddress,
    jobBoardCompanyEmail: patch.jobBoardCompanyEmail,
    jobBoardCompanyIndustry: patch.jobBoardCompanyIndustry,
    jobBoardCompanyLogoUrl: patch.jobBoardCompanyLogoUrl,
    jobBoardCompanyPhone: patch.jobBoardCompanyPhone,
    jobBoardCompanyProfile: patch.jobBoardCompanyProfile,
    jobBoardCompanyProfileScrapedAt: patch.jobBoardCompanyProfileScrapedAt,
    jobBoardCompanyProfileUrl: patch.jobBoardCompanyProfileUrl,
    jobBoardCompanyRegion: patch.jobBoardCompanyRegion,
    jobBoardCompanySize: patch.jobBoardCompanySize,
    jobBoardCompanyWebsiteUrl: patch.jobBoardCompanyWebsiteUrl,
    jobBoardScrapedAt: patch.jobBoardScrapedAt,
    jobBoardSourceLabel: patch.jobBoardSourceLabel,
    jobBoardSourceSite: patch.jobBoardSourceSite,
    jobBoardSourceUrl: patch.jobBoardSourceUrl,
    krs: patch.krs,
    name: patch.name ?? existing.name,
    postalCode: patch.postalCode ?? '',
    regon: patch.regon,
    street: patch.street ?? '',
    streetNumber: patch.streetNumber ?? '',
    taxId: patch.taxId,
    tradingName: patch.tradingName,
    updatedAt: now,
  });

export const updateMongoFilemakerOrganization = async (
  organizationId: string,
  patch: Partial<FilemakerOrganization>
): Promise<FilemakerOrganization> => {
  const collection = await getFilemakerOrganizationsCollection();
  const existing = await findMongoFilemakerOrganizationDocument(collection, organizationId);
  if (!existing) {
    throw notFoundError('Filemaker organization was not found.');
  }
  const now = new Date().toISOString();
  const setFields = buildMongoFilemakerOrganizationUpdate(existing, patch, now);
  await collection.updateOne({ _id: existing._id }, { $set: setFields });
  const updated = await collection.findOne({ _id: existing._id });
  if (!updated) {
    throw notFoundError('Filemaker organization was not found after update.');
  }
  return toFilemakerOrganization(updated);
};

export const deleteMongoFilemakerOrganization = async (
  organizationId: string
): Promise<FilemakerOrganization> => {
  const collection = await getFilemakerOrganizationsCollection();
  const existing = await findMongoFilemakerOrganizationDocument(collection, organizationId);
  if (!existing) {
    throw notFoundError('Filemaker organization was not found.');
  }
  const result = await collection.deleteOne({ _id: existing._id });
  if (result.deletedCount !== 1) {
    throw notFoundError('Filemaker organization was not found.');
  }
  return toFilemakerOrganization(existing);
};
