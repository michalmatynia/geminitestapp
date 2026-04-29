import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type KeyboardEvent,
  type MouseEvent,
  type SetStateAction,
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

export type UseStructuredProductNameSuggestionsArgs = {
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

export type SegmentSuggestionState = {
  activeStage: TitleSegmentStage | null;
  highlightedIndex: number;
  setHighlightedIndex: Dispatch<SetStateAction<number>>;
  suggestions: SuggestionOption[];
  syncSuggestionContext: (value: string, caret: number | null) => void;
};

type SuggestionBlurTimeoutController = {
  clearBlurTimeout: () => void;
  scheduleBlurTimeout: (callback: () => void) => void;
};

type SuggestionKeyDownHandlerArgs = {
  applySuggestion: (option: SuggestionOption) => void;
  dropdownOpen: boolean;
  highlightedIndex: number;
  setHighlightedIndex: Dispatch<SetStateAction<number>>;
  suggestions: SuggestionOption[];
  syncSuggestionContext: (value: string, caret: number | null) => void;
};

type StructuredSuggestionControllerArgs = SuggestionKeyDownHandlerArgs &
  SuggestionBlurTimeoutController & {
    activeDescendantId?: string;
    activeStage: TitleSegmentStage | null;
    onFieldBlur: () => void;
    onFieldChange: (event: ChangeEvent<HTMLInputElement>) => void;
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

export const resolveDropdownOpen = (
  activeStage: TitleSegmentStage | null,
  primaryCatalogId: string | undefined,
  suggestionCount: number
): boolean =>
  activeStage !== null &&
  typeof primaryCatalogId === 'string' &&
  primaryCatalogId !== '' &&
  suggestionCount > 0;

function useHighlightedSuggestionReset({
  highlightedIndex,
  setHighlightedIndex,
  suggestions,
}: Pick<SegmentSuggestionState, 'highlightedIndex' | 'setHighlightedIndex' | 'suggestions'>): void {
  useEffect((): void => {
    if (suggestions.length === 0) {
      if (highlightedIndex !== 0) setHighlightedIndex(0);
      return;
    }
    const currentCandidate = suggestions[highlightedIndex];
    if (currentCandidate === undefined || currentCandidate.disabled === true) {
      setHighlightedIndex(findEnabledSuggestionIndex(suggestions, 0, 1));
    }
  }, [highlightedIndex, setHighlightedIndex, suggestions]);
}

export function useSegmentSuggestionState({
  categorySuggestions,
  locale,
  materialTerms,
  sizeTerms,
  themeTerms,
}: Pick<
  UseStructuredProductNameSuggestionsArgs,
  'categorySuggestions' | 'locale' | 'materialTerms' | 'sizeTerms' | 'themeTerms'
>): SegmentSuggestionState {
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
  useHighlightedSuggestionReset({ highlightedIndex, setHighlightedIndex, suggestions });

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

  return { activeStage, highlightedIndex, setHighlightedIndex, suggestions, syncSuggestionContext };
}

export function useSuggestionBlurTimeout(): SuggestionBlurTimeoutController {
  const blurTimeoutRef = useRef<number | null>(null);
  const clearBlurTimeout = useCallback((): void => {
    if (blurTimeoutRef.current !== null) window.clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = null;
  }, []);
  const scheduleBlurTimeout = useCallback((callback: () => void): void => {
    blurTimeoutRef.current = window.setTimeout((): void => {
      blurTimeoutRef.current = null;
      callback();
    }, 120);
  }, []);
  return { clearBlurTimeout, scheduleBlurTimeout };
}

export function useApplyStructuredSuggestion({
  activeStage,
  fieldName,
  inputRef,
  nameValue,
  setCategoryId,
  setNormalizeNameError,
  setValue,
  syncMappedCategoryField,
  syncSuggestionContext,
}: Pick<
  UseStructuredProductNameSuggestionsArgs,
  | 'fieldName'
  | 'inputRef'
  | 'nameValue'
  | 'setCategoryId'
  | 'setNormalizeNameError'
  | 'setValue'
  | 'syncMappedCategoryField'
> & {
  activeStage: TitleSegmentStage | null;
  syncSuggestionContext: SegmentSuggestionState['syncSuggestionContext'];
}): (option: SuggestionOption) => void {
  return useCallback(
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
}

function createSuggestionKeyDownHandler(
  args: SuggestionKeyDownHandlerArgs
): (event: KeyboardEvent<HTMLInputElement>) => void {
  return (event: KeyboardEvent<HTMLInputElement>): void => {
    if (args.dropdownOpen === false) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      args.setHighlightedIndex((current) =>
        findEnabledSuggestionIndex(args.suggestions, Math.min(current + 1, args.suggestions.length - 1), 1)
      );
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      args.setHighlightedIndex((current) => findEnabledSuggestionIndex(args.suggestions, Math.max(current - 1, 0), -1));
      return;
    }
    if (event.key === 'Enter') {
      const highlighted = args.suggestions[args.highlightedIndex];
      if (highlighted === undefined || highlighted.disabled === true) return;
      event.preventDefault();
      args.applySuggestion(highlighted);
    }
    if (event.key === 'Escape') args.syncSuggestionContext('', null);
  };
}

export function buildStructuredSuggestionController(
  args: StructuredSuggestionControllerArgs
): StructuredProductNameSuggestionsController {
  return {
    activeDescendantId: args.activeDescendantId,
    dropdownOpen: args.dropdownOpen,
    highlightedIndex: args.highlightedIndex,
    listboxLabel: `${args.activeStage !== null ? TITLE_SEGMENT_LABELS[args.activeStage] : 'Title'} suggestions`,
    onApplySuggestion: args.applySuggestion,
    onBlur: () => {
      args.onFieldBlur();
      args.scheduleBlurTimeout(() => args.syncSuggestionContext('', null));
    },
    onChange: (event) => {
      args.onFieldChange(event);
      args.syncSuggestionContext(event.target.value, event.target.selectionStart);
    },
    onClick: (event) => {
      args.clearBlurTimeout();
      args.syncSuggestionContext(event.currentTarget.value, event.currentTarget.selectionStart);
    },
    onFocus: () => {
      args.clearBlurTimeout();
    },
    onHighlightSuggestion: args.setHighlightedIndex,
    onKeyDown: createSuggestionKeyDownHandler(args),
    onKeyUp: (event) => {
      args.syncSuggestionContext(event.currentTarget.value, event.currentTarget.selectionStart);
    },
    suggestions: args.suggestions,
  };
}
