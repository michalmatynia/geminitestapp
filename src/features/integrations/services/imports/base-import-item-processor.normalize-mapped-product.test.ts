import { describe, expect, it } from 'vitest';

import { baseMarketExclusionGenericExtraFieldRecord } from './base-import-fixtures';
import { normalizeMappedProduct } from './base-import-item-processor';

import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';

const marketplaceFieldDefinition: ProductCustomFieldDefinition = {
  id: 'KEYCHA088',
  name: '3rd Party Marketplaces',
  type: 'checkbox_set',
  options: [
    { id: 'opt-tradera', label: 'Tradera' },
    { id: 'opt-willhaben', label: 'Willhaben' },
    { id: 'opt-depop', label: 'Depop' },
    { id: 'opt-grailed', label: 'Grailed' },
    { id: 'opt-schpock', label: 'Schpock' },
    { id: 'opt-vinted', label: 'Vinted' },
  ],
  createdAt: '2026-04-10T00:00:00.000Z',
  updatedAt: '2026-04-10T00:00:00.000Z',
};

describe('normalizeMappedProduct', () => {
  it('maps normalized marketplace checkboxes from grouped Base payloads for import processing', () => {
    const mapped = normalizeMappedProduct(
      {
        base_product_id: 'base-1',
        sku: 'SKU-1',
        parameters: [
          {
            name: 'Disabled Sales Channels',
            values: [
              { label: 'Tradera', selected: true },
              { label: 'Willhaben', checked: true },
              { label: 'Depop', selected: true },
              { label: 'Grailed', selected: true },
              { label: 'Shpock', selected: true },
              { label: 'Vinted', selected: true },
            ],
          },
        ],
      },
      [],
      ['EUR'],
      [marketplaceFieldDefinition]
    );

    expect(mapped.sku).toBe('SKU-1');
    expect(mapped.baseProductId).toBe('base-1');
    expect(mapped.customFields).toEqual([
      {
        fieldId: 'KEYCHA088',
        selectedOptionIds: [
          'opt-tradera',
          'opt-willhaben',
          'opt-depop',
          'opt-grailed',
          'opt-schpock',
          'opt-vinted',
        ],
      },
    ]);
  });

  it('maps generic Base extra fields into the real Market Exclusion checkbox set during import processing', () => {
    const mapped = normalizeMappedProduct(
      baseMarketExclusionGenericExtraFieldRecord,
      [],
      ['EUR'],
      [
        {
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
        },
        {
          id: 'extra-18808',
          name: 'Extra Field 18808',
          type: 'text',
          options: [],
          createdAt: '2026-04-10T00:00:00.000Z',
          updatedAt: '2026-04-10T00:00:00.000Z',
        },
      ]
    );

    expect(mapped.customFields).toHaveLength(2);
    expect(mapped.customFields).toEqual(
      expect.arrayContaining([
        {
          fieldId: 'market-exclusion',
          selectedOptionIds: ['opt-allegro', 'opt-tradera'],
        },
        {
          fieldId: 'extra-18808',
          textValue: 'Yes',
        },
      ])
    );
  });
});
