/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logClientCatchMock, logClientErrorMock } = vi.hoisted(() => ({
  logClientCatchMock: vi.fn(),
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: logClientCatchMock,
  logClientError: logClientErrorMock,
}));

describe('settings-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete (globalThis as typeof globalThis & { __LITE_SETTINGS__?: unknown }).__LITE_SETTINGS__;
  });

  it('hydrates lite settings from SSR without touching fetch during module evaluation', async () => {
    const ssrSettings = [{ key: 'observability.infoEnabled', value: 'true' }];
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    (
      globalThis as typeof globalThis & { __LITE_SETTINGS__?: typeof ssrSettings }
    ).__LITE_SETTINGS__ = ssrSettings;

    const { fetchLiteSettingsCached } = await import('./settings-client');

    await expect(fetchLiteSettingsCached()).resolves.toEqual(ssrSettings);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      (globalThis as typeof globalThis & { __LITE_SETTINGS__?: unknown }).__LITE_SETTINGS__
    ).toBeUndefined();
  });

  it('hydrates lite settings lazily when the SSR payload appears after module evaluation', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { fetchLiteSettingsCached } = await import('./settings-client');
    const ssrSettings = [{ key: 'observability.infoEnabled', value: 'true' }];

    (
      globalThis as typeof globalThis & { __LITE_SETTINGS__?: typeof ssrSettings }
    ).__LITE_SETTINGS__ = ssrSettings;

    await expect(fetchLiteSettingsCached()).resolves.toEqual(ssrSettings);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      (globalThis as typeof globalThis & { __LITE_SETTINGS__?: unknown }).__LITE_SETTINGS__
    ).toBeUndefined();
  });

  it('returns an empty lite settings list without logging when the user is unauthorized', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchLiteSettingsCached, invalidateSettingsCache } = await import('./settings-client');

    invalidateSettingsCache();

    await expect(fetchLiteSettingsCached({ bypassCache: true })).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledWith('/api/settings/lite?fresh=1', {
      cache: 'no-store',
      credentials: 'include',
    });
    expect(logClientErrorMock).not.toHaveBeenCalled();
    expect(logClientCatchMock).not.toHaveBeenCalled();
  });

  it('still logs unexpected lite settings failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchLiteSettingsCached, invalidateSettingsCache } = await import('./settings-client');

    invalidateSettingsCache();

    await expect(fetchLiteSettingsCached({ bypassCache: true })).resolves.toEqual([]);

    expect(logClientErrorMock).toHaveBeenCalledTimes(1);
    expect(logClientCatchMock).not.toHaveBeenCalled();
  });
});
