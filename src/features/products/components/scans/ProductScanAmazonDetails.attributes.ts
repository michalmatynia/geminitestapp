import type {
  AmazonAttribute,
  AmazonAttributeGroup,
} from './ProductScanAmazonDetails.types';
import type {
  ProductScanAmazonDetails as ProductScanAmazonDetailsValue,
} from '@/shared/contracts/product-scans';
import { hasText, normalizeText } from './ProductScanAmazonDetails.format';

const ATTRIBUTE_SOURCE_ORDER = new Map<string, number>([
  ['Product Overview', 0],
  ['Product Details', 1],
  ['Technical Details', 2],
  ['Technical Specifications', 3],
  ['Detail Bullets', 4],
]);

export const resolveAttributeSourceLabel = (value: string | null | undefined): string => {
  const normalized = normalizeText(value) ?? 'other';
  if (normalized === 'detail_bullets') return 'Detail Bullets';
  if (normalized === 'technical_details') return 'Technical Details';
  if (normalized === 'product_details') return 'Product Details';
  if (normalized === 'technical_specifications') return 'Technical Specifications';
  if (normalized === 'product_overview') return 'Product Overview';
  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const groupAmazonAttributesBySource = (
  details: ProductScanAmazonDetailsValue | null | undefined
): AmazonAttributeGroup[] => {
  if (details === null || details === undefined || details.attributes.length === 0) return [];

  const grouped = new Map<string, AmazonAttribute[]>();
  for (const entry of details.attributes) {
    const source = resolveAttributeSourceLabel(entry.source);
    grouped.set(source, [...(grouped.get(source) ?? []), entry]);
  }

  return Array.from(grouped.entries())
    .map(([source, entries]) => ({
      source,
      entries: [...entries].sort(compareAmazonAttributes),
    }))
    .sort(compareAmazonAttributeGroups);
};

const compareAmazonAttributes = (left: AmazonAttribute, right: AmazonAttribute): number =>
  left.label.localeCompare(right.label, undefined, { sensitivity: 'base' });

const compareAmazonAttributeGroups = (
  left: AmazonAttributeGroup,
  right: AmazonAttributeGroup
): number => {
  const leftRank = ATTRIBUTE_SOURCE_ORDER.get(left.source) ?? Number.MAX_SAFE_INTEGER;
  const rightRank = ATTRIBUTE_SOURCE_ORDER.get(right.source) ?? Number.MAX_SAFE_INTEGER;
  if (leftRank !== rightRank) return leftRank - rightRank;
  return left.source.localeCompare(right.source, undefined, { sensitivity: 'base' });
};

export const matchesAttributeQuery = (attribute: AmazonAttribute, query: string): boolean => {
  if (query === '') return true;

  const haystack = [attribute.label, attribute.value, attribute.key, attribute.source]
    .filter((value): value is string => hasText(value))
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
};
