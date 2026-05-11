/* eslint-disable complexity, max-lines, max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions */

import type {
  PromptExploderBenchmarkSuggestion,
  BenchmarkSuggestionPreparation,
} from '@/shared/contracts/prompt-exploder';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const benchmarkSuggestionRuleId = (
  suggestion: PromptExploderBenchmarkSuggestion
): string => {
  const slug = `${suggestion.caseId}_${suggestion.segmentTitle}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return `segment.benchmark.${suggestion.suggestedSegmentType}.${slug.length === 0 ? 'segment' : slug}`;
};

export const dedupeBenchmarkSuggestionsById = (
  suggestions: PromptExploderBenchmarkSuggestion[]
): PromptExploderBenchmarkSuggestion[] => {
  const seen = new Set<string>();
  const unique: PromptExploderBenchmarkSuggestion[] = [];
  suggestions.forEach((suggestion) => {
    const id = suggestion.id ?? '';
    if (id.length === 0 || seen.has(id)) return;
    seen.add(id);
    unique.push(suggestion);
  });
  return unique;
};

const isValidRegexPattern = (pattern: string, flags: string): boolean => {
  try {
    void new RegExp(pattern, flags);
    return true;
  } catch (error) {
    logClientError(error);
    return false;
  }
};

export const prepareBenchmarkSuggestionsForApply = (
  suggestions: PromptExploderBenchmarkSuggestion[]
): BenchmarkSuggestionPreparation => {
  const uniqueSuggestions = dedupeBenchmarkSuggestionsById(suggestions);
  const invalidSegmentTitles: string[] = [];
  const validSuggestions = uniqueSuggestions.filter((suggestion) => {
    const pattern = (suggestion.suggestedRulePattern ?? '').trim();
    const segmentTitle = suggestion.segmentTitle ?? 'Untitled';
    if (pattern.length === 0) {
      invalidSegmentTitles.push(segmentTitle);
      return false;
    }
    if (!isValidRegexPattern(pattern, 'mi')) {
      invalidSegmentTitles.push(segmentTitle);
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
