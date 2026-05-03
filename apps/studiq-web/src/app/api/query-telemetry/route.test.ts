import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

describe('apps/studiq-web query telemetry route bridge', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('re-exports the root query telemetry handler', async () => {
    vi.doMock('@/app/api/query-telemetry/route', () => ({
      POST: postMock,
    }));

    const route = await import('./route');

    expect(route.POST).toBe(postMock);
  });
});
