import { describe, expect, it, vi } from 'vitest';

import { resolveImageUrl, shouldIncludeImageUrl } from './base-exporter-images';

describe('base-exporter image helpers', () => {
  it('resolves relative image urls against the configured base', () => {
    expect(resolveImageUrl('/uploads/image.jpg', 'https://cdn.example.com/base/')).toBe(
      'https://cdn.example.com/base/uploads/image.jpg'
    );
    expect(resolveImageUrl('https://images.example.com/file.png', 'https://cdn.example.com')).toBe(
      'https://images.example.com/file.png'
    );
  });

  it('accepts supported mime aliases and supported extensions', () => {
    expect(
      shouldIncludeImageUrl('https://cdn.example.com/file.jpg', {
        mimetype: 'image/jpg; charset=utf-8',
      })
    ).toBe(true);
    expect(shouldIncludeImageUrl('https://cdn.example.com/file.jpeg')).toBe(true);
    expect(shouldIncludeImageUrl('https://cdn.example.com/file.png')).toBe(true);
  });

  it('rejects unsupported extensions and logs diagnostics', () => {
    const diagnostics = { log: vi.fn() };

    expect(
      shouldIncludeImageUrl('https://cdn.example.com/file.webp', {
        diagnostics,
        sourceType: 'link',
        index: 2,
      })
    ).toBe(false);
    expect(diagnostics.log).toHaveBeenCalledWith(
      'Skipping unsupported image format',
      expect.objectContaining({
        reason: 'unsupported_extension:.webp',
        extension: '.webp',
      })
    );
  });
});
