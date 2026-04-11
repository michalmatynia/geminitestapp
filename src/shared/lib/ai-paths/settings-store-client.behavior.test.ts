// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPostMock,
  apiDeleteMock,
  logSystemEventMock,
  logClientCatchMock,
  logClientErrorMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiDeleteMock: vi.fn(),
  logSystemEventMock: vi.fn(),
  logClientCatchMock: vi.fn(),
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/api-client')>(
    '@/shared/lib/api-client'
  );

  return {
    ...actual,
    api: {
      get: (...args: unknown[]) => apiGetMock(...args),
      post: (...args: unknown[]) => apiPostMock(...args),
      delete: (...args: unknown[]) => apiDeleteMock(...args),
    },
  };
});

vi.mock('@/shared/lib/observability/system-logger-client', () => ({
  logSystemEvent: (...args: unknown[]) => logSystemEventMock(...args),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: (...args: unknown[]) => logClientCatchMock(...args),
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
}));

import { ApiError } from '@/shared/lib/api-client';
import {
  AI_PATHS_MAINTENANCE_ACTION_IDS,
  applyAiPathsMaintenanceActions,
  deleteAiPathsSettings,
  fetchAiPathsMaintenanceReport,
  fetchAiPathsSettingsByKeysCached,
  fetchAiPathsSettingsCached,
  invalidateAiPathsSettingsCache,
  updateAiPathsSetting,
  updateAiPathsSettingsBulk,
} from '@/shared/lib/ai-paths/settings-store-client';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('ai-paths settings-store client behavior', () => {
  beforeEach(() => {
    invalidateAiPathsSettingsCache();
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('dedupes inflight full fetches and reuses the fresh full cache', async () => {
    let resolveFetch: ((response: Response) => void) | null = null;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockReturnValue(fetchPromise as Promise<Response>);

    const firstRequest = fetchAiPathsSettingsCached();
    const secondRequest = fetchAiPathsSettingsCached();

    resolveFetch?.(
      jsonResponse([
        {
          key: 'ai_paths_index',
          value: '{"pathIds":["path_1"]}',
        },
      ])
    );

    const firstResult = await firstRequest;
    const secondResult = await secondRequest;

    expect(firstResult).toEqual(secondResult);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fetchSpy.mockClear();

    await expect(fetchAiPathsSettingsCached()).resolves.toEqual(firstResult);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('normalizes selective keys, orders records, and reuses the selective cache', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse([
        { key: 'ai_paths_beta', value: '2' },
        { key: 'ai_paths_alpha', value: '1' },
      ])
    );

    const records = await fetchAiPathsSettingsByKeysCached([
      ' ai_paths_beta ',
      'ai_paths_alpha',
      'ai_paths_beta',
      'not_ai_paths_key',
    ]);

    expect(records).toEqual([
      { key: 'ai_paths_alpha', value: '1' },
      { key: 'ai_paths_beta', value: '2' },
    ]);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/ai-paths/settings?keys=ai_paths_alpha&keys=ai_paths_beta',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
      })
    );

    fetchSpy.mockClear();

    await expect(
      fetchAiPathsSettingsByKeysCached(['ai_paths_beta', 'ai_paths_alpha'])
    ).resolves.toEqual(records);
    await expect(fetchAiPathsSettingsByKeysCached(['invalid-key', ' '])).resolves.toEqual([]);
    await expect(
      fetchAiPathsSettingsByKeysCached(
        Array.from({ length: 501 }, (_, index) => `ai_paths_key_${index}`)
      )
    ).rejects.toThrow('Too many AI Paths keys requested');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('serves selective key requests from the fresh full cache without refetching', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse([
        { key: 'ai_paths_alpha', value: '1' },
        { key: 'ai_paths_beta', value: '2' },
        { key: 'ai_paths_gamma', value: '3' },
      ])
    );

    await expect(fetchAiPathsSettingsCached()).resolves.toEqual([
      { key: 'ai_paths_alpha', value: '1' },
      { key: 'ai_paths_beta', value: '2' },
      { key: 'ai_paths_gamma', value: '3' },
    ]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fetchSpy.mockClear();

    await expect(fetchAiPathsSettingsByKeysCached(['ai_paths_gamma', 'ai_paths_alpha'])).resolves.toEqual([
      { key: 'ai_paths_alpha', value: '1' },
      { key: 'ai_paths_gamma', value: '3' },
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reuses an inflight full settings request for selective key loads', async () => {
    let resolveFetch: ((response: Response) => void) | null = null;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockReturnValue(fetchPromise as Promise<Response>);

    const fullRequest = fetchAiPathsSettingsCached();
    const selectiveRequest = fetchAiPathsSettingsByKeysCached(['ai_paths_beta']);

    resolveFetch?.(
      jsonResponse([
        { key: 'ai_paths_alpha', value: '1' },
        { key: 'ai_paths_beta', value: '2' },
      ])
    );

    await expect(fullRequest).resolves.toEqual([
      { key: 'ai_paths_alpha', value: '1' },
      { key: 'ai_paths_beta', value: '2' },
    ]);
    await expect(selectiveRequest).resolves.toEqual([{ key: 'ai_paths_beta', value: '2' }]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to the full cache subset when selective fetch fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValueOnce(
      jsonResponse([
        { key: 'ai_paths_alpha', value: '1' },
        { key: 'ai_paths_beta', value: '2' },
      ])
    );

    await fetchAiPathsSettingsCached();

    fetchSpy.mockResolvedValueOnce(new Response('', { status: 400 }));

    await expect(
      fetchAiPathsSettingsByKeysCached(['ai_paths_beta'], { bypassCache: true })
    ).resolves.toEqual([{ key: 'ai_paths_beta', value: '2' }]);
    expect(logClientErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          action: 'fetchByKeysCached',
          message: 'Selective GET failed; using full cache subset.',
        }),
      })
    );
  });

  it('filters invalid bulk-update items and falls back to the request payload when parsing fails', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    apiPostMock.mockResolvedValue([{ key: 123, value: null }]);

    const result = await updateAiPathsSettingsBulk([
      { key: 'ai_paths_alpha', value: '1' },
      { key: 'invalid', value: '2' },
      null,
    ] as any);

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/ai-paths/settings',
      { items: [{ key: 'ai_paths_alpha', value: '1' }] },
      { timeout: 90_000 }
    );
    expect(result).toEqual([{ key: 'ai_paths_alpha', value: '1' }]);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { scope: 'ai-paths' },
        type: 'ai-paths:settings:updated',
      })
    );
  });

  it('wraps ApiError failures when updating a single setting and falls back to the input on invalid responses', async () => {
    apiPostMock.mockRejectedValueOnce(new ApiError('Forbidden', 403));

    await expect(updateAiPathsSetting('ai_paths_alpha', '1')).rejects.toThrow(
      'Failed to update AI Paths setting (403)'
    );
    expect(logClientCatchMock).toHaveBeenCalledWith(
      expect.any(ApiError),
      expect.objectContaining({
        action: 'updateSetting',
        key: 'ai_paths_alpha',
      })
    );

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    apiPostMock.mockResolvedValueOnce({ invalid: true });

    await expect(updateAiPathsSetting('ai_paths_alpha', '2')).resolves.toEqual({
      key: 'ai_paths_alpha',
      value: '2',
    });
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('normalizes delete keys and returns zero when the response shape is missing a deletedCount', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    apiDeleteMock.mockResolvedValue({ deletedCount: 'nope' });

    await expect(
      deleteAiPathsSettings(['ai_paths_alpha', 'ai_paths_alpha', 'invalid'])
    ).resolves.toBe(0);
    expect(apiDeleteMock).toHaveBeenCalledWith('/api/ai-paths/settings', {
      body: JSON.stringify({ keys: ['ai_paths_alpha'] }),
    });
    expect(dispatchSpy).toHaveBeenCalled();

    apiDeleteMock.mockClear();
    await expect(deleteAiPathsSettings(['invalid'])).resolves.toBe(0);
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });

  it('loads and applies maintenance actions through the API client', async () => {
    const report = {
      scannedAt: '2026-03-27T07:00:00.000Z',
      pendingActions: 1,
      blockingActions: 0,
      actions: [
        {
          id: AI_PATHS_MAINTENANCE_ACTION_IDS[0],
          title: 'Compact oversized configs',
          description: 'Shrink stored node configs.',
          blocking: false,
          status: 'ready',
          affectedRecords: 3,
        },
      ],
    } as const;
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    apiGetMock.mockResolvedValue(report);
    await expect(fetchAiPathsMaintenanceReport()).resolves.toEqual(report);

    apiPostMock.mockResolvedValue({
      appliedActionIds: [AI_PATHS_MAINTENANCE_ACTION_IDS[0]],
      report,
    });

    await expect(
      applyAiPathsMaintenanceActions([
        AI_PATHS_MAINTENANCE_ACTION_IDS[0],
        AI_PATHS_MAINTENANCE_ACTION_IDS[0],
      ])
    ).resolves.toEqual({
      appliedActionIds: [AI_PATHS_MAINTENANCE_ACTION_IDS[0]],
      report,
    });
    expect(apiPostMock).toHaveBeenLastCalledWith('/api/ai-paths/settings/maintenance', {
      actionIds: [AI_PATHS_MAINTENANCE_ACTION_IDS[0]],
    });
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('logs slow settings fetches after the response resolves', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse([
        { key: 'ai_paths_alpha', value: '1' },
        { key: 'ai_paths_beta', value: '2' },
      ])
    );
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(300);

    await fetchAiPathsSettingsCached({ bypassCache: true });

    expect(logSystemEventMock).toHaveBeenCalledTimes(1);
    const event = logSystemEventMock.mock.calls[0]?.[0];
    expect(event).toMatchObject({
      source: 'ai-paths-settings-client',
      message: 'Fetched full settings payload',
      context: expect.objectContaining({
        recordCount: 2,
      }),
    });
    expect(event?.context?.durationMs).toBeGreaterThanOrEqual(250);
  });
});
