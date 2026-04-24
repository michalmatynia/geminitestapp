import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { loadScripterFromJson } from '../loader';
import { resolveScripterImportSource } from '../scripter-import-source';
import { createFixtureDriver } from '../test-utils/fixture-driver';

const HERE = dirname(fileURLToPath(import.meta.url));

const loadFixture = (relativePath: string): Promise<string> =>
  readFile(join(HERE, relativePath), 'utf8');

describe('example-shop golden scripter', () => {
  it('produces well-formed drafts and surfaces issues for the broken row', async () => {
    const [definitionJson, listingHtml] = await Promise.all([
      loadFixture('example-shop.scripter.json'),
      loadFixture('fixtures/example-shop-listing.html'),
    ]);
    const loaded = loadScripterFromJson(definitionJson);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const definition = loaded.definition;

    const driver = createFixtureDriver({
      pages: [{ url: 'https://shop.example/products', html: listingHtml }],
      initialUrl: 'https://shop.example/products',
    });

    const result = await resolveScripterImportSource(definition, driver, {
      catalogDefaults: { catalogIds: ['cat-shop'], importSource: 'example-shop' },
    });

    expect(result.source.scripterId).toBe('example-shop');
    expect(result.drafts).toHaveLength(3);

    const [alpha, beta, broken] = result.drafts;

    expect(alpha!.draft.name).toBe('Widget Alpha');
    expect(alpha!.draft.price).toBe(19.99);
    expect(alpha!.draft.sku).toBe('SKU-A1');
    expect(alpha!.draft.supplierLink).toBe('https://shop.example/products/widget-alpha');
    expect(alpha!.draft.imageLinks).toEqual([
      '/img/widget-alpha-1.jpg',
      '/img/widget-alpha-2.jpg',
    ]);
    expect(alpha!.draft.catalogIds).toEqual(['cat-shop']);
    expect(alpha!.draft.importSource).toBe('example-shop');
    expect(alpha!.issues).toEqual([]);

    expect(beta!.draft.name).toBe('Widget Beta');
    expect(beta!.draft.price).toBe(29.5);
    expect(beta!.draft.sku).toBe('SKU-B2');

    expect(broken!.issues.map((i) => i.field).sort()).toEqual(['price', 'title']);
    expect(broken!.issues.every((i) => i.severity === 'error')).toBe(true);

    expect(result.summary.recordsWithErrors).toBe(1);
    expect(result.summary.totalIssues).toBe(2);
  });
});
