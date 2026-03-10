import { ObjectId, type Filter } from 'mongodb';

import { CategoryMapping, CategoryMappingWithDetails } from '@/shared/contracts/integrations';

export type MongoCategoryMappingDoc = {
  _id: string | ObjectId;
  connectionId: string;
  externalCategoryId: string;
  internalCategoryId: string | null;
  catalogId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MongoExternalCategoryDoc = {
  _id: string | ObjectId;
  connectionId: string;
  externalId: string;
  name: string;
  parentExternalId: string | null;
  path: string | null;
  depth: number;
  isLeaf: boolean;
  metadata?: Record<string, unknown> | null;
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type MongoProductCategoryDoc = {
  _id: string | ObjectId;
  name: string;
  description: string | null;
  color: string | null;
  parentId: string | ObjectId | null;
  catalogId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UniqueInternalCategoryScope = {
  connectionId: string;
  catalogId: string;
  internalCategoryId: string | null | undefined;
  excludeExternalCategoryId?: string | null | undefined;
  excludeId?: string | null | undefined;
};

export const CATEGORY_MAPPING_COLLECTION = 'category_mappings';
export const EXTERNAL_CATEGORY_COLLECTION = 'external_categories';
export const PRODUCT_CATEGORY_COLLECTION = 'product_categories';

export const buildMongoIdFilter = (id: string): Filter<MongoCategoryMappingDoc> => {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: id }, { _id: new ObjectId(id) }] } as Filter<MongoCategoryMappingDoc>;
  }
  return { _id: id } as Filter<MongoCategoryMappingDoc>;
};

export const mapMongoCategoryMappingToRecord = (
  record: MongoCategoryMappingDoc
): CategoryMapping => ({
  id: record._id.toString(),
  connectionId: record.connectionId,
  externalCategoryId: record.externalCategoryId,
  internalCategoryId: record.internalCategoryId,
  catalogId: record.catalogId,
  isActive: Boolean(record.isActive),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt?.toISOString() ?? null,
});

export const mapMongoExternalCategory = (
  record: MongoExternalCategoryDoc
): CategoryMappingWithDetails['externalCategory'] => ({
  id: record._id.toString(),
  connectionId: record.connectionId,
  externalId: record.externalId,
  name: record.name,
  parentExternalId: record.parentExternalId ?? null,
  path: record.path ?? null,
  depth: record.depth ?? 0,
  isLeaf: Boolean(record.isLeaf),
  metadata: record.metadata ?? null,
  fetchedAt: record.fetchedAt.toISOString(),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export const mapMongoInternalCategory = (
  record: MongoProductCategoryDoc
): CategoryMappingWithDetails['internalCategory'] => ({
  id: record._id.toString(),
  name: record.name,
  description: record.description ?? null,
  color: record.color ?? null,
  parentId: record.parentId?.toString() ?? null,
  catalogId: record.catalogId,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export const normalizeInternalCategoryId = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};
