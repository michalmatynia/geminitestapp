import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import {
  ApiVersionManager,
  createVersionedResponse,
  withApiVersioning,
} from '@/features/products/api/versioning';

describe('products api versioning', () => {
  it('wraps payloads without transforming product fields', async () => {
    const payload = {
      products: [{ id: 'product-1', sku: 'SKU-1', name_en: 'Desk Lamp' }],
      pagination: { page: 2, limit: 1, total: 4, hasNext: true },
    };

    const response = createVersionedResponse(payload, 'v2');
    const body = (await response.json()) as {
      version: string;
      data: typeof payload;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get('API-Version')).toBe('v2');
    expect(body).toEqual({
      version: 'v2',
      data: payload,
    });
  });

  it('extracts requested version from path and defaults to current version', () => {
    const pathReq = new NextRequest('http://localhost/api/v1/products');
    const defaultReq = new NextRequest('http://localhost/api/unversioned-route');

    expect(ApiVersionManager.extractVersion(pathReq)).toBe('v1');
    expect(ApiVersionManager.extractVersion(defaultReq)).toBe('v2');
  });

  it('rejects unsupported versions before handler execution', async () => {
    const handler = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
    const wrapped = withApiVersioning(handler);

    const response = await wrapped(new NextRequest('http://localhost/api/v1/products'));
    const body = (await response.json()) as {
      error: string;
      supportedVersions: string[];
      requestedVersion: string;
    };

    expect(response.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
    expect(body).toEqual({
      error: 'Unsupported API version',
      supportedVersions: ['v2'],
      requestedVersion: 'v1',
    });
  });

  it('passes supported versions through to the wrapped handler', async () => {
    const wrapped = withApiVersioning(async (_req, version) =>
      new Response(JSON.stringify({ version }), {
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const response = await wrapped(new NextRequest('http://localhost/api/v2/products'));
    const body = (await response.json()) as { version: string };

    expect(response.status).toBe(200);
    expect(body.version).toBe('v2');
  });
});
