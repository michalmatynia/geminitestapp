// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { formatSelectorRegistryRoleLabel } from '@/shared/lib/browser-execution/selector-registry-roles';
import {
  buildSelectorRegistryProbeSuggestionBadgeDescriptors,
  SelectorRegistryProbeSuggestionBadges,
} from './selector-registry-probe-suggestion-badges';

const formattedRoleLabel = formatSelectorRegistryRoleLabel('content_price') ?? 'content_price';

describe('selector-registry probe suggestion badges', () => {
  it('builds shared badge descriptors in the expected order', () => {
    expect(
      buildSelectorRegistryProbeSuggestionBadgeDescriptors({
        role: 'content_price',
        confidence: 0.96,
        tag: 'span',
        draftTargetHints: ['price'],
        baseKey: 'price::signal',
        isCarryForwardSource: true,
        isAiClassified: true,
      }).map((descriptor) => descriptor.label)
    ).toEqual([
      formattedRoleLabel,
      'Source for carry-forward',
      'AI',
      '96%',
      'span',
      'price',
    ]);
  });

  it('renders the shared badge row', () => {
    render(
      <SelectorRegistryProbeSuggestionBadges
        role='content_price'
        confidence={0.96}
        tag='span'
        draftTargetHints={['price']}
        baseKey='price::signal'
        isCarryForwardSource
        isAiClassified
      />
    );

    expect(screen.getByText(formattedRoleLabel)).toBeInTheDocument();
    expect(screen.getByText('Source for carry-forward')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText('span')).toBeInTheDocument();
    expect(screen.getByText('price')).toBeInTheDocument();
  });
});
