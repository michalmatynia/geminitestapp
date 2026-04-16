// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  toastMock,
  ensureVintedBrowserSessionMock,
  exportToBaseMutateAsyncMock,
  checkTraderaStatusMutateAsyncMock,
  preflightTraderaQuickListSessionMock,
  refreshTraderaBrowserSessionMock,
  relistTraderaMutateAsyncMock,
  syncTraderaMutateAsyncMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  ensureVintedBrowserSessionMock: vi.fn(),
  exportToBaseMutateAsyncMock: vi.fn(),
  checkTraderaStatusMutateAsyncMock: vi.fn(),
  preflightTraderaQuickListSessionMock: vi.fn(),
  refreshTraderaBrowserSessionMock: vi.fn(),
  relistTraderaMutateAsyncMock: vi.fn(),
  syncTraderaMutateAsyncMock: vi.fn(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/features/integrations/hooks/useProductListingMutations', () => ({
  useDeleteFromBaseMutation: () => ({ mutateAsync: vi.fn() }),
  useExportToBaseMutation: () => ({ mutateAsync: exportToBaseMutateAsyncMock }),
  usePurgeListingMutation: () => ({ mutateAsync: vi.fn() }),
  useRelistTraderaMutation: () => ({
    mutateAsync: relistTraderaMutateAsyncMock,
  }),
  useCheckTraderaStatusMutation: () => ({
    mutateAsync: checkTraderaStatusMutateAsyncMock,
  }),
  useSyncTraderaMutation: () => ({
    mutateAsync: syncTraderaMutateAsyncMock,
  }),
  useSyncBaseImagesMutation: () => ({ mutateAsync: vi.fn() }),
  useUpdateListingInventoryIdMutation: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/features/integrations/utils/tradera-browser-session', () => ({
  preflightTraderaQuickListSession: (...args: unknown[]) =>
    preflightTraderaQuickListSessionMock(...args) as Promise<unknown>,
  refreshTraderaBrowserSession: (...args: unknown[]) =>
    refreshTraderaBrowserSessionMock(...args) as Promise<unknown>,
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

vi.mock('@/features/integrations/utils/vinted-browser-session', () => ({
  ensureVintedBrowserSession: (...args: unknown[]) =>
    ensureVintedBrowserSessionMock(...args) as Promise<unknown>,
  isVintedBrowserAuthRequiredMessage: (value: string | null | undefined) => {
    const normalized = value?.trim().toLowerCase() ?? '';
    return (
      normalized.includes('auth_required') ||
      normalized.includes('manual verification') ||
      normalized.includes('captcha') ||
      normalized.includes('login requires') ||
      normalized.includes('session expired') ||
      normalized.includes('browser challenge') ||
      normalized.includes('could not be verified') ||
      normalized.includes('verification is incomplete')
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
  productCategoryId: 'category-1',
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
  setOpeningVintedLogin: vi.fn(),
  setRecoveryContext: vi.fn(),
  setRelistingBrowserMode: vi.fn(),
  setPurgingListing: vi.fn(),
  setRelistingListing: vi.fn(),
  setSavingInventoryId: vi.fn(),
  setCheckingTraderaStatusListing: vi.fn(),
  setSyncingImages: vi.fn(),
  setSyncingTraderaListing: vi.fn(),
});

describe('useProductListingsActionsImpl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshTraderaBrowserSessionMock.mockResolvedValue({
      response: { ok: true, steps: [{ step: 'Saving session', status: 'ok' }] },
      savedSession: true,
    });
    ensureVintedBrowserSessionMock.mockResolvedValue({
      response: { ok: true, steps: [{ step: 'Saving session', status: 'ok' }] },
      savedSession: true,
    });
    exportToBaseMutateAsyncMock.mockResolvedValue({
      status: 'queued',
      jobId: 'job-base-export-1',
      logs: [],
    });
    preflightTraderaQuickListSessionMock.mockResolvedValue({
      response: { ok: true, sessionReady: true, steps: [] },
      ready: true,
    });
    relistTraderaMutateAsyncMock.mockResolvedValue({
      queue: { jobId: 'job-tradera-relist-1' },
    });
    checkTraderaStatusMutateAsyncMock.mockResolvedValue({
      queue: { jobId: 'job-tradera-check-status-1' },
    });
    syncTraderaMutateAsyncMock.mockResolvedValue({
      queue: { jobId: 'job-tradera-sync-1' },
    });
  });

  it('runs fast Tradera quicklist preflight before browser relists', async () => {
    const onListingsUpdated = vi.fn();
    const { result } = renderHook(() =>
      useProductListingsActionsImpl(
        buildBaseParams({
          listings: [
            {
              id: 'listing-1',
              productId: 'product-1',
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

    expect(preflightTraderaQuickListSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-tradera-1',
      productId: 'product-1',
    });
    expect(relistTraderaMutateAsyncMock).toHaveBeenCalledWith({ listingId: 'listing-1' });
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
              productId: 'product-1',
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

    expect(preflightTraderaQuickListSessionMock).not.toHaveBeenCalled();
    expect(relistTraderaMutateAsyncMock).toHaveBeenCalledWith({ listingId: 'listing-1' });
  });

  it('can skip session preflight for relists after a completed manual login flow', async () => {
    const { result } = renderHook(() =>
      useProductListingsActionsImpl(
        buildBaseParams({
          listings: [
            {
              id: 'listing-1',
              productId: 'product-1',
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

    expect(preflightTraderaQuickListSessionMock).not.toHaveBeenCalled();
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
              productId: 'product-1',
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

    expect(preflightTraderaQuickListSessionMock).not.toHaveBeenCalled();
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

  it('passes selectorProfile overrides through to Tradera browser relists', async () => {
    const { result } = renderHook(() =>
      useProductListingsActionsImpl(
        buildBaseParams({
          listings: [
            {
              id: 'listing-1',
              productId: 'product-1',
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
        selectorProfile: 'profile-market-a',
      });
    });

    expect(relistTraderaMutateAsyncMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      selectorProfile: 'profile-market-a',
    });
  });

  it('runs fast Tradera quicklist preflight before queueing a Tradera sync', async () => {
    const setSyncingTraderaListing = vi.fn();
    const { result } = renderHook(() =>
      useProductListingsActionsImpl({
        ...buildBaseParams({
          listings: [
            {
              id: 'listing-1',
              productId: 'product-1',
              integrationId: 'integration-tradera-1',
              connectionId: 'connection-tradera-1',
              integration: { slug: 'tradera' },
            },
          ],
        }),
        setSyncingTraderaListing,
      })
    );

    await act(async () => {
      await result.current.handleSyncTradera('listing-1');
    });

    expect(preflightTraderaQuickListSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-tradera-1',
      productId: 'product-1',
    });
    expect(syncTraderaMutateAsyncMock).toHaveBeenCalledWith({ listingId: 'listing-1' });
    expect(setSyncingTraderaListing).toHaveBeenNthCalledWith(1, 'listing-1');
    expect(setSyncingTraderaListing).toHaveBeenLastCalledWith(null);
    expect(toastMock).toHaveBeenCalledWith('Tradera sync queued (job job-tradera-sync-1).', {
      variant: 'success',
    });
  });

  it('can queue a Tradera sync from quicklist feedback ids before the listing row is visible', async () => {
    const { result } = renderHook(() =>
      useProductListingsActionsImpl(buildBaseParams())
    );

    await act(async () => {
      await result.current.handleSyncTradera('listing-1', {
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-tradera-1',
      });
    });

    expect(preflightTraderaQuickListSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-tradera-1',
      productId: 'product-1',
    });
    expect(syncTraderaMutateAsyncMock).toHaveBeenCalledWith({ listingId: 'listing-1' });
  });

  it('passes selectorProfile overrides through to Tradera sync jobs', async () => {
    const { result } = renderHook(() =>
      useProductListingsActionsImpl(
        buildBaseParams({
          listings: [
            {
              id: 'listing-1',
              productId: 'product-1',
              integrationId: 'integration-tradera-1',
              connectionId: 'connection-tradera-1',
              integration: { slug: 'tradera' },
            },
          ],
        })
      )
    );

    await act(async () => {
      await result.current.handleSyncTradera('listing-1', {
        selectorProfile: 'profile-market-a',
      });
    });

    expect(syncTraderaMutateAsyncMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      selectorProfile: 'profile-market-a',
    });
  });

  it('runs fast Tradera quicklist preflight before queueing a Tradera status check', async () => {
    const setCheckingTraderaStatusListing = vi.fn();
    const { result } = renderHook(() =>
      useProductListingsActionsImpl({
        ...buildBaseParams({
          listings: [
            {
              id: 'listing-1',
              productId: 'product-1',
              integrationId: 'integration-tradera-1',
              connectionId: 'connection-tradera-1',
              integration: { slug: 'tradera' },
            },
          ],
        }),
        setCheckingTraderaStatusListing,
      })
    );

    await act(async () => {
      await result.current.handleCheckTraderaStatus('listing-1');
    });

    expect(preflightTraderaQuickListSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-tradera-1',
      productId: 'product-1',
    });
    expect(checkTraderaStatusMutateAsyncMock).toHaveBeenCalledWith({ listingId: 'listing-1' });
    expect(setCheckingTraderaStatusListing).toHaveBeenNthCalledWith(1, 'listing-1');
    expect(setCheckingTraderaStatusListing).toHaveBeenLastCalledWith(null);
    expect(toastMock).toHaveBeenCalledWith(
      'Tradera status check queued (job job-tradera-check-status-1).',
      { variant: 'success' }
    );
  });

  it('shows a toast and opens Tradera recovery for auth-required sync preflight failures', async () => {
    const setError = vi.fn();
    const setRecoveryContext = vi.fn();
    preflightTraderaQuickListSessionMock.mockRejectedValue(
      new Error(
        'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.'
      )
    );

    const { result } = renderHook(() =>
      useProductListingsActionsImpl(
        {
          ...buildBaseParams({
            listings: [
              {
                id: 'listing-1',
                productId: 'product-1',
                integrationId: 'integration-tradera-1',
                connectionId: 'connection-tradera-1',
                integration: { slug: 'tradera' },
              },
            ],
          }),
          setError,
          setRecoveryContext,
        }
      )
    );

    await act(async () => {
      await result.current.handleSyncTradera('listing-1');
    });

    expect(toastMock).toHaveBeenCalledWith(
      'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.',
      { variant: 'error' }
    );
    expect(setRecoveryContext).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'tradera_quick_export_auth_required',
        integrationSlug: 'tradera',
        status: 'auth_required',
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-tradera-1',
        failureReason:
          'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.',
      })
    );
    expect(setError).toHaveBeenNthCalledWith(1, null);
    expect(setError).not.toHaveBeenCalledWith(
      'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.'
    );
    expect(syncTraderaMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('stores Tradera recovery context for non-auth sync preflight failures before queueing', async () => {
    const setError = vi.fn();
    const setRecoveryContext = vi.fn();
    preflightTraderaQuickListSessionMock.mockRejectedValue(
      new Error(
        'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.'
      )
    );

    const { result } = renderHook(() =>
      useProductListingsActionsImpl(
        {
          ...buildBaseParams({
            listings: [
              {
                id: 'listing-1',
                productId: 'product-1',
                integrationId: 'integration-tradera-1',
                connectionId: 'connection-tradera-1',
                integration: { slug: 'tradera' },
              },
            ],
          }),
          setError,
          setRecoveryContext,
        }
      )
    );

    await act(async () => {
      await result.current.handleSyncTradera('listing-1');
    });

    expect(setRecoveryContext).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-tradera-1',
        failureReason:
          'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.',
      })
    );
    expect(setError).toHaveBeenCalledWith(
      'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.'
    );
    expect(syncTraderaMutateAsyncMock).not.toHaveBeenCalled();
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

  it('consolidates Tradera login recovery and relist resume into one action', async () => {
    const { result } = renderHook(() =>
      useProductListingsActionsImpl(
        buildBaseParams({
          listings: [
            {
              id: 'listing-1',
              productId: 'product-1',
              integrationId: 'integration-tradera-1',
              connectionId: 'connection-tradera-1',
              integration: { slug: 'tradera' },
            },
          ],
        })
      )
    );

    let success = false;
    await act(async () => {
      success = await result.current.handleRecoverTraderaListing({
        listingId: 'listing-1',
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-tradera-1',
        action: 'relist',
        browserMode: 'headed',
      });
    });

    expect(success).toBe(true);
    expect(refreshTraderaBrowserSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-tradera-1',
    });
    expect(preflightTraderaQuickListSessionMock).not.toHaveBeenCalled();
    expect(relistTraderaMutateAsyncMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      browserMode: 'headed',
    });
  });

  it('can resume Tradera sync after login recovery through the same consolidated action', async () => {
    const { result } = renderHook(() =>
      useProductListingsActionsImpl(
        buildBaseParams({
          listings: [
            {
              id: 'listing-1',
              productId: 'product-1',
              integrationId: 'integration-tradera-1',
              connectionId: 'connection-tradera-1',
              integration: { slug: 'tradera' },
            },
          ],
        })
      )
    );

    let success = false;
    await act(async () => {
      success = await result.current.handleRecoverTraderaListing({
        listingId: 'listing-1',
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-tradera-1',
        action: 'sync',
        browserMode: 'headed',
      });
    });

    expect(success).toBe(true);
    expect(refreshTraderaBrowserSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-tradera-1',
    });
    expect(preflightTraderaQuickListSessionMock).not.toHaveBeenCalled();
    expect(syncTraderaMutateAsyncMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      browserMode: 'headed',
    });
  });

  it('shows a toast for Tradera auth-required relist quick preflight failures', async () => {
    const setError = vi.fn();
    const setRecoveryContext = vi.fn();
    preflightTraderaQuickListSessionMock.mockRejectedValue(
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
                productId: 'product-1',
                integrationId: 'integration-tradera-1',
                connectionId: 'connection-tradera-1',
                integration: { slug: 'tradera' },
              },
            ],
          }),
          setError,
          setRecoveryContext,
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
    expect(setError).toHaveBeenNthCalledWith(1, null);
    expect(setError).not.toHaveBeenCalledWith(
      'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
    );
    expect(setRecoveryContext).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'tradera_quick_export_auth_required',
        integrationSlug: 'tradera',
        status: 'auth_required',
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-tradera-1',
        failureReason:
          'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.',
      })
    );
    expect(relistTraderaMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('stores Tradera recovery context for non-auth quick preflight failures before relist queueing', async () => {
    const setError = vi.fn();
    const setRecoveryContext = vi.fn();
    preflightTraderaQuickListSessionMock.mockRejectedValue(
      new Error(
        'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.'
      )
    );

    const { result } = renderHook(() =>
      useProductListingsActionsImpl(
        {
          ...buildBaseParams({
            listings: [
              {
                id: 'listing-1',
                productId: 'product-1',
                integrationId: 'integration-tradera-1',
                connectionId: 'connection-tradera-1',
                integration: { slug: 'tradera' },
              },
            ],
          }),
          setError,
          setRecoveryContext,
        }
      )
    );

    await act(async () => {
      await result.current.handleRelistTradera('listing-1');
    });

    expect(setRecoveryContext).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-tradera-1',
        failureReason:
          'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.',
      })
    );
    expect(setError).toHaveBeenCalledWith(
      'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.'
    );
    expect(relistTraderaMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('shows a toast for Tradera auth-required manual login failures', async () => {
    const setError = vi.fn();
    const setRecoveryContext = vi.fn();
    refreshTraderaBrowserSessionMock.mockRejectedValue(
      new Error(
        'AUTH_REQUIRED: Stored Tradera session expired and Tradera requires manual verification.'
      )
    );

    const { result } = renderHook(() =>
      useProductListingsActionsImpl({
        ...buildBaseParams(),
        setError,
        setRecoveryContext,
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
    expect(setError).toHaveBeenNthCalledWith(1, null);
    expect(setError).not.toHaveBeenCalledWith(
      'AUTH_REQUIRED: Stored Tradera session expired and Tradera requires manual verification.'
    );
    expect(setRecoveryContext).not.toHaveBeenCalled();
  });

  it('refreshes the Vinted session and clears Vinted recovery state after manual login succeeds', async () => {
    const refetchListingsQuery = vi.fn().mockResolvedValue(undefined);
    const onListingsUpdated = vi.fn();
    const setRecoveryContext = vi.fn();
    const { result } = renderHook(() =>
      useProductListingsActionsImpl({
        ...buildBaseParams(),
        refetchListingsQuery,
        onListingsUpdated,
        setRecoveryContext,
      })
    );

    let success = false;
    await act(async () => {
      success = await result.current.handleOpenVintedLogin(
        'recovery',
        'integration-vinted-1',
        'connection-vinted-1'
      );
    });

    expect(success).toBe(true);
    expect(ensureVintedBrowserSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-vinted-1',
      connectionId: 'connection-vinted-1',
    });
    expect(toastMock).toHaveBeenCalledWith('Vinted.pl login session refreshed.', {
      variant: 'success',
    });
    expect(refetchListingsQuery).toHaveBeenCalled();
    expect(onListingsUpdated).toHaveBeenCalled();
    expect(setRecoveryContext).toHaveBeenCalledWith(expect.any(Function));
    const clearRecovery = setRecoveryContext.mock.calls.at(-1)?.[0] as (
      current: { integrationSlug?: string } | null
    ) => unknown;
    expect(clearRecovery({ integrationSlug: 'vinted' })).toBeNull();
  });

  it('stores Vinted recovery context and shows a toast for Vinted auth-required manual login failures', async () => {
    const setError = vi.fn();
    const setRecoveryContext = vi.fn();
    ensureVintedBrowserSessionMock.mockRejectedValue(
      new Error(
        'AUTH_REQUIRED: Stored Vinted session expired and Vinted requires manual verification.'
      )
    );

    const { result } = renderHook(() =>
      useProductListingsActionsImpl({
        ...buildBaseParams(),
        setError,
        setRecoveryContext,
      })
    );

    let success = true;
    await act(async () => {
      success = await result.current.handleOpenVintedLogin(
        'recovery',
        'integration-vinted-1',
        'connection-vinted-1'
      );
    });

    expect(success).toBe(false);
    expect(toastMock).toHaveBeenCalledWith(
      'AUTH_REQUIRED: Stored Vinted.pl session expired and Vinted.pl requires manual verification.',
      { variant: 'error' }
    );
    expect(setError).toHaveBeenNthCalledWith(1, null);
    expect(setError).not.toHaveBeenCalledWith(
      'AUTH_REQUIRED: Stored Vinted.pl session expired and Vinted.pl requires manual verification.'
    );
    expect(setRecoveryContext).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'vinted_quick_export_auth_required',
        integrationSlug: 'vinted',
        status: 'auth_required',
        integrationId: 'integration-vinted-1',
        connectionId: 'connection-vinted-1',
        failureReason:
          'AUTH_REQUIRED: Stored Vinted.pl session expired and Vinted.pl requires manual verification.',
      })
    );
  });

  it('keeps Vinted recovery active when manual login finishes without saving a session', async () => {
    const refetchListingsQuery = vi.fn().mockResolvedValue(undefined);
    const onListingsUpdated = vi.fn();
    const setError = vi.fn();
    const setRecoveryContext = vi.fn();
    ensureVintedBrowserSessionMock.mockResolvedValue({
      response: { ok: true, sessionReady: true, steps: [] },
      savedSession: false,
    });

    const { result } = renderHook(() =>
      useProductListingsActionsImpl({
        ...buildBaseParams(),
        refetchListingsQuery,
        onListingsUpdated,
        setError,
        setRecoveryContext,
      })
    );

    let success = true;
    await act(async () => {
      success = await result.current.handleOpenVintedLogin(
        'recovery',
        'integration-vinted-1',
        'connection-vinted-1'
      );
    });

    expect(success).toBe(false);
    expect(ensureVintedBrowserSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-vinted-1',
      connectionId: 'connection-vinted-1',
    });
    expect(toastMock).toHaveBeenCalledWith(
      'Vinted.pl login session could not be saved. Complete login verification and retry.',
      { variant: 'error' }
    );
    expect(setError).toHaveBeenNthCalledWith(1, null);
    expect(setError).not.toHaveBeenCalledWith(
      'Vinted.pl login session could not be saved. Complete login verification and retry.'
    );
    expect(setRecoveryContext).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'vinted_quick_export_auth_required',
        integrationSlug: 'vinted',
        status: 'auth_required',
        integrationId: 'integration-vinted-1',
        connectionId: 'connection-vinted-1',
        failureReason:
          'Vinted.pl login session could not be saved. Complete login verification and retry.',
      })
    );
    expect(refetchListingsQuery).not.toHaveBeenCalled();
    expect(onListingsUpdated).not.toHaveBeenCalled();
  });

  it('clears Tradera recovery state after a queued relist succeeds', async () => {
    const setRecoveryContext = vi.fn();
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
          setRecoveryContext,
        }
      )
    );

    await act(async () => {
      await result.current.handleRelistTradera('listing-1');
    });

    expect(setRecoveryContext).toHaveBeenCalledWith(expect.any(Function));
    const clearRecovery = setRecoveryContext.mock.calls.at(-1)?.[0] as (
      current: { integrationSlug?: string } | null
    ) => unknown;
    expect(clearRecovery({ integrationSlug: 'tradera' })).toBeNull();
    expect(clearRecovery({ integrationSlug: 'baselinker' })).toEqual({
      integrationSlug: 'baselinker',
    });
  });

  it('clears Tradera recovery state after a queued sync succeeds', async () => {
    const setRecoveryContext = vi.fn();
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
          setRecoveryContext,
        }
      )
    );

    await act(async () => {
      await result.current.handleSyncTradera('listing-1');
    });

    expect(setRecoveryContext).toHaveBeenCalledWith(expect.any(Function));
    const clearRecovery = setRecoveryContext.mock.calls.at(-1)?.[0] as (
      current: { integrationSlug?: string } | null
    ) => unknown;
    expect(clearRecovery({ integrationSlug: 'tradera' })).toBeNull();
    expect(clearRecovery({ integrationSlug: 'baselinker' })).toEqual({
      integrationSlug: 'baselinker',
    });
  });

  it('clears Tradera recovery state after manual login succeeds', async () => {
    const setRecoveryContext = vi.fn();
    const { result } = renderHook(() =>
      useProductListingsActionsImpl({
        ...buildBaseParams(),
        setRecoveryContext,
      })
    );

    await act(async () => {
      await result.current.handleOpenTraderaLogin(
        'recovery',
        'integration-tradera-1',
        'connection-tradera-1'
      );
    });

    expect(setRecoveryContext).toHaveBeenCalledWith(expect.any(Function));
    const clearRecovery = setRecoveryContext.mock.calls.at(-1)?.[0] as (
      current: { integrationSlug?: string } | null
    ) => unknown;
    expect(clearRecovery({ integrationSlug: 'tradera' })).toBeNull();
  });

  it('re-exports the current Base listing with listing identity and success feedback', async () => {
    const setError = vi.fn();
    const setExportLogs = vi.fn();
    const setLogsOpen = vi.fn();
    const setLastExportListingId = vi.fn();
    const setExportingListing = vi.fn();
    const onListingsUpdated = vi.fn();

    const { result } = renderHook(() =>
      useProductListingsActionsImpl({
        ...buildBaseParams({
          listings: [
            {
              id: 'listing-base-1',
              connectionId: 'connection-base-1',
              inventoryId: 'inventory-base-1',
              externalListingId: 'base-product-123',
              exportHistory: [
                {
                  exportedAt: '2026-04-03T10:00:00.000Z',
                  templateId: 'template-older',
                },
                {
                  exportedAt: '2026-04-04T10:00:00.000Z',
                  templateId: 'template-latest',
                },
              ],
            },
          ],
        }),
        onListingsUpdated,
        setError,
        setExportLogs,
        setLogsOpen,
        setLastExportListingId,
        setExportingListing,
      })
    );

    await act(async () => {
      await result.current.handleExportAgain('listing-base-1');
    });

    expect(exportToBaseMutateAsyncMock).toHaveBeenCalledWith({
      connectionId: 'connection-base-1',
      inventoryId: 'inventory-base-1',
      listingId: 'listing-base-1',
      externalListingId: 'base-product-123',
      templateId: 'template-latest',
      exportImagesAsBase64: false,
    });
    expect(setError).toHaveBeenCalledWith(null);
    expect(setLastExportListingId).toHaveBeenCalledWith('listing-base-1');
    expect(setLogsOpen).toHaveBeenCalledWith(true);
    expect(toastMock).toHaveBeenCalledWith('Base.com export queued (job job-base-export-1).', {
      variant: 'success',
    });
    expect(onListingsUpdated).toHaveBeenCalled();
    expect(setExportingListing).toHaveBeenNthCalledWith(1, 'listing-base-1');
    expect(setExportingListing).toHaveBeenLastCalledWith(null);
  });

  it('blocks Base re-export when the product has no internal category assigned', async () => {
    const setError = vi.fn();
    const setExportLogs = vi.fn();
    const setLogsOpen = vi.fn();
    const setLastExportListingId = vi.fn();
    const setExportingListing = vi.fn();

    const { result } = renderHook(() =>
      useProductListingsActionsImpl({
        ...buildBaseParams({
          listings: [
            {
              id: 'listing-base-1',
              connectionId: 'connection-base-1',
              inventoryId: 'inventory-base-1',
              externalListingId: 'base-product-123',
              exportHistory: [],
            },
          ],
        }),
        productCategoryId: null,
        setError,
        setExportLogs,
        setLogsOpen,
        setLastExportListingId,
        setExportingListing,
      })
    );

    await act(async () => {
      await result.current.handleExportAgain('listing-base-1');
    });

    expect(setError).toHaveBeenCalledWith(
      'Product has no internal category assigned. Assign a category before exporting with category mapping.'
    );
    expect(setExportLogs).not.toHaveBeenCalled();
    expect(setLogsOpen).not.toHaveBeenCalled();
    expect(setLastExportListingId).not.toHaveBeenCalled();
    expect(setExportingListing).not.toHaveBeenCalled();
    expect(exportToBaseMutateAsyncMock).not.toHaveBeenCalled();
  });
});
