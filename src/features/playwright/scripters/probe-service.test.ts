import { describe, expect, it, vi } from 'vitest';

import { createProbeService } from './probe-service';
import type { ProbeSessionHandle } from './probe-session';

type FakeHandle = ProbeSessionHandle & {
  closed: boolean;
  page: { content: () => Promise<string>; title: () => Promise<string>; url: () => string; evaluate: (script: string) => Promise<unknown> };
};

const makeFakeHandle = (overrides: Partial<FakeHandle['page']> = {}): FakeHandle => {
  const handle: FakeHandle = {
    closed: false,
    async close() { handle.closed = true; },
    page: {
      async content() { return '<html><body><script>x()</script><div id="root"><a href="/x">y</a></div></body></html>'; },
      async title() { return 'Sample'; },
      url() { return 'https://shop.example/products'; },
      async evaluate() { return { matchCount: 0, preview: [], info: null }; },
      ...overrides,
    },
  };
  return handle;
};

describe('createProbeService', () => {
  it('starts a probe session and sanitizes the captured html', async () => {
    const handle = makeFakeHandle();
    const launchPage = vi.fn(async () => handle);
    const service = createProbeService({ launchPage: launchPage as never });
    const result = await service.start('https://shop.example/products');
    expect(launchPage).toHaveBeenCalledWith('https://shop.example/products', true);
    expect(result.sanitizedHtml).not.toMatch(/script/i);
    expect(result.sanitizedHtml).toContain('href="https://shop.example/x"');
    expect(result.title).toBe('Sample');
    expect(result.sessionId).toMatch(/[a-f0-9]+/);
  });

  it('rejects non-http(s) urls', async () => {
    const service = createProbeService({ launchPage: vi.fn() as never });
    await expect(service.start('javascript:alert(1)')).rejects.toThrow(/http\(s\)/);
    await expect(service.start('file:///etc/passwd')).rejects.toThrow(/http\(s\)/);
  });

  it('evaluates a selector against the live page and returns candidates', async () => {
    const evaluate = vi.fn(async () => ({
      matchCount: 3,
      preview: [
        { outerHTML: '<div class="card">A</div>', text: 'A', attrs: { class: 'card' } },
      ],
      info: {
        tagName: 'div',
        id: null,
        classNames: ['card'],
        attributes: { 'data-testid': 'product-card' },
        textContent: 'A',
        parentTagName: 'main',
        indexAmongSiblings: 0,
        siblingsOfSameTag: 3,
      },
    }));
    const handle = makeFakeHandle({ evaluate });
    const service = createProbeService({ launchPage: (async () => handle) as never });
    const start = await service.start('https://shop.example/products');
    const result = await service.evaluate(start.sessionId, ' .card ');
    expect(evaluate).toHaveBeenCalled();
    expect(result.matchCount).toBe(3);
    expect(result.selector).toBe('.card');
    expect(result.candidates[0]?.selector).toBe('[data-testid="product-card"]');
  });

  it('returns 404-equivalent error for unknown sessions', async () => {
    const service = createProbeService({ launchPage: (async () => makeFakeHandle()) as never });
    await expect(service.evaluate('missing', '.x')).rejects.toThrow(/not found/);
  });

  it('close removes the session and triggers handle.close', async () => {
    const handle = makeFakeHandle();
    const service = createProbeService({ launchPage: (async () => handle) as never });
    const start = await service.start('https://shop.example/products');
    expect(await service.close(start.sessionId)).toBe(true);
    expect(handle.closed).toBe(true);
  });
});
