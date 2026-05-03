import type { ProductCategory } from '@/shared/contracts/products/categories';
import {
  normalizeStructuredProductName,
  normalizeTitleTermName,
  parseStructuredProductName,
} from '@/shared/lib/products/title-terms';

const normalizeCategoryLookupValue = (value: string | null | undefined): string =>
  typeof value === 'string' ? normalizeTitleTermName(value) : '';

const categoryMatchesStructuredSegment = (
  category: ProductCategory,
  lookupKey: string
): boolean =>
  [category.name_en, category.name, category.name_pl, category.name_de].some(
    (value) => normalizeCategoryLookupValue(value) === lookupKey
  );

export const resolveCategoryIdFromStructuredDraftName = (
  nameEn: string,
  categories: ProductCategory[]
): string | null => {
  const parsed = parseStructuredProductName(normalizeStructuredProductName(nameEn));
  if (parsed === null) return null;
  const lookupKey = normalizeTitleTermName(parsed.category);
  if (lookupKey === '') return null;

  const matches = categories.filter((category) =>
    categoryMatchesStructuredSegment(category, lookupKey)
  );
  return matches.length === 1 ? (matches[0]?.id ?? null) : null;
};
