import type { LabeledOptionDto } from '@/shared/contracts/base';

export const PRODUCT_IDENTIFIER_FIELD_NAMES = ['ean', 'gtin', 'asin'] as const;
export type ProductIdentifierFieldName = (typeof PRODUCT_IDENTIFIER_FIELD_NAMES)[number];

export const PRODUCT_IDENTIFIER_OPTIONS = [
  { value: 'ean', label: 'EAN' },
  { value: 'gtin', label: 'GTIN' },
  { value: 'asin', label: 'ASIN' },
] as const satisfies ReadonlyArray<LabeledOptionDto<ProductIdentifierFieldName>>;

export const coerceWatchedString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

export const hasNonEmptyStringValue = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length > 0;
