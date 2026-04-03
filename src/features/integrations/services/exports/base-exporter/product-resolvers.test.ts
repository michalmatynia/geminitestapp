import { describe, expect, it } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';

import { getProductCategoryId, getProductParameterValue } from './product-resolvers';

const createProduct = (overrides: Record<string, unknown> = {}): ProductWithImages =>
  ({
    parameters: [],
    tags: [],
    images: [],
    ...overrides,
  }) as unknown as ProductWithImages;

describe('product-resolvers', () => {
  it('resolves localized parameter values with case-insensitive parameter and language matching', () => {
    const product = createProduct({
      parameters: [
        {
          parameterId: 'material',
          value: '',
          valuesByLanguage: {
            PL: 'Bawełna',
            en: 'Cotton',
          },
        },
      ],
    });

    expect(getProductParameterValue(product, ' MATERIAL ', 'pl')).toBe('Bawełna');
  });

  it('falls back to preferred localized values when direct parameter value is blank', () => {
    const product = createProduct({
      parameters: [
        {
          parameterId: 'material',
          value: ' ',
          valuesByLanguage: {
            fr: 'Coton',
            default: 'Cotton',
            pl: 'Bawełna',
          },
        },
      ],
    });

    expect(getProductParameterValue(product, 'material')).toBe('Cotton');
  });

  it('preserves attached-but-empty parameter values as empty strings', () => {
    const product = createProduct({
      parameters: [
        {
          parameterId: 'size',
          value: ' ',
          valuesByLanguage: {
            default: ' ',
          },
        },
      ],
    });

    expect(getProductParameterValue(product, 'size')).toBe('');
  });

  it('resolves category ids from direct, nested, and array-based shapes', () => {
    expect(
      getProductCategoryId(
        createProduct({
          categoryId: 'direct-category',
          category: { id: 'nested-category' },
          categories: [{ id: 'array-category' }],
        })
      )
    ).toBe('direct-category');

    expect(
      getProductCategoryId(
        createProduct({
          category: { category_id: 'nested-category' },
        })
      )
    ).toBe('nested-category');

    expect(
      getProductCategoryId(
        createProduct({
          categories: [null, { value: 'array-category' }],
        })
      )
    ).toBe('array-category');
  });
});
