/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/lib/api-client';
import { KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY } from '@/features/kangur/appearance/storefront-appearance-settings';

import { emptyAddonForm } from '../AdminKangurSocialPage.Constants';

const {
  toastMock,
  createAddonMutateAsyncMock,
  batchCaptureMutateAsyncMock,
  startBatchCaptureMutateAsyncMock,
  useBatchCaptureJobsQueryMock,
  fetchBatchCaptureJobMock,
  logKangurClientErrorMock,
  trackKangurClientEventMock,
  captureExceptionMock,
  settingsStoreGetMock,
  storefrontAppearanceModeRef,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  createAddonMutateAsyncMock: vi.fn(),
  batchCaptureMutateAsyncMock: vi.fn(),
  startBatchCaptureMutateAsyncMock: vi.fn(),
  useBatchCaptureJobsQueryMock: vi.fn(),
  fetchBatchCaptureJobMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  settingsStoreGetMock: vi.fn<(key: string) => string | undefined>(),
  storefrontAppearanceModeRef: { current: null as string | null },
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/features/cms/public', () => ({
  useOptionalCmsStorefrontAppearance: () =>
    storefrontAppearanceModeRef.current
      ? { mode: storefrontAppearanceModeRef.current, setMode: vi.fn() }
      : null,
}));

vi.mock('@/features/kangur/social/hooks/useKangurSocialImageAddons', () => ({
  useCreateKangurSocialImageAddon: () => ({
    mutateAsync: createAddonMutateAsyncMock,
  }),
  useBatchCaptureKangurSocialImageAddons: () => ({
    mutateAsync: batchCaptureMutateAsyncMock,
  }),
  useStartBatchCaptureKangurSocialImageAddons: () => ({
    mutateAsync: startBatchCaptureMutateAsyncMock,
  }),
  useKangurSocialImageAddonsBatchJobs: (...args: unknown[]) =>
    useBatchCaptureJobsQueryMock(...args),
  fetchKangurSocialImageAddonsBatchJob: (...args: unknown[]) => fetchBatchCaptureJobMock(...args),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: settingsStoreGetMock,
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: (...args: unknown[]) => logKangurClientErrorMock(...args),
  trackKangurClientEvent: (...args: unknown[]) => trackKangurClientEventMock(...args),
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system-client', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

import { useSocialImageAddons } from './useSocialImageAddons';

describe('useSocialImageAddons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    createAddonMutateAsyncMock.mockResolvedValue({ id: 'addon-1' });
    batchCaptureMutateAsyncMock.mockResolvedValue({
      addons: [{ id: 'addon-1', title: 'Addon 1' }],
      failures: [],
      usedPresetCount: 1,
    });
    startBatchCaptureMutateAsyncMock.mockResolvedValue({
      id: 'job-1',
      runId: 'run-1',
      status: 'queued',
      progress: {
        processedCount: 0,
        completedCount: 0,
        failureCount: 0,
        remainingCount: 1,
        totalCount: 1,
        message: 'Queued Playwright capture...',
      },
      result: null,
      error: null,
      createdAt: '2026-03-29T10:00:00.000Z',
      updatedAt: '2026-03-29T10:00:00.000Z',
    });
    useBatchCaptureJobsQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    });
    fetchBatchCaptureJobMock.mockResolvedValue(null);
    settingsStoreGetMock.mockReturnValue('default');
    storefrontAppearanceModeRef.current = null;
  });

  it('creates an add-on with the persisted storefront appearance mode and resets the form on success', async () => {
    window.localStorage.setItem(KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY, 'dark');
    const setAddonForm = vi.fn();
    const { result } = renderHook(() =>
      useSocialImageAddons({
        addonForm: {
          title: ' Hero screenshot ',
          sourceUrl: ' https://example.com/page ',
          selector: ' main ',
          description: ' Landing page ',
          waitForMs: '250',
        },
        setAddonForm,
        batchCaptureBaseUrl: 'https://example.com',
        batchCapturePresetIds: ['preset-1'],
        batchCapturePresetLimit: 1,
        buildSocialContext: (overrides?: Record<string, unknown>) => ({
          postId: 'post-1',
          ...overrides,
        }),
      })
    );

    await act(async () => {
      await result.current.handleCreateAddon();
    });

    expect(result.current.captureAppearanceMode).toBe('dark');
    expect(createAddonMutateAsyncMock).toHaveBeenCalledWith({
      title: 'Hero screenshot',
      sourceUrl: 'https://example.com/page',
      description: 'Landing page',
      selector: 'main',
      appearanceMode: 'dark',
      waitForMs: 250,
    });
    expect(setAddonForm).toHaveBeenCalledWith(emptyAddonForm);
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_social_addon_capture_success',
      { postId: 'post-1', addonId: 'addon-1' }
    );
  });

  it('rejects batch capture when the base URL is missing', async () => {
    const { result } = renderHook(() =>
      useSocialImageAddons({
        addonForm: emptyAddonForm,
        setAddonForm: vi.fn(),
        batchCaptureBaseUrl: '   ',
        batchCapturePresetIds: ['preset-1'],
        batchCapturePresetLimit: null,
        buildSocialContext: () => ({ postId: 'post-1' }),
      })
    );

    await expect(result.current.runBatchCapture()).rejects.toThrow(
      'Base URL is required for batch capture'
    );
    expect(toastMock).toHaveBeenCalledWith('Base URL is required for batch capture', {
      variant: 'error',
    });
    expect(batchCaptureMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('stores the batch capture result and shows a success toast', async () => {
    const { result } = renderHook(() =>
      useSocialImageAddons({
        addonForm: emptyAddonForm,
        setAddonForm: vi.fn(),
        batchCaptureBaseUrl: 'https://example.com',
        batchCapturePresetIds: ['preset-1'],
        batchCapturePresetLimit: 2,
        buildSocialContext: (overrides?: Record<string, unknown>) => ({
          postId: 'post-1',
          ...overrides,
        }),
      })
    );

    let batchResult:
      | Awaited<ReturnType<typeof result.current.runBatchCapture>>
      | undefined;
    await act(async () => {
      batchResult = await result.current.runBatchCapture();
    });

    expect(result.current.captureAppearanceMode).toBe('default');
    expect(batchResult).toEqual({
      addons: [{ id: 'addon-1', title: 'Addon 1' }],
      failures: [],
      usedPresetCount: 1,
    });
    expect(batchCaptureMutateAsyncMock).toHaveBeenCalledWith({
      baseUrl: 'https://example.com',
      presetIds: ['preset-1'],
      presetLimit: 2,
      appearanceMode: 'default',
    });
    expect(result.current.batchCaptureResult).toEqual(batchResult);
    expect(toastMock).toHaveBeenCalledWith('Batch capture completed (1 add-on, 0 failures)', {
      variant: 'success',
    });
  });

  it('forwards programmable Playwright capture options to the batch API', async () => {
    const { result } = renderHook(() =>
      useSocialImageAddons({
        addonForm: emptyAddonForm,
        setAddonForm: vi.fn(),
        batchCaptureBaseUrl: 'https://example.com',
        batchCapturePresetIds: ['preset-1'],
        batchCapturePresetLimit: 2,
        buildSocialContext: (overrides?: Record<string, unknown>) => ({
          postId: 'post-1',
          ...overrides,
        }),
      })
    );

    await act(async () => {
      await result.current.runBatchCapture({
        baseUrl: 'https://preview.example.com',
        presetIds: [],
        presetLimit: null,
        playwrightPersonaId: 'persona-1',
        playwrightScript: 'return input.captures;',
        playwrightRoutes: [
          {
            id: 'route-1',
            title: 'Pricing',
            path: '/pricing',
            description: '',
            selector: '',
            waitForMs: 0,
            waitForSelectorMs: 10000,
          },
        ],
      });
    });

    expect(batchCaptureMutateAsyncMock).toHaveBeenCalledWith({
      baseUrl: 'https://preview.example.com',
      presetIds: [],
      presetLimit: null,
      appearanceMode: 'default',
      playwrightPersonaId: 'persona-1',
      playwrightScript: 'return input.captures;',
      playwrightRoutes: [
        {
          id: 'route-1',
          title: 'Pricing',
          path: '/pricing',
          description: '',
          selector: '',
          waitForMs: 0,
          waitForSelectorMs: 10000,
        },
      ],
    });
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_social_batch_capture_attempt',
      expect.objectContaining({
        programmableRouteCount: 1,
        playwrightPersonaId: 'persona-1',
        isProgrammableCapture: true,
      })
    );
  });

  it('surfaces the batch capture mutation error message', async () => {
    batchCaptureMutateAsyncMock.mockRejectedValueOnce(
      new ApiError('Playwright batch capture timed out.', 500)
    );

    const { result } = renderHook(() =>
      useSocialImageAddons({
        addonForm: emptyAddonForm,
        setAddonForm: vi.fn(),
        batchCaptureBaseUrl: 'https://example.com',
        batchCapturePresetIds: ['preset-1'],
        batchCapturePresetLimit: 2,
        buildSocialContext: (overrides?: Record<string, unknown>) => ({
          postId: 'post-1',
          ...overrides,
        }),
      })
    );

    await expect(result.current.runBatchCapture()).rejects.toThrow(
      'Playwright batch capture timed out.'
    );

    expect(toastMock).toHaveBeenCalledWith('Playwright batch capture timed out.', {
      variant: 'error',
    });
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_social_batch_capture_failed',
      expect.objectContaining({
        postId: 'post-1',
        error: true,
        errorMessage: 'Playwright batch capture timed out.',
      })
    );
  });

  it('starts async batch capture jobs with the same programmable payload shape', async () => {
    const { result } = renderHook(() =>
      useSocialImageAddons({
        addonForm: emptyAddonForm,
        setAddonForm: vi.fn(),
        batchCaptureBaseUrl: 'https://example.com',
        batchCapturePresetIds: ['preset-1'],
        batchCapturePresetLimit: 2,
        buildSocialContext: (overrides?: Record<string, unknown>) => ({
          postId: 'post-1',
          ...overrides,
        }),
      })
    );

    let queuedJob:
      | Awaited<ReturnType<typeof result.current.startBatchCapture>>
      | undefined;
    await act(async () => {
      queuedJob = await result.current.startBatchCapture({
        baseUrl: 'https://preview.example.com',
        presetIds: [],
        presetLimit: null,
        playwrightPersonaId: 'persona-1',
        playwrightScript: 'return input.captures;',
        playwrightRoutes: [
          {
            id: 'route-1',
            title: 'Pricing',
            path: '/pricing',
            description: '',
            selector: '',
            waitForMs: 0,
            waitForSelectorMs: 10000,
          },
        ],
      });
    });

    expect(queuedJob).toEqual(
      expect.objectContaining({
        id: 'job-1',
        status: 'queued',
      })
    );
    expect(startBatchCaptureMutateAsyncMock).toHaveBeenCalledWith({
      baseUrl: 'https://preview.example.com',
      presetIds: [],
      presetLimit: null,
      appearanceMode: 'default',
      playwrightPersonaId: 'persona-1',
      playwrightScript: 'return input.captures;',
      playwrightRoutes: [
        {
          id: 'route-1',
          title: 'Pricing',
          path: '/pricing',
          description: '',
          selector: '',
          waitForMs: 0,
          waitForSelectorMs: 10000,
        },
      ],
    });
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_social_batch_capture_attempt',
      expect.objectContaining({
        programmableRouteCount: 1,
        playwrightPersonaId: 'persona-1',
        isProgrammableCapture: true,
        async: true,
      })
    );
  });

  it('rejects programmable capture when routes resolve to duplicate targets', async () => {
    const { result } = renderHook(() =>
      useSocialImageAddons({
        addonForm: emptyAddonForm,
        setAddonForm: vi.fn(),
        batchCaptureBaseUrl: 'https://example.com',
        batchCapturePresetIds: [],
        batchCapturePresetLimit: null,
        buildSocialContext: () => ({ postId: 'post-1' }),
      })
    );

    await expect(
      result.current.startBatchCapture({
        baseUrl: 'https://example.com',
        presetIds: [],
        presetLimit: null,
        playwrightScript: 'return input.captures;',
        playwrightRoutes: [
          {
            id: 'route-1',
            title: 'Pricing',
            path: '/pricing',
            description: '',
            selector: '[data-pricing]',
            waitForMs: 0,
            waitForSelectorMs: 10000,
          },
          {
            id: 'route-2',
            title: 'Duplicate pricing',
            path: 'https://example.com/pricing',
            description: '',
            selector: '[data-pricing]',
            waitForMs: 250,
            waitForSelectorMs: 10000,
          },
        ],
      })
    ).rejects.toThrow('This route duplicates Pricing on the same resolved target.');

    expect(toastMock).toHaveBeenCalledWith(
      'This route duplicates Pricing on the same resolved target.',
      {
        variant: 'warning',
      }
    );
    expect(startBatchCaptureMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('allows absolute programmable routes without a base URL', async () => {
    const { result } = renderHook(() =>
      useSocialImageAddons({
        addonForm: emptyAddonForm,
        setAddonForm: vi.fn(),
        batchCaptureBaseUrl: '   ',
        batchCapturePresetIds: [],
        batchCapturePresetLimit: null,
        buildSocialContext: (overrides?: Record<string, unknown>) => ({
          postId: 'post-1',
          ...overrides,
        }),
      })
    );

    await act(async () => {
      await result.current.startBatchCapture({
        baseUrl: '   ',
        presetIds: [],
        presetLimit: null,
        playwrightPersonaId: 'persona-1',
        playwrightScript: 'return input.captures;',
        playwrightRoutes: [
          {
            id: 'route-1',
            title: 'Pricing',
            path: 'https://example.com/pricing',
            description: '',
            selector: '',
            waitForMs: 0,
            waitForSelectorMs: 10000,
          },
        ],
      });
    });

    expect(startBatchCaptureMutateAsyncMock).toHaveBeenCalledWith({
      presetIds: [],
      presetLimit: null,
      appearanceMode: 'default',
      playwrightPersonaId: 'persona-1',
      playwrightScript: 'return input.captures;',
      playwrightRoutes: [
        {
          id: 'route-1',
          title: 'Pricing',
          path: 'https://example.com/pricing',
          description: '',
          selector: '',
          waitForMs: 0,
          waitForSelectorMs: 10000,
        },
      ],
    });
  });

  it('polls async batch capture jobs for the settings capture flow and stores the live result', async () => {
    fetchBatchCaptureJobMock.mockResolvedValueOnce({
      id: 'job-1',
      runId: 'run-1',
      status: 'completed',
      progress: {
        processedCount: 3,
        completedCount: 2,
        failureCount: 1,
        remainingCount: 0,
        totalCount: 3,
        message: 'Playwright capture completed.',
      },
      result: {
        addons: [
          { id: 'addon-1', title: 'Addon 1' },
          { id: 'addon-2', title: 'Addon 2' },
        ],
        failures: [{ id: 'preset-3', reason: 'Timeout' }],
        usedPresetCount: 3,
        runId: 'run-1',
      },
      error: null,
      createdAt: '2026-03-29T10:00:00.000Z',
      updatedAt: '2026-03-29T10:00:05.000Z',
    });

    const { result } = renderHook(() =>
      useSocialImageAddons({
        addonForm: emptyAddonForm,
        setAddonForm: vi.fn(),
        batchCaptureBaseUrl: 'https://example.com',
        batchCapturePresetIds: ['preset-1', 'preset-2', 'preset-3'],
        batchCapturePresetLimit: 3,
        buildSocialContext: (overrides?: Record<string, unknown>) => ({
          postId: 'post-1',
          ...overrides,
        }),
      })
    );

    await act(async () => {
      await result.current.handleBatchCapture();
    });

    expect(startBatchCaptureMutateAsyncMock).toHaveBeenCalledWith({
      baseUrl: 'https://example.com',
      presetIds: ['preset-1', 'preset-2', 'preset-3'],
      presetLimit: 3,
      appearanceMode: 'default',
    });
    expect(fetchBatchCaptureJobMock).toHaveBeenCalledWith('job-1');
    expect(result.current.batchCapturePending).toBe(false);
    expect(result.current.batchCaptureJob).toEqual(
      expect.objectContaining({
        id: 'job-1',
        status: 'completed',
      })
    );
    expect(result.current.batchCaptureResult).toEqual({
      addons: [
        { id: 'addon-1', title: 'Addon 1' },
        { id: 'addon-2', title: 'Addon 2' },
      ],
      failures: [{ id: 'preset-3', reason: 'Timeout' }],
      usedPresetCount: 3,
      runId: 'run-1',
    });
    expect(result.current.batchCaptureMessage).toBe(
      'Captured 2 add-ons from the current batch. Failed: preset-3: Timeout.'
    );
    expect(result.current.batchCaptureErrorMessage).toBeNull();
  });

  it('retries only failed presets from a stored capture run', async () => {
    const refetchMock = vi.fn();
    useBatchCaptureJobsQueryMock.mockReturnValue({
      data: [
        {
          id: 'job-history-1',
          runId: 'run-history-1',
          status: 'completed',
          request: {
            baseUrl: 'https://retry.example.com',
            presetIds: ['game', 'lessons'],
            presetLimit: null,
            appearanceMode: 'default',
            playwrightPersonaId: null,
            playwrightScript: null,
            playwrightRoutes: [],
          },
          progress: {
            processedCount: 2,
            completedCount: 1,
            failureCount: 1,
            remainingCount: 0,
            totalCount: 2,
          },
          result: {
            addons: [{ id: 'addon-1', title: 'Addon 1' }],
            failures: [{ id: 'lessons', reason: 'Timeout' }],
            usedPresetCount: 2,
            usedPresetIds: ['game', 'lessons'],
            runId: 'run-history-1',
          },
          error: null,
          createdAt: '2026-03-29T10:00:00.000Z',
          updatedAt: '2026-03-29T10:00:01.000Z',
        },
      ],
      isLoading: false,
      refetch: refetchMock,
    });
    fetchBatchCaptureJobMock.mockResolvedValueOnce({
      id: 'job-1',
      runId: 'run-1',
      status: 'completed',
      progress: {
        processedCount: 1,
        completedCount: 1,
        failureCount: 0,
        remainingCount: 0,
        totalCount: 1,
        message: 'Retry completed.',
      },
      result: {
        addons: [{ id: 'addon-2', title: 'Addon 2' }],
        failures: [],
        usedPresetCount: 1,
        usedPresetIds: ['preset-2'],
        runId: 'run-1',
      },
      error: null,
      createdAt: '2026-03-29T10:00:00.000Z',
      updatedAt: '2026-03-29T10:00:05.000Z',
    });

    const { result } = renderHook(() =>
      useSocialImageAddons({
        addonForm: emptyAddonForm,
        setAddonForm: vi.fn(),
        batchCaptureBaseUrl: 'https://example.com',
        batchCapturePresetIds: ['preset-1', 'preset-2'],
        batchCapturePresetLimit: null,
        buildSocialContext: (overrides?: Record<string, unknown>) => ({
          postId: 'post-1',
          ...overrides,
        }),
      })
    );

    await act(async () => {
      await result.current.handleRetryFailedPresetBatchCaptureJob({
        id: 'job-history-1',
        runId: 'run-history-1',
        status: 'completed',
        request: {
          baseUrl: 'https://retry.example.com',
          presetIds: ['game', 'lessons'],
          presetLimit: null,
          appearanceMode: 'default',
          playwrightPersonaId: null,
          playwrightScript: null,
          playwrightRoutes: [],
        },
        progress: {
          processedCount: 2,
          completedCount: 1,
          failureCount: 1,
          remainingCount: 0,
          totalCount: 2,
        },
        result: {
          addons: [{ id: 'addon-1', title: 'Addon 1' }],
          failures: [{ id: 'lessons', reason: 'Timeout' }],
          usedPresetCount: 2,
          usedPresetIds: ['game', 'lessons'],
          runId: 'run-history-1',
        },
        error: null,
        createdAt: '2026-03-29T10:00:00.000Z',
        updatedAt: '2026-03-29T10:00:01.000Z',
      });
    });

    expect(startBatchCaptureMutateAsyncMock).toHaveBeenCalledWith({
      baseUrl: 'https://retry.example.com',
      presetIds: ['lessons'],
      presetLimit: null,
      appearanceMode: 'default',
    });
    expect(refetchMock).toHaveBeenCalled();
    expect(result.current.batchCaptureMessage).toBe(
      'Captured 1 add-on from the current batch.'
    );
  });
});
