import { describe, expect, it } from 'vitest';

import {
  coerceProductValidationNumericValue,
  coerceProductValidationTargetValue,
  getProductValidationFieldChangedAtDependencies,
  getProductValidationFieldValueKind,
  getProductValidationTargetAdapter,
  getReplacementFieldsForProductValidationTarget,
} from './validatorTargetAdapters';

describe('validatorTargetAdapters', () => {
  it('returns typed adapters for non-text targets', () => {
    expect(getProductValidationTargetAdapter('category')).toEqual({
      target: 'category',
      valueKind: 'category',
      replacementFields: ['categoryId'],
    });
    expect(getProductValidationTargetAdapter('price')).toEqual({
      target: 'price',
      valueKind: 'number',
      numberMode: 'decimal',
      replacementFields: ['price'],
    });
  });

  it('derives replacement fields and field kinds from the adapters', () => {
    expect(getReplacementFieldsForProductValidationTarget('size_width')).toEqual(['sizeWidth']);
    expect(getProductValidationFieldValueKind('stock')).toBe('number');
    expect(getProductValidationFieldValueKind('categoryId')).toBe('category');
    expect(getProductValidationFieldValueKind('name_en')).toBe('text');
  });

  it('tracks category validation dependencies through adapter metadata', () => {
    expect(getProductValidationFieldChangedAtDependencies('categoryId')).toEqual([
      'categoryId',
      'name_en',
    ]);
    expect(getProductValidationFieldChangedAtDependencies('price')).toEqual(['price']);
  });

  it('coerces numeric target values through the adapter layer', () => {
    expect(coerceProductValidationNumericValue('7.8')).toBe(7);
    expect(coerceProductValidationNumericValue('7.8', 'decimal')).toBe(7.8);
    expect(coerceProductValidationTargetValue({ target: 'weight', value: '12,9' })).toBe(12.9);
    expect(coerceProductValidationTargetValue({ target: 'stock', value: '12,9' })).toBe(12);
    expect(coerceProductValidationTargetValue({ target: 'name', value: '  Title  ' })).toBe(
      '  Title  '
    );
    expect(coerceProductValidationTargetValue({ target: 'price', value: 'abc' })).toBeNull();
  });
});
