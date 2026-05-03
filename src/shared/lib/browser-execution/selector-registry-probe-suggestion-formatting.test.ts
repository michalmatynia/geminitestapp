import { describe, expect, it } from 'vitest';

import {
  formatSelectorRegistryProbeSuggestionCandidateSummary,
  formatSelectorRegistryProbeSuggestionCandidateValue,
  getSelectorRegistryProbeSuggestionEvidenceText,
  getSelectorRegistryProbeSuggestionPrimaryPageLabel,
  getSelectorRegistryProbeSuggestionSecondaryPageLabel,
  getSelectorRegistryProbeSuggestionTextPreview,
} from './selector-registry-probe-suggestion-formatting';

const baseSuggestion = {
  textPreview: '$19.99',
  pageTitle: 'Example item',
  pageUrl: 'https://www.amazon.com/example-item',
  evidence: ['Visible text', 'looks like a price.'],
  candidates: {
    css: '.a-price',
    xpath: '/html/body/main/span[1]',
  },
};

describe('selector-registry probe suggestion formatting', () => {
  it('formats shared suggestion text fields', () => {
    expect(getSelectorRegistryProbeSuggestionTextPreview(baseSuggestion)).toBe('$19.99');
    expect(getSelectorRegistryProbeSuggestionEvidenceText(baseSuggestion)).toBe(
      'Visible text looks like a price.'
    );
    expect(getSelectorRegistryProbeSuggestionPrimaryPageLabel(baseSuggestion)).toBe('Example item');
    expect(getSelectorRegistryProbeSuggestionSecondaryPageLabel(baseSuggestion)).toBe(
      'https://www.amazon.com/example-item'
    );
  });

  it('falls back cleanly when optional text fields are missing', () => {
    const suggestion = {
      ...baseSuggestion,
      textPreview: null,
      pageTitle: null,
      candidates: {
        css: null,
        xpath: null,
      },
    };

    expect(getSelectorRegistryProbeSuggestionTextPreview(suggestion)).toBe('(no visible text)');
    expect(getSelectorRegistryProbeSuggestionPrimaryPageLabel(suggestion)).toBe(
      'https://www.amazon.com/example-item'
    );
    expect(getSelectorRegistryProbeSuggestionSecondaryPageLabel(suggestion)).toBeNull();
    expect(formatSelectorRegistryProbeSuggestionCandidateValue(null)).toBe('Unavailable');
    expect(formatSelectorRegistryProbeSuggestionCandidateSummary(suggestion)).toBe(
      'CSS: Unavailable · XPath: Unavailable'
    );
  });
});
