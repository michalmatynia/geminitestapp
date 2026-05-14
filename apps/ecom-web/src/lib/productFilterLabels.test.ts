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

  it('uses product type labels when selected filters span universes within one item type', () => {
    expect(getCategorySelectorTitle(
      ['Anime Keychain', 'Gaming Keychain', 'Keychain Mini Dice', 'Movie Keychain'],
      [
        { name: 'Anime Keychain', parentName: 'Keychains' },
        { name: 'Gaming Keychain', parentName: 'Keychains' },
        { name: 'Keychain Mini Dice', parentName: 'Dice' },
        { name: 'Movie Keychain', parentName: 'Keychains' },
      ],
    )).toBe('Keychains');
  });

  it('uses Dice as the title for dice category filters', () => {
    expect(getCategorySelectorTitle(
      ['Keychain Mini Dice', 'Set Of 7 Dice'],
      [
        { name: 'Keychain Mini Dice', parentName: 'Dice' },
        { name: 'Set Of 7 Dice', parentName: 'Dice' },
      ],
    )).toBe('Dice');
  });

  it('uses Bracelets as the title for bracelet category filters', () => {
    expect(getCategorySelectorTitle(
      ['Gaming Bracelets', 'Anime Bracelet'],
      [
        { name: 'Gaming Bracelets', parentName: 'Bracelets' },
        { name: 'Anime Bracelet', parentName: 'Bracelets' },
      ],
    )).toBe('Bracelets');
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

  it('uses product type labels for single matching category filters', () => {
    expect(getCategorySelectorTitle(['Set Of 7 Dice'])).toBe('Dice');
    expect(getCategorySelectorTitle(['Gaming Bracelets'])).toBe('Bracelets');
  });
});
