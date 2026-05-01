import {
  normalizeSegmentValue,
  resolveUniqueLeafCategorySuggestion,
} from './StructuredProductNameField.suggestions';
import type { SuggestionOption } from './StructuredProductNameField.types';

export type CategorySegmentSyncAction =
  | { type: 'none' }
  | { type: 'clear' }
  | { type: 'sync'; categoryId: string | null }
  | { type: 'select'; categoryId: string };

export const resolveCategorySegment = (nameValue: string): string =>
  normalizeSegmentValue(nameValue.split('|')[3] ?? '');

export const hasStructuredCategoryPrefix = (nameValue: string): boolean => {
  const segments = nameValue.split('|').map((segment: string) => normalizeSegmentValue(segment));
  return Boolean(segments[0] !== '' && segments[1] !== '' && segments[2] !== '');
};

const isSelectedCategorySegment = (
  selectedCategoryOption: SuggestionOption | null,
  categorySegment: string
): boolean => selectedCategoryOption !== null && selectedCategoryOption.value === categorySegment;

const shouldSelectMatchedCategory = (
  match: SuggestionOption | null,
  selectedCategoryId: string | null
): match is SuggestionOption & { categoryId: string } =>
  match?.categoryId !== undefined && match.categoryId !== selectedCategoryId;

const shouldClearSelectedCategory = ({
  categorySegmentChanged,
  selectedCategoryChanged,
  selectedCategoryId,
}: {
  categorySegmentChanged: boolean;
  selectedCategoryChanged: boolean;
  selectedCategoryId: string | null;
}): boolean =>
  categorySegmentChanged && selectedCategoryId !== null && selectedCategoryChanged === false;

export const resolveCategorySegmentSyncAction = ({
  categorySuggestions,
  categorySegment,
  categorySegmentChanged,
  selectedCategoryId,
  selectedCategoryOption,
  selectedCategoryChanged,
}: {
  categorySuggestions: SuggestionOption[];
  categorySegment: string;
  categorySegmentChanged: boolean;
  selectedCategoryId: string | null;
  selectedCategoryOption: SuggestionOption | null;
  selectedCategoryChanged: boolean;
}): CategorySegmentSyncAction => {
  if (isSelectedCategorySegment(selectedCategoryOption, categorySegment)) {
    return { type: 'sync', categoryId: selectedCategoryId };
  }

  const match = resolveUniqueLeafCategorySuggestion(categorySuggestions, categorySegment);
  if (shouldSelectMatchedCategory(match, selectedCategoryId)) {
    return { type: 'select', categoryId: match.categoryId };
  }
  if (
    shouldClearSelectedCategory({
      categorySegmentChanged,
      selectedCategoryChanged,
      selectedCategoryId,
    })
  ) {
    return { type: 'clear' };
  }
  return { type: 'none' };
};
