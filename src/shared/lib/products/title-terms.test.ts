import { describe, expect, it } from 'vitest';

import {
  PRODUCT_TITLE_SEPARATOR,
  composeStructuredProductName,
  normalizeStructuredProductName,
  normalizeTitleTermName,
  parseStructuredProductName,
  splitStructuredProductName,
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
});
