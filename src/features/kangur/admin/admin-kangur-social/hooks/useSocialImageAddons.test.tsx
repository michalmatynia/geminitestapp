/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emptyAddonForm } from '../AdminKangurSocialPage.Constants';

const {
  toastMock,
  createAddonMutateAsyncMock,
  batchCaptureMutateAsyncMock,
  logKangurClientErrorMock,
  trackKangurClientEventMock,
  captureExceptionMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  createAddonMutateAsyncMock: vi.fn(),
  batchCaptureMutateAsyncMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurSocialImageAddons', () => ({
  useCreateKangurSocialImageAddon: () => ({
    mutateAsync: createAddonMutateAsyncMock,
  }),
  useBatchCaptureKangurSocialImageAddons: () => ({
    mutateAsync: batchCaptureMutateAsyncMock,
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
    createAddonMutateAsyncMock.mockResolvedValue({ id: 'addon-1' });
    batchCaptureMutateAsyncMock.mockResolvedValue({
      addons: [{ id: 'addon-1', title: 'Addon 1' }],
      failures: [],
      usedPresetCount: 1,
    });
  });

  it('creates an add-on and resets the form on success', async () => {
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

    expect(createAddonMutateAsyncMock).toHaveBeenCalledWith({
      title: 'Hero screenshot',
      sourceUrl: 'https://example.com/page',
      description: 'Landing page',
      selector: 'main',
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

    expect(batchResult).toEqual({
      addons: [{ id: 'addon-1', title: 'Addon 1' }],
      failures: [],
      usedPresetCount: 1,
    });
    expect(batchCaptureMutateAsyncMock).toHaveBeenCalledWith({
      baseUrl: 'https://example.com',
      presetIds: ['preset-1'],
      presetLimit: 2,
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
});
