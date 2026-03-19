import { describe, expect, it } from 'vitest';

import type { ProductCategory } from '@/shared/contracts/products';

import { resolveValidatorFieldReplacement } from './resolveValidatorFieldReplacement';

const categories: ProductCategory[] = [
  {
    id: 'category-1',
    name: 'Keychains',
    name_en: 'Keychains',
    name_pl: 'Breloki',
    name_de: 'Schlusselanhanger',
    color: null,
    parentId: null,
    catalogId: 'catalog-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('resolveValidatorFieldReplacement', () => {
  it('resolves text replacements as trimmed strings', () => {
    expect(
      resolveValidatorFieldReplacement({
        fieldName: 'name_en',
        replacementValue: '  New title  ',
      })
    ).toEqual({
      kind: 'text',
      fieldName: 'name_en',
      value: 'New title',
      comparableValue: 'New title',
      displayValue: 'New title',
    });
  });

  it('resolves numeric replacements as non-negative integers', () => {
    expect(
      resolveValidatorFieldReplacement({
        fieldName: 'stock',
        replacementValue: '7.8',
      })
    ).toEqual({
      kind: 'number',
      fieldName: 'stock',
      value: 7,
      comparableValue: '7',
      displayValue: '7',
    });
  });

  it('resolves category replacements to ids and display labels', () => {
    expect(
      resolveValidatorFieldReplacement({
        fieldName: 'categoryId',
        replacementValue: 'Breloki',
        categories,
        categoryNameById: new Map([['category-1', 'Keychains']]),
      })
    ).toEqual({
      kind: 'category',
      fieldName: 'categoryId',
      value: 'category-1',
      comparableValue: 'category-1',
      displayValue: 'Keychains',
    });
  });

  it('returns null for unresolvable category replacements', () => {
    expect(
      resolveValidatorFieldReplacement({
        fieldName: 'categoryId',
        replacementValue: 'Unknown',
        categories,
      })
    ).toBeNull();
  });
});
