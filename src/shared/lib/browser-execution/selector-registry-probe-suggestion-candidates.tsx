'use client';

import {
  formatSelectorRegistryProbeSuggestionCandidateSummary,
  formatSelectorRegistryProbeSuggestionCandidateValue,
} from './selector-registry-probe-suggestion-formatting';

type SelectorRegistryProbeSuggestionCandidateInput = {
  candidates: {
    css: string | null;
    xpath: string | null;
  };
  repeatedSiblingCount: number;
};

type SelectorRegistryProbeSuggestionCandidateDetailsProps = {
  suggestion: SelectorRegistryProbeSuggestionCandidateInput;
  mode?: 'stacked' | 'summary';
  includeSiblingRepeat?: boolean;
  className?: string;
};

export const buildSelectorRegistryProbeSuggestionCandidateRows = (
  suggestion: SelectorRegistryProbeSuggestionCandidateInput,
  { includeSiblingRepeat = false }: { includeSiblingRepeat?: boolean } = {}
): Array<{ key: string; label: string; value: string }> => {
  const rows = [
    {
      key: 'css',
      label: 'CSS',
      value: formatSelectorRegistryProbeSuggestionCandidateValue(suggestion.candidates.css),
    },
    {
      key: 'xpath',
      label: 'XPath',
      value: formatSelectorRegistryProbeSuggestionCandidateValue(suggestion.candidates.xpath),
    },
  ];

  if (includeSiblingRepeat) {
    rows.push({
      key: 'sibling-repeat',
      label: 'Sibling repeat',
      value: String(suggestion.repeatedSiblingCount),
    });
  }

  return rows;
};

export function SelectorRegistryProbeSuggestionCandidateDetails({
  suggestion,
  mode = 'summary',
  includeSiblingRepeat = false,
  className,
}: SelectorRegistryProbeSuggestionCandidateDetailsProps): React.JSX.Element {
  if (mode === 'stacked') {
    const rows = buildSelectorRegistryProbeSuggestionCandidateRows(suggestion, {
      includeSiblingRepeat,
    });

    return (
      <div className={className}>
        {rows.map((row) => (
          <div key={row.key}>
            <span className='font-medium text-foreground'>{row.label}:</span> {row.value}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {formatSelectorRegistryProbeSuggestionCandidateSummary(suggestion)}
    </div>
  );
}
