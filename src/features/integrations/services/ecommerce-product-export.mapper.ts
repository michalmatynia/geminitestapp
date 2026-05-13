import { createHash } from 'crypto';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { EcommerceProductExportEnrichment } from './ecommerce-product-export.enrichment';
import {
  buildPricingSnapshot,
  buildShippingGroupSnapshot,
  type EcommerceProductPricingFields,
  type EcommerceProductShippingFields,
} from './ecommerce-product-export.snapshot';

export const ECOMMERCE_PRODUCT_SOURCE = 'geminitestapp-products';

type EcommerceProductCoreFields = {
  _id: string;
  sourceProductId: string;
  source: typeof ECOMMERCE_PRODUCT_SOURCE;
  sku: string | null;
  slug: string;
  name_en: string | null;
  name_pl: string | null;
  name_de: string | null;
  description_en: string | null;
  description_pl: string | null;
  description_de: string | null;
  price: number | null;
  stock: number | null;
  published: boolean;
  archived: boolean;
  catalogId: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryName_en: string | null;
  categoryName_pl: string | null;
  categoryName_de: string | null;
  collectionSlug: string;
  imageUrl: string | null;
  imageUrls: string[];
  imageLinks: string[];
  exportedAt: string | Date;
  sourceCreatedAt: string | null;
  sourceUpdatedAt: string | null;
  sourceChecksum: string;
  createdAt: string | Date;
  updatedAt: string | Date | null;
};

export type EcommerceProductDocument = EcommerceProductCoreFields &
  EcommerceProductPricingFields &
  EcommerceProductShippingFields;

export type EcommerceCategoryDocument = {
  _id: string;
  sourceCategoryId: string;
  name: string;
  name_en: string | null;
  name_pl: string | null;
  name_de: string | null;
  catalogId: string;
  collectionSlug: string;
  source: typeof ECOMMERCE_PRODUCT_SOURCE;
  exportedAt: string | Date;
  updatedAt: string | Date;
};

type ProductSourceSnapshot = Omit<
  EcommerceProductDocument,
  '_id' | 'createdAt' | 'exportedAt' | 'source' | 'sourceChecksum' | 'updatedAt'
>;
type ProductCategory = NonNullable<ProductWithImages['category']>;
type CategoryExportInput = {
  category: ProductCategory;
  categoryId: string;
  categoryName: string;
};

const trimString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const firstTrimmedEnvValue = (...keys: string[]): string => {
  for (const key of keys) {
    const value = trimString(process.env[key]);
    if (value.length > 0) return value;
  }
  return '';
};

const firstNonEmptyString = (...values: string[]): string => {
  for (const value of values) {
    if (value.length > 0) return value;
  }
  return '';
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const compactStringArray = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = trimString(value);
    if (trimmed.length === 0 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
};

const chooseText = (...values: Array<string | null | undefined>): string => {
  for (const value of values) {
    const trimmed = trimString(value);
    if (trimmed.length > 0) return trimmed;
  }
  return '';
};

const optionalStringArray = (values: string[] | undefined): string[] => {
  if (values === undefined) return [];
  return values;
};

const nullableString = (value: string | null | undefined): string | null => {
  if (value === undefined) return null;
  return value;
};

const nullableNumber = (value: number | null | undefined): number | null => {
  if (value === undefined) return null;
  return value;
};

const localizedCategoryText = (
  category: ProductCategory | undefined,
  field: 'name_de' | 'name_en' | 'name_pl',
  fallback: string | null
): string | null => {
  if (category === undefined) return fallback;
  return nullableString(category[field]) ?? fallback;
};

const resolveCategoryName = (category: ProductCategory | undefined): string | null => {
  if (category === undefined) return null;
  const name = chooseText(category.name_en, category.name_pl, category.name_de, category.name);
  return name.length > 0 ? name : null;
};

export const categoryToCollectionSlug = (categoryName: string | null): string => {
  const normalized = (categoryName ?? '').toLowerCase();
  if (/women|dam[eę]|femm|ladies|girl|female/i.test(normalized)) return 'womenswear';
  if (/\bmen\b|heren|herr|homme|uomini|male/i.test(normalized)) return 'menswear';
  if (
    /bag|accessor|jewel|key\s*chain|keychain|charm|pin|ring|necklace|pendant|belt|scarf|wallet|purse|hat|cap|shoes?|boots?/i.test(
      normalized
    )
  ) {
    return 'accessories';
  }
  return 'objects';
};

const resolveSlug = (product: ProductWithImages): string => {
  const skuSlug = slugify(product.sku ?? '');
  if (skuSlug.length > 1) return skuSlug;

  const nameSlug = slugify(chooseText(product.name_en, product.name_pl, product.name_de, product.id));
  const idSuffix = product.id.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
  if (nameSlug.length > 1 && idSuffix.length > 0) return `${nameSlug}-${idSuffix}`;
  return product.id.toLowerCase();
};

const collectProductImageUrls = (product: ProductWithImages): string[] =>
  compactStringArray([
    ...optionalStringArray(product.imageLinks),
    ...product.images.flatMap((image) => [
      image.imageFile.publicUrl,
      image.imageFile.url,
      image.imageFile.filepath,
      image.imageFile.thumbnailUrl,
    ]),
  ]);

const resolveCatalogId = (product: ProductWithImages): string =>
  firstNonEmptyString(
    firstTrimmedEnvValue('ECOM_EXPORT_CATALOG_ID', 'MENTIOS_CATALOG_ID'),
    trimString(product.catalogId),
    'catalog-mentios'
  );

const stableChecksum = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

const resolveCategoryExportInput = (product: ProductWithImages): CategoryExportInput | null => {
  if (product.categoryId === null) return null;
  const category = product.category;
  if (category === undefined) return null;

  const categoryName = resolveCategoryName(category);
  if (categoryName === null) return null;

  return {
    category,
    categoryId: product.categoryId,
    categoryName,
  };
};

const buildProductSourceSnapshot = (
  product: ProductWithImages,
  enrichment?: EcommerceProductExportEnrichment
): ProductSourceSnapshot => {
  const category = product.category;
  const categoryName = resolveCategoryName(category);
  const imageUrls = collectProductImageUrls(product);
  const collectionSlug = categoryToCollectionSlug(categoryName);
  return {
    sourceProductId: product.id,
    sku: nullableString(product.sku),
    slug: resolveSlug(product),
    name_en: nullableString(product.name_en),
    name_pl: nullableString(product.name_pl),
    name_de: nullableString(product.name_de),
    description_en: nullableString(product.description_en),
    description_pl: nullableString(product.description_pl),
    description_de: nullableString(product.description_de),
    ...buildPricingSnapshot(product),
    stock: nullableNumber(product.stock),
    published: product.published !== false,
    archived: product.archived === true,
    catalogId: resolveCatalogId(product),
    categoryId: nullableString(product.categoryId),
    categoryName,
    categoryName_en: localizedCategoryText(category, 'name_en', categoryName),
    categoryName_pl: localizedCategoryText(category, 'name_pl', null),
    categoryName_de: localizedCategoryText(category, 'name_de', null),
    collectionSlug,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    imageLinks: imageUrls,
    ...buildShippingGroupSnapshot(product, enrichment?.shippingGroup),
    sourceCreatedAt: nullableString(product.createdAt),
    sourceUpdatedAt: nullableString(product.updatedAt),
  };
};

export const buildEcommerceProductExportDocument = (
  product: ProductWithImages,
  exportedAt: string,
  enrichment?: EcommerceProductExportEnrichment
): EcommerceProductDocument => {
  const sourceSnapshot = buildProductSourceSnapshot(product, enrichment);
  return {
    _id: product.id,
    source: ECOMMERCE_PRODUCT_SOURCE,
    ...sourceSnapshot,
    exportedAt,
    sourceChecksum: stableChecksum(sourceSnapshot),
    createdAt: exportedAt,
    updatedAt: exportedAt,
  };
};

export const buildEcommerceCategoryDocument = (
  product: ProductWithImages,
  exportedAt: string
): EcommerceCategoryDocument | null => {
  const categoryExport = resolveCategoryExportInput(product);
  if (categoryExport === null) return null;

  return {
    _id: categoryExport.categoryId,
    sourceCategoryId: categoryExport.categoryId,
    name: categoryExport.categoryName,
    name_en: localizedCategoryText(categoryExport.category, 'name_en', categoryExport.categoryName),
    name_pl: localizedCategoryText(categoryExport.category, 'name_pl', null),
    name_de: localizedCategoryText(categoryExport.category, 'name_de', null),
    catalogId: resolveCatalogId(product),
    collectionSlug: categoryToCollectionSlug(categoryExport.categoryName),
    source: ECOMMERCE_PRODUCT_SOURCE,
    exportedAt,
    updatedAt: exportedAt,
  };
};
