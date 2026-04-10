import { describe, expect, it } from 'vitest';

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
});
