import type {
  ProductParameterValue,
  ProductRecord,
  ProductWithImages,
} from '@/features/products/types';
import { decodeSimpleParameterStorageId } from '@/features/products/utils/parameter-partition';

import type { WithId } from 'mongodb';

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
};

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveCategoryId = (doc: ProductDocument): string | null => {
  const direct = toTrimmedString(doc.categoryId);
  if (direct) return direct;

  if (Array.isArray(doc.categories)) {
    for (const entry of doc.categories as unknown[]) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      const categoryId =
        toTrimmedString(record['categoryId']) ??
        toTrimmedString(record['category_id']) ??
        toTrimmedString(record['id']) ??
        toTrimmedString(record['value']);
      if (categoryId) return categoryId;
    }
    return null;
  }

  if (doc.categories && typeof doc.categories === 'object') {
    const record = doc.categories as Record<string, unknown>;
    const categoryId =
      toTrimmedString(record['categoryId']) ??
      toTrimmedString(record['category_id']) ??
      toTrimmedString(record['id']) ??
      toTrimmedString(record['value']);
    if (categoryId) return categoryId;
  }

  return null;
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
    const value = typeof record['value'] === 'string' ? record['value'] : '';
    const valuesByLanguageRaw = record['valuesByLanguage'];
    const valuesByLanguage =
      valuesByLanguageRaw &&
      typeof valuesByLanguageRaw === 'object' &&
      !Array.isArray(valuesByLanguageRaw)
        ? Object.entries(valuesByLanguageRaw as Record<string, unknown>).reduce(
            (acc: Record<string, string>, [languageCode, languageValue]) => {
              const normalizedCode = toTrimmedString(languageCode)?.toLowerCase();
              if (!normalizedCode || typeof languageValue !== 'string') return acc;
              acc[normalizedCode] = languageValue;
              return acc;
            },
            {}
          )
        : {};
    const current = byParameterId.get(parameterId);
    if (!current) {
      byParameterId.set(parameterId, {
        parameterId,
        value,
        ...(Object.keys(valuesByLanguage).length > 0
          ? { valuesByLanguage }
          : {}),
      });
      return;
    }
    const mergedValuesByLanguage = {
      ...(current.valuesByLanguage ?? {}),
      ...valuesByLanguage,
    };
    byParameterId.set(parameterId, {
      parameterId,
      value: current.value || value,
      ...(Object.keys(mergedValuesByLanguage).length > 0
        ? { valuesByLanguage: mergedValuesByLanguage }
        : {}),
    });
  });
  return Array.from(byParameterId.values());
};

const normalizeProducerRelations = (
  producers: unknown,
  fallbackProductId: string,
  fallbackAssignedAt: string
): NonNullable<ProductWithImages['producers']> => {
  if (!Array.isArray(producers)) return [];
  const normalized: NonNullable<ProductWithImages['producers']> = [];
  const seen = new Set<string>();
  for (const entry of producers) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const producerId =
      toTrimmedString(record['producerId']) ??
      toTrimmedString(record['producer_id']) ??
      toTrimmedString(record['id']) ??
      toTrimmedString(record['value']);
    if (!producerId || seen.has(producerId)) continue;
    seen.add(producerId);

    const relationProductId =
      toTrimmedString(record['productId']) ??
      toTrimmedString(record['product_id']) ??
      fallbackProductId;

    const rawAssignedAt = record['assignedAt'] ?? record['assigned_at'];
    let assignedAt = fallbackAssignedAt;
    if (
      rawAssignedAt &&
      typeof rawAssignedAt === 'object' &&
      rawAssignedAt instanceof Date
    ) {
      assignedAt = rawAssignedAt.toISOString();
    } else {
      assignedAt = toTrimmedString(rawAssignedAt) ?? fallbackAssignedAt;
    }

    const relation: NonNullable<ProductWithImages['producers']>[number] = {
      productId: relationProductId,
      producerId,
      assignedAt,
    };

    if (record['producer'] && typeof record['producer'] === 'object') {
      relation.producer =
        record['producer'] as NonNullable<ProductWithImages['producers']>[number]['producer'];
    }
    normalized.push(relation);
  }
  return normalized;
};

const normalizeTagRelations = (
  tags: unknown,
  fallbackProductId: string,
  fallbackAssignedAt: string
): NonNullable<ProductRecord['tags']> => {
  if (!Array.isArray(tags)) return [];
  const normalized: NonNullable<ProductRecord['tags']> = [];
  const seen = new Set<string>();
  for (const entry of tags) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const tagId =
      toTrimmedString(record['tagId']) ??
      toTrimmedString(record['tag_id']) ??
      toTrimmedString(record['id']) ??
      toTrimmedString(record['value']);
    if (!tagId || seen.has(tagId)) continue;
    seen.add(tagId);

    const relationProductId =
      toTrimmedString(record['productId']) ??
      toTrimmedString(record['product_id']) ??
      fallbackProductId;

    const rawAssignedAt = record['assignedAt'] ?? record['assigned_at'];
    let assignedAt = fallbackAssignedAt;
    if (
      rawAssignedAt &&
      typeof rawAssignedAt === 'object' &&
      rawAssignedAt instanceof Date
    ) {
      assignedAt = rawAssignedAt.toISOString();
    } else {
      assignedAt = toTrimmedString(rawAssignedAt) ?? fallbackAssignedAt;
    }

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
  const catalogs = Array.isArray(doc.catalogs) ? doc.catalogs : [];
  const fallbackAssignedAt =
    doc.updatedAt instanceof Date
      ? doc.updatedAt.toISOString()
      : ((doc.updatedAt as unknown as string) || new Date().toISOString());
  const tags = normalizeTagRelations(doc.tags, productId, fallbackAssignedAt);
  const producers = normalizeProducerRelations(
    doc.producers,
    productId,
    fallbackAssignedAt
  );
  const noteIds = Array.isArray((doc as unknown as { noteIds?: unknown }).noteIds)
    ? (doc as unknown as { noteIds: string[] }).noteIds
    : [];

  return {
    id: productId,
    sku: doc.sku ?? null,
    baseProductId: doc.baseProductId ?? null,
    defaultPriceGroupId: doc.defaultPriceGroupId ?? null,
    ean: doc.ean ?? null,
    gtin: doc.gtin ?? null,
    asin: doc.asin ?? null,
    name: doc.name || { en: doc.name_en ?? '', pl: doc.name_pl ?? null, de: doc.name_de ?? null },
    description: doc.description || { en: doc.description_en ?? '', pl: doc.description_pl ?? null, de: doc.description_de ?? null },
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
    catalogId: doc.catalogId ?? '',
    parameters: normalizeParameterValues(doc.parameters),
    imageLinks: Array.isArray(doc.imageLinks) ? doc.imageLinks : [],
    imageBase64s: Array.isArray(doc.imageBase64s) ? doc.imageBase64s : [],
    noteIds,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : (doc.createdAt as unknown as string),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : (doc.updatedAt as unknown as string),
    images: images.map((img) => ({ ...img, assignedAt: img.assignedAt })),
    catalogs: catalogs.map((cat) => ({ ...cat, assignedAt: cat.assignedAt })),
    categoryId: resolveCategoryId(doc),
    tags,
    producers,
  };
};

export const toProductBase = (doc: ProductDocument): ProductRecord => {
  const productId = doc.id ?? doc._id;
  const noteIds = Array.isArray((doc as unknown as { noteIds?: unknown }).noteIds)
    ? (doc as unknown as { noteIds: string[] }).noteIds
    : [];
  const fallbackAssignedAt =
    doc.updatedAt instanceof Date
      ? doc.updatedAt.toISOString()
      : ((doc.updatedAt as unknown as string) || new Date().toISOString());
  const tags = normalizeTagRelations(doc.tags, productId, fallbackAssignedAt);
  const producers = normalizeProducerRelations(
    doc.producers,
    productId,
    fallbackAssignedAt
  );

  return {
    id: productId,
    sku: doc.sku ?? null,
    baseProductId: doc.baseProductId ?? null,
    defaultPriceGroupId: doc.defaultPriceGroupId ?? null,
    ean: doc.ean ?? null,
    gtin: doc.gtin ?? null,
    asin: doc.asin ?? null,
    name: doc.name || { en: doc.name_en ?? '', pl: doc.name_pl ?? null, de: doc.name_de ?? null },
    description: doc.description || { en: doc.description_en ?? '', pl: doc.description_pl ?? null, de: doc.description_de ?? null },
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
    catalogId: doc.catalogId ?? '',
    parameters: normalizeParameterValues(doc.parameters),
    imageLinks: Array.isArray(doc.imageLinks) ? doc.imageLinks : [],
    imageBase64s: Array.isArray(doc.imageBase64s) ? doc.imageBase64s : [],
    noteIds,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : (doc.createdAt as unknown as string),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : (doc.updatedAt as unknown as string),
    categoryId: resolveCategoryId(doc),
    tags,
    producers,
    images: Array.isArray(doc.images) ? doc.images : [],
  };
};
