import 'server-only';

import type { Collection, Filter } from 'mongodb';

import { notFoundError } from '@/shared/errors/app-error';

import type { FilemakerOrganization } from '../types';
import {
  normalizeOrganizationPage,
  resolveOrganizationListOptions,
  type FilemakerOrganizationAddressFilter,
  type FilemakerOrganizationBankFilter,
  type FilemakerOrganizationParentFilter,
  type FilemakerOrganizationsListInput,
  type FilemakerOrganizationsListOptions,
} from './filemaker-organizations-list-options';
import {
  getFilemakerOrganizationsCollection,
  toFilemakerOrganization,
  type FilemakerOrganizationMongoDocument,
} from './filemaker-organizations-mongo';

export type FilemakerOrganizationsListResult = {
  collectionCount: number;
  filters: {
    address: FilemakerOrganizationAddressFilter;
    bank: FilemakerOrganizationBankFilter;
    parent: FilemakerOrganizationParentFilter;
    updatedBy: string;
  };
  limit: number;
  organizations: FilemakerOrganization[];
  page: number;
  pageSize: number;
  query: string;
  totalCount: number;
  totalPages: number;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  bankFilter: FilemakerOrganizationBankFilter;
  parentFilter: FilemakerOrganizationParentFilter;
  query: string;
  updatedBy: string;
}): Filter<FilemakerOrganizationMongoDocument> => {
  const clauses: Filter<FilemakerOrganizationMongoDocument>[] = [];
  const { addressFilter, bankFilter, parentFilter, query, updatedBy } = input;
  const normalizedQuery = query.trim();
  if (normalizedQuery.length > 0) {
    const regex = new RegExp(escapeRegex(normalizedQuery), 'i');
    clauses.push({
      $or: [
        { name: regex },
        { tradingName: regex },
        { taxId: regex },
        { krs: regex },
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
  clauses.push(buildAddressFilter(addressFilter), buildBankFilter(bankFilter), buildParentFilter(parentFilter));
  const activeClauses = clauses.filter((clause) => Object.keys(clause).length > 0);
  return activeClauses.length > 0 ? { $and: activeClauses } : {};
};

const buildListResult = (input: {
  collectionCount: number;
  documents: FilemakerOrganizationMongoDocument[];
  options: FilemakerOrganizationsListOptions;
  page: number;
  totalCount: number;
  totalPages: number;
}): FilemakerOrganizationsListResult => ({
  collectionCount: input.collectionCount,
  filters: {
    address: input.options.addressFilter,
    bank: input.options.bankFilter,
    parent: input.options.parentFilter,
    updatedBy: input.options.updatedBy,
  },
  limit: input.options.pageSize,
  organizations: input.documents.map(toFilemakerOrganization),
  page: input.page,
  pageSize: input.options.pageSize,
  query: input.options.query,
  totalCount: input.totalCount,
  totalPages: input.totalPages,
});

export const listMongoFilemakerOrganizations = async (
  input: FilemakerOrganizationsListInput
): Promise<FilemakerOrganizationsListResult> => {
  const options = resolveOrganizationListOptions(input);
  const filter = buildOrganizationFilter({
    addressFilter: options.addressFilter,
    bankFilter: options.bankFilter,
    parentFilter: options.parentFilter,
    query: options.query,
    updatedBy: options.updatedBy,
  });
  const collection = await getFilemakerOrganizationsCollection();
  const [collectionCount, totalCount] = await Promise.all([
    collection.estimatedDocumentCount(),
    collection.countDocuments(filter),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / options.pageSize));
  const page = normalizeOrganizationPage(options.requestedPage, totalPages);
  const documents = await collection
    .find(filter)
    .sort({ name: 1, _id: 1 })
    .skip((page - 1) * options.pageSize)
    .limit(options.pageSize)
    .toArray();

  return buildListResult({
    collectionCount,
    documents,
    options,
    page,
    totalCount,
    totalPages,
  });
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
    krs: patch.krs,
    name: patch.name ?? existing.name,
    postalCode: patch.postalCode ?? '',
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
