import type { ProductTitleTermType } from '@/shared/contracts/products/title-terms';

export const PRODUCT_TITLE_SEPARATOR = ' | ';

export type StructuredProductName = {
  baseName: string;
  size: string;
  material: string;
  category: string;
  theme: string;
};

export const PRODUCT_TITLE_TERM_TYPES = ['size', 'material', 'theme'] as const satisfies readonly ProductTitleTermType[];

const normalizeSegment = (value: string): string => value.trim().replace(/\s+/g, ' ');

export const normalizeTitleTermName = (value: string): string => normalizeSegment(value).toLowerCase();

export const splitStructuredProductName = (value: string): string[] =>
  value
    .split('|')
    .map((segment: string): string => normalizeSegment(segment));

export const normalizeStructuredProductName = (value: string): string =>
  splitStructuredProductName(value)
    .filter((segment: string): boolean => segment.length > 0)
    .join(PRODUCT_TITLE_SEPARATOR);

export const parseStructuredProductName = (value: string): StructuredProductName | null => {
  const [baseName = '', size = '', material = '', category = '', theme = '', ...rest] =
    splitStructuredProductName(value);
  if (rest.length > 0) return null;
  if (!baseName || !size || !material || !category || !theme) return null;
  return {
    baseName,
    size,
    material,
    category,
    theme,
  };
};

export const composeStructuredProductName = (value: Partial<StructuredProductName>): string => {
  const segments = [
    normalizeSegment(value.baseName ?? ''),
    normalizeSegment(value.size ?? ''),
    normalizeSegment(value.material ?? ''),
    normalizeSegment(value.category ?? ''),
    normalizeSegment(value.theme ?? ''),
  ];
  return segments.filter((segment: string): boolean => segment.length > 0).join(PRODUCT_TITLE_SEPARATOR);
};
