import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiHandlerMock } = vi.hoisted(() => ({
  apiHandlerMock: vi.fn((_handler, options) => options),
}));

const loadRoute = async () => {
  vi.resetModules();
  vi.doMock('@/shared/lib/api/api-handler', () => ({
    apiHandler: apiHandlerMock,
  }));

  return import('./route');
};

describe('analytics events route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the write rate-limit bucket for event ingestion', async () => {
    await loadRoute();

    expect(apiHandlerMock).toHaveBeenCalledTimes(2);
    expect(apiHandlerMock.mock.calls[0]?.[1]).toMatchObject({
      source: 'analytics.events.POST',
      requireCsrf: false,
      rateLimitKey: 'write',
    });
  });
});
