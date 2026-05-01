// Validator target adapters: define how abstract validation targets map to
// concrete product fields, their value kinds and replacement fields. This is
// used by the validation engine to extract and coerce values for rules.
import type { ProductValidationTarget } from '@/shared/contracts/products/validation';

export type ProductValidationValueKind = 'text' | 'number' | 'category' | 'producer';
export type ProductValidationNumberMode = 'integer' | 'decimal';
type ProductValidationMeasurementKind = 'dimensionCm' | 'weightKg';

export type ProductValidationTargetAdapter = {
  target: ProductValidationTarget;
  valueKind: ProductValidationValueKind;
  numberMode?: ProductValidationNumberMode;
  measurementKind?: ProductValidationMeasurementKind;
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
  producer: {
    target: 'producer',
    valueKind: 'producer',
    replacementFields: ['producerIds'],
  },
  weight: {
    target: 'weight',
    valueKind: 'number',
    numberMode: 'decimal',
    measurementKind: 'weightKg',
    replacementFields: ['weight'],
  },
  size_length: {
    target: 'size_length',
    valueKind: 'number',
    numberMode: 'decimal',
    measurementKind: 'dimensionCm',
    replacementFields: ['sizeLength'],
  },
  size_width: {
    target: 'size_width',
    valueKind: 'number',
    numberMode: 'decimal',
    measurementKind: 'dimensionCm',
    replacementFields: ['sizeWidth'],
  },
  length: {
    target: 'length',
    valueKind: 'number',
    numberMode: 'decimal',
    measurementKind: 'dimensionCm',
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
  producerIds: 'producer',
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

const FIELD_MEASUREMENT_KIND_BY_FIELD_NAME: Partial<
  Record<keyof typeof FIELD_VALUE_KIND_BY_FIELD_NAME, ProductValidationMeasurementKind>
> = {
  weight: 'weightKg',
  sizeLength: 'dimensionCm',
  sizeWidth: 'dimensionCm',
  length: 'dimensionCm',
};

const CATEGORY_FIELD_CHANGED_AT_DEPENDENCIES = ['categoryId', 'name_en'] as const;
const NUMBER_WITH_OPTIONAL_UNIT_PATTERN =
  /^([+-]?\d+(?:[.,]\d+)?)\s*([a-zA-Zµμ]+)?$/u;
const DIMENSION_CM_UNIT_FACTORS: Record<string, number> = {
  cm: 1,
  centimeter: 1,
  centimeters: 1,
  mm: 0.1,
  millimeter: 0.1,
  millimeters: 0.1,
  m: 100,
  meter: 100,
  meters: 100,
};
const WEIGHT_KG_UNIT_FACTORS: Record<string, number> = {
  kg: 1,
  kilogram: 1,
  kilograms: 1,
  g: 0.001,
  gram: 0.001,
  grams: 0.001,
};

export const getProductValidationTargetAdapter = (
  target: string
): ProductValidationTargetAdapter => {
  if (Object.prototype.hasOwnProperty.call(TARGET_ADAPTERS, target)) {
    return TARGET_ADAPTERS[target as ProductValidationTarget];
  }

  return DEFAULT_TARGET_ADAPTER;
};

export const getReplacementFieldsForProductValidationTarget = (
  target: string
): ReadonlyArray<string> => getProductValidationTargetAdapter(target).replacementFields;

export const getProductValidationFieldValueKind = (
  fieldName: string
): ProductValidationValueKind | null => FIELD_VALUE_KIND_BY_FIELD_NAME[fieldName] ?? null;

export const getProductValidationFieldNumberMode = (
  fieldName: string
): ProductValidationNumberMode => FIELD_NUMBER_MODE_BY_FIELD_NAME[fieldName] ?? 'integer';

const normalizeNumericText = (value: string): string => value.trim().replace(',', '.');

const normalizeUnitText = (unit: string | undefined): string | null => {
  if (unit === undefined) return null;
  const normalized = unit.trim().toLowerCase().replace('µ', 'u').replace('μ', 'u');
  return normalized.length > 0 ? normalized : null;
};

const convertByUnitFactor = (
  value: number,
  unit: string | null,
  factors: Record<string, number>
): number | null => {
  if (unit === null) return value;
  const factor = factors[unit];
  return factor === undefined ? null : value * factor;
};

const convertDimensionToCm = (value: number, unit: string | null): number | null =>
  convertByUnitFactor(value, unit, DIMENSION_CM_UNIT_FACTORS);

const convertWeightToKg = (value: number, unit: string | null): number | null =>
  convertByUnitFactor(value, unit, WEIGHT_KG_UNIT_FACTORS);

const convertMeasuredNumericValue = (
  value: number,
  unit: string | null,
  measurementKind: ProductValidationMeasurementKind | undefined
): number | null => {
  if (measurementKind === 'dimensionCm') return convertDimensionToCm(value, unit);
  if (measurementKind === 'weightKg') return convertWeightToKg(value, unit);
  return unit === null ? value : null;
};

const roundNumericValue = (value: number, mode: ProductValidationNumberMode): number =>
  Math.max(0, mode === 'decimal' ? value : Math.floor(value));

export const getProductValidationFieldChangedAtDependencies = (
  fieldName: string
): ReadonlyArray<string> =>
  fieldName === 'categoryId' ? CATEGORY_FIELD_CHANGED_AT_DEPENDENCIES : [fieldName];

export const coerceProductValidationNumericValue = (
  value: string | null | undefined,
  mode: ProductValidationNumberMode = 'integer',
  measurementKind?: ProductValidationMeasurementKind
): number | null => {
  if (typeof value !== 'string') return null;
  const match = NUMBER_WITH_OPTIONAL_UNIT_PATTERN.exec(normalizeNumericText(value));
  if (match === null) return null;
  const numericValue = Number(match[1]);
  if (!Number.isFinite(numericValue)) return null;
  const measuredValue = convertMeasuredNumericValue(
    numericValue,
    normalizeUnitText(match[2]),
    measurementKind
  );
  if (measuredValue === null || !Number.isFinite(measuredValue)) return null;
  return roundNumericValue(measuredValue, mode);
};

export const coerceProductValidationFieldNumericValue = (
  fieldName: string,
  value: string | null | undefined
): number | null => {
  const mode = getProductValidationFieldNumberMode(fieldName);
  const measurementKind = FIELD_MEASUREMENT_KIND_BY_FIELD_NAME[fieldName];
  return coerceProductValidationNumericValue(value, mode, measurementKind);
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
    return coerceProductValidationNumericValue(
      value,
      adapter.numberMode ?? 'integer',
      adapter.measurementKind
    );
  }
  return value;
};
