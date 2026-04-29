// resolveValidatorCategoryReplacement: resolves loose user-provided category
// replacement strings to canonical category IDs using normalized exact matching
// and fallback 'loose' label matching. Pure, side-effect-free utility used by
// validator replacement resolution logic.
import type { ProductCategory } from '@/shared/contracts/products/categories';
import {
  normalizeValidatorCategoryLooseComparableText,
  normalizeValidatorCategorySingularComparableText,
} from '@/shared/lib/products/utils/validator-category-labels';

const normalizeComparableText = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const getCategoryCandidateLabels = (category: ProductCategory): string[] =>
  [category.id, category.name, category.name_en, category.name_pl, category.name_de]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

const resolveCategoryId = (category: ProductCategory): string =>
  typeof category.id === 'string' ? category.id.trim() : '';

const resolveExactCategoryId = (
  normalizedReplacement: string,
  categories: ProductCategory[]
): string | null => {
  for (const category of categories) {
    const categoryId = resolveCategoryId(category);
    if (categoryId === '') continue;
    if (normalizeComparableText(categoryId) === normalizedReplacement) return categoryId;
  }
  return null;
};

const resolveLabelCategoryId = (
  normalizedReplacement: string,
  categories: ProductCategory[]
): string | null => {
  for (const category of categories) {
    const categoryId = resolveCategoryId(category);
    if (categoryId === '') continue;
    const matchesLabel = getCategoryCandidateLabels(category).some(
      (label) => normalizeComparableText(label) === normalizedReplacement
    );
    if (matchesLabel) return categoryId;
  }
  return null;
};

const matchesLooseCategoryLabel = (
  label: string,
  normalizedLooseReplacement: string,
  normalizedSingularReplacement: string
): boolean => {
  const normalizedLooseLabel = normalizeValidatorCategoryLooseComparableText(label);
  if (normalizedLooseLabel === '') return false;
  if (normalizedLooseLabel === normalizedLooseReplacement) return true;
  return normalizeValidatorCategorySingularComparableText(label) === normalizedSingularReplacement;
};

const resolveLooseCategoryId = (
  replacementValue: string | null | undefined,
  categories: ProductCategory[]
): string | null => {
  const normalizedLooseReplacement = normalizeValidatorCategoryLooseComparableText(replacementValue);
  if (normalizedLooseReplacement === '') return null;

  const normalizedSingularReplacement =
    normalizeValidatorCategorySingularComparableText(replacementValue);
  for (const category of categories) {
    const categoryId = resolveCategoryId(category);
    if (categoryId === '') continue;
    const matchesLooseLabel = getCategoryCandidateLabels(category).some((label) =>
      matchesLooseCategoryLabel(label, normalizedLooseReplacement, normalizedSingularReplacement)
    );
    if (matchesLooseLabel) return categoryId;
  }
  return null;
};

export const resolveValidatorCategoryReplacementId = (
  replacementValue: string | null | undefined,
  categories: ProductCategory[]
): string | null => {
  const normalizedReplacement = normalizeComparableText(replacementValue);
  if (normalizedReplacement === '') return null;
  return (
    resolveExactCategoryId(normalizedReplacement, categories) ??
    resolveLabelCategoryId(normalizedReplacement, categories) ??
    resolveLooseCategoryId(replacementValue, categories)
  );
};
