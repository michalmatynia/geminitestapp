// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  toastMock,
  ensureTraderaBrowserSessionMock,
  relistTraderaMutateAsyncMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  ensureTraderaBrowserSessionMock: vi.fn(),
  relistTraderaMutateAsyncMock: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/features/integrations/hooks/useProductListingMutations', () => ({
  useDeleteFromBaseMutation: () => ({ mutateAsync: vi.fn() }),
  useExportToBaseMutation: () => ({ mutateAsync: vi.fn() }),
  usePurgeListingMutation: () => ({ mutateAsync: vi.fn() }),
  useRelistTraderaMutation: () => ({
    mutateAsync: relistTraderaMutateAsyncMock,
  }),
  useSyncBaseImagesMutation: () => ({ mutateAsync: vi.fn() }),
  useUpdateListingInventoryIdMutation: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/features/integrations/utils/tradera-browser-session', () => ({
  ensureTraderaBrowserSession: (...args: unknown[]) =>
    ensureTraderaBrowserSessionMock(...args) as Promise<unknown>,
  isTraderaBrowserAuthRequiredMessage: (value: string | null | undefined) => {
    const normalized = value?.trim().toLowerCase() ?? '';
    return (
      normalized.includes('auth_required') ||
      normalized.includes('manual verification') ||
      normalized.includes('captcha') ||
      normalized.includes('login requires') ||
      normalized.includes('session expired')
    );
  },
}));

import { useProductListingsActionsImpl } from './useProductListingsActionsImpl';

const buildBaseParams = (overrides?: {
  listings?: Array<Record<string, unknown>>;
}) => ({
  inventoryOverrides: {},
  lastExportListingId: null,
  listings: (overrides?.listings ?? []) as never,
  onListingsUpdated: vi.fn(),
  productId: 'product-1',
  refetchListingsQuery: vi.fn(),
  setDeletingFromBase: vi.fn(),
  setError: vi.fn(),
  setExportingListing: vi.fn(),
  setExportLogs: vi.fn(),
  setInventoryOverrides: vi.fn(),
  setIsSyncImagesConfirmOpen: vi.fn(),
  setLastExportListingId: vi.fn(),
  setListingToDelete: vi.fn(),
  setListingToPurge: vi.fn(),
  setLogsOpen: vi.fn(),
  setOpeningTraderaLogin: vi.fn(),
  setRelistingBrowserMode: vi.fn(),
  setPurgingListing: vi.fn(),
  setRelistingListing: vi.fn(),
  setSavingInventoryId: vi.fn(),
  setSyncingImages: vi.fn(),
});

describe('useProductListingsActionsImpl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureTraderaBrowserSessionMock.mockResolvedValue({
      response: { ok: true, steps: [{ step: 'Saving session', status: 'ok' }] },
      savedSession: true,
    });
    relistTraderaMutateAsyncMock.mockResolvedValue({
      queue: { jobId: 'job-tradera-relist-1' },
    });
  });

  it('runs Tradera browser session preflight before browser relists', async () => {
    const onListingsUpdated = vi.fn();
    const { result } = renderHook(() =>
      useProductListingsActionsImpl(
        buildBaseParams({
          listings: [
            {
              id: 'listing-1',
              integrationId: 'integration-tradera-1',
              connectionId: 'connection-tradera-1',
              integration: { slug: 'tradera' },
            },
          ],
          onListingsUpdated,
        } as never)
      )
    );

    await act(async () => {
      await result.current.handleRelistTradera('listing-1');
    });

    expect(ensureTraderaBrowserSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-tradera-1',
    });
    expect(relistTraderaMutateAsyncMock).toHaveBeenCalledWith({ listingId: 'listing-1' });
    expect(toastMock).toHaveBeenCalledWith('Tradera login session refreshed.', {
      variant: 'success',
    });
    expect(toastMock).toHaveBeenCalledWith('Tradera relist queued (job job-tradera-relist-1).', {
      variant: 'success',
    });
  });

  it('skips session preflight for Tradera API relists', async () => {
    const { result } = renderHook(() =>
      useProductListingsActionsImpl(
        buildBaseParams({
          listings: [
            {
              id: 'listing-1',
              integrationId: 'integration-tradera-api-1',
              connectionId: 'connection-tradera-api-1',
              integration: { slug: 'tradera-api' },
            },
          ],
        })
      )
    );

    await act(async () => {
      await result.current.handleRelistTradera('listing-1');
    });

    expect(ensureTraderaBrowserSessionMock).not.toHaveBeenCalled();
    expect(relistTraderaMutateAsyncMock).toHaveBeenCalledWith({ listingId: 'listing-1' });
  });

  it('can skip session preflight for relists after a completed manual login flow', async () => {
    const { result } = renderHook(() =>
      useProductListingsActionsImpl(
        buildBaseParams({
          listings: [
            {
              id: 'listing-1',
              integrationId: 'integration-tradera-1',
              connectionId: 'connection-tradera-1',
              integration: { slug: 'tradera' },
            },
          ],
        })
      )
    );

    await act(async () => {
      await result.current.handleRelistTradera('listing-1', {
        skipSessionPreflight: true,
      });
    });

    expect(ensureTraderaBrowserSessionMock).not.toHaveBeenCalled();
    expect(relistTraderaMutateAsyncMock).toHaveBeenCalledWith({ listingId: 'listing-1' });
  });

  it('passes Playwright relist browser-mode overrides through to the relist mutation', async () => {
    const setRelistingBrowserMode = vi.fn();
    const { result } = renderHook(() =>
      useProductListingsActionsImpl(
        {
          ...buildBaseParams({
            listings: [
              {
                id: 'listing-1',
                integrationId: 'integration-playwright-1',
                connectionId: 'connection-playwright-1',
                integration: { slug: 'playwright-programmable' },
              },
            ],
          }),
          setRelistingBrowserMode,
        }
      )
    );

    await act(async () => {
      await result.current.handleRelistTradera('listing-1', {
        browserMode: 'headed',
      });
    });

    expect(ensureTraderaBrowserSessionMock).not.toHaveBeenCalled();
    expect(relistTraderaMutateAsyncMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      browserMode: 'headed',
    });
    expect(setRelistingBrowserMode).toHaveBeenNthCalledWith(1, 'headed');
    expect(setRelistingBrowserMode).toHaveBeenLastCalledWith(null);
    expect(toastMock).toHaveBeenCalledWith('Playwright relist queued (headed, job job-tradera-relist-1).', {
      variant: 'success',
    });
  });

  it('returns true when manual Tradera login succeeds', async () => {
    const refetchListingsQuery = vi.fn().mockResolvedValue(undefined);
    const onListingsUpdated = vi.fn();
    const { result } = renderHook(() =>
      useProductListingsActionsImpl({
        ...buildBaseParams(),
        refetchListingsQuery,
        onListingsUpdated,
      })
    );

    let success = false;
    await act(async () => {
      success = await result.current.handleOpenTraderaLogin(
        'recovery',
        'integration-tradera-1',
        'connection-tradera-1'
      );
    });

    expect(success).toBe(true);
    expect(refetchListingsQuery).toHaveBeenCalled();
    expect(onListingsUpdated).toHaveBeenCalled();
  });

  it('shows a toast for Tradera auth-required relist preflight failures', async () => {
    const setError = vi.fn();
    ensureTraderaBrowserSessionMock.mockRejectedValue(
      new Error(
        'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
      )
    );

    const { result } = renderHook(() =>
      useProductListingsActionsImpl(
        {
          ...buildBaseParams({
            listings: [
              {
                id: 'listing-1',
                integrationId: 'integration-tradera-1',
                connectionId: 'connection-tradera-1',
                integration: { slug: 'tradera' },
              },
            ],
          }),
          setError,
        }
      )
    );

    await act(async () => {
      await result.current.handleRelistTradera('listing-1');
    });

    expect(toastMock).toHaveBeenCalledWith(
      'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.',
      { variant: 'error' }
    );
    expect(setError).toHaveBeenCalledWith(
      'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
    );
    expect(relistTraderaMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('shows a toast for Tradera auth-required manual login failures', async () => {
    const setError = vi.fn();
    ensureTraderaBrowserSessionMock.mockRejectedValue(
      new Error(
        'AUTH_REQUIRED: Stored Tradera session expired and Tradera requires manual verification.'
      )
    );

    const { result } = renderHook(() =>
      useProductListingsActionsImpl({
        ...buildBaseParams(),
        setError,
      })
    );

    let success = true;
    await act(async () => {
      success = await result.current.handleOpenTraderaLogin(
        'recovery',
        'integration-tradera-1',
        'connection-tradera-1'
      );
    });

    expect(success).toBe(false);
    expect(toastMock).toHaveBeenCalledWith(
      'AUTH_REQUIRED: Stored Tradera session expired and Tradera requires manual verification.',
      { variant: 'error' }
    );
    expect(setError).toHaveBeenCalledWith(
      'AUTH_REQUIRED: Stored Tradera session expired and Tradera requires manual verification.'
    );
  });
});
