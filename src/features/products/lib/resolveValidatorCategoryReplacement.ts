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

export const resolveValidatorCategoryReplacementId = (
  replacementValue: string | null | undefined,
  categories: ProductCategory[]
): string | null => {
  const normalizedReplacement = normalizeComparableText(replacementValue);
  if (!normalizedReplacement) return null;

  for (const category of categories) {
    const categoryId = typeof category.id === 'string' ? category.id.trim() : '';
    if (!categoryId) continue;
    if (normalizeComparableText(categoryId) === normalizedReplacement) {
      return categoryId;
    }
  }

  for (const category of categories) {
    const categoryId = typeof category.id === 'string' ? category.id.trim() : '';
    if (!categoryId) continue;
    const matchesLabel = getCategoryCandidateLabels(category).some(
      (label) => normalizeComparableText(label) === normalizedReplacement
    );
    if (matchesLabel) {
      return categoryId;
    }
  }

  const normalizedLooseReplacement = normalizeValidatorCategoryLooseComparableText(replacementValue);
  const normalizedSingularReplacement = normalizeValidatorCategorySingularComparableText(
    replacementValue
  );
  if (!normalizedLooseReplacement) return null;

  for (const category of categories) {
    const categoryId = typeof category.id === 'string' ? category.id.trim() : '';
    if (!categoryId) continue;
    const matchesLooseLabel = getCategoryCandidateLabels(category).some((label) => {
      const normalizedLooseLabel = normalizeValidatorCategoryLooseComparableText(label);
      if (!normalizedLooseLabel) return false;
      if (normalizedLooseLabel === normalizedLooseReplacement) return true;
      return (
        normalizeValidatorCategorySingularComparableText(label) === normalizedSingularReplacement
      );
    });
    if (matchesLooseLabel) {
      return categoryId;
    }
  }

  return null;
};
