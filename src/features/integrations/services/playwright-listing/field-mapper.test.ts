import { describe, expect, it } from 'vitest';

import {
  mapPlaywrightImportProduct,
  parsePlaywrightFieldMapperJson,
} from './field-mapper';

describe('parsePlaywrightFieldMapperJson', () => {
  it('parses array-based mapper config', () => {
    expect(
      parsePlaywrightFieldMapperJson(
        JSON.stringify([
          { sourceKey: 'name', targetField: 'title' },
          { sourceKey: 'pricing.amount', targetField: 'price' },
        ])
      )
    ).toEqual([
      { sourceKey: 'name', targetField: 'title' },
      { sourceKey: 'pricing.amount', targetField: 'price' },
    ]);
  });

  it('parses object-based mapper config', () => {
    expect(
      parsePlaywrightFieldMapperJson(
        JSON.stringify({
          name: 'title',
          'pricing.amount': 'price',
        })
      )
    ).toEqual([
      { sourceKey: 'name', targetField: 'title' },
      { sourceKey: 'pricing.amount', targetField: 'price' },
    ]);
  });
});

describe('mapPlaywrightImportProduct', () => {
  it('maps script output into normalized import fields and create input', () => {
    const mapped = mapPlaywrightImportProduct(
      {
        payload: {
          title: 'Programmable product',
          description: 'Imported from external site',
          images: ['https://example.com/a.jpg'],
        },
        pricing: { amount: '19.95' },
        sourceUrl: 'https://marketplace.example.com/items/123',
      },
      [
        { sourceKey: 'payload.title', targetField: 'title' },
        { sourceKey: 'payload.description', targetField: 'description' },
        { sourceKey: 'payload.images', targetField: 'images' },
        { sourceKey: 'pricing.amount', targetField: 'price' },
        { sourceKey: 'sourceUrl', targetField: 'sourceUrl' },
      ]
    );

    expect(mapped.title).toBe('Programmable product');
    expect(mapped.description).toBe('Imported from external site');
    expect(mapped.images).toEqual(['https://example.com/a.jpg']);
    expect(mapped.price).toBe(19.95);
    expect(mapped.sourceUrl).toBe('https://marketplace.example.com/items/123');
    expect(mapped.createInput.name_en).toBe('Programmable product');
    expect(mapped.createInput.imageLinks).toEqual(['https://example.com/a.jpg']);
  });
});
