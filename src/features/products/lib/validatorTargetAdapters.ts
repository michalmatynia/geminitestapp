import type { ProductValidationTarget } from '@/shared/contracts/products/validation';

export type ProductValidationValueKind = 'text' | 'number' | 'category';
export type ProductValidationNumberMode = 'integer' | 'decimal';

export type ProductValidationTargetAdapter = {
  target: ProductValidationTarget;
  valueKind: ProductValidationValueKind;
  numberMode?: ProductValidationNumberMode;
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
    numberMode: 'decimal',
    replacementFields: ['price'],
  },
  stock: {
    target: 'stock',
    valueKind: 'number',
    numberMode: 'integer',
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
    numberMode: 'decimal',
    replacementFields: ['weight'],
  },
  size_length: {
    target: 'size_length',
    valueKind: 'number',
    numberMode: 'decimal',
    replacementFields: ['sizeLength'],
  },
  size_width: {
    target: 'size_width',
    valueKind: 'number',
    numberMode: 'decimal',
    replacementFields: ['sizeWidth'],
  },
  length: {
    target: 'length',
    valueKind: 'number',
    numberMode: 'decimal',
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

const FIELD_NUMBER_MODE_BY_FIELD_NAME: Partial<
  Record<keyof typeof FIELD_VALUE_KIND_BY_FIELD_NAME, ProductValidationNumberMode>
> = {
  price: 'decimal',
  stock: 'integer',
  weight: 'decimal',
  sizeLength: 'decimal',
  sizeWidth: 'decimal',
  length: 'decimal',
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

export const getProductValidationFieldNumberMode = (
  fieldName: string
): ProductValidationNumberMode => FIELD_NUMBER_MODE_BY_FIELD_NAME[fieldName] ?? 'integer';

export const getProductValidationFieldChangedAtDependencies = (
  fieldName: string
): ReadonlyArray<string> =>
  fieldName === 'categoryId' ? CATEGORY_FIELD_CHANGED_AT_DEPENDENCIES : [fieldName];

export const coerceProductValidationNumericValue = (
  value: string | null | undefined,
  mode: ProductValidationNumberMode = 'integer'
): number | null => {
  if (typeof value !== 'string') return null;
  const numericValue = Number(value.replace(',', '.'));
  if (!Number.isFinite(numericValue)) return null;
  return Math.max(0, mode === 'decimal' ? numericValue : Math.floor(numericValue));
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
    return coerceProductValidationNumericValue(value, adapter.numberMode ?? 'integer');
  }
  return value;
};
