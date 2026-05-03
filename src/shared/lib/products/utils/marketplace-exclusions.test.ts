import { describe, expect, it } from 'vitest';

import {
  ensureProductMarketplaceExclusionSelection,
  hasProductMarketplaceExclusionSelection,
} from './marketplace-exclusions';

const customFieldDefinitions = [
  {
    id: 'market-exclusion',
    name: 'Market Exclusion',
    type: 'checkbox_set' as const,
    options: [
      { id: 'opt-allegro', label: 'Allegro' },
      { id: 'opt-tradera', label: 'Tradera' },
    ],
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
];

describe('marketplace-exclusions', () => {
  it('detects when Tradera is already selected in Market Exclusion', () => {
    expect(
      hasProductMarketplaceExclusionSelection({
        customFieldDefinitions,
        customFieldValues: [
          {
            fieldId: 'market-exclusion',
            selectedOptionIds: ['opt-tradera'],
          },
        ],
        marketplaceLabelOrAlias: 'Tradera',
      })
    ).toBe(true);
  });

  it('adds the Tradera option without removing existing selections', () => {
    expect(
      ensureProductMarketplaceExclusionSelection({
        customFieldDefinitions,
        customFieldValues: [
          {
            fieldId: 'market-exclusion',
            selectedOptionIds: ['opt-allegro'],
          },
          {
            fieldId: 'notes',
            textValue: 'Keep me',
          },
        ],
        marketplaceLabelOrAlias: 'Tradera',
      })
    ).toEqual({
      changed: true,
      customFields: [
        {
          fieldId: 'market-exclusion',
          selectedOptionIds: ['opt-allegro', 'opt-tradera'],
        },
        {
          fieldId: 'notes',
          textValue: 'Keep me',
        },
      ],
    });
  });

  it('returns unchanged values when Tradera is already selected', () => {
    expect(
      ensureProductMarketplaceExclusionSelection({
        customFieldDefinitions,
        customFieldValues: [
          {
            fieldId: 'market-exclusion',
            selectedOptionIds: ['opt-tradera'],
          },
        ],
        marketplaceLabelOrAlias: 'Tradera',
      })
    ).toEqual({
      changed: false,
      customFields: [
        {
          fieldId: 'market-exclusion',
          selectedOptionIds: ['opt-tradera'],
        },
      ],
    });
  });
});
