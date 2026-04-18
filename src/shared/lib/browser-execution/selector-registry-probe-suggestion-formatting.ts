type SelectorRegistryProbeSuggestionFormattingInput = {
  textPreview: string | null;
  pageTitle: string | null;
  pageUrl: string;
  evidence: string[];
  candidates: {
    css: string | null;
    xpath: string | null;
  };
};

export const getSelectorRegistryProbeSuggestionTextPreview = (
  suggestion: SelectorRegistryProbeSuggestionFormattingInput
): string => suggestion.textPreview ?? '(no visible text)';

export const getSelectorRegistryProbeSuggestionEvidenceText = (
  suggestion: SelectorRegistryProbeSuggestionFormattingInput
): string => suggestion.evidence.join(' ');

export const getSelectorRegistryProbeSuggestionPrimaryPageLabel = (
  suggestion: SelectorRegistryProbeSuggestionFormattingInput
): string => suggestion.pageTitle ?? suggestion.pageUrl;

export const getSelectorRegistryProbeSuggestionSecondaryPageLabel = (
  suggestion: SelectorRegistryProbeSuggestionFormattingInput
): string | null => (suggestion.pageTitle === null ? null : suggestion.pageUrl);

export const formatSelectorRegistryProbeSuggestionCandidateValue = (
  value: string | null
): string => value ?? 'Unavailable';

export const formatSelectorRegistryProbeSuggestionCandidateSummary = (
  suggestion: SelectorRegistryProbeSuggestionFormattingInput
): string =>
  `CSS: ${formatSelectorRegistryProbeSuggestionCandidateValue(suggestion.candidates.css)} · XPath: ${formatSelectorRegistryProbeSuggestionCandidateValue(suggestion.candidates.xpath)}`;
