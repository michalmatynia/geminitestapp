import { describe, expect, it } from 'vitest';

import {
  buildCategoryNameById,
  resolveProductCategoryDisplayLabel,
} from '@/features/products/hooks/product-list-state-utils';

describe('product-list-state-utils category guards', () => {
  it('builds category labels from runtime category payloads that expose _id instead of id', () => {
    const map = buildCategoryNameById(
      {
        'catalog-1': [
          {
            _id: '507f1f77bcf86cd799439011',
            name_en: 'Keychains',
            name_pl: 'Breloki',
            catalogId: 'catalog-1',
          },
        ],
      },
      'name_en'
    );

    expect(map.get('507f1f77bcf86cd799439011')).toBe('Keychains');
  });

  it('does not expose opaque category ids when the label lookup is missing', () => {
    const label = resolveProductCategoryDisplayLabel(
      '507f1f77bcf86cd799439011',
      new Map<string, string>()
    );

    expect(label).toBe('—');
  });

  it('keeps human-readable category fallbacks when the id is not opaque', () => {
    const label = resolveProductCategoryDisplayLabel(
      'Accessories',
      new Map<string, string>()
    );

    expect(label).toBe('Accessories');
  });
});
