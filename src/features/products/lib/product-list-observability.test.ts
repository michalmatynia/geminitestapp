// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  logProductListDebug,
  resetProductListObservabilityStateForTests,
} from './product-list-observability';

describe('product-list-observability', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetProductListObservabilityStateForTests();
    document.cookie = '';
    window.history.replaceState({}, '', '/admin/products?productListDebug=1');
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    resetProductListObservabilityStateForTests();
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('ships debug events to the centralized system logs endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    global.fetch = fetchMock as typeof fetch;

    logProductListDebug('products-table-render', {
      visibleCount: 12,
    });
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/system/logs');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');

    const headers = init.headers instanceof Headers ? init.headers : new Headers(init.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('x-csrf-token')).toBeTruthy();
    expect(headers.get('X-Trace-Id')).toBeTruthy();

    const payload = JSON.parse(String(init.body)) as {
      level: string;
      message: string;
      source: string;
      service: string;
      category: string;
      path: string;
      context: Record<string, unknown>;
    };
    expect(payload).toMatchObject({
      level: 'info',
      message: '[ProductListDebug] products-table-render',
      source: 'products.product-list.debug',
      service: 'products.product-list',
      category: 'UI',
      path: '/admin/products',
    });
    expect(payload.context).toMatchObject({
      debugSurface: 'product-list',
      event: 'products-table-render',
      visibleCount: 12,
    });
  });

  it('dedupes repeated events inside the throttle window', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    global.fetch = fetchMock as typeof fetch;

    logProductListDebug('background-sync-event', { status: 'completed' }, { throttleMs: 2_000 });
    logProductListDebug('background-sync-event', { status: 'completed' }, { throttleMs: 2_000 });
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not ship events when product list debug mode is disabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    global.fetch = fetchMock as typeof fetch;
    window.history.replaceState({}, '', '/admin/products');

    logProductListDebug('background-sync-event', { status: 'completed' });
    await Promise.resolve();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
