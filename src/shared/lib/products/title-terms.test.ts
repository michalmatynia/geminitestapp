import { describe, expect, it } from 'vitest';

import {
  PRODUCT_TITLE_SEPARATOR,
  composeStructuredProductNameSegments,
  composeStructuredProductName,
  normalizeStructuredProductName,
  normalizeTitleTermName,
  parseStructuredProductName,
  splitStructuredProductName,
  translateStructuredProductName,
} from './title-terms';

describe('product title term helpers', () => {
  it('normalizes English term names for case-insensitive lookup', () => {
    expect(normalizeTitleTermName('  Metal   Alloy ')).toBe('metal alloy');
  });

  it('normalizes structured titles into a consistent separator format', () => {
    expect(
      normalizeStructuredProductName(
        '  Scout Regiment| 4 cm |  Metal   | Anime Pin | Attack   On Titan '
      )
    ).toBe(`Scout Regiment${PRODUCT_TITLE_SEPARATOR}4 cm${PRODUCT_TITLE_SEPARATOR}Metal${PRODUCT_TITLE_SEPARATOR}Anime Pin${PRODUCT_TITLE_SEPARATOR}Attack On Titan`);
  });

  it('parses only complete five-segment structured titles', () => {
    expect(
      parseStructuredProductName('Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan')
    ).toEqual({
      baseName: 'Scout Regiment',
      size: '4 cm',
      material: 'Metal',
      category: 'Anime Pin',
      theme: 'Attack On Titan',
    });
    expect(parseStructuredProductName('Scout Regiment | 4 cm | Metal | Anime Pin')).toBeNull();
    expect(
      parseStructuredProductName(
        'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan | Extra'
      )
    ).toBeNull();
  });

  it('splits and composes segments with trimmed values', () => {
    expect(splitStructuredProductName(' Name |  4 cm|Metal ')).toEqual(['Name', '4 cm', 'Metal']);
    expect(composeStructuredProductNameSegments(['Name', '', 'Metal'])).toBe('Name |  | Metal');
    expect(
      composeStructuredProductName({
        baseName: ' Scout Regiment ',
        size: ' 4 cm ',
        material: ' Metal ',
        category: ' Anime Pin ',
        theme: ' Attack On Titan ',
      })
    ).toBe('Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan');
  });

  it('translates structured names segment-by-segment with English fallbacks', () => {
    expect(
      translateStructuredProductName({
        englishTitle: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
        locale: 'pl',
        sizeTerms: [
          {
            id: 'size-4',
            name: '4 cm',
            name_en: '4 cm',
            name_pl: null,
            catalogId: 'catalog-1',
            type: 'size',
          },
        ],
        materialTerms: [
          {
            id: 'material-metal',
            name: 'Metal',
            name_en: 'Metal',
            name_pl: 'Metal PL',
            catalogId: 'catalog-1',
            type: 'material',
          },
        ],
        categories: [
          {
            id: 'category-pin',
            name: 'Anime Pin',
            name_en: 'Anime Pin',
            name_pl: 'Przypinka Anime',
            name_de: null,
            description: null,
            color: null,
            parentId: null,
            catalogId: 'catalog-1',
            sortIndex: 0,
          },
        ],
        themeTerms: [
          {
            id: 'theme-aot',
            name: 'Attack On Titan',
            name_en: 'Attack On Titan',
            name_pl: 'Atak Tytanow',
            catalogId: 'catalog-1',
            type: 'theme',
          },
        ],
      })
    ).toBe('Scout Regiment | 4 cm | Metal PL | Przypinka Anime | Atak Tytanow');
  });
});
