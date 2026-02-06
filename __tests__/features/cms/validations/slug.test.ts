import { describe, it, expect } from 'vitest';

import { isValidSlug } from '@/features/cms/validations/slug';

describe('Slug Validation', () => {
  it('should return true for valid slugs', () => {
    expect(isValidSlug('home')).toBe(true);
    expect(isValidSlug('about-us')).toBe(true);
    expect(isValidSlug('product-123')).toBe(true);
  });

  it('should return false for invalid slugs', () => {
    expect(isValidSlug('About Us')).toBe(false);
    expect(isValidSlug('home!')).toBe(false);
    expect(isValidSlug('-home')).toBe(false);
    expect(isValidSlug('home-')).toBe(false);
    expect(isValidSlug('home--page')).toBe(false);
  });
});
