// Validator source field labels and helper mappings: maps product fields to
// human-friendly labels used by validator UIs and replacement recipes. Kept as
// a small, deterministic module so it can be imported in both client and
// server contexts.
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/shared/lib/products/constants';

export const PRODUCT_VALIDATION_REPLACEMENT_FIELD_LABELS: Record<string, string> = {
  sku: 'SKU',
  ean: 'EAN',
  gtin: 'GTIN',
  asin: 'ASIN',
  price: 'Price',
  stock: 'Stock',
  categoryId: 'Category',
  weight: 'Weight',
  sizeLength: 'Size Length',
  sizeWidth: 'Size Width',
  length: 'Height',
  name_en: 'Name (EN)',
  name_pl: 'Name (PL)',
  name_de: 'Name (DE)',
  description_en: 'Description (EN)',
  description_pl: 'Description (PL)',
  description_de: 'Description (DE)',
};

export const PRODUCT_VALIDATION_REPLACEMENT_FIELD_OPTIONS: ReadonlyArray<LabeledOptionDto<string>> =
  PRODUCT_VALIDATION_REPLACEMENT_FIELDS.map((field) => ({
    value: field,
    label: PRODUCT_VALIDATION_REPLACEMENT_FIELD_LABELS[field] ?? field,
  }));

export const PRODUCT_VALIDATION_SOURCE_FIELD_IDS = {
  primaryCatalogId: 'primaryCatalogId',
  categoryName: 'categoryName',
  nameEnSegment4: 'nameEnSegment4',
  nameEnSegment4RegexEscaped: 'nameEnSegment4RegexEscaped',
} as const;

export const PRODUCT_VALIDATION_DERIVED_SOURCE_FIELD_OPTIONS: ReadonlyArray<
  LabeledOptionDto<string>
> = [
  {
    value: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.primaryCatalogId,
    label: 'Primary Catalog ID',
  },
  {
    value: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.categoryName,
    label: 'Category Name',
  },
  {
    value: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment4,
    label: 'Name EN Segment #4',
  },
  {
    value: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment4RegexEscaped,
    label: 'Name EN Segment #4 (Regex Escaped)',
  },
] as const;

export const PRODUCT_VALIDATION_SOURCE_FIELD_OPTIONS: ReadonlyArray<LabeledOptionDto<string>> = [
  ...PRODUCT_VALIDATION_REPLACEMENT_FIELD_OPTIONS,
  ...PRODUCT_VALIDATION_DERIVED_SOURCE_FIELD_OPTIONS,
];

type BuildProductValidationSourceValuesInput = {
  baseValues: Record<string, unknown>;
  categories?: ReadonlyArray<ProductCategory>;
  selectedCategoryId?: string | null;
  selectedCatalogIds?: ReadonlyArray<string>;
  fallbackCatalogId?: string | null;
};

const toTrimmedString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const extractNameSegment = (value: unknown, segmentIndex: number): string => {
  const normalizedValue = toTrimmedString(value);
  if (!normalizedValue) return '';
  const parts = normalizedValue.split('|').map((part) => part.trim());
  if (parts.length < segmentIndex + 1) return '';
  return parts[segmentIndex] ?? '';
};

const escapeRegexLiteral = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolvePrimaryCatalogId = (
  selectedCatalogIds: ReadonlyArray<string> | undefined,
  fallbackCatalogId: string | null | undefined
): string => {
  const selected = selectedCatalogIds?.[0]?.trim() ?? '';
  if (selected) return selected;
  return toTrimmedString(fallbackCatalogId);
};

const resolveCategoryId = (
  selectedCategoryId: string | null | undefined,
  baseValues: Record<string, unknown>
): string => {
  const selected = toTrimmedString(selectedCategoryId);
  if (selected) return selected;
  return toTrimmedString(baseValues['categoryId']);
};

const resolveCategoryName = (
  categoryId: string,
  categories: ReadonlyArray<ProductCategory> | undefined
): string => {
  if (!categoryId) return '';
  const match = categories?.find((category) => toTrimmedString(category.id) === categoryId) ?? null;
  return toTrimmedString(match?.name);
};

export const buildProductValidationSourceValues = (
  input: BuildProductValidationSourceValuesInput
): Record<string, unknown> => {
  const baseValues = input.baseValues;
  const categoryId = resolveCategoryId(input.selectedCategoryId, baseValues);
  const nameEnSegment4 = extractNameSegment(baseValues['name_en'], 3);

  return {
    ...baseValues,
    categoryId,
    [PRODUCT_VALIDATION_SOURCE_FIELD_IDS.primaryCatalogId]: resolvePrimaryCatalogId(
      input.selectedCatalogIds,
      input.fallbackCatalogId
    ),
    [PRODUCT_VALIDATION_SOURCE_FIELD_IDS.categoryName]: resolveCategoryName(
      categoryId,
      input.categories
    ),
    [PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment4]: nameEnSegment4,
    [PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment4RegexEscaped]:
      escapeRegexLiteral(nameEnSegment4),
  };
};
