import { describe, it, expect } from 'vitest';
import { getProductSizeInfo, productMatchesSizes } from './productSizeInfo';

const makeProduct = (name: string, sizeInfo?: string) => ({ name, sizeInfo });

describe('getProductSizeInfo', () => {
  it('returns the sizeInfo field when set', () => {
    expect(getProductSizeInfo(makeProduct('Spinner | One Size | Metal | Pendant', 'One Size'))).toBe('One Size');
  });

  it('extracts the 2nd pipe segment when sizeInfo field is absent', () => {
    expect(getProductSizeInfo(makeProduct('Ring | Adjustable | Gold-plated | Pendant'))).toBe('Adjustable');
  });

  it('trims whitespace around the extracted segment', () => {
    expect(getProductSizeInfo(makeProduct('Ring |  XS  | Metal | Pendant'))).toBe('XS');
  });

  it('returns empty string for a plain product name with no pipes', () => {
    expect(getProductSizeInfo(makeProduct('Amphora Vessel'))).toBe('');
  });

  it('prefers the sizeInfo field over the pipe segment', () => {
    expect(getProductSizeInfo(makeProduct('Ring | PipeSize | Metal | Pendant', 'FieldSize'))).toBe('FieldSize');
  });

  it('falls back to pipe segment when sizeInfo field is null', () => {
    expect(getProductSizeInfo({ name: 'Keychain | One Size | Acrylic | Pendant', sizeInfo: null })).toBe('One Size');
  });

  it('falls back to pipe segment when sizeInfo field is empty string', () => {
    expect(getProductSizeInfo({ name: 'Pin | XS | Metal | Badge', sizeInfo: '' })).toBe('XS');
  });
});

describe('productMatchesSizes', () => {
  const product = makeProduct('Spinner | One Size | Metal | Pendant');

  it('returns true when sizes list is empty (no filter)', () => {
    expect(productMatchesSizes(product, [])).toBe(true);
  });

  it('matches exact size (case-insensitive)', () => {
    expect(productMatchesSizes(product, ['one size'])).toBe(true);
    expect(productMatchesSizes(product, ['One Size'])).toBe(true);
    expect(productMatchesSizes(product, ['ONE SIZE'])).toBe(true);
  });

  it('does not match a different size', () => {
    expect(productMatchesSizes(product, ['Adjustable'])).toBe(false);
  });

  it('uses exact match (not substring)', () => {
    expect(productMatchesSizes(product, ['One'])).toBe(false);
  });

  it('returns true if any size in the list matches', () => {
    expect(productMatchesSizes(product, ['Adjustable', 'One Size'])).toBe(true);
  });

  it('returns false when product has no size info (plain name)', () => {
    const plain = makeProduct('Amphora Vessel');
    expect(productMatchesSizes(plain, ['One Size'])).toBe(false);
  });
});
