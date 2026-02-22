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

  it('returns empty result when lite endpoint returns 404', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(buildResponse({ ok: true }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    global.fetch = fetchMock;

    const { fetchLiteSettingsCached } = await import('@/shared/api/settings-client');
    const result = await fetchLiteSettingsCached();

    expect(result).toEqual([]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/settings/lite',
      expect.objectContaining({
        cache: 'default',
        credentials: 'include',
      })
    );
  });

  it('reuses lite cache when refresh fails', async () => {
    const settingsPayload = [{ key: 'theme', value: 'dark' }];
    const fetchMock = vi
      .fn()
      .mockResolvedValue(buildResponse({ ok: true }))
      .mockResolvedValueOnce(buildResponse(settingsPayload))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    global.fetch = fetchMock;

    const { fetchLiteSettingsCached } = await import('@/shared/api/settings-client');
    const first = await fetchLiteSettingsCached({ bypassCache: true });
    const second = await fetchLiteSettingsCached({ bypassCache: true });

    expect(first).toEqual(settingsPayload);
    expect(second).toEqual(settingsPayload);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/settings/lite?fresh=1',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/settings/lite?fresh=1',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
      })
    );
  });
});
