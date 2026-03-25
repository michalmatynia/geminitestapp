/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logClientCatch: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: mocks.logClientCatch,
}));

import {
  normalizeProductImageExternalBaseUrl,
  resolveProductImageUrl,
} from './image-routing';

describe('products image-routing utils', () => {
  beforeEach(() => {
    mocks.logClientCatch.mockReset();
  });

  it('normalizes external base urls and logs invalid values defensively', () => {
    expect(normalizeProductImageExternalBaseUrl(' example.com/// ')).toBe('http://example.com');
    expect(normalizeProductImageExternalBaseUrl('https://cdn.example.com/base///')).toBe(
      'https://cdn.example.com/base'
    );
    expect(normalizeProductImageExternalBaseUrl('')).toBe('');
    expect(normalizeProductImageExternalBaseUrl('http:// bad host///')).toBe('http:// bad host');
    expect(mocks.logClientCatch).toHaveBeenCalledTimes(1);
  });

  it('preserves local and external urls while remapping loopback sources to configured hosts', () => {
    expect(resolveProductImageUrl('data:image/png;base64,abc', 'https://cdn.example.com')).toBe(
      'data:image/png;base64,abc'
    );
    expect(resolveProductImageUrl('blob:https://app.local/id', 'https://cdn.example.com')).toBe(
      'blob:https://app.local/id'
    );
    expect(resolveProductImageUrl('/uploads/image.png', 'https://cdn.example.com/assets')).toBe(
      'https://cdn.example.com/assets/uploads/image.png'
    );
    expect(resolveProductImageUrl('/uploads/image.png', 'http://localhost:3000')).toBe(
      '/uploads/image.png'
    );
    expect(
      resolveProductImageUrl(
        'http://127.0.0.1:3000/uploads/image.png?size=lg#preview',
        'https://cdn.example.com/assets'
      )
    ).toBe('https://cdn.example.com/assets/uploads/image.png?size=lg#preview');
    expect(resolveProductImageUrl('https://images.example.com/remote.png', 'https://cdn.example.com'))
      .toBe('https://images.example.com/remote.png');
  });

  it('normalizes relative paths and falls back safely when parsing absolute urls fails', () => {
    expect(resolveProductImageUrl('gallery/photo.jpg', 'https://cdn.example.com/root')).toBe(
      'https://cdn.example.com/root/gallery/photo.jpg'
    );
    expect(resolveProductImageUrl('gallery/photo.jpg', 'http://localhost:3000')).toBe(
      '/gallery/photo.jpg'
    );
    expect(resolveProductImageUrl('gallery/photo.jpg')).toBe('/gallery/photo.jpg');
    expect(resolveProductImageUrl('http:// bad host/image.png', 'https://cdn.example.com')).toBe(
      'http:// bad host/image.png'
    );
    expect(mocks.logClientCatch).toHaveBeenCalledTimes(1);
  });
});
