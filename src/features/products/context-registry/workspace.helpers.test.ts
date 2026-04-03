import { describe, expect, it } from 'vitest';

import {
  pickProductTitle,
  resolveProductEditorEntityKey,
  resolveProductEditorTitle,
  summarizeVariant,
  trimText,
} from './workspace.helpers';

describe('products workspace helpers', () => {
  it('trims and truncates text with null fallback', () => {
    expect(trimText('  Vintage Lamp  ', 20)).toBe('Vintage Lamp');
    expect(trimText('   ', 20)).toBeNull();
    expect(trimText('abcdefghij', 5)).toBe('abcd...');
  });

  it('picks product title and editor keys from the first non-empty candidate', () => {
    expect(
      pickProductTitle({
        id: 'product-1',
        name_en: '  ',
        name_pl: ' Polska nazwa ',
        name_de: null,
        sku: 'SKU-1',
      } as never)
    ).toBe('Polska nazwa');

    expect(
      resolveProductEditorEntityKey({
        productId: '  ',
        draftId: ' draft-1 ',
      })
    ).toBe('draft-1');

    expect(
      resolveProductEditorTitle({
        productTitle: null,
        productId: ' product-1 ',
        draftId: null,
      })
    ).toBe('product-1');
  });

  it('summarizes variants with filepath and url fallbacks', () => {
    expect(
      summarizeVariant({
        id: 'variant-1',
        name: 'Variant 1',
        folderPath: 'products/SKU-1',
        createdAt: '2026-04-03T10:00:00.000Z',
        imageUrl: '/variant-1.png',
        imageFile: {
          filepath: '/files/variant-1.png',
        },
      } as never)
    ).toEqual({
      id: 'variant-1',
      name: 'Variant 1',
      folderPath: 'products/SKU-1',
      createdAt: '2026-04-03T10:00:00.000Z',
      imagePath: '/files/variant-1.png',
    });

    expect(
      summarizeVariant({
        id: 'variant-2',
        name: 'Variant 2',
        folderPath: null,
        createdAt: null,
        imageUrl: '/variant-2.png',
        imageFile: null,
      } as never)
    ).toEqual({
      id: 'variant-2',
      name: 'Variant 2',
      folderPath: null,
      createdAt: null,
      imagePath: '/variant-2.png',
    });
  });
});
