import { describe, expect, it } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';

import {
  getProductValue,
  toProducerIdValueList,
  toProducerNameValueList,
  toTagIdValueList,
  toTagNameValueList,
} from './value-resolvers';

const createProduct = (overrides: Record<string, unknown> = {}): ProductWithImages =>
  ({
    parameters: [],
    tags: [],
    images: [],
    ...overrides,
  }) as unknown as ProductWithImages;

describe('value-resolvers', () => {
  it('routes parameter, category, producer, tag, and fallback keys through getProductValue', () => {
    const product = createProduct({
      parameters: [
        {
          parameterId: 'material',
          value: '',
          valuesByLanguage: { en: 'Cotton' },
        },
      ],
      category: { id: 'category-1' },
      producers: [{ producerId: 'producer-1', producerName: 'Acme' }],
      tags: [{ tagId: 'tag-1', tagName: 'Featured' }],
      sku: 'SKU-123',
    });

    expect(getProductValue(product, 'parameter:material|en')).toBe('Cotton');
    expect(getProductValue(product, 'category_id')).toBe('category-1');
    expect(getProductValue(product, 'producer_names', null, undefined, { 'producer-1': 'Acme' })).toEqual([
      'Acme',
    ]);
    expect(getProductValue(product, 'tag_id', null, undefined, undefined, undefined, undefined, { 'tag-1': 'ext-tag-1' })).toEqual([
      'ext-tag-1',
    ]);
    expect(getProductValue(product, 'sku')).toBe('SKU-123');
  });

  it('normalizes producer names from nested objects, delimiters, and lookups', () => {
    expect(
      toProducerNameValueList(
        [
          { producerId: 'producer-1' },
          'Acme, Beta',
          { manufacturer_name: 'Acme' },
        ],
        { 'producer-1': 'Acme' }
      )
    ).toEqual(['Acme', 'Beta']);
  });

  it('normalizes producer ids from internal ids and producer-name lookups', () => {
    expect(
      toProducerIdValueList(
        [
          { producerId: 'producer-1' },
          'Acme; ext-producer-2',
          { manufacturerName: 'Beta' },
        ],
        {
          'producer-1': 'ext-producer-1',
          'producer-2': 'ext-producer-2',
          'producer-3': 'ext-producer-3',
        },
        {
          'producer-1': 'Acme',
          'producer-3': 'Beta',
        }
      )
    ).toEqual(['ext-producer-1', 'ext-producer-2', 'ext-producer-3']);
  });

  it('normalizes tag names and ids from nested objects, delimiters, and lookups', () => {
    expect(
      toTagNameValueList(
        [{ tagId: 'tag-1' }, 'Featured, Summer', { name: 'Featured' }],
        { 'tag-1': 'Featured' }
      )
    ).toEqual(['Featured', 'Summer']);

    expect(
      toTagIdValueList(
        [{ tagId: 'tag-1' }, 'Featured; ext-tag-2', { tagName: 'Summer' }],
        {
          'tag-1': 'ext-tag-1',
          'tag-2': 'ext-tag-2',
          'tag-3': 'ext-tag-3',
        },
        {
          'tag-1': 'Featured',
          'tag-3': 'Summer',
        }
      )
    ).toEqual(['ext-tag-1', 'ext-tag-2', 'ext-tag-3']);
  });
});
