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
  totalCountIsExact: boolean;
  totalPages: number;
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
  totalCountIsExact: boolean;
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
  totalCountIsExact: input.totalCountIsExact,
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
  const hasActiveFilter = Object.keys(filter).length > 0;
  const collectionCount = await collection.estimatedDocumentCount();
  const exactTotalPages = Math.max(1, Math.ceil(collectionCount / options.pageSize));
  const page = hasActiveFilter
    ? normalizeOrganizationPage(options.requestedPage, Number.MAX_SAFE_INTEGER)
    : normalizeOrganizationPage(options.requestedPage, exactTotalPages);
  const requestedLimit = hasActiveFilter ? options.pageSize + 1 : options.pageSize;
  const rawDocuments = await collection
    .find(filter, { projection: ORGANIZATION_LIST_PROJECTION })
    .sort({ name: 1, _id: 1 })
    .skip((page - 1) * options.pageSize)
    .limit(requestedLimit)
    .toArray();
  const hasNextPage = hasActiveFilter && rawDocuments.length > options.pageSize;
  const documents = hasActiveFilter ? rawDocuments.slice(0, options.pageSize) : rawDocuments;
  const totalCount = hasActiveFilter
    ? (page - 1) * options.pageSize + documents.length + (hasNextPage ? 1 : 0)
    : collectionCount;
  const totalPages = hasActiveFilter
    ? Math.max(1, page + (hasNextPage ? 1 : 0))
    : exactTotalPages;

  return buildListResult({
    collectionCount,
    documents,
    options,
    page,
    totalCount,
    totalCountIsExact: !hasActiveFilter,
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
