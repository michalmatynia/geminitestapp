import { describe, expect, it } from 'vitest';

import { importScripterFromConnection } from './from-connection';
import { loadScripter } from './loader';

const makeInput = (overrides: Parameters<typeof importScripterFromConnection>[0] = { connectionId: 'conn-1', name: 'Shop Import' }) => overrides;

describe('importScripterFromConnection', () => {
  it('produces a valid ScripterDefinition from connection fields', () => {
    const result = importScripterFromConnection({
      connectionId: 'conn-1',
      name: 'Shop Import',
      playwrightImportBaseUrl: 'https://shop.example/products',
      playwrightFieldMapperJson: JSON.stringify([
        { sourceKey: 'name', targetField: 'title' },
        { sourceKey: 'pricing.amount', targetField: 'price' },
        { sourceKey: 'slug', targetField: 'sourceUrl' },
        { sourceKey: 'images[*].url', targetField: 'images' },
      ]),
    });
    expect(result.warnings).toEqual([]);
    const loaded = loadScripter(result.definition);
    expect(loaded.ok).toBe(true);

    expect(result.definition.id).toBe('shop-import');
    expect(result.definition.siteHost).toBe('shop.example');
    expect(result.definition.entryUrl).toBe('https://shop.example/products');

    const bindings = result.definition.fieldMap.bindings;
    expect(bindings.title).toMatchObject({ path: 'name', required: true });
    expect(bindings.title?.transforms).toEqual([{ name: 'trim' }]);
    expect(bindings.price).toMatchObject({
      path: 'pricing.amount',
      required: true,
      transforms: [{ name: 'toNumber' }, { name: 'money' }],
    });
    expect(bindings.sourceUrl?.transforms).toEqual([
      { name: 'absoluteUrl', args: { base: 'https://shop.example/products' } },
    ]);
    expect(bindings.images?.transforms).toEqual([{ name: 'toStringArray' }]);
  });

  it('merges duplicate source keys into a multi-path binding', () => {
    const result = importScripterFromConnection({
      connectionId: 'conn-2',
      name: 'Dup Import',
      playwrightImportBaseUrl: 'https://x.example/catalog',
      playwrightFieldMapperJson: JSON.stringify([
        { sourceKey: 'name_en', targetField: 'title' },
        { sourceKey: 'name_pl', targetField: 'title' },
      ]),
    });
    expect(result.definition.fieldMap.bindings.title?.paths).toEqual(['name_en', 'name_pl']);
  });

  it('warns when no base URL is provided and uses a placeholder', () => {
    const result = importScripterFromConnection({
      connectionId: 'conn-3',
      name: 'Baseless',
      playwrightFieldMapperJson: JSON.stringify([
        { sourceKey: 'name', targetField: 'title' },
      ]),
    });
    expect(result.warnings.some((w) => /playwrightImportBaseUrl/.test(w))).toBe(true);
    expect(result.definition.entryUrl).toBe('https://example.com/products');
    expect(result.definition.siteHost).toBe('example.com');
  });

  it('warns and produces an empty field map when no entries exist', () => {
    const result = importScripterFromConnection({
      connectionId: 'conn-4',
      name: 'Empty',
      playwrightImportBaseUrl: 'https://y.example/items',
    });
    expect(result.warnings.some((w) => /no field-mapper entries/.test(w))).toBe(true);
    expect(Object.keys(result.definition.fieldMap.bindings)).toEqual([]);
    expect(loadScripter(result.definition).ok).toBe(true);
  });

  it('sanitizes exotic names into safe scripter ids', () => {
    const result = importScripterFromConnection({
      connectionId: 'conn-5',
      name: '  Kotły & Grzejniki PL  ',
      playwrightImportBaseUrl: 'https://grzejniki.example/produkty',
      playwrightFieldMapperJson: JSON.stringify([
        { sourceKey: 'title', targetField: 'title' },
      ]),
    });
    expect(result.definition.id).toBe('kotly-grzejniki-pl');
  });

  it('honors siteHostHint when provided', () => {
    const result = importScripterFromConnection({
      connectionId: 'conn-6',
      name: 'Hinted',
      playwrightImportBaseUrl: 'https://cdn.internal/bypass-redirect',
      siteHostHint: 'shop.public',
      playwrightFieldMapperJson: JSON.stringify([
        { sourceKey: 'name', targetField: 'title' },
      ]),
    });
    expect(result.definition.siteHost).toBe('shop.public');
  });
});
