import { describe, expect, it } from 'vitest';

import type { PageDriver } from './page-driver';
import { runScripterDryRun } from './scripter-dry-run';
import type { ScripterDefinition } from './types';

const makeDriver = (jsonLd: unknown[]): PageDriver => ({
  async goto() {},
  async currentUrl() {
    return 'https://shop.example/products';
  },
  async waitFor() {},
  async tryClick() {
    return null;
  },
  async extractJsonLd() {
    return jsonLd;
  },
  async extractList() {
    return [];
  },
  async scrollToBottom() {},
});

const definition: ScripterDefinition = {
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
      title: { path: 'name', required: true, transforms: [{ name: 'trim' }] },
      price: {
        path: 'offers.price',
        transforms: [{ name: 'toNumber' }, { name: 'money' }],
        required: true,
      },
      currency: { path: 'offers.priceCurrency' },
      sourceUrl: {
        path: 'url',
        transforms: [{ name: 'absoluteUrl', args: { base: 'https://shop.example/' } }],
      },
    },
    defaults: { brand: 'Unknown' },
  },
};

describe('runScripterDryRun', () => {
  it('maps extracted records and summarises issues', async () => {
    const driver = makeDriver([
      {
        '@type': 'Product',
        name: 'Widget A',
        offers: { price: '19,99', priceCurrency: 'PLN' },
        url: '/p/widget-a',
      },
      {
        '@type': 'Product',
        name: '  Widget B  ',
        offers: { price: '29.50', priceCurrency: 'PLN' },
        url: '/p/widget-b',
      },
      {
        '@type': 'Product',
        offers: {},
        url: '/p/broken',
      },
    ]);

    const result = await runScripterDryRun(definition, driver);

    expect(result.scripterId).toBe('shop-example');
    expect(result.records).toHaveLength(3);

    expect(result.records[0]!.mapped.title).toBe('Widget A');
    expect(result.records[0]!.mapped.price).toBe(19.99);
    expect(result.records[0]!.mapped.currency).toBe('PLN');
    expect(result.records[0]!.mapped.sourceUrl).toBe('https://shop.example/p/widget-a');
    expect(result.records[0]!.mapped.brand).toBe('Unknown');
    expect(result.records[0]!.issues).toEqual([]);

    expect(result.records[1]!.mapped.title).toBe('Widget B');

    expect(result.records[2]!.issues.map((i) => i.field).sort()).toEqual(['price', 'title']);

    expect(result.summary).toEqual({
      rawCount: 3,
      mappedCount: 3,
      recordsWithErrors: 1,
      recordsWithWarnings: 0,
      totalIssues: 2,
      issueCountByField: { title: 1, price: 1 },
    });
  });

  it('honors the limit option', async () => {
    const driver = makeDriver([
      { '@type': 'Product', name: 'A', offers: { price: '1' } },
      { '@type': 'Product', name: 'B', offers: { price: '2' } },
      { '@type': 'Product', name: 'C', offers: { price: '3' } },
    ]);
    const result = await runScripterDryRun(definition, driver, { limit: 2 });
    expect(result.records).toHaveLength(2);
    expect(result.run.records).toHaveLength(3);
  });
});
