import { resolveStructuredProductTitleTermValues } from '@/shared/lib/products/title-terms';

const STRUCTURED_TITLE_FIELDS = ['size', 'material', 'theme'] as const;

type StructuredTitleField = (typeof STRUCTURED_TITLE_FIELDS)[number];

export type ProductStructuredTitleValue = Partial<Record<StructuredTitleField, string>>;

type ProductStructuredTitleRecord = {
  id?: unknown;
  _id?: unknown;
  name_en?: unknown;
  structuredTitle?: unknown;
};

export type ProductStructuredTitleBackfillResult = {
  productId: string | null;
  currentStructuredTitle: ProductStructuredTitleValue;
  nextStructuredTitle: ProductStructuredTitleValue;
  changed: boolean;
  populatedFieldCount: number;
  cleared: boolean;
};

const normalizeTrimmedString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const normalizeStructuredTitleValue = (value: unknown): ProductStructuredTitleValue => {
  const record = toRecord(value);
  if (!record) return {};

  return STRUCTURED_TITLE_FIELDS.reduce<ProductStructuredTitleValue>(
    (accumulator, field) => {
      const normalized = normalizeTrimmedString(record[field]);
      if (!normalized) return accumulator;
      accumulator[field] = normalized;
      return accumulator;
    },
    {}
  );
};

const areStructuredTitleValuesEqual = (
  left: ProductStructuredTitleValue,
  right: ProductStructuredTitleValue
): boolean =>
  STRUCTURED_TITLE_FIELDS.every((field) => (left[field] ?? '') === (right[field] ?? ''));

export const buildProductStructuredTitleBackfillResult = (
  product: ProductStructuredTitleRecord
): ProductStructuredTitleBackfillResult => {
  const productId =
    normalizeTrimmedString(product.id) || normalizeTrimmedString(product._id) || null;
  const currentStructuredTitle = normalizeStructuredTitleValue(product.structuredTitle);
  const nextStructuredTitle = resolveStructuredProductTitleTermValues(
    normalizeTrimmedString(product.name_en)
  );

  return {
    productId,
    currentStructuredTitle,
    nextStructuredTitle,
    changed: !areStructuredTitleValuesEqual(currentStructuredTitle, nextStructuredTitle),
    populatedFieldCount: Object.keys(nextStructuredTitle).length,
    cleared:
      Object.keys(currentStructuredTitle).length > 0 &&
      Object.keys(nextStructuredTitle).length === 0,
  };
};
