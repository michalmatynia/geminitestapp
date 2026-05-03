import { describe, expect, it } from 'vitest';

import {
  createEmptyPlaywrightDraftMapperRow,
  mapScrapedProductToDraftPreview,
  parsePlaywrightDraftMapperJson,
  serializePlaywrightDraftMapperRows,
  type PlaywrightDraftMapperRow,
} from './draft-mapper';

const buildRow = (
  overrides: Partial<PlaywrightDraftMapperRow>
): PlaywrightDraftMapperRow => ({
  ...createEmptyPlaywrightDraftMapperRow(),
  ...overrides,
});

describe('playwright draft mapper', () => {
  it('maps mixed scraped and static values into a draft preview', () => {
    const preview = mapScrapedProductToDraftPreview(
      {
        title: '  Vintage Shirt  ',
        price: '12,99',
        gallery: {
          images: [
            { url: 'https://cdn.example.com/1.jpg' },
            'https://cdn.example.com/2.jpg',
          ],
        },
      },
      [
        buildRow({
          id: 'row-name',
          targetPath: 'name_en',
          mode: 'scraped',
          sourcePath: 'title',
          transform: 'trim',
          required: true,
        }),
        buildRow({
          id: 'row-price',
          targetPath: 'price',
          mode: 'scraped',
          sourcePath: 'price',
          transform: 'number',
          required: true,
        }),
        buildRow({
          id: 'row-images',
          targetPath: 'imageLinks',
          mode: 'scraped',
          sourcePath: 'gallery.images',
          transform: 'string_array',
        }),
        buildRow({
          id: 'row-catalog',
          targetPath: 'catalogIds',
          mode: 'static',
          staticValue: '["catalog-a"]',
          transform: 'string_array',
          required: true,
        }),
      ]
    );

    expect(preview.valid).toBe(true);
    expect(preview.diagnostics).toEqual([]);
    expect(preview.draftInput).toMatchObject({
      name_en: 'Vintage Shirt',
      price: 12.99,
      imageLinks: ['https://cdn.example.com/1.jpg', 'https://cdn.example.com/2.jpg'],
      catalogIds: ['catalog-a'],
    });
  });

  it('emits diagnostics for invalid values and duplicate targets', () => {
    const preview = mapScrapedProductToDraftPreview(
      {
        title: 'Example title',
        price: 'not-a-number',
      },
      [
        buildRow({
          id: 'row-name-a',
          targetPath: 'name_en',
          mode: 'scraped',
          sourcePath: 'title',
          transform: 'trim',
          required: true,
        }),
        buildRow({
          id: 'row-name-b',
          targetPath: 'name_en',
          mode: 'static',
          staticValue: 'Fallback title',
          transform: 'trim',
        }),
        buildRow({
          id: 'row-price',
          targetPath: 'price',
          mode: 'scraped',
          sourcePath: 'price',
          transform: 'number',
          required: true,
        }),
      ]
    );

    expect(preview.valid).toBe(false);
    expect(preview.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'duplicate_target_path',
          level: 'warning',
          targetPath: 'name_en',
        }),
        expect.objectContaining({
          code: 'invalid_number',
          level: 'error',
          rowId: 'row-price',
          targetPath: 'price',
        }),
        expect.objectContaining({
          code: 'empty_required_value',
          level: 'error',
          rowId: 'row-price',
          targetPath: 'price',
        }),
      ])
    );
    expect(preview.draftInput).toMatchObject({
      name_en: 'Fallback title',
    });
  });

  it('parses and serializes persisted draft mapper rows', () => {
    const rows = parsePlaywrightDraftMapperJson(
      JSON.stringify([
        {
          enabled: true,
          targetPath: 'supplierLink',
          mode: 'scraped',
          sourcePath: 'source.url',
          staticValue: '',
          transform: 'first_non_empty',
          required: false,
        },
      ])
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      enabled: true,
      targetPath: 'supplierLink',
      mode: 'scraped',
      sourcePath: 'source.url',
      transform: 'first_non_empty',
      required: false,
    });
    expect(serializePlaywrightDraftMapperRows(rows)).toBe(
      JSON.stringify([
        {
          enabled: true,
          targetPath: 'supplierLink',
          mode: 'scraped',
          sourcePath: 'source.url',
          staticValue: '',
          transform: 'first_non_empty',
          required: false,
        },
      ])
    );
  });
});
