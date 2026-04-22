import { describe, expect, it } from 'vitest';

import { postHandler, guessExtensionFromMime } from './handler';

describe('image-studio project assets import handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof postHandler).toBe('function');
  });

  it('maps supported mime types to import filename extensions', () => {
    expect(guessExtensionFromMime('image/jpeg')).toBe('.jpg');
    expect(guessExtensionFromMime('IMAGE/PNG')).toBe('.png');
    expect(guessExtensionFromMime('image/webp; charset=binary')).toBe('.webp');
    expect(guessExtensionFromMime('image/gif')).toBe('.gif');
    expect(guessExtensionFromMime('image/svg+xml')).toBe('.svg');
    expect(guessExtensionFromMime('application/json')).toBeNull();
    expect(guessExtensionFromMime(null)).toBeNull();
  });
});
