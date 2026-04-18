// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  buildSelectorRegistryProbeSuggestionCandidateRows,
  SelectorRegistryProbeSuggestionCandidateDetails,
} from './selector-registry-probe-suggestion-candidates';

const suggestion = {
  candidates: {
    css: '.a-price',
    xpath: '/html/body/main/span[1]',
  },
  repeatedSiblingCount: 3,
};

describe('selector-registry probe suggestion candidates', () => {
  it('builds stacked candidate rows with optional sibling-repeat detail', () => {
    expect(
      buildSelectorRegistryProbeSuggestionCandidateRows(suggestion, {
        includeSiblingRepeat: true,
      })
    ).toEqual([
      {
        key: 'css',
        label: 'CSS',
        value: '.a-price',
      },
      {
        key: 'xpath',
        label: 'XPath',
        value: '/html/body/main/span[1]',
      },
      {
        key: 'sibling-repeat',
        label: 'Sibling repeat',
        value: '3',
      },
    ]);
  });

  it('renders the stacked candidate detail block', () => {
    render(
      <SelectorRegistryProbeSuggestionCandidateDetails
        suggestion={suggestion}
        mode='stacked'
        includeSiblingRepeat
      />
    );

    expect(screen.getByText('CSS:')).toBeInTheDocument();
    expect(screen.getByText('.a-price')).toBeInTheDocument();
    expect(screen.getByText('XPath:')).toBeInTheDocument();
    expect(screen.getByText('/html/body/main/span[1]')).toBeInTheDocument();
    expect(screen.getByText('Sibling repeat:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders the compact summary block', () => {
    render(<SelectorRegistryProbeSuggestionCandidateDetails suggestion={suggestion} />);

    expect(
      screen.getByText('CSS: .a-price · XPath: /html/body/main/span[1]')
    ).toBeInTheDocument();
  });
});
