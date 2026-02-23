import { describe, expect, it } from 'vitest';

import { getValueTypeLabel, isValueCompatibleWithTypes } from '../port-types';

describe('port type compatibility', () => {
  it('treats URL-like prompt text as string for string ports', () => {
    const value =
      'Analyze these images: ["/uploads/products/ABC/image.png", "https://example.com/pic.jpg"]';
    expect(getValueTypeLabel(value)).toBe('string');
    expect(isValueCompatibleWithTypes(value, ['string'])).toBe(true);
  });

  it('still accepts URL strings for image ports', () => {
    expect(isValueCompatibleWithTypes('https://example.com/image.png', ['image'])).toBe(true);
  });

  it('does not treat image arrays as string-compatible', () => {
    const value = ['https://example.com/image.png'];
    expect(isValueCompatibleWithTypes(value, ['string'])).toBe(false);
    expect(isValueCompatibleWithTypes(value, ['image'])).toBe(true);
  });
});

