import 'server-only';

import type { Document, Filter, Sort } from 'mongodb';

import { normalizeFilemakerEmailStatus } from '../filemaker-email-status';
import { createFilemakerEmail } from '../filemaker-settings.entities';
import type { FilemakerEmail, FilemakerEmailStatus } from '../types';
import {
  normalizeEmailPage,
  resolveEmailListOptions,
  type FilemakerEmailSortOption,
  type FilemakerEmailsListInput,
  type FilemakerEmailsListOptions,
} from './filemaker-emails-list-options';
import {
  getMongoFilemakerEmailCollections,
  type MongoFilemakerEmailCollections,
  type MongoFilemakerEmailDocument,
} from './filemaker-email-repository';

export type FilemakerEmailLinkCounts = {
  organizations: number;
  persons: number;
  total: number;
};

export type FilemakerEmailsListResult = {
  collectionCount: number;
  emails: FilemakerEmail[];
  filters: {
    status: FilemakerEmailStatus | 'all';
    updatedBy: string;
  };
  limit: number;
  linkCount: number;
  linkCountsByEmailId: Record<string, FilemakerEmailLinkCounts>;
  page: number;
  pageSize: number;
  query: string;
  sort: FilemakerEmailSortOption;
  totalCount: number;
  totalCountIsExact: boolean;
  totalPages: number;
};

type EmailAggregationResult = {
  documents?: MongoFilemakerEmailDocument[];
  metadata?: Array<{ totalCount?: number }>;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const mongoEmailToFilemakerEmail = (document: MongoFilemakerEmailDocument): FilemakerEmail =>
  createFilemakerEmail({
    id: document.id,
    email: document.email,
    status: normalizeFilemakerEmailStatus(document.status),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  });

const buildEmailFilter = (
  options: FilemakerEmailsListOptions
): Filter<MongoFilemakerEmailDocument> => {
  const clauses: Filter<MongoFilemakerEmailDocument>[] = [];
  if (options.query.length > 0) {
    const regex = new RegExp(escapeRegex(options.query), 'i');
    clauses.push({
      $or: [
        { email: regex },
        { status: regex },
        { legacyUuid: regex },
        { legacyUuids: regex },
        { domainCountry: regex },
      ],
    });
  }
  if (options.statusFilter !== 'all') {
    clauses.push({ status: options.statusFilter });
  }
  if (options.updatedBy.length > 0) {
    clauses.push({ updatedBy: new RegExp(escapeRegex(options.updatedBy), 'i') });
  }
  return clauses.length > 0 ? { $and: clauses } : {};
};

const buildEmailSort = (sort: FilemakerEmailSortOption): Sort => {
  if (sort === 'email_desc') return { email: -1, _id: 1 };
  if (sort === 'createdAt_desc') return { createdAt: -1, email: 1, _id: 1 };
  if (sort === 'createdAt_asc') return { createdAt: 1, email: 1, _id: 1 };
  if (sort === 'updatedAt_desc') return { updatedAt: -1, email: 1, _id: 1 };
  if (sort === 'updatedAt_asc') return { updatedAt: 1, email: 1, _id: 1 };
  if (sort === 'status_desc') return { status: -1, email: 1, _id: 1 };
  if (sort === 'status_asc') return { status: 1, email: 1, _id: 1 };
  return { email: 1, _id: 1 };
};

const buildEmailListPipeline = (input: {
  filter: Filter<MongoFilemakerEmailDocument>;
  options: FilemakerEmailsListOptions;
  page: number;
}): Document[] => [
  { $match: input.filter },
  { $sort: buildEmailSort(input.options.sort) },
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

const listEmailLinkCountsByEmailId = async (
  links: MongoFilemakerEmailCollections['links'],
  emailIds: string[]
): Promise<Record<string, FilemakerEmailLinkCounts>> => {
  if (emailIds.length === 0) return {};
  const rows = await links
    .aggregate<{
      _id: string;
      organizations: number;
      persons: number;
      total: number;
    }>([
      { $match: { emailId: { $in: emailIds } } },
      {
        $group: {
          _id: '$emailId',
          organizations: {
            $sum: { $cond: [{ $eq: ['$partyKind', 'organization'] }, 1, 0] },
          },
          persons: { $sum: { $cond: [{ $eq: ['$partyKind', 'person'] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ])
    .toArray();
  return Object.fromEntries(
    rows.map((row): [string, FilemakerEmailLinkCounts] => [
      row._id,
      {
        organizations: row.organizations,
        persons: row.persons,
        total: row.total,
      },
    ])
  );
};

const readEmailListPage = async (input: {
  collections: MongoFilemakerEmailCollections;
  filter: Filter<MongoFilemakerEmailDocument>;
  options: FilemakerEmailsListOptions;
  page: number;
}): Promise<EmailAggregationResult> => {
  const [result] = await input.collections.emails
    .aggregate<EmailAggregationResult>(
      buildEmailListPipeline({
        filter: input.filter,
        options: input.options,
        page: input.page,
      })
    )
    .toArray();
  return result ?? { documents: [], metadata: [] };
};

const buildEmailListResult = (input: {
  collectionCount: number;
  documents: MongoFilemakerEmailDocument[];
  linkCount: number;
  linkCountsByEmailId: Record<string, FilemakerEmailLinkCounts>;
  options: FilemakerEmailsListOptions;
  page: number;
  totalCount: number;
  totalPages: number;
}): FilemakerEmailsListResult => ({
  collectionCount: input.collectionCount,
  emails: input.documents.map(mongoEmailToFilemakerEmail),
  filters: {
    status: input.options.statusFilter,
    updatedBy: input.options.updatedBy,
  },
  limit: input.options.pageSize,
  linkCount: input.linkCount,
  linkCountsByEmailId: input.linkCountsByEmailId,
  page: input.page,
  pageSize: input.options.pageSize,
  query: input.options.query,
  sort: input.options.sort,
  totalCount: input.totalCount,
  totalCountIsExact: true,
  totalPages: input.totalPages,
});

export const listMongoFilemakerEmails = async (
  input: FilemakerEmailsListInput
): Promise<FilemakerEmailsListResult> => {
  const options = resolveEmailListOptions(input);
  const collections = await getMongoFilemakerEmailCollections();
  const filter = buildEmailFilter(options);
  const [collectionCount, linkCount, first] = await Promise.all([
    collections.emails.estimatedDocumentCount(),
    collections.links.estimatedDocumentCount(),
    readEmailListPage({ collections, filter, options, page: 1 }),
  ]);
  const totalCount =
    Array.isArray(first.metadata) && typeof first.metadata[0]?.totalCount === 'number'
      ? first.metadata[0].totalCount
      : 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / options.pageSize));
  const page = normalizeEmailPage(options.requestedPage, totalPages);
  const result =
    page === 1 ? first : await readEmailListPage({ collections, filter, options, page });
  const documents = result.documents ?? [];
  const linkCountsByEmailId = await listEmailLinkCountsByEmailId(
    collections.links,
    documents.map((document: MongoFilemakerEmailDocument): string => document.id)
  );
  return buildEmailListResult({
    collectionCount,
    documents,
    linkCount,
    linkCountsByEmailId,
    options,
    page,
    totalCount,
    totalPages,
  });
};
