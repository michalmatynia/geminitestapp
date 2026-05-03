import { describe, expect, it } from 'vitest';

import { evaluateFieldMap } from './field-map';
import type { FieldMap } from './types';

describe('evaluateFieldMap', () => {
  const raw = {
    name: '  Sample Product  ',
    description: '<p>Hi</p>',
    offers: { price: '1 299,00 zł', currency: 'PLN' },
    images: [{ url: '/a.jpg' }, { url: '/b.jpg' }],
    meta: { sku: 'SKU-987', ean: '' },
    url: '/products/sample',
  };

  const fieldMap: FieldMap = {
    bindings: {
      title: { path: 'name', transforms: [{ name: 'trim' }], required: true },
      description: { path: 'description', transforms: [{ name: 'stripHtml' }] },
      price: {
        path: 'offers.price',
        transforms: [{ name: 'toNumber' }, { name: 'money' }],
        required: true,
      },
      currency: { path: 'offers.currency' },
      images: {
        path: 'images[*].url',
        transforms: [{ name: 'toStringArray' }],
      },
      sku: { paths: ['meta.sku', 'meta.id'] },
      ean: { path: 'meta.ean', fallback: null },
      sourceUrl: {
        path: 'url',
        transforms: [{ name: 'absoluteUrl', args: { base: 'https://shop.example/' } }],
      },
    },
    defaults: { brand: 'Unknown' },
  };

  it('maps fields with transforms and paths', () => {
    const { record, issues } = evaluateFieldMap(raw, fieldMap);
    expect(issues).toEqual([]);
    expect(record.title).toBe('Sample Product');
    expect(record.description).toBe('Hi');
    expect(record.price).toBe(1299);
    expect(record.currency).toBe('PLN');
    expect(record.images).toEqual(['/a.jpg', '/b.jpg']);
    expect(record.sku).toBe('SKU-987');
    expect(record.ean).toBeNull();
    expect(record.brand).toBe('Unknown');
    expect(record.sourceUrl).toBe('https://shop.example/products/sample');
    expect(record.raw).toBe(raw);
  });

  it('reports required fields that resolve empty', () => {
    const { issues } = evaluateFieldMap(
      { offers: {} },
      {
        bindings: {
          title: { path: 'missing', required: true },
          price: { path: 'offers.price', required: true },
        },
      }
    );
    expect(issues).toHaveLength(2);
    expect(issues[0]?.severity).toBe('error');
    expect(issues.map((i) => i.field).sort()).toEqual(['price', 'title']);
  });

  it('reports unknown transforms', () => {
    const { issues } = evaluateFieldMap(
      { name: 'x' },
      {
        bindings: {
          title: { path: 'name', transforms: [{ name: 'nope' }] },
        },
      }
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.transform).toBe('nope');
  });
});
