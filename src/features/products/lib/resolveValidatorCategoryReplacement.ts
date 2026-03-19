import type { ProductCategory } from '@/shared/contracts/products';

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

  return null;
};
