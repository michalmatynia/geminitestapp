import type { ProductValidationTarget } from '@/shared/contracts/products';

export type ProductValidationValueKind = 'text' | 'number' | 'category';

export type ProductValidationTargetAdapter = {
  target: ProductValidationTarget;
  valueKind: ProductValidationValueKind;
  replacementFields: ReadonlyArray<string>;
};

const TARGET_ADAPTERS: Record<ProductValidationTarget, ProductValidationTargetAdapter> = {
  name: {
    target: 'name',
    valueKind: 'text',
    replacementFields: ['name_en', 'name_pl', 'name_de'],
  },
  description: {
    target: 'description',
    valueKind: 'text',
    replacementFields: ['description_en', 'description_pl', 'description_de'],
  },
  sku: {
    target: 'sku',
    valueKind: 'text',
    replacementFields: ['sku'],
  },
  price: {
    target: 'price',
    valueKind: 'number',
    replacementFields: ['price'],
  },
  stock: {
    target: 'stock',
    valueKind: 'number',
    replacementFields: ['stock'],
  },
  category: {
    target: 'category',
    valueKind: 'category',
    replacementFields: ['categoryId'],
  },
  weight: {
    target: 'weight',
    valueKind: 'number',
    replacementFields: ['weight'],
  },
  size_length: {
    target: 'size_length',
    valueKind: 'number',
    replacementFields: ['sizeLength'],
  },
  size_width: {
    target: 'size_width',
    valueKind: 'number',
    replacementFields: ['sizeWidth'],
  },
  length: {
    target: 'length',
    valueKind: 'number',
    replacementFields: ['length'],
  },
};

const DEFAULT_TARGET_ADAPTER = TARGET_ADAPTERS.sku;

const FIELD_VALUE_KIND_BY_FIELD_NAME: Record<string, ProductValidationValueKind> = {
  name_en: 'text',
  name_pl: 'text',
  name_de: 'text',
  description_en: 'text',
  description_pl: 'text',
  description_de: 'text',
  sku: 'text',
  price: 'number',
  stock: 'number',
  categoryId: 'category',
  weight: 'number',
  sizeLength: 'number',
  sizeWidth: 'number',
  length: 'number',
};

const CATEGORY_FIELD_CHANGED_AT_DEPENDENCIES = ['categoryId', 'name_en'] as const;

export const getProductValidationTargetAdapter = (
  target: string
): ProductValidationTargetAdapter =>
  TARGET_ADAPTERS[target as ProductValidationTarget] ?? DEFAULT_TARGET_ADAPTER;

export const getReplacementFieldsForProductValidationTarget = (
  target: string
): ReadonlyArray<string> => getProductValidationTargetAdapter(target).replacementFields;

export const getProductValidationFieldValueKind = (
  fieldName: string
): ProductValidationValueKind | null => FIELD_VALUE_KIND_BY_FIELD_NAME[fieldName] ?? null;

export const getProductValidationFieldChangedAtDependencies = (
  fieldName: string
): ReadonlyArray<string> =>
  fieldName === 'categoryId' ? CATEGORY_FIELD_CHANGED_AT_DEPENDENCIES : [fieldName];

export const coerceProductValidationNumericValue = (
  value: string | null | undefined
): number | null => {
  if (typeof value !== 'string') return null;
  const numericValue = Number(value.replace(',', '.'));
  if (!Number.isFinite(numericValue)) return null;
  return Math.max(0, Math.floor(numericValue));
};

export const coerceProductValidationTargetValue = ({
  target,
  value,
}: {
  target: string;
  value: string;
}): string | number | null => {
  const adapter = getProductValidationTargetAdapter(target);
  if (adapter.valueKind === 'number') {
    return coerceProductValidationNumericValue(value);
  }
  return value;
};
