import { describe, expect, it } from 'vitest';

import {
  IMAGE_STUDIO_IMAGE_MODEL_FALLBACKS,
  getImageModelCapabilities,
  isLikelyImageOutputModelId,
} from '../image-models';

describe('image model utilities', () => {
  it('prefers gpt-image-2 and excludes transparent backgrounds for it', () => {
    const capabilities = getImageModelCapabilities('gpt-image-2');

    expect(IMAGE_STUDIO_IMAGE_MODEL_FALLBACKS[0]).toBe('gpt-image-2');
    expect(isLikelyImageOutputModelId('gpt-image-2')).toBe(true);
    expect(capabilities.family).toBe('gpt-image-2');
    expect(capabilities.supportsOutputFormat).toBe(true);
    expect(capabilities.supportsOutputCompression).toBe(true);
    expect(capabilities.sizeOptions).toEqual(['auto', '1024x1024', '1536x1024', '1024x1536']);
    expect(capabilities.backgroundOptions).toEqual(['auto', 'opaque']);
  });
});
