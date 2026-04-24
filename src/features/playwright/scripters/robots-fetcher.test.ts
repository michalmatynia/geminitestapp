import { describe, expect, it, vi } from 'vitest';

import { createRobotsFetcher } from './robots-fetcher';

const mockFetch = (responses: Record<string, { status: number; body?: string }>): typeof fetch =>
  (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const response = responses[url];
    if (!response) {
      return new Response('not found', { status: 404 });
    }
    return new Response(response.body ?? '', { status: response.status });
  }) as unknown as typeof fetch;

describe('createRobotsFetcher', () => {
  it('treats missing robots.txt as allowed', async () => {
    const fetcher = createRobotsFetcher({ fetchImpl: mockFetch({}) });
    const result = await fetcher.check('https://shop.example/anything');
    expect(result.allowed).toBe(true);
    expect(result.source).toBe('missing');
  });

  it('disallows paths blocked by robots.txt', async () => {
    const fetcher = createRobotsFetcher({
      fetchImpl: mockFetch({
        'https://shop.example/robots.txt': {
          status: 200,
          body: 'User-agent: *\nDisallow: /admin/\n',
        },
      }),
    });
    const blocked = await fetcher.check('https://shop.example/admin/secret');
    expect(blocked.allowed).toBe(false);
    expect(blocked.source).toBe('fetched');
    const allowed = await fetcher.check('https://shop.example/products');
    expect(allowed.allowed).toBe(true);
  });

  it('caches per host within ttl and reports cached source', async () => {
    const calls = vi.fn(async () =>
      new Response('User-agent: *\nDisallow:\n', { status: 200 })
    );
    let currentTime = 0;
    const fetcher = createRobotsFetcher({
      fetchImpl: calls as unknown as typeof fetch,
      now: () => currentTime,
      ttlMs: 1_000,
    });
    const first = await fetcher.check('https://shop.example/a');
    expect(first.source).toBe('fetched');
    const second = await fetcher.check('https://shop.example/b');
    expect(second.source).toBe('cached');
    currentTime = 5_000;
    const third = await fetcher.check('https://shop.example/c');
    expect(third.source).toBe('fetched');
    expect(calls).toHaveBeenCalledTimes(2);
  });

  it('treats fetch errors as "fetch-failed" but defaults to allowed', async () => {
    const fetcher = createRobotsFetcher({
      fetchImpl: (() => {
        throw new Error('network down');
      }) as unknown as typeof fetch,
    });
    const result = await fetcher.check('https://shop.example/x');
    expect(result.allowed).toBe(true);
    expect(result.source).toBe('fetch-failed');
    expect(result.reason).toMatch(/network down/);
  });
});
