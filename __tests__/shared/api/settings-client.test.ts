import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const buildResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('settings-client cache guards', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('uses no-store for heavy settings fetches', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse([]));
    global.fetch = fetchMock;

    const { fetchSettingsCached } = await import('@/shared/api/settings-client');
    await fetchSettingsCached({ scope: 'heavy' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/settings?scope=heavy',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
      })
    );
  });

  it('uses default cache mode for light settings fetches', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse([]));
    global.fetch = fetchMock;

    const { fetchSettingsCached } = await import('@/shared/api/settings-client');
    await fetchSettingsCached({ scope: 'light' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/settings?scope=light',
      expect.objectContaining({
        cache: 'default',
        credentials: 'include',
      })
    );
  });

  it('forces no-store when bypassCache is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse([]));
    global.fetch = fetchMock;

    const { fetchSettingsCached } = await import('@/shared/api/settings-client');
    await fetchSettingsCached({ scope: 'light', bypassCache: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/settings?scope=light',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
      })
    );
  });
});

