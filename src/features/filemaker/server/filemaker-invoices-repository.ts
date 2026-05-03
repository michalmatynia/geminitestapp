import 'server-only';

/* eslint-disable complexity */

import type { Document, Filter } from 'mongodb';

import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  normalizeInvoicePage,
  resolveInvoiceListOptions,
  type FilemakerInvoiceOrganizationFilter,
  type FilemakerInvoicePaymentFilter,
  type FilemakerInvoicesListInput,
  type FilemakerInvoicesListOptions,
} from './filemaker-invoices-list-options';
import {
  FILEMAKER_INVOICE_ORGANIZATION_LINKS_COLLECTION,
  FILEMAKER_INVOICES_COLLECTION,
  getFilemakerInvoicesCollection,
  toMongoFilemakerInvoice,
  type FilemakerInvoiceMongoDocument,
  type MongoFilemakerInvoice,
} from './filemaker-invoices-mongo';

export type FilemakerInvoicesListResult = {
  collectionCount: number;
  filters: {
    organization: FilemakerInvoiceOrganizationFilter;
    payment: FilemakerInvoicePaymentFilter;
    year: string;
  };
  invoices: MongoFilemakerInvoice[];
  limit: number;
  page: number;
  pageSize: number;
  query: string;
  totalCount: number;
  totalPages: number;
};

type InvoiceAggregationResult = {
  documents?: FilemakerInvoiceMongoDocument[];
  metadata?: Array<{ totalCount?: number }>;
};

const PAID_INVOICE_RE = /^(1|true|yes|tak|paid)$/i;

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildPaymentFilter = (
  filter: FilemakerInvoicePaymentFilter
): Filter<FilemakerInvoiceMongoDocument> => {
  if (filter === 'paid') return { isPaid: PAID_INVOICE_RE };
  if (filter === 'unpaid') {
    return {
      $or: [
        { isPaid: { $exists: false } },
        { isPaid: '' },
        { isPaid: null },
        { isPaid: { $not: PAID_INVOICE_RE } },
      ],
    };
  }
  return {};
};

const buildBaseFilter = (
  options: FilemakerInvoicesListOptions
): Filter<FilemakerInvoiceMongoDocument> => {
  const clauses: Filter<FilemakerInvoiceMongoDocument>[] = [];
  if (options.year.length > 0) {
    clauses.push({ cIssueYear: new RegExp(escapeRegex(options.year), 'i') });
  }
  clauses.push(buildPaymentFilter(options.paymentFilter));
  const activeClauses = clauses.filter((clause) => Object.keys(clause).length > 0);
  return activeClauses.length > 0 ? { $and: activeClauses } : {};
};

const buildQueryMatch = (query: string): Document | null => {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length === 0) return null;
  const regex = new RegExp(escapeRegex(normalizedQuery), 'i');
  return {
    $or: [
      { invoiceNo: regex },
      { signature: regex },
      { issueDate: regex },
      { cIssueYear: regex },
      { cPaymentDue: regex },
      { organizationBName: regex },
      { organizationSName: regex },
      { organizationBUuid: regex },
      { organizationSUuid: regex },
      { filesPathListName: regex },
      { filesPathListUuid: regex },
      { servicesServiceType: regex },
      { servicesSum: regex },
      { servicesCurrency: regex },
      { 'organizationLinks.organizationName': regex },
      { 'organizationLinks.legacyOrganizationUuid': regex },
    ],
  };
};

const buildAggregationPipeline = (input: {
  filter: Filter<FilemakerInvoiceMongoDocument>;
  options: FilemakerInvoicesListOptions;
  page: number;
}): Document[] => {
  const pipeline: Document[] = [
    { $match: input.filter },
    {
      $lookup: {
        from: FILEMAKER_INVOICE_ORGANIZATION_LINKS_COLLECTION,
        localField: 'id',
        foreignField: 'invoiceId',
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
  const queryMatch = buildQueryMatch(input.options.query);
  if (queryMatch !== null) pipeline.push({ $match: queryMatch });
  pipeline.push(
    { $sort: { cIssueYear: -1, invoiceNo: -1, issueDate: -1, _id: 1 } },
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
  documents: FilemakerInvoiceMongoDocument[];
  options: FilemakerInvoicesListOptions;
  page: number;
  totalCount: number;
  totalPages: number;
}): FilemakerInvoicesListResult => ({
  collectionCount: input.collectionCount,
  filters: {
    organization: input.options.organizationFilter,
    payment: input.options.paymentFilter,
    year: input.options.year,
  },
  invoices: input.documents.map(toMongoFilemakerInvoice),
  limit: input.options.pageSize,
  page: input.page,
  pageSize: input.options.pageSize,
  query: input.options.query,
  totalCount: input.totalCount,
  totalPages: input.totalPages,
});

export async function listMongoFilemakerInvoices(
  input: FilemakerInvoicesListInput
): Promise<FilemakerInvoicesListResult> {
  const options = resolveInvoiceListOptions(input);
  const filter = buildBaseFilter(options);
  const db = await getMongoDb();
  const collection = db.collection<FilemakerInvoiceMongoDocument>(FILEMAKER_INVOICES_COLLECTION);
  const collectionCount = await collection.estimatedDocumentCount();
  const firstResult = await collection
    .aggregate<InvoiceAggregationResult>(buildAggregationPipeline({ filter, options, page: 1 }))
    .toArray();
  const first = firstResult[0] ?? { documents: [], metadata: [] };
  const totalCount =
    Array.isArray(first.metadata) && typeof first.metadata[0]?.totalCount === 'number'
      ? first.metadata[0].totalCount
      : 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / options.pageSize));
  const page = normalizeInvoicePage(options.requestedPage, totalPages);
  const documents =
    page === 1
      ? (first.documents ?? [])
      : ((await collection
          .aggregate<InvoiceAggregationResult>(buildAggregationPipeline({ filter, options, page }))
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

export async function getMongoFilemakerInvoiceById(
  invoiceId: string
): Promise<MongoFilemakerInvoice | null> {
  const collection = await getFilemakerInvoicesCollection();
  const documents = await collection
    .aggregate([
      {
        $match: {
          $or: [{ _id: invoiceId }, { id: invoiceId }, { legacyIdentityKey: invoiceId }],
        },
      },
      { $limit: 1 },
      {
        $lookup: {
          from: FILEMAKER_INVOICE_ORGANIZATION_LINKS_COLLECTION,
          localField: 'id',
          foreignField: 'invoiceId',
          as: 'organizationLinks',
        },
      },
    ])
    .toArray();
  const document = documents[0] as FilemakerInvoiceMongoDocument | undefined;
  return document ? toMongoFilemakerInvoice(document) : null;
}

export async function requireMongoFilemakerInvoiceById(
  invoiceId: string
): Promise<MongoFilemakerInvoice> {
  const invoice = await getMongoFilemakerInvoiceById(invoiceId);
  if (invoice === null) throw notFoundError('Filemaker invoice was not found.');
  return invoice;
}
