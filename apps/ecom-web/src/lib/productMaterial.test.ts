import { describe, it, expect } from 'vitest';
import { getProductMaterial, productMatchesMaterials } from './productMaterial';

const makeProduct = (name: string, material?: string) => ({ name, material });

describe('getProductMaterial', () => {
  it('returns the material field when set', () => {
    expect(getProductMaterial(makeProduct('Spinner | One Size | Metal | Movie Pendant', 'Metal'))).toBe('Metal');
  });

  it('extracts the 3rd pipe segment when material field is absent', () => {
    expect(getProductMaterial(makeProduct('Spinner | One Size | Resin | Anime Pendant'))).toBe('Resin');
  });

  it('trims whitespace around the extracted segment', () => {
    expect(getProductMaterial(makeProduct('Ring |  XS  |  Gold-plated  | Pendant'))).toBe('Gold-plated');
  });

  it('returns empty string when name has fewer than 3 pipe segments', () => {
    expect(getProductMaterial(makeProduct('Simple Product | One Size'))).toBe('');
  });

  it('returns empty string for a plain product name with no pipes', () => {
    expect(getProductMaterial(makeProduct('Amphora Vessel'))).toBe('');
  });

  it('prefers the material field over the pipe segment', () => {
    expect(getProductMaterial(makeProduct('Spinner | One Size | PipeValue | Pendant', 'FieldValue'))).toBe('FieldValue');
  });

  it('falls back to pipe segment when material field is null', () => {
    expect(getProductMaterial({ name: 'Spinner | One Size | Acrylic | Pendant', material: null })).toBe('Acrylic');
  });

  it('falls back to pipe segment when material field is empty string', () => {
    expect(getProductMaterial({ name: 'Spinner | One Size | Brass | Pendant', material: '' })).toBe('Brass');
  });
});

describe('productMatchesMaterials', () => {
  const product = makeProduct('Spinner | One Size | Metal | Movie Pendant');

  it('returns true when materials list is empty (no filter)', () => {
    expect(productMatchesMaterials(product, [])).toBe(true);
  });

  it('matches exact material (case-insensitive)', () => {
    expect(productMatchesMaterials(product, ['metal'])).toBe(true);
    expect(productMatchesMaterials(product, ['Metal'])).toBe(true);
    expect(productMatchesMaterials(product, ['METAL'])).toBe(true);
  });

  it('does not match a different material', () => {
    expect(productMatchesMaterials(product, ['Resin'])).toBe(false);
  });

  it('uses exact match (not substring)', () => {
    expect(productMatchesMaterials(product, ['Met'])).toBe(false);
  });

  it('returns true if any material in the list matches', () => {
    expect(productMatchesMaterials(product, ['Resin', 'Metal'])).toBe(true);
  });

  it('returns false when product has no material (plain name)', () => {
    const plain = makeProduct('Amphora Vessel');
    expect(productMatchesMaterials(plain, ['Metal'])).toBe(false);
  });
});
