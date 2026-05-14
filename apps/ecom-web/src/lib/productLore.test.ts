import { describe, it, expect } from 'vitest';
import { getProductLore, productMatchesLores } from './productLore';

const makeProduct = (name: string, lore?: string) => ({ name, lore });

describe('getProductLore', () => {
  it('returns the lore field when set', () => {
    expect(getProductLore(makeProduct('Spinner | One Size | Metal | Pendant | Blade Runner 2049', 'Blade Runner 2049'))).toBe('Blade Runner 2049');
  });

  it('extracts the 5th pipe segment when lore field is absent', () => {
    expect(getProductLore(makeProduct('Spinner | One Size | Metal | Pendant | Warhammer 40k'))).toBe('Warhammer 40k');
  });

  it('trims whitespace around the extracted segment', () => {
    expect(getProductLore(makeProduct('Ring | XS | Metal | Pendant |  Dune  '))).toBe('Dune');
  });

  it('returns empty string when name has fewer than 5 pipe segments', () => {
    expect(getProductLore(makeProduct('Spinner | One Size | Metal | Pendant'))).toBe('');
  });

  it('returns empty string for a plain product name with no pipes', () => {
    expect(getProductLore(makeProduct('Amphora Vessel'))).toBe('');
  });

  it('prefers the lore field over the pipe segment', () => {
    expect(getProductLore(makeProduct('Spinner | One Size | Metal | Pendant | PipeValue', 'FieldValue'))).toBe('FieldValue');
  });

  it('falls back to pipe segment when lore field is null', () => {
    expect(getProductLore({ name: 'Spinner | One Size | Metal | Pendant | Dune', lore: null })).toBe('Dune');
  });

  it('falls back to pipe segment when lore field is empty string', () => {
    expect(getProductLore({ name: 'Pin | XS | Metal | Badge | Naruto', lore: '' })).toBe('Naruto');
  });
});

describe('productMatchesLores', () => {
  const product = makeProduct('Spinner | One Size | Metal | Pendant | Warhammer 40k');

  it('returns true when lores list is empty (no filter)', () => {
    expect(productMatchesLores(product, [])).toBe(true);
  });

  it('matches exact lore (case-insensitive)', () => {
    expect(productMatchesLores(product, ['warhammer 40k'])).toBe(true);
    expect(productMatchesLores(product, ['Warhammer 40k'])).toBe(true);
    expect(productMatchesLores(product, ['WARHAMMER 40K'])).toBe(true);
  });

  it('does not match a different lore', () => {
    expect(productMatchesLores(product, ['Dune'])).toBe(false);
  });

  it('uses exact match (not substring)', () => {
    expect(productMatchesLores(product, ['Warhammer'])).toBe(false);
  });

  it('returns true if any lore in the list matches', () => {
    expect(productMatchesLores(product, ['Dune', 'Warhammer 40k'])).toBe(true);
  });

  it('returns false when product has no lore (plain name)', () => {
    const plain = makeProduct('Amphora Vessel');
    expect(productMatchesLores(plain, ['Warhammer 40k'])).toBe(false);
  });
});
