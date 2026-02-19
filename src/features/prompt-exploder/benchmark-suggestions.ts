import type { PromptExploderBenchmarkSuggestion } from './types';

export type BenchmarkSuggestionPreparation = {
  uniqueSuggestions: PromptExploderBenchmarkSuggestion[];
  validSuggestions: PromptExploderBenchmarkSuggestion[];
  invalidSegmentTitles: string[];
};

export const benchmarkSuggestionRuleId = (
  suggestion: PromptExploderBenchmarkSuggestion
): string => {
  const slug = `${suggestion.caseId}_${suggestion.segmentTitle}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return `segment.benchmark.${suggestion.suggestedSegmentType}.${slug || 'segment'}`;
};

export const dedupeBenchmarkSuggestionsById = (
  suggestions: PromptExploderBenchmarkSuggestion[]
): PromptExploderBenchmarkSuggestion[] => {
  const seen = new Set<string>();
  const unique: PromptExploderBenchmarkSuggestion[] = [];
  suggestions.forEach((suggestion) => {
    if (seen.has(suggestion.id)) return;
    seen.add(suggestion.id);
    unique.push(suggestion);
  });
  return unique;
};

const isValidRegexPattern = (pattern: string, flags: string): boolean => {
  try {
    void new RegExp(pattern, flags);
    return true;
  } catch {
    return false;
  }
};

export const prepareBenchmarkSuggestionsForApply = (
  suggestions: PromptExploderBenchmarkSuggestion[]
): BenchmarkSuggestionPreparation => {
  const uniqueSuggestions = dedupeBenchmarkSuggestionsById(suggestions);
  const invalidSegmentTitles: string[] = [];
  const validSuggestions = uniqueSuggestions.filter((suggestion) => {
    const pattern = suggestion.suggestedRulePattern.trim();
    if (!pattern) {
      invalidSegmentTitles.push(suggestion.segmentTitle);
      return false;
    }
    if (!isValidRegexPattern(pattern, 'mi')) {
      invalidSegmentTitles.push(suggestion.segmentTitle);
      return false;
    }
    return true;
  });

  return {
    uniqueSuggestions,
    validSuggestions,
    invalidSegmentTitles,
  };
};
