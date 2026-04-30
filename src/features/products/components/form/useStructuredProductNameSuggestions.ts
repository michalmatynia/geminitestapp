import {
  buildStructuredSuggestionController,
  resolveDropdownOpen,
  useApplyStructuredSuggestion,
  useSegmentSuggestionState,
  useSuggestionBlurTimeout,
  type StructuredProductNameSuggestionsController,
  type UseStructuredProductNameSuggestionsArgs,
} from './useStructuredProductNameSuggestions.helpers';

export type { StructuredProductNameSuggestionsController };

export function useStructuredProductNameSuggestions(
  args: UseStructuredProductNameSuggestionsArgs
): StructuredProductNameSuggestionsController {
  const suggestionState = useSegmentSuggestionState(args);
  const blurTimeout = useSuggestionBlurTimeout();
  const applySuggestion = useApplyStructuredSuggestion({
    ...args,
    activeStage: suggestionState.activeStage,
    syncSuggestionContext: suggestionState.syncSuggestionContext,
  });
  const dropdownOpen = resolveDropdownOpen(
    suggestionState.activeStage,
    args.primaryCatalogId,
    suggestionState.suggestions.length,
    args.requireCatalogForSuggestions
  );
  const activeDescendantId =
    dropdownOpen && suggestionState.suggestions[suggestionState.highlightedIndex] !== undefined
      ? `${args.listboxId}-option-${suggestionState.highlightedIndex}`
      : undefined;

  return buildStructuredSuggestionController({
    ...blurTimeout,
    activeDescendantId,
    activeStage: suggestionState.activeStage,
    applySuggestion,
    dropdownOpen,
    highlightedIndex: suggestionState.highlightedIndex,
    onFieldBlur: args.onFieldBlur,
    onFieldChange: args.onFieldChange,
    setHighlightedIndex: suggestionState.setHighlightedIndex,
    suggestions: suggestionState.suggestions,
    syncSuggestionContext: suggestionState.syncSuggestionContext,
  });
}
