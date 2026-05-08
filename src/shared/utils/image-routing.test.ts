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
  resolveProductImageFileUrl,
  resolveProductImageLocalFallbackUrl,
  resolveProductImageServingMode,
  resolveProductImageUrl,
} from '@/shared/utils/image-routing';

function registerBaseUrlNormalizationTests(): void {
  it('normalizes external base urls and logs invalid values defensively', () => {
    expect(normalizeProductImageExternalBaseUrl(' example.com/// ')).toBe('http://example.com');
    expect(normalizeProductImageExternalBaseUrl('https://cdn.example.com/base///')).toBe(
      'https://cdn.example.com/base'
    );
    expect(normalizeProductImageExternalBaseUrl('https://qubrick.io')).toBe(
      'https://sparksofsindri.com'
    );
    expect(normalizeProductImageExternalBaseUrl('')).toBe('');
    expect(normalizeProductImageExternalBaseUrl('http:// bad host///')).toBe('http:// bad host');
    expect(mocks.logClientCatch).toHaveBeenCalledTimes(1);
  });
}

function registerUrlResolutionTests(): void {
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
}

function registerFastCometUploadRouteTests(): void {
  it('canonicalizes FastComet upload urls to the selected serving route', () => {
    expect(
      resolveProductImageUrl(
        'https://qubrick.io/uploads/products/SKU_123/stored.png',
        'https://sparksofsindri.com'
      )
    ).toBe('https://sparksofsindri.com/uploads/products/SKU_123/stored.png');
    expect(
      resolveProductImageUrl(
        'https://sparksofsindri.com/public/uploads/products/SKU_123/stored.png',
        'https://sparksofsindri.com'
      )
    ).toBe('https://sparksofsindri.com/uploads/products/SKU_123/stored.png');
    expect(
      resolveProductImageUrl(
        'https://sparksofsindri.com/uploads/products/SKU_123/stored.png',
        'http://localhost:3000'
      )
    ).toBe('/uploads/products/SKU_123/stored.png');
    expect(
      resolveProductImageUrl(
        'https://sparksofsindri.com/public/uploads/products/SKU_123/stored.png',
        'http://localhost:3000'
      )
    ).toBe('/uploads/products/SKU_123/stored.png');
    expect(resolveProductImageServingMode('http://localhost:3000')).toBe('local');
    expect(resolveProductImageServingMode('https://sparksofsindri.com')).toBe('fastcomet');
  });

  it('keeps local fallback image files on the local upload route even when FastComet serving is selected', () => {
    expect(
      resolveProductImageFileUrl(
        {
          filepath: '/uploads/products/SKU_123/local-fallback.jpg',
          storageProvider: 'local',
        },
        'https://sparksofsindri.com'
      )
    ).toBe('/uploads/products/SKU_123/local-fallback.jpg');
    expect(
      resolveProductImageFileUrl(
        {
          filepath: '/uploads/products/SKU_123/local-fallback.jpg',
          metadata: { storageSource: 'local-fallback' },
        },
        'https://sparksofsindri.com'
      )
    ).toBe('/uploads/products/SKU_123/local-fallback.jpg');
  });

  it('derives local fallbacks for upload urls without rewriting unrelated remotes', () => {
    expect(
      resolveProductImageLocalFallbackUrl(
        'https://sparksofsindri.com/public/uploads/products/SKU_123/stored.png?size=lg#preview'
      )
    ).toBe('/uploads/products/SKU_123/stored.png?size=lg#preview');
    expect(resolveProductImageLocalFallbackUrl('/public/uploads/products/SKU_123/stored.png')).toBe(
      '/uploads/products/SKU_123/stored.png'
    );
    expect(resolveProductImageLocalFallbackUrl('public/uploads/products/SKU_123/stored.png')).toBe(
      '/uploads/products/SKU_123/stored.png'
    );
    expect(resolveProductImageLocalFallbackUrl('https://images.example.com/remote.png')).toBeNull();
    expect(resolveProductImageLocalFallbackUrl('data:image/png;base64,abc')).toBeNull();
  });
}

function registerRelativePathFallbackTests(): void {
  it('normalizes relative paths and falls back safely when parsing absolute urls fails', () => {
    expect(resolveProductImageUrl('gallery/photo.jpg', 'https://cdn.example.com/root')).toBe(
      'https://cdn.example.com/root/gallery/photo.jpg'
    );
    expect(resolveProductImageUrl('gallery/photo.jpg', 'http://localhost:3000')).toBe(
      '/gallery/photo.jpg'
    );
    expect(resolveProductImageUrl('gallery/photo.jpg')).toBe('/gallery/photo.jpg');
    expect(resolveProductImageUrl('/public/uploads/products/SKU_123/stored.png')).toBe(
      '/uploads/products/SKU_123/stored.png'
    );
    expect(resolveProductImageUrl('public/uploads/products/SKU_123/stored.png')).toBe(
      '/uploads/products/SKU_123/stored.png'
    );
    expect(resolveProductImageUrl('http:// bad host/image.png', 'https://cdn.example.com')).toBe(
      'http:// bad host/image.png'
    );
    expect(mocks.logClientCatch).toHaveBeenCalledTimes(1);
  });
}

describe('shared image-routing utils', () => {
  beforeEach(() => {
    mocks.logClientCatch.mockReset();
  });

  registerBaseUrlNormalizationTests();
  registerUrlResolutionTests();
  registerFastCometUploadRouteTests();
  registerRelativePathFallbackTests();
});
