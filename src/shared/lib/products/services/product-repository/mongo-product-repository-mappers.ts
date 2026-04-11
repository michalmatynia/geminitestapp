import type { ProductCategory } from '@/shared/contracts/products/categories';
import { catalogSchema } from '@/shared/contracts/products/catalogs';
import type {
  ProductParameterValue,
  ProductRecord,
  ProductWithImages,
} from '@/shared/contracts/products/product';
import { normalizeProductMarketplaceContentOverrides } from '@/shared/contracts/products/product';
import { validationError } from '@/shared/errors/app-error';
import { decodeSimpleParameterStorageId } from '@/shared/lib/products/utils/parameter-partition';
import {
  mergeProductParameterValue,
  normalizeParameterValuesByLanguage,
  resolveStoredParameterValue,
} from '@/shared/lib/products/utils/parameter-values';
import { normalizeProductCustomFieldValues } from '@/shared/lib/products/utils/custom-field-values';

import type { WithId } from 'mongodb';

type ProductCatalogRelation = NonNullable<ProductWithImages['catalogs']>[number];

export type ProductDocument = Omit<
  ProductRecord,
  | 'createdAt'
  | 'updatedAt'
  | 'name'
  | 'description'
  | 'published'
  | 'catalogId'
  | 'tags'
  | 'images'
  | 'catalogs'
> & {
  _id: string;
  duplicateSkuCount?: number;
  createdAt: Date;
  updatedAt: Date;
  name?: ProductRecord['name'];
  description?: ProductRecord['description'];
  published?: boolean;
  catalogId?: string;
  images?: ProductWithImages['images'];
  catalogs?: ProductWithImages['catalogs'];
  categories?: Array<{ categoryId: string; assignedAt?: string }>;
  categoryId?: string | null;
  tags?: ProductWithImages['tags'];
  producers?: ProductWithImages['producers'];
  noteIds?: string[];
};

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toPlainRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const assertNoUnsupportedLocalizedObjectShape = (
  value: unknown,
  field: 'name' | 'description',
  productId: string
): void => {
  if (value === undefined || value === null) return;
  throw validationError(`Product ${field} payload includes unsupported object shape.`, {
    productId,
    field,
  });
};

const assertCanonicalLocalizedScalarField = (
  value: unknown,
  field: 'name_en' | 'name_pl' | 'name_de' | 'description_en' | 'description_pl' | 'description_de',
  productId: string
): void => {
  if (value === undefined || value === null) return;
  if (typeof value === 'string') return;
  throw validationError('Invalid product localized scalar field payload.', {
    productId,
    field,
    reason: 'invalid_type',
    valueType: typeof value,
  });
};

const buildCanonicalLocalizedField = (scalar: {
  en: string | null | undefined;
  pl: string | null | undefined;
  de: string | null | undefined;
}): ProductRecord['name'] => {
  return {
    en: typeof scalar.en === 'string' ? scalar.en : '',
    pl: typeof scalar.pl === 'string' ? scalar.pl : scalar.pl === null ? null : null,
    de: typeof scalar.de === 'string' ? scalar.de : scalar.de === null ? null : null,
  };
};

const resolveCanonicalCategoryId = (doc: ProductDocument, productId: string): string | null => {
  if (doc.categories !== undefined && doc.categories !== null) {
    throw validationError('Product categories payload includes unsupported fields.', {
      productId,
      field: 'categories',
    });
  }
  const rawCategoryId = doc.categoryId;
  if (rawCategoryId === undefined || rawCategoryId === null) return null;
  if (typeof rawCategoryId !== 'string') {
    throw validationError('Invalid product categoryId payload.', {
      productId,
      field: 'categoryId',
      reason: 'invalid_type',
      valueType: typeof rawCategoryId,
    });
  }
  const direct = rawCategoryId.trim();
  return direct.length > 0 ? direct : null;
};

const toOptionalIsoString = (value: unknown): string | undefined => {
  if (value instanceof Date) return value.toISOString();
  return toTrimmedString(value) ?? undefined;
};

const normalizeProductCategory = (
  category: unknown,
  fallbackCatalogId: string
): ProductCategory | undefined => {
  const record = toPlainRecord(category);
  if (!record) return undefined;

  const id = toTrimmedString(record['id']) ?? toTrimmedString(record['_id']);
  const nameEn = toTrimmedString(record['name_en']);
  const namePl = toTrimmedString(record['name_pl']);
  const nameDe = toTrimmedString(record['name_de']);
  const name = toTrimmedString(record['name']) ?? nameEn ?? namePl ?? nameDe;
  const catalogId = toTrimmedString(record['catalogId']) ?? fallbackCatalogId;

  if (!id || !name || !catalogId) return undefined;

  const descriptionValue = record['description'];
  const colorValue = record['color'];
  const parentIdValue = record['parentId'];
  const updatedAtValue = record['updatedAt'];
  const normalized: ProductCategory = {
    id,
    name,
    catalogId,
    color: colorValue === null ? null : toTrimmedString(colorValue) ?? null,
    parentId: parentIdValue === null ? null : toTrimmedString(parentIdValue) ?? null,
  };
  const description =
    descriptionValue === null ? null : toTrimmedString(descriptionValue) ?? undefined;
  const createdAt = toOptionalIsoString(record['createdAt']);
  const updatedAt =
    updatedAtValue === null ? null : toOptionalIsoString(updatedAtValue) ?? undefined;
  const sortIndex = record['sortIndex'];

  if (description !== undefined) normalized.description = description;
  if (createdAt !== undefined) normalized.createdAt = createdAt;
  if (updatedAt !== undefined) normalized.updatedAt = updatedAt;
  if (nameEn !== null) normalized.name_en = nameEn;
  if (namePl !== null) normalized.name_pl = namePl;
  if (nameDe !== null) normalized.name_de = nameDe;
  if (typeof sortIndex === 'number' && Number.isFinite(sortIndex)) {
    normalized.sortIndex = sortIndex;
  }

  return normalized;
};

const normalizeCatalogRelations = (
  value: unknown,
  rootProductId: string
): NonNullable<ProductWithImages['catalogs']> => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry: unknown, index: number): ProductCatalogRelation | null => {
      const record = toPlainRecord(entry);
      if (!record) return null;

      const embeddedCatalog = toPlainRecord(record['catalog']);
      const productId = toTrimmedString(record['productId']) ?? rootProductId;
      const catalogId =
        toTrimmedString(record['catalogId']) ?? toTrimmedString(embeddedCatalog?.['id']);
      const assignedAt = toOptionalIsoString(record['assignedAt']);

      if (!productId || !catalogId || !assignedAt) {
        throw validationError('Invalid product catalog relation payload.', {
          productId: rootProductId,
          field: 'catalogs',
          index,
          reason: 'missing_required_fields',
        });
      }

      const relation: ProductCatalogRelation = {
        productId,
        catalogId,
        assignedAt,
      };
      const parsedCatalog = catalogSchema.safeParse(record['catalog']);
      if (parsedCatalog.success) {
        relation.catalog = parsedCatalog.data;
      }
      return relation;
    })
    .filter(
      (relation: ProductCatalogRelation | null): relation is ProductCatalogRelation =>
        relation !== null
    );
};

const normalizeParameterValues = (input: unknown): ProductParameterValue[] => {
  if (!Array.isArray(input)) return [];
  const byParameterId = new Map<string, ProductParameterValue>();
  input.forEach((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;
    const parameterId = decodeSimpleParameterStorageId(
      toTrimmedString(record['parameterId']) ?? ''
    );
    if (!parameterId) return;
    const value = typeof record['value'] === 'string' ? record['value'].trim() : '';
    const valuesByLanguage = normalizeParameterValuesByLanguage(record['valuesByLanguage']);
    const hasLocalizedValues = Object.keys(valuesByLanguage).length > 0;
    const existingEntry = byParameterId.get(parameterId);
    byParameterId.set(
      parameterId,
      hasLocalizedValues
        ? mergeProductParameterValue(existingEntry, {
          parameterId,
          value,
          valuesByLanguage,
        })
        : {
          parameterId,
          value: resolveStoredParameterValue({}, value),
        }
    );
  });
  return Array.from(byParameterId.values());
};

const resolveCanonicalCatalogId = (doc: ProductDocument): string => {
  if (Array.isArray(doc.catalogs)) {
    for (const entry of doc.catalogs) {
      const record = toPlainRecord(entry);
      if (!record) continue;
      const relationCatalogId =
        toTrimmedString(record['catalogId']) ||
        toTrimmedString(toPlainRecord(record['catalog'])?.['id']) ||
        toTrimmedString(record['id']);
      if (relationCatalogId) return relationCatalogId;
    }
  }
  return toTrimmedString(doc.catalogId) ?? '';
};

const normalizeProducerRelations = (
  producers: unknown,
  rootProductId: string
): NonNullable<ProductWithImages['producers']> => {
  if (producers === undefined || producers === null) return [];
  if (!Array.isArray(producers)) {
    throw validationError('Invalid product producer relations payload.', {
      productId: rootProductId,
      field: 'producers',
      reason: 'not_array',
    });
  }
  const producerEntries = producers as unknown[];
  const normalized: NonNullable<ProductWithImages['producers']> = [];
  const seen = new Set<string>();
  for (let index = 0; index < producerEntries.length; index += 1) {
    const entry = producerEntries[index];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw validationError('Invalid product producer relation entry payload.', {
        productId: rootProductId,
        field: 'producers',
        index,
        reason: 'entry_not_object',
      });
    }
    const record = entry as Record<string, unknown>;
    const unsupportedKeys = ['producer_id', 'product_id', 'assigned_at', 'id', 'value'].filter(
      (key: string): boolean => key in record
    );
    if (unsupportedKeys.length > 0) {
      throw validationError('Product producer relation payload includes unsupported fields.', {
        productId: rootProductId,
        field: 'producers',
        index,
        unsupportedKeys,
      });
    }

    const producerId = toTrimmedString(record['producerId']);
    if (!producerId || seen.has(producerId)) continue;

    const relationProductId = toTrimmedString(record['productId']);
    const rawAssignedAt = record['assignedAt'];
    const assignedAt =
      rawAssignedAt instanceof Date ? rawAssignedAt.toISOString() : toTrimmedString(rawAssignedAt);
    if (!relationProductId || !assignedAt) {
      throw validationError('Invalid product producer relation payload.', {
        productId: rootProductId,
        field: 'producers',
        index,
        reason: 'missing_required_fields',
      });
    }
    seen.add(producerId);

    const relation: NonNullable<ProductWithImages['producers']>[number] = {
      productId: relationProductId,
      producerId,
      assignedAt,
    };

    if (record['producer'] && typeof record['producer'] === 'object') {
      relation.producer = record['producer'] as NonNullable<
        ProductWithImages['producers']
      >[number]['producer'];
    }
    normalized.push(relation);
  }
  return normalized;
};

const resolveLegacyProducerRefId = (value: unknown): string | null => {
  if (typeof value === 'string') return toTrimmedString(value);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return (
    toTrimmedString(record['producerId']) ??
    toTrimmedString(record['producer_id']) ??
    toTrimmedString(record['manufacturerId']) ??
    toTrimmedString(record['manufacturer_id']) ??
    toTrimmedString(record['id']) ??
    (record['producer'] && typeof record['producer'] === 'object'
      ? toTrimmedString((record['producer'] as Record<string, unknown>)['id'])
      : null)
  );
};

const normalizeLegacyTopLevelProducerRelations = (
  doc: ProductDocument,
  rootProductId: string
): NonNullable<ProductWithImages['producers']> => {
  const record = doc as Record<string, unknown>;
  const legacyProducerIds = Array.isArray(record['producerIds'])
    ? (record['producerIds'] as unknown[])
    : [];
  const assignedAtSource =
    doc.updatedAt instanceof Date
      ? doc.updatedAt.toISOString()
      : doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : null;
  if (!assignedAtSource) return [];

  const candidateIds = [
    ...legacyProducerIds,
    record['producerId'],
    record['producer_id'],
    record['manufacturerId'],
    record['manufacturer_id'],
    record['producer'],
    record['manufacturer'],
  ]
    .map((candidate: unknown) => resolveLegacyProducerRefId(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));

  return Array.from(new Set(candidateIds)).map((producerId: string) => ({
    productId: rootProductId,
    producerId,
    assignedAt: assignedAtSource,
  }));
};

const normalizeTagRelations = (
  tags: unknown,
  rootProductId: string
): NonNullable<ProductRecord['tags']> => {
  if (tags === undefined || tags === null) return [];
  if (!Array.isArray(tags)) {
    throw validationError('Invalid product tag relations payload.', {
      productId: rootProductId,
      field: 'tags',
      reason: 'not_array',
    });
  }
  const tagEntries = tags as unknown[];
  const normalized: NonNullable<ProductRecord['tags']> = [];
  const seen = new Set<string>();
  for (let index = 0; index < tagEntries.length; index += 1) {
    const entry = tagEntries[index];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw validationError('Invalid product tag relation entry payload.', {
        productId: rootProductId,
        field: 'tags',
        index,
        reason: 'entry_not_object',
      });
    }
    const record = entry as Record<string, unknown>;
    const unsupportedKeys = ['tag_id', 'product_id', 'assigned_at', 'id', 'value'].filter(
      (key: string): boolean => key in record
    );
    if (unsupportedKeys.length > 0) {
      throw validationError('Product tag relation payload includes unsupported fields.', {
        productId: rootProductId,
        field: 'tags',
        index,
        unsupportedKeys,
      });
    }

    const tagId = toTrimmedString(record['tagId']);
    if (!tagId || seen.has(tagId)) continue;

    const relationProductId = toTrimmedString(record['productId']);
    const rawAssignedAt = record['assignedAt'];
    const assignedAt =
      rawAssignedAt instanceof Date ? rawAssignedAt.toISOString() : toTrimmedString(rawAssignedAt);
    if (!relationProductId || !assignedAt) {
      throw validationError('Invalid product tag relation payload.', {
        productId: rootProductId,
        field: 'tags',
        index,
        reason: 'missing_required_fields',
      });
    }
    seen.add(tagId);

    const relation: NonNullable<ProductRecord['tags']>[number] = {
      productId: relationProductId,
      tagId,
      assignedAt,
    };

    if (record['tag'] && typeof record['tag'] === 'object') {
      relation.tag = record['tag'] as NonNullable<ProductRecord['tags']>[number]['tag'];
    }
    normalized.push(relation);
  }
  return normalized;
};

export const toProductResponse = (doc: WithId<ProductDocument>): ProductWithImages => {
  const productId = doc.id ?? doc._id;
  const images = Array.isArray(doc.images) ? doc.images : [];
  const catalogs = normalizeCatalogRelations(doc.catalogs, productId);
  assertNoUnsupportedLocalizedObjectShape(doc.name, 'name', productId);
  assertNoUnsupportedLocalizedObjectShape(doc.description, 'description', productId);
  assertCanonicalLocalizedScalarField(doc.name_en, 'name_en', productId);
  assertCanonicalLocalizedScalarField(doc.name_pl, 'name_pl', productId);
  assertCanonicalLocalizedScalarField(doc.name_de, 'name_de', productId);
  assertCanonicalLocalizedScalarField(doc.description_en, 'description_en', productId);
  assertCanonicalLocalizedScalarField(doc.description_pl, 'description_pl', productId);
  assertCanonicalLocalizedScalarField(doc.description_de, 'description_de', productId);
  const normalizedName = buildCanonicalLocalizedField({
    en: doc.name_en,
    pl: doc.name_pl,
    de: doc.name_de,
  });
  const normalizedDescription = buildCanonicalLocalizedField({
    en: doc.description_en,
    pl: doc.description_pl,
    de: doc.description_de,
  });
  const tags = normalizeTagRelations(doc.tags, productId);
  const canonicalProducers = normalizeProducerRelations(doc.producers, productId);
  const producers =
    canonicalProducers.length > 0
      ? canonicalProducers
      : normalizeLegacyTopLevelProducerRelations(doc, productId);
  const noteIds = Array.isArray(doc.noteIds) ? doc.noteIds : [];
  const catalogId = resolveCanonicalCatalogId(doc);
  const category = normalizeProductCategory(doc.category, catalogId);
  const duplicateSkuCount =
    typeof doc.duplicateSkuCount === 'number' &&
    Number.isFinite(doc.duplicateSkuCount) &&
    doc.duplicateSkuCount > 1
      ? Math.trunc(doc.duplicateSkuCount)
      : undefined;

  return {
    id: productId,
    sku: doc.sku ?? null,
    baseProductId: doc.baseProductId ?? null,
    importSource: doc.importSource ?? null,
    defaultPriceGroupId: doc.defaultPriceGroupId ?? null,
    ean: doc.ean ?? null,
    gtin: doc.gtin ?? null,
    asin: doc.asin ?? null,
    name: normalizedName,
    description: normalizedDescription,
    name_en: doc.name_en ?? null,
    name_pl: doc.name_pl ?? null,
    name_de: doc.name_de ?? null,
    description_en: doc.description_en ?? null,
    description_pl: doc.description_pl ?? null,
    description_de: doc.description_de ?? null,
    supplierName: doc.supplierName ?? null,
    supplierLink: doc.supplierLink ?? null,
    priceComment: doc.priceComment ?? null,
    stock: doc.stock ?? null,
    price: doc.price ?? null,
    sizeLength: doc.sizeLength ?? null,
    sizeWidth: doc.sizeWidth ?? null,
    weight: doc.weight ?? null,
    length: doc.length ?? null,
    published: doc.published ?? false,
    catalogId,
    category,
    shippingGroupId: toTrimmedString(doc.shippingGroupId) ?? null,
    customFields: normalizeProductCustomFieldValues(doc.customFields),
    parameters: normalizeParameterValues(doc.parameters),
    marketplaceContentOverrides: normalizeProductMarketplaceContentOverrides(
      doc.marketplaceContentOverrides
    ),
    imageLinks: Array.isArray(doc.imageLinks) ? doc.imageLinks : [],
    imageBase64s: Array.isArray(doc.imageBase64s) ? doc.imageBase64s : [],
    noteIds,
    duplicateSkuCount,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
    images: images.map((img) => ({ ...img, assignedAt: img.assignedAt })),
    catalogs,
    categoryId: resolveCanonicalCategoryId(doc, productId),
    tags,
    producers,
  };
};

export const toProductBase = (doc: ProductDocument): ProductRecord => {
  const productId = doc.id ?? doc._id;
  assertNoUnsupportedLocalizedObjectShape(doc.name, 'name', productId);
  assertNoUnsupportedLocalizedObjectShape(doc.description, 'description', productId);
  assertCanonicalLocalizedScalarField(doc.name_en, 'name_en', productId);
  assertCanonicalLocalizedScalarField(doc.name_pl, 'name_pl', productId);
  assertCanonicalLocalizedScalarField(doc.name_de, 'name_de', productId);
  assertCanonicalLocalizedScalarField(doc.description_en, 'description_en', productId);
  assertCanonicalLocalizedScalarField(doc.description_pl, 'description_pl', productId);
  assertCanonicalLocalizedScalarField(doc.description_de, 'description_de', productId);
  const normalizedName = buildCanonicalLocalizedField({
    en: doc.name_en,
    pl: doc.name_pl,
    de: doc.name_de,
  });
  const normalizedDescription = buildCanonicalLocalizedField({
    en: doc.description_en,
    pl: doc.description_pl,
    de: doc.description_de,
  });
  const noteIds = Array.isArray(doc.noteIds) ? doc.noteIds : [];
  const tags = normalizeTagRelations(doc.tags, productId);
  const canonicalProducers = normalizeProducerRelations(doc.producers, productId);
  const producers =
    canonicalProducers.length > 0
      ? canonicalProducers
      : normalizeLegacyTopLevelProducerRelations(doc, productId);
  const catalogId = resolveCanonicalCatalogId(doc);
  const category = normalizeProductCategory(doc.category, catalogId);

  return {
    id: productId,
    sku: doc.sku ?? null,
    baseProductId: doc.baseProductId ?? null,
    importSource: doc.importSource ?? null,
    defaultPriceGroupId: doc.defaultPriceGroupId ?? null,
    ean: doc.ean ?? null,
    gtin: doc.gtin ?? null,
    asin: doc.asin ?? null,
    name: normalizedName,
    description: normalizedDescription,
    name_en: doc.name_en ?? null,
    name_pl: doc.name_pl ?? null,
    name_de: doc.name_de ?? null,
    description_en: doc.description_en ?? null,
    description_pl: doc.description_pl ?? null,
    description_de: doc.description_de ?? null,
    supplierName: doc.supplierName ?? null,
    supplierLink: doc.supplierLink ?? null,
    priceComment: doc.priceComment ?? null,
    stock: doc.stock ?? null,
    price: doc.price ?? null,
    sizeLength: doc.sizeLength ?? null,
    sizeWidth: doc.sizeWidth ?? null,
    weight: doc.weight ?? null,
    length: doc.length ?? null,
    published: doc.published ?? false,
    catalogId,
    category,
    shippingGroupId: toTrimmedString(doc.shippingGroupId) ?? null,
    customFields: normalizeProductCustomFieldValues(doc.customFields),
    parameters: normalizeParameterValues(doc.parameters),
    marketplaceContentOverrides: normalizeProductMarketplaceContentOverrides(
      doc.marketplaceContentOverrides
    ),
    imageLinks: Array.isArray(doc.imageLinks) ? doc.imageLinks : [],
    imageBase64s: Array.isArray(doc.imageBase64s) ? doc.imageBase64s : [],
    noteIds,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
    categoryId: resolveCanonicalCategoryId(doc, productId),
    tags,
    producers,
    images: Array.isArray(doc.images) ? doc.images : [],
  };
};
