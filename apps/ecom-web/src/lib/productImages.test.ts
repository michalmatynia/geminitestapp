/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getProductImageFallbackSrc,
  getProductImageSrc,
  getProductUploadPath,
  shouldBypassImageOptimization,
} from './productImages';

const originalFileBaseUrl = process.env.NEXT_PUBLIC_FILE_BASE_URL;
const originalFallbackFileBaseUrl = process.env.NEXT_PUBLIC_FILE_FALLBACK_BASE_URL;
const originalMainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL;

describe('ecom product image helpers', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_FILE_BASE_URL;
    delete process.env.NEXT_PUBLIC_FILE_FALLBACK_BASE_URL;
    delete process.env.NEXT_PUBLIC_MAIN_APP_URL;
  });

  afterEach(() => {
    if (originalFileBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_FILE_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_FILE_BASE_URL = originalFileBaseUrl;
    }

    if (originalFallbackFileBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_FILE_FALLBACK_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_FILE_FALLBACK_BASE_URL = originalFallbackFileBaseUrl;
    }

    if (originalMainAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_MAIN_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_MAIN_APP_URL = originalMainAppUrl;
    }
  });

  it('normalizes FastComet public upload paths to the configured file host', () => {
    expect(getProductImageSrc('/public/uploads/products/SKU_123/stored.png')).toBe(
      'https://sparksofsindri.com/uploads/products/SKU_123/stored.png'
    );
    expect(getProductImageSrc('public/uploads/products/SKU_123/stored.png')).toBe(
      'https://sparksofsindri.com/uploads/products/SKU_123/stored.png'
    );
    expect(getProductUploadPath('public/uploads/products/SKU_123/stored.png')).toBe(
      '/uploads/products/SKU_123/stored.png'
    );
    expect(
      getProductImageFallbackSrc(
        'https://sparksofsindri.com/public/uploads/products/SKU_123/stored.png'
      )
    ).toBe('http://localhost:3000/uploads/products/SKU_123/stored.png');
  });

  it('uses configured local upload fallback hosts for ecommerce development', () => {
    process.env.NEXT_PUBLIC_FILE_FALLBACK_BASE_URL = 'http://localhost:3000/';

    expect(
      getProductImageFallbackSrc(
        'https://sparksofsindri.com/public/uploads/products/SKU_123/stored.png'
      )
    ).toBe('http://localhost:3000/uploads/products/SKU_123/stored.png');

    delete process.env.NEXT_PUBLIC_FILE_FALLBACK_BASE_URL;
    process.env.NEXT_PUBLIC_MAIN_APP_URL = 'http://127.0.0.1:3000/';

    expect(getProductImageFallbackSrc('/uploads/products/SKU_123/stored.png')).toBe(
      'http://127.0.0.1:3000/uploads/products/SKU_123/stored.png'
    );
  });

  it('rewrites known file host upload URLs to the configured FastComet base URL', () => {
    process.env.NEXT_PUBLIC_FILE_BASE_URL = 'https://cdn.example.test/assets/';

    expect(
      getProductImageSrc(
        'https://qubrick.io/public/uploads/products/SKU_123/stored.png?size=lg#preview'
      )
    ).toBe('https://cdn.example.test/assets/uploads/products/SKU_123/stored.png?size=lg#preview');
    expect(
      getProductImageSrc('http://localhost:3000/public/uploads/products/SKU_123/stored.png')
    ).toBe('https://cdn.example.test/assets/uploads/products/SKU_123/stored.png');
    expect(
      getProductImageSrc('https://sparksofsindri.com/public/uploads/products/SKU_123/stored.png')
    ).toBe('https://cdn.example.test/assets/uploads/products/SKU_123/stored.png');
  });

  it('keeps product images on the configured Next Image path', () => {
    expect(shouldBypassImageOptimization('/public/uploads/products/SKU_123/stored.png')).toBe(false);
    expect(shouldBypassImageOptimization('https://sparksofsindri.com/remote/image.png')).toBe(false);
    expect(shouldBypassImageOptimization('https://images.example.com/remote/image.png')).toBe(false);
  });
});
