import { describe, expect, it } from 'vitest';

import {
  hasBaseMarketExclusionValue,
  resolveBaseMarketExclusionOptionStates,
  resolveBaseMarketplaceCheckboxValue,
} from './base-marketplace-checkboxes';

import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';

const marketExclusionDefinition: ProductCustomFieldDefinition = {
  id: 'market-exclusion',
  name: 'Market Exclusion',
  type: 'checkbox_set',
  options: [
    { id: 'opt-allegro', label: 'Allegro' },
    { id: 'opt-amazon-pl', label: 'Amazon.pl' },
    { id: 'opt-tradera', label: 'Tradera' },
    { id: 'opt-vinted', label: 'Vinted' },
  ],
  createdAt: '2026-04-10T00:00:00.000Z',
  updatedAt: '2026-04-10T00:00:00.000Z',
};

describe('base-marketplace-checkboxes', () => {
  it('resolves checked and unchecked states from generic Base extra field containers', () => {
    const states = resolveBaseMarketExclusionOptionStates(
      {
        text_fields: {
          'Extra Field 6302': [
            { label: 'Allegro', checked: true },
            { label: 'Amazon.pl', checked: false },
            { label: 'Tradera', selected: true },
            { label: 'Vinted', selected: false },
          ],
        },
      },
      [marketExclusionDefinition]
    );

    expect(Array.from(states.entries())).toEqual([
      ['opt-allegro', true],
      ['opt-amazon-pl', false],
      ['opt-tradera', true],
      ['opt-vinted', false],
    ]);
  });

  it('detects market exclusion payloads but ignores unrelated text-only extra fields', () => {
    expect(
      hasBaseMarketExclusionValue(
        {
          text_fields: {
            'Extra Field 6302': [
              { label: 'Allegro', checked: true },
              { label: 'Tradera', selected: true },
            ],
          },
        },
        [marketExclusionDefinition]
      )
    ).toBe(true);

    expect(
      hasBaseMarketExclusionValue(
        {
          text_fields: {
            'Extra Field 18808': 'Yes',
          },
        },
        [marketExclusionDefinition]
      )
    ).toBe(false);
  });

  it('keeps direct marketplace checkbox lookup limited to recognized marketplace labels', () => {
    expect(
      resolveBaseMarketplaceCheckboxValue(
        {
          text_fields: {
            'Tradera Yes': '1',
          },
        },
        'Tradera'
      )
    ).toBe(true);

    expect(
      resolveBaseMarketplaceCheckboxValue(
        {
          text_fields: {
            'shipping_notes|pl': 'Keep flat',
          },
        },
        'Shipping Notes'
      )
    ).toBeNull();
  });
});
