import { describe, expect, it } from 'vitest';

import type { PageDriver } from './page-driver';
import { resolveScripterImportSource } from './scripter-import-source';
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
  version: 2,
  siteHost: 'shop.example',
  entryUrl: 'https://shop.example/products',
  steps: [
    { id: 'open', kind: 'goto', url: 'https://shop.example/products' },
    { id: 'jsonld', kind: 'extractJsonLd', filterType: 'Product' },
  ],
  fieldMap: {
    bindings: {
      title: { path: 'name', required: true, transforms: [{ name: 'trim' }] },
      description: { path: 'description', transforms: [{ name: 'stripHtml' }] },
      price: { path: 'offers.price', transforms: [{ name: 'toNumber' }], required: true },
      sku: { path: 'sku' },
      sourceUrl: {
        path: 'url',
        transforms: [{ name: 'absoluteUrl', args: { base: 'https://shop.example/' } }],
      },
      images: { path: 'image', transforms: [{ name: 'toStringArray' }] },
    },
  },
};

describe('resolveScripterImportSource', () => {
  it('produces CreateProductDraftInput per mapped record', async () => {
    const driver = makeDriver([
      {
        '@type': 'Product',
        name: 'Widget',
        description: '<p>Nice</p>',
        offers: { price: '49.00' },
        sku: 'SKU-1',
        url: '/p/widget',
        image: ['/a.jpg', '/b.jpg'],
      },
    ]);

    const result = await resolveScripterImportSource(definition, driver, {
      catalogDefaults: { catalogIds: ['cat-main'], importSource: 'scripter-test' },
    });

    expect(result.source.scripterId).toBe('shop-example');
    expect(result.source.executionMode).toBe('dry_run');
    expect(result.drafts).toHaveLength(1);

    const first = result.drafts[0]!;
    expect(first.externalId).toBe('SKU-1');
    expect(first.draft.name).toBe('Widget');
    expect(first.draft.sku).toBe('SKU-1');
    expect(first.draft.price).toBe(49);
    expect(first.draft.description).toBe('Nice');
    expect(first.draft.supplierLink).toBe('https://shop.example/p/widget');
    expect(first.draft.imageLinks).toEqual(['/a.jpg', '/b.jpg']);
    expect(first.draft.catalogIds).toEqual(['cat-main']);
    expect(first.draft.importSource).toBe('scripter-test');
    expect(first.issues).toEqual([]);
  });

  it('skips records with blocking errors when requested', async () => {
    const driver = makeDriver([
      { '@type': 'Product', name: 'A', offers: { price: '1' }, url: '/a' },
      { '@type': 'Product', offers: {}, url: '/broken' },
    ]);

    const kept = await resolveScripterImportSource(definition, driver, {
      skipRecordsWithErrors: true,
    });
    expect(kept.drafts.map((d) => d.draft.name)).toEqual(['A']);
    expect(kept.summary.recordsWithErrors).toBe(1);

    const all = await resolveScripterImportSource(definition, driver);
    expect(all.drafts).toHaveLength(2);
  });

  it('falls back to sourceUrl for externalId when sku is missing', async () => {
    const driver = makeDriver([
      { '@type': 'Product', name: 'A', offers: { price: '1' }, url: '/a' },
    ]);
    const result = await resolveScripterImportSource(definition, driver);
    expect(result.drafts[0]!.externalId).toBe('https://shop.example/a');
  });
});
