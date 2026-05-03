import { describe, expect, it } from 'vitest';

import { loadScripter, loadScripterFromJson } from './loader';

const validDef = {
  id: 'shop-example',
  version: 1,
  siteHost: 'shop.example',
  entryUrl: 'https://shop.example/products',
  steps: [
    { id: 'open', kind: 'goto', url: 'https://shop.example/products' },
    { id: 'jsonld', kind: 'extractJsonLd', filterType: 'Product' },
  ],
  fieldMap: {
    bindings: {
      title: { path: 'name', required: true },
      price: { path: 'offers.price', transforms: [{ name: 'toNumber' }], required: true },
    },
  },
};

describe('loadScripter', () => {
  it('accepts a valid definition', () => {
    const result = loadScripter(validDef);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.definition.id).toBe('shop-example');
  });

  it('rejects bindings with no source', () => {
    const result = loadScripter({
      ...validDef,
      fieldMap: { bindings: { title: { transforms: [{ name: 'trim' }] } } },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown step kind', () => {
    const result = loadScripter({
      ...validDef,
      steps: [{ id: 'x', kind: 'teleport' }],
    });
    expect(result.ok).toBe(false);
  });
});

describe('loadScripterFromJson', () => {
  it('parses a JSON string', () => {
    const result = loadScripterFromJson(JSON.stringify(validDef));
    expect(result.ok).toBe(true);
  });

  it('reports invalid JSON', () => {
    const result = loadScripterFromJson('{not json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/Invalid JSON/);
  });
});
