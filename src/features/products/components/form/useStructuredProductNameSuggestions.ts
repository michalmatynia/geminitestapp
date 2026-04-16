import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import type { UseFormSetValue } from 'react-hook-form';

import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductTitleTerm } from '@/shared/contracts/products/title-terms';
import type { StructuredProductTitleLocale } from '@/shared/lib/products/title-terms';

import {
  buildSuggestionsForStage,
  findEnabledSuggestionIndex,
  replaceStructuredSegment,
  resolveSegmentContextUpdate,
} from './StructuredProductNameField.suggestions';
import {
  CATEGORY_STAGE,
  TITLE_SEGMENT_LABELS,
  type SegmentBounds,
  type SuggestionOption,
  type TitleSegmentStage,
} from './StructuredProductNameField.types';

type UseStructuredProductNameSuggestionsArgs = {
  categorySuggestions: SuggestionOption[];
  fieldName: 'name_en' | 'name_pl';
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  listboxId: string;
  locale: StructuredProductTitleLocale;
  materialTerms: ProductTitleTerm[];
  nameValue: string;
  primaryCatalogId?: string;
  setCategoryId: (categoryId: string | null) => void;
  setNormalizeNameError: (error: string | null) => void;
  setValue: UseFormSetValue<ProductFormData>;
  sizeTerms: ProductTitleTerm[];
  syncMappedCategoryField: (nextCategoryId: string | null) => void;
  themeTerms: ProductTitleTerm[];
  onFieldBlur: () => void;
  onFieldChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export type StructuredProductNameSuggestionsController = {
  activeDescendantId?: string;
  dropdownOpen: boolean;
  highlightedIndex: number;
  listboxLabel: string;
  onApplySuggestion: (option: SuggestionOption) => void;
  onBlur: () => void;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClick: (event: MouseEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onHighlightSuggestion: (index: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onKeyUp: (event: KeyboardEvent<HTMLInputElement>) => void;
  suggestions: SuggestionOption[];
};

const didSegmentContextChange = ({
  activeStage,
  segmentBounds,
  segmentQuery,
  nextActiveStage,
  nextBounds,
  nextQuery,
}: {
  activeStage: TitleSegmentStage | null;
  segmentBounds: SegmentBounds | null;
  segmentQuery: string;
  nextActiveStage: TitleSegmentStage | null;
  nextBounds: SegmentBounds | null;
  nextQuery: string;
}): boolean =>
  activeStage !== nextActiveStage ||
  segmentQuery !== nextQuery ||
  segmentBounds?.start !== nextBounds?.start ||
  segmentBounds?.end !== nextBounds?.end;

const resolveDropdownOpen = (
  activeStage: TitleSegmentStage | null,
  primaryCatalogId: string | undefined,
  suggestionCount: number
): boolean =>
  activeStage !== null &&
  typeof primaryCatalogId === 'string' &&
  primaryCatalogId !== '' &&
  suggestionCount > 0;

// eslint-disable-next-line max-lines-per-function
export function useStructuredProductNameSuggestions({
  categorySuggestions,
  fieldName,
  inputRef,
  listboxId,
  locale,
  materialTerms,
  nameValue,
  primaryCatalogId,
  setCategoryId,
  setNormalizeNameError,
  setValue,
  sizeTerms,
  syncMappedCategoryField,
  themeTerms,
  onFieldBlur,
  onFieldChange,
}: UseStructuredProductNameSuggestionsArgs): StructuredProductNameSuggestionsController {
  const blurTimeoutRef = useRef<number | null>(null);
  const [activeStage, setActiveStage] = useState<TitleSegmentStage | null>(null);
  const [segmentQuery, setSegmentQuery] = useState('');
  const [segmentBounds, setSegmentBounds] = useState<SegmentBounds | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const suggestions = useMemo(
    () =>
      buildSuggestionsForStage({
        activeStage,
        query: segmentQuery,
        locale,
        categorySuggestions,
        sizeTerms,
        materialTerms,
        themeTerms,
      }),
    [activeStage, categorySuggestions, locale, materialTerms, segmentQuery, sizeTerms, themeTerms]
  );

  useEffect((): void => {
    if (suggestions.length === 0) {
      if (highlightedIndex !== 0) setHighlightedIndex(0);
      return;
    }
    const currentCandidate = suggestions[highlightedIndex];
    if (currentCandidate === undefined || currentCandidate.disabled === true) {
      setHighlightedIndex(findEnabledSuggestionIndex(suggestions, 0, 1));
    }
  }, [highlightedIndex, suggestions]);

  const syncSuggestionContext = useCallback(
    (value: string, caret: number | null): void => {
      const nextContext = resolveSegmentContextUpdate(value, caret);
      const changed = didSegmentContextChange({
        activeStage,
        segmentBounds,
        segmentQuery,
        nextActiveStage: nextContext.activeStage,
        nextBounds: nextContext.bounds,
        nextQuery: nextContext.query,
      });
      setActiveStage(nextContext.activeStage);
      setSegmentBounds(nextContext.bounds);
      setSegmentQuery(nextContext.query);
      if (changed) setHighlightedIndex(0);
    },
    [activeStage, segmentBounds, segmentQuery]
  );

  const applySuggestion = useCallback(
    (option: SuggestionOption): void => {
      if (activeStage === null || option.disabled === true) return;
      const nextValue = replaceStructuredSegment(nameValue, activeStage, option.value);
      if (fieldName === 'name_en') setNormalizeNameError(null);
      setValue(fieldName, nextValue, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      if (activeStage === CATEGORY_STAGE) {
        const nextCategoryId = option.categoryId ?? null;
        setCategoryId(nextCategoryId);
        syncMappedCategoryField(nextCategoryId);
      }
      window.setTimeout((): void => {
        const input = inputRef.current;
        if (input === null) return;
        input.focus();
        input.setSelectionRange(nextValue.length, nextValue.length);
        syncSuggestionContext(nextValue, nextValue.length);
      }, 0);
    },
    [activeStage, fieldName, inputRef, nameValue, setCategoryId, setNormalizeNameError, setValue, syncMappedCategoryField, syncSuggestionContext]
  );

  const dropdownOpen = resolveDropdownOpen(activeStage, primaryCatalogId, suggestions.length);
  const activeDescendantId =
    dropdownOpen && suggestions[highlightedIndex] !== undefined
      ? `${listboxId}-option-${highlightedIndex}`
      : undefined;

  return {
    activeDescendantId,
    dropdownOpen,
    highlightedIndex,
    listboxLabel: `${activeStage !== null ? TITLE_SEGMENT_LABELS[activeStage] : 'Title'} suggestions`,
    onApplySuggestion: applySuggestion,
    onBlur: () => {
      onFieldBlur();
      blurTimeoutRef.current = window.setTimeout((): void => {
        blurTimeoutRef.current = null;
        syncSuggestionContext('', null);
      }, 120);
    },
    onChange: (event) => {
      onFieldChange(event);
      syncSuggestionContext(event.target.value, event.target.selectionStart);
    },
    onClick: (event) => {
      if (blurTimeoutRef.current !== null) window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
      syncSuggestionContext(event.currentTarget.value, event.currentTarget.selectionStart);
    },
    onFocus: () => {
      if (blurTimeoutRef.current !== null) window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    },
    onHighlightSuggestion: setHighlightedIndex,
    onKeyDown: (event) => {
      if (dropdownOpen === false) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((current) =>
          findEnabledSuggestionIndex(suggestions, Math.min(current + 1, suggestions.length - 1), 1)
        );
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((current) => findEnabledSuggestionIndex(suggestions, Math.max(current - 1, 0), -1));
        return;
      }
      if (event.key === 'Enter') {
        const highlighted = suggestions[highlightedIndex];
        if (highlighted === undefined || highlighted.disabled === true) return;
        event.preventDefault();
        applySuggestion(highlighted);
      }
      if (event.key === 'Escape') syncSuggestionContext('', null);
    },
    onKeyUp: (event) => {
      syncSuggestionContext(event.currentTarget.value, event.currentTarget.selectionStart);
    },
    suggestions,
  };
}
