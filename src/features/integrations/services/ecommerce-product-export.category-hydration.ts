import 'server-only';

import { ObjectId } from 'mongodb';

import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { getMongoDb } from '@/shared/lib/db/product-mongo-client';

const PRODUCT_CATEGORIES_COLLECTION = 'product_categories';

type ProductCategorySourceDocument = {
  _id: string | ObjectId;
  id?: unknown;
  catalogId?: unknown;
  color?: unknown;
  createdAt?: unknown;
  name?: unknown;
  name_de?: unknown;
  name_en?: unknown;
  name_pl?: unknown;
  parentId?: unknown;
  sortIndex?: unknown;
  updatedAt?: unknown;
};

const trimString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const nullableString = (value: unknown): string | null => {
  const trimmed = trimString(value);
  return trimmed.length > 0 ? trimmed : null;
};

const nullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const chooseText = (...values: unknown[]): string => {
  for (const value of values) {
    const trimmed = trimString(value);
    if (trimmed.length > 0) return trimmed;
  }
  return '';
};

const stringifyObjectDocumentValue = (value: object): string | null => {
  const candidate = value as { toHexString?: () => string; toString?: () => string };
  if (typeof candidate.toHexString === 'function') return candidate.toHexString();
  if (
    typeof candidate.toString === 'function' &&
    candidate.toString !== Object.prototype.toString
  ) {
    const stringified = candidate.toString().trim();
    return stringified.length > 0 ? stringified : null;
  }
  return null;
};

const stringifyDocumentValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'object') return null;
  return stringifyObjectDocumentValue(value);
};

const toIsoDateString = (value: unknown): string | undefined => {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value !== 'string') return undefined;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : undefined;
};

const buildCategoryLookupValues = (categoryId: string): Array<string | ObjectId> => {
  const values: Array<string | ObjectId> = [categoryId];
  if (/^[0-9a-fA-F]{24}$/.test(categoryId) && ObjectId.isValid(categoryId)) {
    values.push(new ObjectId(categoryId));
  }
  return values;
};

const toProductCategory = (
  doc: ProductCategorySourceDocument,
  categoryId: string,
  catalogId: string
): ProductCategory | null => {
  const name = chooseText(doc.name_en, doc.name_pl, doc.name_de, doc.name);
  if (name.length === 0) return null;

  const createdAt = toIsoDateString(doc.createdAt);
  const updatedAt = toIsoDateString(doc.updatedAt);
  return {
    id: categoryId,
    ...(createdAt === undefined ? {} : { createdAt }),
    ...(updatedAt === undefined ? {} : { updatedAt }),
    name,
    name_en: nullableString(doc.name_en),
    name_pl: nullableString(doc.name_pl),
    name_de: nullableString(doc.name_de),
    color: nullableString(doc.color),
    parentId: stringifyDocumentValue(doc.parentId),
    catalogId: nullableString(doc.catalogId) ?? catalogId,
    sortIndex: nullableNumber(doc.sortIndex),
  };
};

export const hydrateProductCategoryForExport = async (
  product: ProductWithImages
): Promise<ProductWithImages> => {
  if (product.category !== undefined || product.categoryId === null) return product;

  const productsDb = await getMongoDb('local');
  const categoryDoc = await productsDb
    .collection<ProductCategorySourceDocument>(PRODUCT_CATEGORIES_COLLECTION)
    .findOne({
      $or: [
        { _id: { $in: buildCategoryLookupValues(product.categoryId) } },
        { id: product.categoryId },
      ],
    });
  if (categoryDoc === null) return product;

  const category = toProductCategory(categoryDoc, product.categoryId, product.catalogId);
  return category === null ? product : { ...product, category };
};
