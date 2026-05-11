/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import { getProductThemeName, productMatchesThemes } from './productThemes';

describe('product theme filters', () => {
  it('uses the fifth pipe-delimited product name segment as the theme', () => {
    const product = {
      name: 'Spinner | One Size | Metal | Movie Pendant | Blade Runner 2049',
    };

    expect(getProductThemeName(product)).toBe('Blade Runner 2049');
    expect(productMatchesThemes(product, ['Blade Runner'])).toBe(true);
  });

  it('prefers mapped lore when available', () => {
    const product = {
      name: 'Spinner | One Size | Metal | Movie Pendant | Wrong Theme',
      lore: 'Blade Runner 2049',
    };

    expect(getProductThemeName(product)).toBe('Blade Runner 2049');
    expect(productMatchesThemes(product, ['Blade Runner 2049'])).toBe(true);
  });

  it('does not match other title segments as themes', () => {
    const product = {
      name: 'Blade Runner Charm | One Size | Metal | Movie Pendant | Cyberpunk 2077',
    };

    expect(productMatchesThemes(product, ['Blade Runner'])).toBe(false);
  });
});
