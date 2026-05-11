import { describe, expect, it } from 'vitest';

import { getCategoryDisplayNames, getCategorySelectorTitle } from './productFilterLabels';

describe('product filter display labels', () => {
  it('dedupes child category filters under their parent category name', () => {
    expect(getCategorySelectorTitle(
      ['Movie Pin', 'Movie Wallet', 'Movie Ring'],
      [
        { name: 'Movie Pin', parentName: 'Pins' },
        { name: 'Movie Wallet', parentName: 'Wallets' },
        { name: 'Movie Ring', parentName: 'Rings' },
      ],
    )).toBe('Movie');
  });

  it('uses multiple parent names when selected filters span parent categories', () => {
    expect(getCategoryDisplayNames(
      ['Anime Ring', 'Movie Wallet', 'Anime Keychain'],
      [
        { name: 'Anime Ring', parentName: 'Rings' },
        { name: 'Anime Keychain', parentName: 'Keychains' },
        { name: 'Movie Wallet', parentName: 'Wallets' },
      ],
    )).toEqual(['Anime', 'Movie']);
  });

  it('uses universe category prefixes even for a single child category', () => {
    expect(getCategorySelectorTitle(
      ['Movie Wallet'],
      [{ name: 'Movie Wallet', parentName: 'Wallets' }],
    )).toBe('Movie');
  });

  it('uses catalog parent names for non-universe categories', () => {
    expect(getCategorySelectorTitle(
      ['Set Of 7 Dice'],
      [{ name: 'Set Of 7 Dice', parentName: 'Dice' }],
    )).toBe('Dice');
  });

  it('falls back to shared first-word grouping for URL-only category lists', () => {
    expect(getCategorySelectorTitle(['Movie Pin', 'Movie Wallet', 'Movie Ring'])).toBe('Movie');
  });

  it('does not collapse a single child category without parent data', () => {
    expect(getCategorySelectorTitle(['Set Of 7 Dice'])).toBe('Set Of 7 Dice');
  });
});
