import 'server-only';

import { randomUUID } from 'crypto';

import { ObjectId, type Document, type Filter } from 'mongodb';

import { mongoImageFileRepository } from '@/features/files/server';
import { mongoCatalogRepository } from '@/features/products/services/catalog-repository/mongo-catalog-repository';
import {
  toProductBase,
  toProductResponse,
  type ProductDocument,
} from '@/features/products/services/product-repository/mongo-product-repository-mappers';
import { decodeSimpleParameterStorageId } from '@/features/products/utils/parameter-partition';
import type { ImageFileRecord } from '@/shared/contracts/files';
import {
  getProductAdvancedFilterMetrics,
  productAdvancedFilterGroupSchema,
  type CatalogRecord,
  CreateProductInput,
  type ProductAdvancedFilterCondition,
  type ProductAdvancedFilterGroup,
  type ProductAdvancedFilterRule,
  type ProductImageRecord,
  ProductFilters,
  type ProductWithImages,
  ProductRepository,
  TransactionalProductRepository,
  UpdateProductInput,
} from '@/shared/contracts/products';
import { conflictError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logger } from '@/shared/utils/logger';

import type { Prisma } from '@prisma/client';

const productCollectionName = 'products';
const integrationCollectionName = 'integrations';
const listingCollectionName = 'product_listings';
const BASE_INTEGRATION_SLUGS = ['baselinker', 'base-com', 'base'] as const;

type IntegrationSlugDocument = {
  _id: string | ObjectId;
  slug: string;
};

type ProductListingFilterDocument = {
  productId: string | ObjectId;
  integrationId: string | ObjectId;
  externalListingId?: string | null;
};

type BaseExportLookupContext = {
  integrationLookupValues: Array<string | ObjectId>;
  exportedProductIds: string[];
  exportedProductLookupValues: Array<string | ObjectId>;
};

let productIndexesEnsured: Promise<void> | null = null;

const ensureProductIndexes = async (): Promise<void> => {
  if (!productIndexesEnsured) {
    productIndexesEnsured = (async (): Promise<void> => {
      const db = await getMongoDb();
      const collection = db.collection<ProductDocument>(productCollectionName);
      await Promise.all([
        // Single-field indexes for individual filter conditions
        collection.createIndex({ createdAt: -1 }, { name: 'products_createdAt_desc' }),
        collection.createIndex({ updatedAt: -1 }, { name: 'products_updatedAt_desc' }),
        collection.createIndex({ sku: 1 }, { name: 'products_sku' }),
        collection.createIndex({ id: 1 }, { name: 'products_id' }),
        collection.createIndex({ baseProductId: 1 }, { name: 'products_baseProductId' }),
        collection.createIndex({ categoryId: 1 }, { name: 'products_categoryId' }),
        collection.createIndex({ 'catalogs.catalogId': 1 }, { name: 'products_catalogId' }),
        collection.createIndex({ name_en: 1 }, { name: 'products_name_en' }),
        collection.createIndex({ name_pl: 1 }, { name: 'products_name_pl' }),
        collection.createIndex({ name_de: 1 }, { name: 'products_name_de' }),
        // Composite indexes for the most common filter+sort combinations.
        // The list always sorts by createdAt DESC, so each composite index
        // ends with { createdAt: -1 } to serve both filter and sort in one scan.
        collection.createIndex(
          { 'catalogs.catalogId': 1, createdAt: -1 },
          { name: 'products_catalogId_createdAt' }
        ),
        collection.createIndex(
          { categoryId: 1, createdAt: -1 },
          { name: 'products_categoryId_createdAt' }
        ),
        collection.createIndex(
          { 'catalogs.catalogId': 1, categoryId: 1, createdAt: -1 },
          { name: 'products_catalogId_categoryId_createdAt' }
        ),
      ]);
    })();
  }
  try {
    await productIndexesEnsured;
  } catch (error) {
    productIndexesEnsured = null;
    throw error;
  }
};

const getProductCollection = async () => {
  await ensureProductIndexes();
  const db = await getMongoDb();
  return db.collection<ProductDocument>(productCollectionName);
};

const isEmptyFilter = (filter: Filter<ProductDocument>): boolean =>
  Object.keys(filter as Record<string, unknown>).length === 0;

const appendAndCondition = (
  filter: Filter<ProductDocument>,
  condition: Filter<ProductDocument>
): Filter<ProductDocument> => {
  if (isEmptyFilter(filter)) return condition;
  return {
    $and: [filter, condition],
  } as Filter<ProductDocument>;
};

const normalizeLookupId = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '';
  }
  if (value instanceof ObjectId) {
    return value.toHexString();
  }
  return '';
};

const buildLookupValues = (ids: string[]): Array<string | ObjectId> => {
  const seen = new Set<string>();
  const values: Array<string | ObjectId> = [];

  ids.forEach((rawId: string) => {
    const normalized = rawId.trim();
    if (!normalized) return;

    const stringKey = `s:${normalized}`;
    if (!seen.has(stringKey)) {
      seen.add(stringKey);
      values.push(normalized);
    }

    if (!ObjectId.isValid(normalized)) return;
    const objectId = new ObjectId(normalized);
    const objectKey = `o:${objectId.toHexString()}`;
    if (!seen.has(objectKey)) {
      seen.add(objectKey);
      values.push(objectId);
    }
  });

  return values;
};

const normalizeProductParameterValues = (
  input: unknown
): Array<{ parameterId: string; value: string; valuesByLanguage?: Record<string, string> }> => {
  if (!Array.isArray(input)) return [];
  return input.reduce(
    (
      acc: Array<{
        parameterId: string;
        value: string;
        valuesByLanguage?: Record<string, string>;
      }>,
      raw: unknown
    ) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return acc;
      const record = raw as Record<string, unknown>;
      const parameterIdRaw =
        typeof record['parameterId'] === 'string'
          ? record['parameterId'].trim()
          : '';
      const parameterId = decodeSimpleParameterStorageId(parameterIdRaw);
      if (!parameterId) return acc;
      const value =
        typeof record['value'] === 'string' ? record['value'] : '';
      const valuesByLanguageRaw = record['valuesByLanguage'];
      const valuesByLanguage =
        valuesByLanguageRaw &&
        typeof valuesByLanguageRaw === 'object' &&
        !Array.isArray(valuesByLanguageRaw)
          ? Object.entries(valuesByLanguageRaw as Record<string, unknown>).reduce(
            (map: Record<string, string>, [lang, langValue]: [string, unknown]) => {
              const normalizedLang = lang.trim().toLowerCase();
              const normalizedValue =
                typeof langValue === 'string' ? langValue.trim() : '';
              if (!normalizedLang || !normalizedValue) return map;
              map[normalizedLang] = normalizedValue;
              return map;
            },
            {}
          )
          : {};
      acc.push({
        parameterId,
        value,
        ...(Object.keys(valuesByLanguage).length > 0
          ? { valuesByLanguage }
          : {}),
      });
      return acc;
    },
    []
  );
};

const buildMongoExportedByBaseProductIdCondition = (): Filter<ProductDocument> =>
  ({
    baseProductId: { $exists: true, $nin: [null, ''] },
  }) as Filter<ProductDocument>;

const buildMongoUnexportedByBaseProductIdCondition = (): Filter<ProductDocument> =>
  ({
    $or: [
      { baseProductId: { $exists: false } },
      { baseProductId: null },
      { baseProductId: '' },
    ],
  }) as Filter<ProductDocument>;

const loadMongoBaseExportLookupContext = async (): Promise<BaseExportLookupContext> => {
  const db = await getMongoDb();
  const integrations = await db
    .collection<IntegrationSlugDocument>(integrationCollectionName)
    .find(
      { slug: { $in: [...BASE_INTEGRATION_SLUGS] } },
      { projection: { _id: 1 } }
    )
    .toArray();

  const integrationIds = integrations
    .map((integration: IntegrationSlugDocument) => normalizeLookupId(integration._id))
    .filter((id: string) => id.length > 0);
  const integrationLookupValues = buildLookupValues(integrationIds);

  if (integrationLookupValues.length === 0) {
    return {
      integrationLookupValues,
      exportedProductIds: [],
      exportedProductLookupValues: [],
    };
  }

  const exportedProductIdsRaw = await db
    .collection<ProductListingFilterDocument>(listingCollectionName)
    .distinct('productId', {
      integrationId: { $in: integrationLookupValues },
      externalListingId: { $exists: true, $nin: [null, ''] },
    });

  const exportedProductIds = exportedProductIdsRaw
    .map((value: unknown) => normalizeLookupId(value))
    .filter((id: string) => id.length > 0);
  const exportedProductLookupValues = buildLookupValues(exportedProductIds);

  return {
    integrationLookupValues,
    exportedProductIds,
    exportedProductLookupValues,
  };
};

const buildMongoBaseExportedCondition = (
  baseExported: boolean,
  context: BaseExportLookupContext
): Filter<ProductDocument> | null => {
  const exportedByBaseProductId = buildMongoExportedByBaseProductIdCondition();
  const unexportedByBaseProductId = buildMongoUnexportedByBaseProductIdCondition();

  if (context.integrationLookupValues.length === 0) {
    if (baseExported) {
      return {
        id: '__no_base_exported_products__',
      } as Filter<ProductDocument>;
    }
    return null;
  }

  if (baseExported) {
    if (context.exportedProductIds.length === 0) {
      return exportedByBaseProductId;
    }
    return {
      $or: [
        exportedByBaseProductId,
        { id: { $in: context.exportedProductIds } },
        { _id: { $in: context.exportedProductLookupValues } },
      ],
    } as Filter<ProductDocument>;
  }

  if (context.exportedProductIds.length === 0) {
    return unexportedByBaseProductId;
  }

  return {
    $and: [
      unexportedByBaseProductId,
      { id: { $nin: context.exportedProductIds } },
      { _id: { $nin: context.exportedProductLookupValues } },
    ],
  } as Filter<ProductDocument>;
};

const applyBaseExportedFilter = async (
  filter: Filter<ProductDocument>,
  baseExported: boolean | undefined
): Promise<Filter<ProductDocument>> => {
  if (baseExported === undefined) return filter;
  const context = await loadMongoBaseExportLookupContext();
  const baseCondition = buildMongoBaseExportedCondition(baseExported, context);
  if (!baseCondition) return filter;
  return appendAndCondition(filter, baseCondition);
};

const buildListProjectStage = (filters: ProductFilters): Document | null => {
  // List/grid queries should return only fields used by table cells and row actions.
  // This avoids transferring large document payloads (notably descriptions/base64 arrays).
  if (typeof filters.sku === 'string' && filters.sku.trim().length > 0) {
    return null;
  }
  return {
    _id: 1,
    id: 1,
    sku: 1,
    baseProductId: 1,
    defaultPriceGroupId: 1,
    categoryId: 1,
    categories: { $slice: ['$categories', 1] },
    catalogId: 1,
    catalogs: { $slice: ['$catalogs', 1] },
    name_en: 1,
    name_pl: 1,
    name_de: 1,
    price: 1,
    stock: 1,
    createdAt: 1,
    updatedAt: 1,
    imageLinks: { $slice: ['$imageLinks', 1] },
    imageBase64s: { $literal: [] },
    images: { $slice: ['$images', 1] },
  };
};

const buildProductIdFilter = (id: string): Filter<ProductDocument> => {
  const normalized = id.trim();
  const conditions: Array<Record<string, unknown>> = [
    { id: normalized },
    { _id: normalized },
  ];
  if (ObjectId.isValid(normalized)) {
    conditions.push({ _id: new ObjectId(normalized) });
  }
  return { $or: conditions } as Filter<ProductDocument>;
};

const buildCategoryLookupFilter = (id: string): Filter<Document> => {
  const normalized = id.trim();
  const conditions: Array<Record<string, unknown>> = [
    { id: normalized },
    { _id: normalized },
  ];
  if (ObjectId.isValid(normalized)) {
    conditions.push({ _id: new ObjectId(normalized) });
  }
  return { $or: conditions } as Filter<Document>;
};

const buildLookupFilterForIds = (ids: string[]): Filter<Document> => {
  const normalizedIds = Array.from(
    new Set(
      ids
        .map((id: string): string => id.trim())
        .filter((id: string): boolean => id.length > 0)
    )
  );
  const objectIds = normalizedIds
    .filter((id: string): boolean => ObjectId.isValid(id))
    .map((id: string): ObjectId => new ObjectId(id));
  const conditions: Array<Record<string, unknown>> = [];
  if (normalizedIds.length > 0) {
    conditions.push({ id: { $in: normalizedIds } });
    conditions.push({ _id: { $in: normalizedIds } });
  }
  if (objectIds.length > 0) {
    conditions.push({ _id: { $in: objectIds } });
  }
  if (conditions.length === 0) {
    return { _id: { $in: [] } } as Filter<Document>;
  }
  if (conditions.length === 1) {
    return conditions[0] as Filter<Document>;
  }
  return { $or: conditions } as Filter<Document>;
};

const resolveLookupDocumentId = (doc: Document | null | undefined): string =>
  normalizeLookupId(
    (doc as { id?: unknown; _id?: unknown } | null)?.id ??
      (doc as { _id?: unknown } | null)?._id
  );

const normalizeImageFileIds = (imageFileIds: string[]): string[] => {
  const unique = new Set<string>();
  for (const rawId of imageFileIds) {
    const trimmed = rawId.trim();
    if (!trimmed || unique.has(trimmed)) continue;
    unique.add(trimmed);
  }
  return Array.from(unique);
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseAdvancedFilterGroup = (
  payload: string | undefined
): ProductAdvancedFilterGroup | null => {
  if (!payload) return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    const validated = productAdvancedFilterGroupSchema.safeParse(parsed);
    if (validated.success) return validated.data;
    logger.warn('[products.advanced-filter.mongo] validation failed', {
      issues: validated.error.issues.slice(0, 5).map((issue) => issue.message),
    });
    return null;
  } catch {
    logger.warn('[products.advanced-filter.mongo] invalid JSON payload');
    return null;
  }
};

const toAdvancedStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toAdvancedNumberValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toAdvancedDateValue = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

const toAdvancedBooleanValue = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return null;
};

const toAdvancedStringArrayValues = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const normalizedValues = value
    .map((entry: unknown) => toAdvancedStringValue(entry))
    .filter((entry: string | null): entry is string => entry !== null);
  return Array.from(new Set(normalizedValues));
};

const buildEmptyStringPathCondition = (path: string): Filter<ProductDocument> =>
  ({
    $or: [
      { [path]: { $exists: false } },
      { [path]: null },
      { [path]: '' },
    ],
  }) as Filter<ProductDocument>;

const buildNonEmptyStringPathCondition = (path: string): Filter<ProductDocument> =>
  ({
    [path]: { $exists: true, $nin: [null, ''] },
  }) as Filter<ProductDocument>;

const buildMongoStringFieldCondition = (
  paths: string[],
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  if (paths.length === 0) return null;

  if (condition.operator === 'isEmpty') {
    if (paths.length === 1) return buildEmptyStringPathCondition(paths[0]!);
    return {
      $and: paths.map((path: string) => buildEmptyStringPathCondition(path)),
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'isNotEmpty') {
    if (paths.length === 1) return buildNonEmptyStringPathCondition(paths[0]!);
    return {
      $or: paths.map((path: string) => buildNonEmptyStringPathCondition(path)),
    } as Filter<ProductDocument>;
  }

  const value = toAdvancedStringValue(condition.value);
  if (!value) return null;

  if (condition.operator === 'contains') {
    const regex = { $regex: escapeRegex(value), $options: 'i' };
    if (paths.length === 1) {
      return { [paths[0]!]: regex } as Filter<ProductDocument>;
    }
    return {
      $or: paths.map((path: string) => ({ [path]: regex })),
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'eq') {
    if (paths.length === 1) {
      return { [paths[0]!]: value } as Filter<ProductDocument>;
    }
    return {
      $or: paths.map((path: string) => ({ [path]: value })),
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'in') {
    const values = toAdvancedStringArrayValues(condition.value);
    if (values.length === 0) return null;
    if (paths.length === 1) {
      return { [paths[0]!]: { $in: values } } as Filter<ProductDocument>;
    }
    return {
      $or: paths.map((path: string) => ({ [path]: { $in: values } })),
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'notIn') {
    const inCondition = buildMongoStringFieldCondition(paths, {
      ...condition,
      operator: 'in',
    });
    if (!inCondition) return null;
    return { $nor: [inCondition] } as Filter<ProductDocument>;
  }

  if (condition.operator === 'neq') {
    const equalCondition = buildMongoStringFieldCondition(paths, {
      ...condition,
      operator: 'eq',
    });
    if (!equalCondition) return null;
    return { $nor: [equalCondition] } as Filter<ProductDocument>;
  }

  return null;
};

const buildMongoIdCondition = (
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  if (condition.operator === 'isEmpty') {
    return {
      $or: [
        { id: { $exists: false } },
        { id: null },
        { id: '' },
      ],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'isNotEmpty') {
    return {
      id: { $exists: true, $nin: [null, ''] },
    } as Filter<ProductDocument>;
  }

  const value = toAdvancedStringValue(condition.value);
  if (!value) return null;

  if (condition.operator === 'eq') {
    return buildProductIdFilter(value);
  }

  if (condition.operator === 'neq') {
    return {
      $nor: [buildProductIdFilter(value)],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'contains') {
    const escapedId = escapeRegex(value);
    return {
      $or: [
        { id: { $regex: escapedId, $options: 'i' } },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: '$_id' },
              regex: escapedId,
              options: 'i',
            },
          },
        },
      ],
    } as Filter<ProductDocument>;
  }

  return null;
};

const buildMongoCategoryCondition = (
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  if (condition.operator === 'isEmpty') {
    return {
      $or: [
        { categoryId: { $exists: false } },
        { categoryId: null },
        { categoryId: '' },
        { categories: { $exists: false } },
        { categories: { $size: 0 } },
      ],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'isNotEmpty') {
    return {
      $or: [
        { categoryId: { $exists: true, $nin: [null, ''] } },
        { 'categories.0': { $exists: true } },
      ],
    } as Filter<ProductDocument>;
  }

  const value = toAdvancedStringValue(condition.value);
  if (!value) return null;

  if (condition.operator === 'contains') {
    const regex = { $regex: escapeRegex(value), $options: 'i' };
    return {
      $or: [
        { categoryId: regex },
        { 'categories.categoryId': regex },
      ],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'eq') {
    return {
      $or: [
        { categoryId: value },
        { 'categories.categoryId': value },
      ],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'neq') {
    const eqCondition = buildMongoCategoryCondition({
      ...condition,
      operator: 'eq',
    });
    if (!eqCondition) return null;
    return { $nor: [eqCondition] } as Filter<ProductDocument>;
  }

  return null;
};

const buildMongoNestedIdArrayCondition = (
  fieldPath: 'catalogs.catalogId' | 'tags.tagId' | 'producers.producerId',
  arrayPath: 'catalogs' | 'tags' | 'producers',
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  if (condition.operator === 'isEmpty') {
    return {
      $or: [
        { [fieldPath]: { $exists: false } },
        { [fieldPath]: null },
        { [arrayPath]: { $exists: false } },
        { [arrayPath]: { $size: 0 } },
      ],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'isNotEmpty') {
    return {
      $or: [
        { [fieldPath]: { $exists: true, $nin: [null, ''] } },
        { [`${arrayPath}.0`]: { $exists: true } },
      ],
    } as Filter<ProductDocument>;
  }

  const value = toAdvancedStringValue(condition.value);
  if (condition.operator === 'eq') {
    if (!value) return null;
    return {
      [fieldPath]: value,
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'neq') {
    if (!value) return null;
    return {
      $nor: [{ [fieldPath]: value }],
    } as Filter<ProductDocument>;
  }

  const values = toAdvancedStringArrayValues(condition.value);
  if (condition.operator === 'in') {
    if (values.length === 0) return null;
    return {
      [fieldPath]: { $in: values },
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'notIn') {
    if (values.length === 0) return null;
    return {
      $nor: [{ [fieldPath]: { $in: values } }],
    } as Filter<ProductDocument>;
  }

  return null;
};

const buildMongoBooleanCondition = (
  field: 'published',
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  const value = toAdvancedBooleanValue(condition.value);
  if (value === null) return null;

  if (condition.operator === 'eq') {
    return {
      [field]: value,
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'neq') {
    return {
      [field]: { $ne: value },
    } as Filter<ProductDocument>;
  }

  return null;
};

const buildMongoNumericCondition = (
  field: 'price' | 'stock',
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  if (condition.operator === 'isEmpty') {
    return {
      $or: [
        { [field]: { $exists: false } },
        { [field]: null },
      ],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'isNotEmpty') {
    return {
      [field]: { $exists: true },
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'between') {
    const left = toAdvancedNumberValue(condition.value);
    const right = toAdvancedNumberValue(condition.valueTo);
    if (left === null || right === null) return null;
    const [min, max] = left <= right ? [left, right] : [right, left];
    return {
      [field]: {
        $gte: min,
        $lte: max,
      },
    } as Filter<ProductDocument>;
  }

  const value = toAdvancedNumberValue(condition.value);
  if (value === null) return null;

  if (condition.operator === 'eq') {
    return { [field]: { $eq: value } } as Filter<ProductDocument>;
  }
  if (condition.operator === 'neq') {
    return { [field]: { $ne: value } } as Filter<ProductDocument>;
  }
  if (condition.operator === 'gt') {
    return { [field]: { $gt: value } } as Filter<ProductDocument>;
  }
  if (condition.operator === 'gte') {
    return { [field]: { $gte: value } } as Filter<ProductDocument>;
  }
  if (condition.operator === 'lt') {
    return { [field]: { $lt: value } } as Filter<ProductDocument>;
  }
  if (condition.operator === 'lte') {
    return { [field]: { $lte: value } } as Filter<ProductDocument>;
  }

  return null;
};

const buildMongoDateCondition = (
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  const field = 'createdAt';

  if (condition.operator === 'isEmpty') {
    return {
      $or: [
        { [field]: { $exists: false } },
        { [field]: null },
      ],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'isNotEmpty') {
    return {
      [field]: { $exists: true, $ne: null },
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'between') {
    const left = toAdvancedDateValue(condition.value);
    const right = toAdvancedDateValue(condition.valueTo);
    if (!left || !right) return null;
    const [min, max] = left <= right ? [left, right] : [right, left];
    return {
      [field]: {
        $gte: min,
        $lte: max,
      },
    } as Filter<ProductDocument>;
  }

  const value = toAdvancedDateValue(condition.value);
  if (!value) return null;

  if (condition.operator === 'eq') {
    return { [field]: { $eq: value } } as Filter<ProductDocument>;
  }
  if (condition.operator === 'neq') {
    return { [field]: { $ne: value } } as Filter<ProductDocument>;
  }
  if (condition.operator === 'gt') {
    return { [field]: { $gt: value } } as Filter<ProductDocument>;
  }
  if (condition.operator === 'gte') {
    return { [field]: { $gte: value } } as Filter<ProductDocument>;
  }
  if (condition.operator === 'lt') {
    return { [field]: { $lt: value } } as Filter<ProductDocument>;
  }
  if (condition.operator === 'lte') {
    return { [field]: { $lte: value } } as Filter<ProductDocument>;
  }

  return null;
};

type AdvancedMongoCompileContext = {
  baseExportLookup: BaseExportLookupContext | null;
};

const buildMongoBaseExportedAdvancedCondition = (
  condition: ProductAdvancedFilterCondition,
  context: AdvancedMongoCompileContext
): Filter<ProductDocument> | null => {
  if (!context.baseExportLookup) return null;
  const value = toAdvancedBooleanValue(condition.value);
  if (value === null) return null;

  if (condition.operator === 'eq') {
    return buildMongoBaseExportedCondition(value, context.baseExportLookup);
  }

  if (condition.operator === 'neq') {
    return buildMongoBaseExportedCondition(!value, context.baseExportLookup);
  }

  return null;
};

const compileAdvancedMongoCondition = (
  condition: ProductAdvancedFilterCondition,
  context: AdvancedMongoCompileContext
): Filter<ProductDocument> | null => {
  if (condition.field === 'id') {
    return buildMongoIdCondition(condition);
  }
  if (condition.field === 'sku') {
    return buildMongoStringFieldCondition(['sku'], condition);
  }
  if (condition.field === 'name') {
    return buildMongoStringFieldCondition(['name_en', 'name_pl', 'name_de'], condition);
  }
  if (condition.field === 'description') {
    return buildMongoStringFieldCondition(
      ['description_en', 'description_pl', 'description_de'],
      condition
    );
  }
  if (condition.field === 'categoryId') {
    return buildMongoCategoryCondition(condition);
  }
  if (condition.field === 'catalogId') {
    return buildMongoNestedIdArrayCondition('catalogs.catalogId', 'catalogs', condition);
  }
  if (condition.field === 'tagId') {
    return buildMongoNestedIdArrayCondition('tags.tagId', 'tags', condition);
  }
  if (condition.field === 'producerId') {
    return buildMongoNestedIdArrayCondition('producers.producerId', 'producers', condition);
  }
  if (condition.field === 'price') {
    return buildMongoNumericCondition('price', condition);
  }
  if (condition.field === 'stock') {
    return buildMongoNumericCondition('stock', condition);
  }
  if (condition.field === 'published') {
    return buildMongoBooleanCondition('published', condition);
  }
  if (condition.field === 'baseExported') {
    return buildMongoBaseExportedAdvancedCondition(condition, context);
  }
  if (condition.field === 'baseProductId') {
    return buildMongoStringFieldCondition(['baseProductId'], condition);
  }
  if (condition.field === 'createdAt') {
    return buildMongoDateCondition(condition);
  }
  return null;
};

const compileAdvancedMongoRule = (
  rule: ProductAdvancedFilterRule,
  context: AdvancedMongoCompileContext
): Filter<ProductDocument> | null => {
  if (rule.type === 'condition') {
    return compileAdvancedMongoCondition(rule, context);
  }

  const compiledRules = rule.rules
    .map((nestedRule: ProductAdvancedFilterRule) => compileAdvancedMongoRule(nestedRule, context))
    .filter((nestedRule): nestedRule is Filter<ProductDocument> => nestedRule !== null);

  if (compiledRules.length === 0) return null;

  const combined =
    compiledRules.length === 1
      ? compiledRules[0]!
      : ({
        [rule.combinator === 'and' ? '$and' : '$or']: compiledRules,
      } as Filter<ProductDocument>);

  if (!rule.not) return combined;

  return {
    $nor: [combined],
  } as Filter<ProductDocument>;
};

const advancedFilterNeedsBaseExportContext = (
  rule: ProductAdvancedFilterRule
): boolean => {
  if (rule.type === 'condition') {
    return rule.field === 'baseExported';
  }
  return rule.rules.some((nestedRule: ProductAdvancedFilterRule) =>
    advancedFilterNeedsBaseExportContext(nestedRule)
  );
};

const applyAdvancedFilterCondition = async (
  filter: Filter<ProductDocument>,
  advancedFilterPayload: string | undefined
): Promise<Filter<ProductDocument>> => {
  const parsedGroup = parseAdvancedFilterGroup(advancedFilterPayload);
  if (!parsedGroup) return filter;
  const metrics = getProductAdvancedFilterMetrics(parsedGroup);
  const compileStart = Date.now();
  const compileContext: AdvancedMongoCompileContext = {
    baseExportLookup: advancedFilterNeedsBaseExportContext(parsedGroup)
      ? await loadMongoBaseExportLookupContext()
      : null,
  };

  const compiled = compileAdvancedMongoRule(parsedGroup, compileContext);
  const compileDurationMs = Date.now() - compileStart;
  logger.info('[products.advanced-filter.mongo] compiled', {
    rules: metrics.rules,
    depth: metrics.depth,
    setItems: metrics.setItems,
    compileDurationMs,
    compiled: Boolean(compiled),
  });

  if (!compiled) return filter;
  return appendAndCondition(filter, compiled);
};

const buildSearchFilter = (filters: ProductFilters): Filter<ProductDocument> => {
  const filter: Filter<ProductDocument> = {};
  const andConditions: Filter<ProductDocument>[] = [];

  if (filters.id) {
    const normalizedId = filters.id.trim();
    if (normalizedId.length > 0) {
      if (filters.idMatchMode === 'partial') {
        const escapedId = escapeRegex(normalizedId);
        andConditions.push({
          $or: [
            { id: { $regex: escapedId, $options: 'i' } },
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$_id' },
                  regex: escapedId,
                  options: 'i',
                },
              },
            },
          ],
        } as Filter<ProductDocument>);
      } else {
        andConditions.push(buildProductIdFilter(normalizedId));
      }
    }
  }

  if (filters.sku) {
    filter.sku = { $regex: filters.sku, $options: 'i' };
  }

  if (filters.search) {
    const regex = { $regex: filters.search, $options: 'i' };
    // If a specific language is selected, only search in that language's name field
    if (filters.searchLanguage) {
      // searchLanguage is like "name_en", "name_pl", "name_de"
      andConditions.push({ $or: [{ [filters.searchLanguage]: regex }] });
    } else {
      // Search all language fields
      andConditions.push({
        $or: [
          { name_en: regex },
          { name_pl: regex },
          { name_de: regex },
          { description_en: regex },
          { description_pl: regex },
          { description_de: regex },
        ],
      });
    }
  }

  if (filters.description) {
    const regex = { $regex: filters.description, $options: 'i' };
    andConditions.push({
      $or: [
        { description_en: regex },
        { description_pl: regex },
        { description_de: regex },
      ],
    });
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    filter.price = {};
    if (filters.minPrice !== undefined) {
      filter.price.$gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      filter.price.$lte = filters.maxPrice;
    }
  }

  if (filters.stockValue !== undefined) {
    const operator = filters.stockOperator ?? 'eq';
    filter.stock = {};
    if (operator === 'gt') {
      filter.stock.$gt = filters.stockValue;
    } else if (operator === 'gte') {
      filter.stock.$gte = filters.stockValue;
    } else if (operator === 'lt') {
      filter.stock.$lt = filters.stockValue;
    } else if (operator === 'lte') {
      filter.stock.$lte = filters.stockValue;
    } else {
      filter.stock.$eq = filters.stockValue;
    }
  }

  if (filters.startDate || filters.endDate) {
    filter.createdAt = {};
    if (filters.startDate) {
      filter.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      filter.createdAt.$lte = new Date(filters.endDate);
    }
  }

  if (filters.catalogId) {
    if (filters.catalogId === 'unassigned') {
      andConditions.push({
        $or: [
          { catalogs: { $exists: false } },
          { catalogs: { $size: 0 } },
        ],
      });
    } else {
      andConditions.push({
        $or: [
          { catalogs: { $elemMatch: { catalogId: filters.catalogId } } },
        ],
      });
    }
  }

  if (filters.categoryId) {
    andConditions.push({
      $or: [
        { categoryId: filters.categoryId },
        { 'categories.categoryId': filters.categoryId },
      ],
    });
  }

  if (andConditions.length === 1) {
    Object.assign(filter, andConditions[0]!);
  } else if (andConditions.length > 1) {
    filter.$and = andConditions;
  }

  return filter;
};

export const mongoProductRepository: ProductRepository = {
  async getProducts(filters: ProductFilters) {
    const collection = await getProductCollection();
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const limit = pageSize;
    const basicSearchFilter = await applyBaseExportedFilter(
      buildSearchFilter(filters),
      filters.baseExported
    );
    const searchFilter = await applyAdvancedFilterCondition(
      basicSearchFilter,
      filters.advancedFilter
    );
    const projectStage = buildListProjectStage(filters);

    if (projectStage) {
      const pipeline: Document[] = [
        { $match: searchFilter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: projectStage },
      ];
      const aggregateOptions = isEmptyFilter(searchFilter)
        ? { hint: { createdAt: -1 } }
        : undefined;
      const docs = await collection
        .aggregate<ProductDocument>(pipeline, aggregateOptions)
        .toArray();
      return docs.map(toProductResponse);
    }

    let cursor = collection.find(searchFilter).sort({ createdAt: -1 });
    if (isEmptyFilter(searchFilter)) {
      cursor = cursor.hint({ createdAt: -1 });
    }
    cursor = cursor.skip(skip).limit(limit);
    const docs = await cursor.toArray();
    return docs.map(toProductResponse);
  },

  async countProducts(filters: ProductFilters) {
    const collection = await getProductCollection();
    const basicSearchFilter = await applyBaseExportedFilter(
      buildSearchFilter(filters),
      filters.baseExported
    );
    const searchFilter = await applyAdvancedFilterCondition(
      basicSearchFilter,
      filters.advancedFilter
    );
    if (isEmptyFilter(searchFilter)) {
      return collection.estimatedDocumentCount();
    }
    return collection.countDocuments(searchFilter);
  },

  async getProductsWithCount(filters: ProductFilters): Promise<{ products: ProductWithImages[]; total: number }> {
    const collection = await getProductCollection();
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const basicSearchFilter = await applyBaseExportedFilter(
      buildSearchFilter(filters),
      filters.baseExported
    );
    const searchFilter = await applyAdvancedFilterCondition(
      basicSearchFilter,
      filters.advancedFilter
    );
    const projectStage = buildListProjectStage(filters);

    // Build the $facet products sub-pipeline: sort → skip → limit → (optional) project
    const facetProductsPipeline: Document[] = [
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: pageSize },
    ];
    if (projectStage) {
      facetProductsPipeline.push({ $project: projectStage });
    }

    // Run $match once, then fan-out into the list branch and the count branch
    const pipeline: Document[] = [];
    if (!isEmptyFilter(searchFilter)) {
      pipeline.push({ $match: searchFilter });
    }
    pipeline.push({
      $facet: {
        products: facetProductsPipeline,
        total: [{ $count: 'count' }],
      },
    });

    const aggregateOptions = isEmptyFilter(searchFilter)
      ? { hint: { createdAt: -1 } }
      : undefined;

    const [result] = await collection
      .aggregate<{ products: ProductDocument[]; total: Array<{ count: number }> }>(
        pipeline,
        aggregateOptions
      )
      .toArray();

    return {
      products: (result?.products ?? []).map(toProductResponse),
      total: result?.total?.[0]?.count ?? 0,
    };
  },
  
  async getProductImages(productId: string) {
    const collection = await getProductCollection();
    const doc = await collection.findOne(buildProductIdFilter(productId), {
      projection: {
        _id: 1,
        id: 1,
        updatedAt: 1,
        images: 1,
      },
    });
    if (!doc || !Array.isArray(doc.images) || doc.images.length === 0) {
      return [];
    }

    const fallbackProductId = normalizeLookupId(doc.id ?? doc._id) || productId;
    const fallbackAssignedAt =
      doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString();

    type ParsedImageEntry = {
      productId: string;
      imageFileId: string;
      assignedAt: string;
      imageFile?: ImageFileRecord;
    };

    const parsedEntries = doc.images.reduce<ParsedImageEntry[]>(
      (acc: ParsedImageEntry[], rawImage: unknown) => {
        if (!rawImage || typeof rawImage !== 'object') return acc;
        const imageRecord = rawImage as Record<string, unknown>;
        const imageFileId = normalizeLookupId(
          imageRecord['imageFileId'] ??
            (imageRecord['imageFile'] as { id?: unknown } | null | undefined)?.id
        );
        if (!imageFileId) return acc;

        const rawAssignedAt = imageRecord['assignedAt'];
        const assignedAt =
          rawAssignedAt instanceof Date
            ? rawAssignedAt.toISOString()
            : typeof rawAssignedAt === 'string' && rawAssignedAt.trim().length > 0
              ? rawAssignedAt
              : fallbackAssignedAt;

        const rawProductId = imageRecord['productId'];
        const entryProductId =
          normalizeLookupId(rawProductId) ||
          fallbackProductId;

        const rawImageFile = imageRecord['imageFile'];
        const imageFile =
          rawImageFile && typeof rawImageFile === 'object'
            ? (rawImageFile as ImageFileRecord)
            : undefined;

        acc.push({
          productId: entryProductId,
          imageFileId,
          assignedAt,
          ...(imageFile ? { imageFile } : {}),
        });
        return acc;
      },
      []
    );

    if (parsedEntries.length === 0) {
      return [];
    }

    const missingImageFileIds = Array.from(
      new Set(
        parsedEntries
          .filter((entry: ParsedImageEntry) => !entry.imageFile)
          .map((entry: ParsedImageEntry) => entry.imageFileId)
      )
    );

    const hydratedImageFiles =
      missingImageFileIds.length > 0
        ? await mongoImageFileRepository.findImageFilesByIds(missingImageFileIds)
        : [];
    const hydratedById = new Map<string, ImageFileRecord>(
      hydratedImageFiles.map((imageFile: ImageFileRecord) => [imageFile.id, imageFile])
    );

    return parsedEntries
      .map((entry: ParsedImageEntry): ProductImageRecord | null => {
        const imageFile = entry.imageFile ?? hydratedById.get(entry.imageFileId);
        if (!imageFile) return null;
        return {
          productId: entry.productId,
          imageFileId: entry.imageFileId,
          assignedAt: entry.assignedAt,
          imageFile,
        };
      })
      .filter((entry: ProductImageRecord | null): entry is ProductImageRecord => entry !== null)
      .sort((a: ProductImageRecord, b: ProductImageRecord) => {
        const aTime = Date.parse(a.assignedAt);
        const bTime = Date.parse(b.assignedAt);
        if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
        return bTime - aTime;
      });
  },
  
  async getProductById(id: string) {
  
    const collection = await getProductCollection();
    const doc = await collection.findOne(buildProductIdFilter(id));
    return doc ? toProductResponse({ ...doc, _id: doc._id }) : null;
  },

  async getProductBySku(sku: string) {
    const collection = await getProductCollection();
    const doc = await collection.findOne({ sku });
    return doc ? toProductBase(doc) : null;
  },

  async findProductByBaseId(baseProductId: string) {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne({ baseProductId });
    return doc ? toProductBase(doc) : null;
  },

  async createProduct(data: CreateProductInput) {
    const db = await getMongoDb();
    const now = new Date();
    const id = randomUUID();
    if (data.sku) {
      const existing = await db
        .collection<ProductDocument>(productCollectionName)
        .findOne({ sku: data.sku });
      if (existing) {
        throw conflictError('A product with this SKU already exists.', {
          sku: data.sku,
          productId: existing.id ?? existing._id,
        });
      }
    }
    const document: ProductDocument = {
      _id: id,
      id,
      sku: typeof data.sku === 'string' ? data.sku : null,
      baseProductId:
        typeof data.baseProductId === 'string' ? data.baseProductId : null,
      defaultPriceGroupId:
        typeof data.defaultPriceGroupId === 'string'
          ? data.defaultPriceGroupId
          : null,
      ean: typeof data.ean === 'string' ? data.ean : null,
      gtin: typeof data.gtin === 'string' ? data.gtin : null,
      asin: typeof data.asin === 'string' ? data.asin : null,
      name_en: typeof data.name_en === 'string' ? data.name_en : null,
      name_pl: typeof data.name_pl === 'string' ? data.name_pl : null,
      name_de: typeof data.name_de === 'string' ? data.name_de : null,
      description_en:
        typeof data.description_en === 'string' ? data.description_en : null,
      description_pl:
        typeof data.description_pl === 'string' ? data.description_pl : null,
      description_de:
        typeof data.description_de === 'string' ? data.description_de : null,
      supplierName:
        typeof data.supplierName === 'string' ? data.supplierName : null,
      supplierLink:
        typeof data.supplierLink === 'string' ? data.supplierLink : null,
      priceComment:
        typeof data.priceComment === 'string' ? data.priceComment : null,
      stock: typeof data.stock === 'number' ? data.stock : null,
      price: typeof data.price === 'number' ? data.price : null,
      categoryId: typeof data.categoryId === 'string' ? data.categoryId : null,
      sizeLength: typeof data.sizeLength === 'number' ? data.sizeLength : null,
      sizeWidth: typeof data.sizeWidth === 'number' ? data.sizeWidth : null,
      weight: typeof data.weight === 'number' ? data.weight : null,
      length: typeof data.length === 'number' ? data.length : null,
      parameters: normalizeProductParameterValues(data.parameters),
      imageLinks: Array.isArray(data.imageLinks) ? data.imageLinks : [],
      imageBase64s: Array.isArray(data.imageBase64s) ? data.imageBase64s : [],
      noteIds: [],
      createdAt: now,
      updatedAt: now,
      images: [],
      catalogs: [],
    };
    await db
      .collection<ProductDocument>(productCollectionName)
      .insertOne(document);
    return toProductBase(document);
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    const db = await getMongoDb();
    const updateDoc: Partial<ProductDocument> = {
      updatedAt: new Date(),
      ...(data.sku !== undefined ? { sku: data.sku ?? null } : null),
      ...(data.baseProductId !== undefined
        ? { baseProductId: data.baseProductId ?? null }
        : null),
      ...(data.defaultPriceGroupId !== undefined
        ? { defaultPriceGroupId: data.defaultPriceGroupId ?? null }
        : null),
      ...(data.ean !== undefined ? { ean: data.ean ?? null } : null),
      ...(data.gtin !== undefined ? { gtin: data.gtin ?? null } : null),
      ...(data.asin !== undefined ? { asin: data.asin ?? null } : null),
      ...(data.name_en !== undefined ? { name_en: data.name_en ?? null } : null),
      ...(data.name_pl !== undefined ? { name_pl: data.name_pl ?? null } : null),
      ...(data.name_de !== undefined ? { name_de: data.name_de ?? null } : null),
      ...(data.description_en !== undefined
        ? { description_en: data.description_en ?? null }
        : null),
      ...(data.description_pl !== undefined
        ? { description_pl: data.description_pl ?? null }
        : null),
      ...(data.description_de !== undefined
        ? { description_de: data.description_de ?? null }
        : null),
      ...(data.supplierName !== undefined
        ? { supplierName: data.supplierName ?? null }
        : null),
      ...(data.supplierLink !== undefined
        ? { supplierLink: data.supplierLink ?? null }
        : null),
      ...(data.priceComment !== undefined
        ? { priceComment: data.priceComment ?? null }
        : null),
      ...(data.stock !== undefined ? { stock: data.stock ?? null } : null),
      ...(data.price !== undefined ? { price: data.price ?? null } : null),
      ...(data.sizeLength !== undefined
        ? { sizeLength: data.sizeLength ?? null }
        : null),
      ...(data.sizeWidth !== undefined
        ? { sizeWidth: data.sizeWidth ?? null }
        : null),
      ...(data.weight !== undefined ? { weight: data.weight ?? null } : null),
      ...(data.length !== undefined ? { length: data.length ?? null } : null),
      ...(data.parameters !== undefined
        ? {
          parameters: normalizeProductParameterValues(data.parameters),
        }
        : null),
      ...(data.imageLinks !== undefined
        ? {
          imageLinks: Array.isArray(data.imageLinks)
            ? data.imageLinks
            : [],
        }
        : null),
      ...(data.imageBase64s !== undefined
        ? {
          imageBase64s: Array.isArray(data.imageBase64s)
            ? data.imageBase64s
            : [],
        }
        : null),
    };
    const result = await db
      .collection<ProductDocument>(productCollectionName)
      .findOneAndUpdate(
        buildProductIdFilter(id),
        { $set: updateDoc },
        { returnDocument: 'after' }
      );
    if (!result) return null;
    return toProductBase({
      ...(result as ProductDocument),
      id: (result as ProductDocument).id ?? id,
    });
  },

  async deleteProduct(id: string) {    const db = await getMongoDb();
    const result = await db
      .collection<ProductDocument>(productCollectionName)
      .findOneAndDelete(buildProductIdFilter(id));
    if (!result) return null;
    return toProductBase({
      ...(result as ProductDocument),
      id: (result as ProductDocument).id ?? id,
    });
  },

  async duplicateProduct(id: string, sku: string) {
    const db = await getMongoDb();
    const existing = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne(buildProductIdFilter(id));
    if (!existing) return null;

    const skuExists = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne({ sku });
    if (skuExists) {
      throw conflictError('A product with this SKU already exists.', {
        sku,
        productId: skuExists.id ?? skuExists._id,
      });
    }

    const now = new Date();
    const duplicatedId = randomUUID();
    const document: ProductDocument = {
      _id: duplicatedId,
      id: duplicatedId,
      sku,
      baseProductId: null,
      defaultPriceGroupId: existing.defaultPriceGroupId ?? null,
      ean: existing.ean ?? null,
      gtin: existing.gtin ?? null,
      asin: existing.asin ?? null,
      name_en: existing.name_en ?? null,
      name_pl: existing.name_pl ?? null,
      name_de: existing.name_de ?? null,
      description_en: existing.description_en ?? null,
      description_pl: existing.description_pl ?? null,
      description_de: existing.description_de ?? null,
      supplierName: existing.supplierName ?? null,
      supplierLink: existing.supplierLink ?? null,
      priceComment: existing.priceComment ?? null,
      stock: existing.stock ?? null,
      price: existing.price ?? null,
      categoryId: existing.categoryId ?? null,
      sizeLength: existing.sizeLength ?? null,
      sizeWidth: existing.sizeWidth ?? null,
      weight: existing.weight ?? null,
      length: existing.length ?? null,
      parameters: Array.isArray(existing.parameters) ? existing.parameters : [],
      imageLinks: Array.isArray(existing.imageLinks) ? existing.imageLinks : [],
      imageBase64s: Array.isArray(existing.imageBase64s) ? existing.imageBase64s : [],
      noteIds: Array.isArray((existing as unknown as { noteIds?: unknown }).noteIds)
        ? ((existing as unknown as { noteIds: string[] }).noteIds)
        : [],
      createdAt: now,
      updatedAt: now,
      images: [],
      catalogs: [],
    };

    await db
      .collection<ProductDocument>(productCollectionName)
      .insertOne(document);
    return toProductBase(document);
  },

  async addProductImages(productId: string, imageFileIds: string[]) {
    const normalizedIds = normalizeImageFileIds(imageFileIds);
    if (normalizedIds.length === 0) return;
    const db = await getMongoDb();
    const imageFiles = await mongoImageFileRepository.findImageFilesByIds(
      normalizedIds
    );
    const now = new Date();
    const incoming = imageFiles.map((imageFile: ImageFileRecord) => ({
      productId,
      imageFileId: imageFile.id,
      assignedAt: now.toISOString(),
      imageFile,
    }));
    const product = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne(buildProductIdFilter(productId));
    const existing = Array.isArray(product?.images) ? product.images : [];
    const merged = [
      ...existing.filter(
        (entry: ProductImageRecord) =>
          !incoming.some(
            (next: ProductImageRecord) => next.imageFileId === entry.imageFileId
          )
      ),
      ...incoming,
    ];
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        { $set: { images: merged, updatedAt: new Date() } }
      );
  },

  async replaceProductImages(productId: string, imageFileIds: string[]) {
    const normalizedIds = normalizeImageFileIds(imageFileIds);
    const db = await getMongoDb();
    if (normalizedIds.length === 0) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          buildProductIdFilter(productId),
          { $set: { images: [], updatedAt: new Date() } }
        );
      return;
    }

    const imageFiles = await mongoImageFileRepository.findImageFilesByIds(
      normalizedIds
    );
    const imageFileById = new Map<string, ImageFileRecord>(
      imageFiles.map((imageFile: ImageFileRecord) => [imageFile.id, imageFile])
    );
    const now = new Date();
    const images: ProductImageRecord[] = [];
    normalizedIds.forEach((imageFileId: string, index: number): void => {
      const imageFile = imageFileById.get(imageFileId);
      if (!imageFile) return;
      images.push({
        productId,
        imageFileId,
        assignedAt: new Date(now.getTime() - index).toISOString(),
        imageFile,
      });
    });

    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        { $set: { images, updatedAt: new Date() } }
      );
  },

  async replaceProductCatalogs(productId: string, catalogIds: string[]) {
    const db = await getMongoDb();
    if (catalogIds.length === 0) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          buildProductIdFilter(productId),
          { $set: { catalogs: [], updatedAt: new Date() } }
        );
      return;
    }
    const uniqueIds = Array.from(new Set(catalogIds));
    const catalogs = await mongoCatalogRepository.getCatalogsByIds(uniqueIds);
    const now = new Date();
    const catalogEntries = catalogs.map((catalog: CatalogRecord) => ({
      productId,
      catalogId: catalog.id,
      assignedAt: now.toISOString(),
      catalog,
    }));
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        { $set: { catalogs: catalogEntries, updatedAt: new Date() } }
      );
  },

  async bulkReplaceProductCatalogs(productIds: string[], catalogIds: string[]) {
    const db = await getMongoDb();
    if (productIds.length === 0) return;
    const uniqueIds = Array.from(new Set(catalogIds));
    const catalogs = await mongoCatalogRepository.getCatalogsByIds(uniqueIds);
    const now = new Date();
    const catalogEntries = catalogs.map((catalog: CatalogRecord) => ({
      catalogId: catalog.id,
      assignedAt: now.toISOString(),
      catalog,
    }));

    await db
      .collection<ProductDocument>(productCollectionName)
      .updateMany(
        { id: { $in: productIds } } as Filter<ProductDocument>,
        { 
          $set: { 
            catalogs: catalogEntries as ProductDocument['catalogs'], 
            updatedAt: new Date() 
          } 
        }
      );
  },

  async bulkAddProductCatalogs(productIds: string[], catalogIds: string[]) {
    const db = await getMongoDb();
    if (productIds.length === 0 || catalogIds.length === 0) return;
    const uniqueIds = Array.from(new Set(catalogIds));
    const catalogs = await mongoCatalogRepository.getCatalogsByIds(uniqueIds);
    const now = new Date();
    const catalogEntries = catalogs.map((catalog: CatalogRecord) => ({
      catalogId: catalog.id,
      assignedAt: now.toISOString(),
      catalog,
    }));

    await db
      .collection<ProductDocument>(productCollectionName)
      .updateMany(
        { id: { $in: productIds } } as Filter<ProductDocument>,
        {
          $addToSet: { catalogs: { $each: catalogEntries as NonNullable<ProductDocument['catalogs']> } },
          $set: { updatedAt: new Date() },
        }
      );
  },

  async bulkRemoveProductCatalogs(productIds: string[], catalogIds: string[]) {
    const db = await getMongoDb();
    if (productIds.length === 0 || catalogIds.length === 0) return;
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateMany(
        { id: { $in: productIds } } as Filter<ProductDocument>,
        {
          $pull: {
            catalogs: { catalogId: { $in: catalogIds } },
          } as unknown as import('mongodb').UpdateFilter<ProductDocument>['$pull'],
          $set: { updatedAt: new Date() },
        }
      );
  },

  async replaceProductCategory(productId: string, categoryId: string | null) {
    const db = await getMongoDb();
    const normalized = typeof categoryId === 'string' ? categoryId.trim() : '';
    if (!normalized) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          buildProductIdFilter(productId),
          { $set: { categories: [], categoryId: null, updatedAt: new Date() } }
        );
      return;
    }
    const category = await db
      .collection('product_categories')
      .findOne(buildCategoryLookupFilter(normalized), {
        projection: { _id: 1, id: 1 },
      });
    const resolvedCategoryId = resolveLookupDocumentId(category);
    if (!resolvedCategoryId) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          buildProductIdFilter(productId),
          { $set: { categories: [], categoryId: null, updatedAt: new Date() } }
        );
      return;
    }
    const now = new Date();
    const categoryEntries = [
      {
        productId,
        categoryId: resolvedCategoryId,
        assignedAt: now.toISOString(),
      },
    ];
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        { $set: { categories: categoryEntries, categoryId: categoryEntries[0]?.categoryId ?? null, updatedAt: new Date() } }
      );
  },

  async replaceProductTags(productId: string, tagIds: string[]) {
    const db = await getMongoDb();
    if (tagIds.length === 0) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          buildProductIdFilter(productId),
          { $set: { tags: [], updatedAt: new Date() } }
        );
      return;
    }
    const uniqueIds = Array.from(new Set(tagIds));
    const tags = await db
      .collection('product_tags')
      .find(buildLookupFilterForIds(uniqueIds))
      .project({ _id: 1, id: 1 })
      .toArray();
    const now = new Date();
    const seenTagIds = new Set<string>();
    const tagEntries = tags.reduce(
      (acc: Array<{ productId: string; tagId: string; assignedAt: string }>, tag: Document) => {
        const tagId = resolveLookupDocumentId(tag);
        if (!tagId || seenTagIds.has(tagId)) return acc;
        seenTagIds.add(tagId);
        acc.push({
          productId,
          tagId,
          assignedAt: now.toISOString(),
        });
        return acc;
      },
      []
    );
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        { $set: { tags: tagEntries, updatedAt: new Date() } }
      );
  },

  async replaceProductProducers(productId: string, producerIds: string[]) {
    const db = await getMongoDb();
    if (producerIds.length === 0) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          buildProductIdFilter(productId),
          { $set: { producers: [], updatedAt: new Date() } }
        );
      return;
    }
    const uniqueIds = Array.from(new Set(producerIds));
    const producers = await db
      .collection('product_producers')
      .find(buildLookupFilterForIds(uniqueIds))
      .project({ _id: 1, id: 1 })
      .toArray();
    const now = new Date();
    const seenProducerIds = new Set<string>();
    const producerEntries = producers.reduce(
      (
        acc: Array<{ productId: string; producerId: string; assignedAt: string }>,
        producer: Document
      ) => {
        const producerId = resolveLookupDocumentId(producer);
        if (!producerId || seenProducerIds.has(producerId)) return acc;
        seenProducerIds.add(producerId);
        acc.push({
          productId,
          producerId,
          assignedAt: now.toISOString(),
        });
        return acc;
      },
      []
    );
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        { $set: { producers: producerEntries, updatedAt: new Date() } }
      );
  },

  async replaceProductNotes(productId: string, noteIds: string[]) {
    const db = await getMongoDb();
    const uniqueIds = Array.from(
      new Set(noteIds.map((id: string) => id.trim()).filter((id: string) => id.length > 0)),
    );
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        { $set: { noteIds: uniqueIds, updatedAt: new Date() } },
      );
  },

  async removeProductImage(productId: string, imageFileId: string) {
    const db = await getMongoDb();
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        {
          $pull: {
            images: {
              imageFileId,
            },
          },
        }
      );
  },

  async countProductsByImageFileId(imageFileId: string) {    const db = await getMongoDb();
    return db
      .collection<ProductDocument>(productCollectionName)
      .countDocuments({ 'images.imageFileId': imageFileId });
  },

  async createProductInTransaction<T>(
    callback: (tx: TransactionalProductRepository & Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    // MongoDB transactions are not natively supported in this setup.
    // Call the callback with the repository itself.
    return callback(this as unknown as TransactionalProductRepository & Prisma.TransactionClient);
  },
};
