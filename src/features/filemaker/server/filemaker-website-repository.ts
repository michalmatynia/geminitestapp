import 'server-only';

/* eslint-disable complexity, max-lines */

import type { Collection, Document, Filter } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  FilemakerWebsitePartyKind,
  MongoFilemakerWebsiteDetail,
  MongoFilemakerWebsiteLink,
  MongoFilemakerWebsitesResponse,
  MongoFilemakerWebsiteSummary,
  MongoFilemakerWebsite,
  WebsiteLinkFilter,
} from '../filemaker-websites.types';
import type { FilemakerEvent, FilemakerOrganization } from '../types';
import type { MongoFilemakerPerson } from './filemaker-persons-mongo';

export const FILEMAKER_WEBSITES_COLLECTION = 'filemaker_websites';
export const FILEMAKER_WEBSITE_LINKS_COLLECTION = 'filemaker_website_links';

export type MongoFilemakerWebsiteDocument = Document & {
  _id: string;
  createdAt?: string;
  host?: string;
  id: string;
  importBatchId?: string;
  importSourceKind?: string;
  importedAt?: Date;
  legacyTypeRaw?: string;
  legacyTypes?: string[];
  legacyUuid?: string;
  legacyUuids: string[];
  normalizedUrl?: string;
  schemaVersion: 1;
  updatedAt?: string;
  updatedBy?: string;
  url: string;
};

export type MongoFilemakerWebsiteLinkDocument = Document & {
  _id: string;
  createdAt?: string;
  createdBy?: string;
  id: string;
  importBatchId?: string;
  importSourceKind?: string;
  importedAt?: Date;
  legacyJoinUuid?: string;
  legacyJoinUuids?: string[];
  legacyOwnerUuid: string;
  legacyWebsiteUuid: string;
  eventId?: string;
  organizationId?: string;
  ownerName?: string;
  partyId: string;
  partyKind: FilemakerWebsitePartyKind;
  personId?: string;
  schemaVersion: 1;
  updatedAt?: string;
  updatedBy?: string;
  websiteId: string;
};

type WebsiteWithLinksDocument = MongoFilemakerWebsiteDocument & {
  links?: MongoFilemakerWebsiteLinkDocument[];
};

type WebsiteAggregationResult = {
  documents?: WebsiteWithLinksDocument[];
  metadata?: Array<{ totalCount?: number }>;
};

type ListWebsiteInput = {
  links?: string | null;
  limit?: string | null;
  page?: string | null;
  pageSize?: string | null;
  query?: string | null;
};

const DEFAULT_WEBSITE_PAGE_SIZE = 48;
const MAX_WEBSITE_PAGE_SIZE = 200;

export type MongoFilemakerWebsiteCollections = {
  links: Collection<MongoFilemakerWebsiteLinkDocument>;
  websites: Collection<MongoFilemakerWebsiteDocument>;
};

export const getMongoFilemakerWebsiteCollections =
  async (): Promise<MongoFilemakerWebsiteCollections> => {
    const db = await getMongoDb();
    return {
      links: db.collection<MongoFilemakerWebsiteLinkDocument>(
        FILEMAKER_WEBSITE_LINKS_COLLECTION
      ),
      websites: db.collection<MongoFilemakerWebsiteDocument>(FILEMAKER_WEBSITES_COLLECTION),
    };
  };

export const ensureMongoFilemakerWebsiteIndexes = async (
  collections: MongoFilemakerWebsiteCollections
): Promise<void> => {
  await Promise.all([
    collections.websites.createIndex(
      { normalizedUrl: 1 },
      {
        name: 'filemaker_websites_normalized_url_unique',
        partialFilterExpression: { normalizedUrl: { $type: 'string' } },
        unique: true,
      }
    ),
    collections.websites.createIndex(
      { legacyUuids: 1 },
      {
        name: 'filemaker_websites_legacy_uuids',
        partialFilterExpression: { legacyUuids: { $type: 'array' } },
      }
    ),
    collections.websites.createIndex({ host: 1 }, { name: 'filemaker_websites_host' }),
    collections.links.createIndex(
      { websiteId: 1, partyKind: 1, partyId: 1 },
      { name: 'filemaker_website_links_party_unique', unique: true }
    ),
    collections.links.createIndex(
      { legacyOwnerUuid: 1 },
      { name: 'filemaker_website_links_legacy_owner_uuid' }
    ),
    collections.links.createIndex(
      { legacyWebsiteUuid: 1 },
      { name: 'filemaker_website_links_legacy_website_uuid' }
    ),
    collections.links.createIndex(
      { organizationId: 1 },
      {
        name: 'filemaker_website_links_organization',
        partialFilterExpression: { organizationId: { $type: 'string' } },
      }
    ),
    collections.links.createIndex(
      { personId: 1 },
      {
        name: 'filemaker_website_links_person',
        partialFilterExpression: { personId: { $type: 'string' } },
      }
    ),
    collections.links.createIndex(
      { eventId: 1 },
      {
        name: 'filemaker_website_links_event',
        partialFilterExpression: { eventId: { $type: 'string' } },
      }
    ),
  ]);
};

const uniqueStrings = (values: Array<string | undefined>): string[] =>
  Array.from(
    new Set(
      values.filter(
        (value: string | undefined): value is string =>
          typeof value === 'string' && value.trim().length > 0
      )
    )
  );

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePositiveInt = (value: string | null | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeWebsitePageSize = (input: ListWebsiteInput): number =>
  Math.min(
    parsePositiveInt(input.pageSize ?? input.limit, DEFAULT_WEBSITE_PAGE_SIZE),
    MAX_WEBSITE_PAGE_SIZE
  );

const normalizeWebsiteLinkFilter = (value: string | null | undefined): WebsiteLinkFilter => {
  if (
    value === 'with_links' ||
    value === 'without_links' ||
    value === 'organizations' ||
    value === 'persons' ||
    value === 'events'
  ) {
    return value;
  }
  return 'all';
};

const toMongoFilemakerWebsite = (
  document: MongoFilemakerWebsiteDocument
): MongoFilemakerWebsite => ({
  ...(document.createdAt !== undefined ? { createdAt: document.createdAt } : {}),
  ...(document.host !== undefined ? { host: document.host } : {}),
  id: document.id,
  ...(document.legacyTypeRaw !== undefined ? { legacyTypeRaw: document.legacyTypeRaw } : {}),
  ...(document.legacyUuid !== undefined ? { legacyUuid: document.legacyUuid } : {}),
  legacyUuids: document.legacyUuids,
  ...(document.normalizedUrl !== undefined ? { normalizedUrl: document.normalizedUrl } : {}),
  ...(document.updatedAt !== undefined ? { updatedAt: document.updatedAt } : {}),
  ...(document.updatedBy !== undefined ? { updatedBy: document.updatedBy } : {}),
  url: document.url,
});

const toMongoFilemakerWebsiteLink = (
  document: MongoFilemakerWebsiteLinkDocument
): MongoFilemakerWebsiteLink => ({
  ...(document.createdAt !== undefined ? { createdAt: document.createdAt } : {}),
  ...(document.createdBy !== undefined ? { createdBy: document.createdBy } : {}),
  id: document.id,
  ...(document.legacyJoinUuid !== undefined ? { legacyJoinUuid: document.legacyJoinUuid } : {}),
  legacyOwnerUuid: document.legacyOwnerUuid,
  ...(document.ownerName !== undefined ? { ownerName: document.ownerName } : {}),
  partyId: document.partyId,
  partyKind: document.partyKind,
  ...(document.updatedAt !== undefined ? { updatedAt: document.updatedAt } : {}),
  ...(document.updatedBy !== undefined ? { updatedBy: document.updatedBy } : {}),
  websiteId: document.websiteId,
});

const summarizeWebsite = (document: WebsiteWithLinksDocument): MongoFilemakerWebsiteSummary => {
  const links = document.links ?? [];
  return {
    ...toMongoFilemakerWebsite(document),
    eventLinkCount: links.filter(
      (link: MongoFilemakerWebsiteLinkDocument): boolean => link.partyKind === 'event'
    ).length,
    linkCount: links.length,
    organizationLinkCount: links.filter(
      (link: MongoFilemakerWebsiteLinkDocument): boolean => link.partyKind === 'organization'
    ).length,
    personLinkCount: links.filter(
      (link: MongoFilemakerWebsiteLinkDocument): boolean => link.partyKind === 'person'
    ).length,
  };
};

const toWebsiteDetail = (document: WebsiteWithLinksDocument): MongoFilemakerWebsiteDetail => ({
  ...summarizeWebsite(document),
  links: (document.links ?? []).map(toMongoFilemakerWebsiteLink),
});

const buildWebsiteDocumentFilter = (
  links: MongoFilemakerWebsiteLinkDocument[]
): Filter<MongoFilemakerWebsiteDocument> => {
  const websiteIds = uniqueStrings(
    links.map((link: MongoFilemakerWebsiteLinkDocument): string => link.websiteId)
  );
  const legacyWebsiteUuids = uniqueStrings(
    links.map((link: MongoFilemakerWebsiteLinkDocument): string => link.legacyWebsiteUuid)
  );
  const clauses: Filter<MongoFilemakerWebsiteDocument>[] = [
    { _id: { $in: websiteIds } },
    { id: { $in: websiteIds } },
  ];
  if (legacyWebsiteUuids.length > 0) {
    clauses.push(
      { legacyUuid: { $in: legacyWebsiteUuids } },
      { legacyUuids: { $in: legacyWebsiteUuids } }
    );
  }
  return { $or: clauses };
};

const listWebsitesForLinkFilter = async (
  filter: Filter<MongoFilemakerWebsiteLinkDocument>
): Promise<MongoFilemakerWebsite[]> => {
  const collections = await getMongoFilemakerWebsiteCollections();
  const links = await collections.links.find(filter).sort({ websiteId: 1 }).toArray();
  if (links.length === 0) return [];

  const documents = await collections.websites
    .find(buildWebsiteDocumentFilter(links))
    .sort({ host: 1, url: 1 })
    .toArray();
  return documents.map(toMongoFilemakerWebsite);
};

export const listMongoFilemakerWebsitesForOrganization = async (
  organization: FilemakerOrganization
): Promise<MongoFilemakerWebsite[]> => {
  const clauses: Filter<MongoFilemakerWebsiteLinkDocument>[] = [
    { organizationId: organization.id },
    { partyId: organization.id },
  ];
  if (organization.legacyUuid !== undefined && organization.legacyUuid.trim().length > 0) {
    clauses.push({ legacyOwnerUuid: organization.legacyUuid });
  }
  return listWebsitesForLinkFilter({
    partyKind: 'organization',
    $or: clauses,
  });
};

export const listMongoFilemakerWebsitesForPerson = async (
  person: MongoFilemakerPerson
): Promise<MongoFilemakerWebsite[]> => {
  const clauses: Filter<MongoFilemakerWebsiteLinkDocument>[] = [
    { personId: person.id },
    { partyId: person.id },
  ];
  if (person.legacyUuid !== undefined && person.legacyUuid.trim().length > 0) {
    clauses.push({ legacyOwnerUuid: person.legacyUuid });
  }
  return listWebsitesForLinkFilter({
    partyKind: 'person',
    $or: clauses,
  });
};

export const listMongoFilemakerWebsitesForEvent = async (
  event: FilemakerEvent & { legacyUuid?: string }
): Promise<MongoFilemakerWebsite[]> => {
  const clauses: Filter<MongoFilemakerWebsiteLinkDocument>[] = [
    { eventId: event.id },
    { partyId: event.id },
  ];
  if (event.legacyUuid !== undefined && event.legacyUuid.trim().length > 0) {
    clauses.push({ legacyOwnerUuid: event.legacyUuid });
  }
  return listWebsitesForLinkFilter({
    partyKind: 'event',
    $or: clauses,
  });
};

const buildWebsiteSearchFilter = (query: string): Filter<MongoFilemakerWebsiteDocument> => {
  const trimmed = query.trim();
  if (trimmed.length === 0) return {};
  const regex = new RegExp(escapeRegex(trimmed), 'i');
  return {
    $or: [
      { host: regex },
      { legacyUuid: regex },
      { legacyUuids: regex },
      { normalizedUrl: regex },
      { url: regex },
    ],
  };
};

const applyWebsiteLinkFilter = (pipeline: Document[], filter: WebsiteLinkFilter): void => {
  if (filter === 'with_links') {
    pipeline.push({ $match: { 'links.0': { $exists: true } } });
  }
  if (filter === 'without_links') {
    pipeline.push({ $match: { links: { $size: 0 } } });
  }
  if (filter === 'organizations') {
    pipeline.push({ $match: { 'links.partyKind': 'organization' } });
  }
  if (filter === 'persons') {
    pipeline.push({ $match: { 'links.partyKind': 'person' } });
  }
  if (filter === 'events') {
    pipeline.push({ $match: { 'links.partyKind': 'event' } });
  }
};

const buildWebsiteListPipeline = (input: {
  filter: Filter<MongoFilemakerWebsiteDocument>;
  linkFilter: WebsiteLinkFilter;
  page: number;
  pageSize: number;
}): Document[] => {
  const pipeline: Document[] = [
    { $match: input.filter },
    {
      $lookup: {
        as: 'links',
        foreignField: 'websiteId',
        from: FILEMAKER_WEBSITE_LINKS_COLLECTION,
        localField: 'id',
      },
    },
  ];
  applyWebsiteLinkFilter(pipeline, input.linkFilter);
  pipeline.push(
    { $sort: { host: 1, url: 1, _id: 1 } },
    {
      $facet: {
        documents: [
          { $skip: (input.page - 1) * input.pageSize },
          { $limit: input.pageSize },
        ],
        metadata: [{ $count: 'totalCount' }],
      },
    }
  );
  return pipeline;
};

export const listMongoFilemakerWebsites = async (
  input: ListWebsiteInput
): Promise<MongoFilemakerWebsitesResponse> => {
  const pageSize = normalizeWebsitePageSize(input);
  const requestedPage = parsePositiveInt(input.page, 1);
  const query = input.query?.trim() ?? '';
  const linkFilter = normalizeWebsiteLinkFilter(input.links);
  const collections = await getMongoFilemakerWebsiteCollections();
  const collectionCount = await collections.websites.estimatedDocumentCount();
  const firstResult = await collections.websites
    .aggregate<WebsiteAggregationResult>(
      buildWebsiteListPipeline({
        filter: buildWebsiteSearchFilter(query),
        linkFilter,
        page: 1,
        pageSize,
      })
    )
    .toArray();
  const first = firstResult[0] ?? { documents: [], metadata: [] };
  const totalCount =
    Array.isArray(first.metadata) && typeof first.metadata[0]?.totalCount === 'number'
      ? first.metadata[0].totalCount
      : 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const documents =
    page === 1
      ? (first.documents ?? [])
      : ((await collections.websites
          .aggregate<WebsiteAggregationResult>(
            buildWebsiteListPipeline({
              filter: buildWebsiteSearchFilter(query),
              linkFilter,
              page,
              pageSize,
            })
          )
          .toArray())[0]?.documents ?? []);

  return {
    collectionCount,
    filters: { links: linkFilter },
    limit: pageSize,
    page,
    pageSize,
    query,
    totalCount,
    totalPages,
    websites: documents.map(summarizeWebsite),
  };
};

export const getMongoFilemakerWebsiteById = async (
  websiteId: string
): Promise<MongoFilemakerWebsiteDetail | null> => {
  const collections = await getMongoFilemakerWebsiteCollections();
  const documents = await collections.websites
    .aggregate<WebsiteWithLinksDocument>([
      {
        $match: {
          $or: [
            { _id: websiteId },
            { id: websiteId },
            { legacyUuid: websiteId },
            { legacyUuids: websiteId },
          ],
        },
      },
      { $limit: 1 },
      {
        $lookup: {
          as: 'links',
          foreignField: 'websiteId',
          from: FILEMAKER_WEBSITE_LINKS_COLLECTION,
          localField: 'id',
        },
      },
    ])
    .toArray();
  const document = documents[0];
  return document === undefined ? null : toWebsiteDetail(document);
};
