import { describe, expect, it, vi } from 'vitest';

import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { Producer } from '@/shared/contracts/products/producers';
import type { ProductFormData } from '@/shared/contracts/products/drafts';

import {
  applyValidatorFieldReplacement,
  doesValidatorFieldReplacementMatchCurrentValue,
} from './applyValidatorFieldReplacement';

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
  {
    id: 'category-2',
    name: 'Wallets',
    name_en: 'Wallets',
    name_pl: 'Portfele',
    name_de: 'Geldborsen',
    color: null,
    parentId: null,
    catalogId: 'catalog-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'anime-pin',
    name: 'Anime Pins',
    name_en: 'Anime Pins',
    name_pl: 'Przypinki Anime',
    name_de: 'Anime Pins',
    color: null,
    parentId: null,
    catalogId: 'catalog-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const producers: Producer[] = [
  {
    id: 'producer-1',
    name: 'StarGater.net',
    website: 'https://stargater.net',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const createApplyApi = (currentValues: Partial<Record<keyof ProductFormData, unknown>>) => {
  const setFormFieldValue = vi.fn();
  const setCategoryId = vi.fn();
  const setProducerIds = vi.fn();

  return {
    setFormFieldValue,
    setCategoryId,
    setProducerIds,
    getCurrentFieldValue: (fieldName: keyof ProductFormData): unknown => currentValues[fieldName],
  };
};

describe('applyValidatorFieldReplacement', () => {
  it('applies category replacements through setCategoryId', () => {
    const applyApi = createApplyApi({ categoryId: 'category-1' });

    expect(
      applyValidatorFieldReplacement({
        fieldName: 'categoryId',
        replacementValue: 'Portfele',
        categories,
        ...applyApi,
      })
    ).toBe(true);

    expect(applyApi.setCategoryId).toHaveBeenCalledWith('category-2');
    expect(applyApi.setFormFieldValue).not.toHaveBeenCalled();
  });

  it('applies numeric replacements through setFormFieldValue', () => {
    const applyApi = createApplyApi({ stock: 2 });

    expect(
      applyValidatorFieldReplacement({
        fieldName: 'stock',
        replacementValue: '7.9',
        ...applyApi,
      })
    ).toBe(true);

    expect(applyApi.setFormFieldValue).toHaveBeenCalledWith('stock', 7);
    expect(applyApi.setCategoryId).not.toHaveBeenCalled();
  });

  it('applies producer replacements through setProducerIds', () => {
    const applyApi = createApplyApi({ producerIds: [] });

    expect(
      applyValidatorFieldReplacement({
        fieldName: 'producerIds',
        replacementValue: 'StarGater.net',
        producers,
        ...applyApi,
      })
    ).toBe(true);

    expect(applyApi.setProducerIds).toHaveBeenCalledWith(['producer-1']);
    expect(applyApi.setFormFieldValue).not.toHaveBeenCalled();
    expect(applyApi.setCategoryId).not.toHaveBeenCalled();
  });

  it('preserves decimal replacements for dimension fields', () => {
    const applyApi = createApplyApi({ sizeLength: 10 });

    expect(
      applyValidatorFieldReplacement({
        fieldName: 'sizeLength',
        replacementValue: '12.5',
        ...applyApi,
      })
    ).toBe(true);

    expect(applyApi.setFormFieldValue).toHaveBeenCalledWith('sizeLength', 12.5);
    expect(applyApi.setCategoryId).not.toHaveBeenCalled();
  });

  it('detects when a decimal dimension replacement is already applied', () => {
    const applyApi = createApplyApi({ sizeLength: 12.5 });

    expect(
      doesValidatorFieldReplacementMatchCurrentValue({
        fieldName: 'sizeLength',
        replacementValue: '12.5',
        ...applyApi,
      })
    ).toBe(true);
  });

  it('detects when a hydrated reset has undone a decimal dimension replacement', () => {
    const applyApi = createApplyApi({ sizeLength: 10 });

    expect(
      doesValidatorFieldReplacementMatchCurrentValue({
        fieldName: 'sizeLength',
        replacementValue: '12.5',
        ...applyApi,
      })
    ).toBe(false);
  });

  it('detects when a producer replacement is already applied', () => {
    const applyApi = createApplyApi({ producerIds: ['producer-1'] });

    expect(
      doesValidatorFieldReplacementMatchCurrentValue({
        fieldName: 'producerIds',
        replacementValue: 'stargater.net',
        producers,
        ...applyApi,
      })
    ).toBe(true);
  });

  it('applies trimmed text replacements through setFormFieldValue', () => {
    const applyApi = createApplyApi({ name_en: 'Current title' });

    expect(
      applyValidatorFieldReplacement({
        fieldName: 'name_en',
        replacementValue: '  Next title  ',
        ...applyApi,
      })
    ).toBe(true);

    expect(applyApi.setFormFieldValue).toHaveBeenCalledWith('name_en', 'Next title');
    expect(applyApi.setCategoryId).not.toHaveBeenCalled();
  });

  it('returns false when the replacement cannot be resolved', () => {
    const applyApi = createApplyApi({ categoryId: 'category-1' });

    expect(
      applyValidatorFieldReplacement({
        fieldName: 'categoryId',
        replacementValue: 'Unknown',
        categories,
        ...applyApi,
      })
    ).toBe(false);

    expect(applyApi.setCategoryId).not.toHaveBeenCalled();
    expect(applyApi.setFormFieldValue).not.toHaveBeenCalled();
  });

  it('applies category replacements when the inferred title segment uses a singularized label', () => {
    const applyApi = createApplyApi({ categoryId: null });

    expect(
      applyValidatorFieldReplacement({
        fieldName: 'categoryId',
        replacementValue: 'Anime Pin',
        categories,
        ...applyApi,
      })
    ).toBe(true);

    expect(applyApi.setCategoryId).toHaveBeenCalledWith('anime-pin');
    expect(applyApi.setFormFieldValue).not.toHaveBeenCalled();
  });
});
