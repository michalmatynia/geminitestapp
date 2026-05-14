/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { GET } from './route';

function makeRequest(path: string | null): NextRequest {
  const url = new URL('http://localhost/api/product-images/fallback');
  if (path !== null) url.searchParams.set('path', path);
  return new Request(url) as NextRequest;
}

describe('GET /api/product-images/fallback', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubEnv('NODE_ENV', 'development');
  });

  it('rejects non-upload paths', async () => {
    const response = await GET(makeRequest('/private/secrets.png'));

    expect(response.status).toBe(400);
  });

  it('proxies local upload fallback images through the ecommerce origin', async () => {
    const fetchMock = vi.fn(async () => new Response('image-bytes', {
      headers: {
        'Content-Length': '11',
        'Content-Type': 'image/png',
      },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(makeRequest('/uploads/products/SKU_123/stored.png'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
    expect(await response.text()).toBe('image-bytes');
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:3000/uploads/products/SKU_123/stored.png'),
      { cache: 'no-store' },
    );
  });

  it('rejects non-image upstream responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not image', {
      headers: { 'Content-Type': 'text/html' },
    })));

    const response = await GET(makeRequest('/uploads/products/SKU_123/stored.html'));

    expect(response.status).toBe(502);
  });
});
