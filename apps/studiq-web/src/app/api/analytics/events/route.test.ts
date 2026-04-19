import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

describe('apps/studiq-web analytics events route bridge', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('re-exports the root analytics events handlers', async () => {
    vi.doMock('@/app/api/analytics/events/route', () => ({
      GET: getMock,
      POST: postMock,
    }));

    const route = await import('./route');

    expect(route.GET).toBe(getMock);
    expect(route.POST).toBe(postMock);
  });
});
