/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useProductListingsUIStateMock,
  useProductListingsActionsMock,
  useProductListingsModalsMock,
  useImageRetryPresetsMock,
  useTraderaLiveExecutionMock,
} = vi.hoisted(() => ({
  useProductListingsUIStateMock: vi.fn(),
  useProductListingsActionsMock: vi.fn(),
  useProductListingsModalsMock: vi.fn(),
  useImageRetryPresetsMock: vi.fn(),
  useTraderaLiveExecutionMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ProductListingsContext', () => ({
  useProductListingsUIState: () => useProductListingsUIStateMock(),
  useProductListingsActions: () => useProductListingsActionsMock(),
  useProductListingsModals: () => useProductListingsModalsMock(),
}));

vi.mock('@/features/integrations/components/listings/useImageRetryPresets', () => ({
  useImageRetryPresets: () => useImageRetryPresetsMock(),
}));

vi.mock('@/features/integrations/hooks/useTraderaLiveExecution', () => ({
  useTraderaLiveExecution: () => useTraderaLiveExecutionMock(),
}));

vi.mock('@/shared/ui/primitives.public', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    DropdownMenuItem: ({ children, onSelect, onClick }: any) => (
      <button type='button' onClick={onSelect || onClick}>
        {children}
      </button>
    ),
  };
});

vi.mock('@/shared/ui/forms-and-actions.public', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    ActionMenu: ({ children, trigger, ariaLabel, disabled }: any) => (
      <div data-testid='mock-action-menu'>
        <button type='button' aria-label={ariaLabel} disabled={disabled}>
          {trigger}
        </button>
        <div>{children}</div>
      </div>
    ),
  };
});

import { ProductListingActions } from './ProductListingActions';

describe('ProductListingActions', () => {
  const handleExportAgain = vi.fn();
  const handleCheckTraderaStatus = vi.fn();
  const handleRecoverTraderaListing = vi.fn();
  const handleRelistTradera = vi.fn();
  const handleSyncTradera = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    handleExportAgain.mockResolvedValue(undefined);
    handleCheckTraderaStatus.mockResolvedValue(undefined);
    handleRecoverTraderaListing.mockResolvedValue(true);
    handleRelistTradera.mockResolvedValue(undefined);
    handleSyncTradera.mockResolvedValue(undefined);
    useImageRetryPresetsMock.mockReturnValue([]);
    useTraderaLiveExecutionMock.mockReturnValue(null);
    useProductListingsUIStateMock.mockReturnValue({
      exportingListing: null,
      inventoryOverrides: {},
      setInventoryOverrides: vi.fn(),
      savingInventoryId: null,
      deletingFromBase: null,
      purgingListing: null,
      syncingTraderaListing: null,
      checkingTraderaStatusListing: null,
      relistingListing: null,
      relistingBrowserMode: null,
      openingTraderaLogin: null,
    });
    useProductListingsActionsMock.mockReturnValue({
      handleExportAgain,
      handleExportImagesOnly: vi.fn(),
      handleSaveInventoryId: vi.fn(),
      handleSyncTradera,
      handleCheckTraderaStatus,
      handleRelistTradera,
      handleOpenTraderaLogin: vi.fn(),
      handleRecoverTraderaListing,
    });
    useProductListingsModalsMock.mockReturnValue({
      setListingToDelete: vi.fn(),
      setListingToPurge: vi.fn(),
    });
  });

  it('shows the login-and-retry action for AUTH-classified Tradera browser failures', async () => {
    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            failureReason: 'Listing failed.',
            integrationId: 'integration-1',
            connectionId: 'connection-1',
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  errorCategory: 'AUTH',
                },
              },
            },
          } as never
        }
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login and retry relist' }));

    await Promise.resolve();
    expect(handleRecoverTraderaListing).toHaveBeenCalledWith({
      listingId: 'listing-1',
      integrationId: 'integration-1',
      connectionId: 'connection-1',
      action: 'relist',
      browserMode: 'headed',
    });
    expect(handleRelistTradera).not.toHaveBeenCalled();
  });

  it('does not queue relist when manual login recovery fails', async () => {
    handleRecoverTraderaListing.mockResolvedValue(false);

    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            failureReason: 'Listing failed.',
            integrationId: 'integration-1',
            connectionId: 'connection-1',
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  errorCategory: 'AUTH',
                },
              },
            },
          } as never
        }
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login and retry relist' }));
    await Promise.resolve();

    expect(handleRecoverTraderaListing).toHaveBeenCalledWith({
      listingId: 'listing-1',
      integrationId: 'integration-1',
      connectionId: 'connection-1',
      action: 'relist',
      browserMode: 'headed',
    });
    expect(handleRelistTradera).not.toHaveBeenCalled();
  });

  it('does not show the login window action for non-auth Tradera failures', () => {
    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            failureReason: 'Listing failed.',
            integrationId: 'integration-1',
            connectionId: 'connection-1',
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  errorCategory: 'NAVIGATION',
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.queryByRole('button', { name: 'Open login window' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Sync with Tradera' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check Status' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Relist now' })).toBeInTheDocument();
  });

  it('queues a Tradera sync from the listing actions', async () => {
    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'active',
            integrationId: 'integration-1',
            connectionId: 'connection-1',
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            marketplaceData: null,
          } as never
        }
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sync with Tradera' }));
    fireEvent.click(screen.getByText('Sync (default)'));
    await Promise.resolve();

    expect(handleSyncTradera).toHaveBeenCalledWith('listing-1', {
      integrationId: 'integration-1',
      connectionId: 'connection-1',
    });
  });

  it('queues a Tradera status check from the listing actions', async () => {
    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'active',
            integrationId: 'integration-1',
            connectionId: 'connection-1',
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            marketplaceData: null,
          } as never
        }
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Check Status' }));
    await Promise.resolve();

    expect(handleCheckTraderaStatus).toHaveBeenCalledWith('listing-1');
  });

  it('retries sync after manual login when the last Tradera execution action was sync', async () => {
    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            failureReason: 'Listing failed.',
            integrationId: 'integration-1',
            connectionId: 'connection-1',
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  action: 'sync',
                  errorCategory: 'AUTH',
                },
              },
            },
          } as never
        }
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login and retry sync' }));

    await Promise.resolve();
    expect(handleRecoverTraderaListing).toHaveBeenCalledWith({
      listingId: 'listing-1',
      integrationId: 'integration-1',
      connectionId: 'connection-1',
      action: 'sync',
      browserMode: 'headed',
    });
    expect(handleSyncTradera).not.toHaveBeenCalled();
    expect(handleRelistTradera).not.toHaveBeenCalled();
  });

  it('retries status check after manual login when the last Tradera execution action was check_status', async () => {
    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'active',
            failureReason: 'Listing failed.',
            integrationId: 'integration-1',
            connectionId: 'connection-1',
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  action: 'check_status',
                  errorCategory: 'AUTH',
                },
              },
            },
          } as never
        }
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login and retry status check' }));

    await Promise.resolve();
    expect(handleRecoverTraderaListing).toHaveBeenCalledWith({
      listingId: 'listing-1',
      integrationId: 'integration-1',
      connectionId: 'connection-1',
      action: 'check_status',
      browserMode: 'headed',
    });
    expect(handleSyncTradera).not.toHaveBeenCalled();
    expect(handleRelistTradera).not.toHaveBeenCalled();
  });

  it('keeps the legacy failureReason fallback for older listings without execution metadata', () => {
    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            failureReason: 'Manual login required after captcha verification.',
            integrationId: 'integration-1',
            connectionId: 'connection-1',
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            marketplaceData: null,
          } as never
        }
      />
    );

    expect(screen.getByRole('button', { name: 'Login and retry relist' })).toBeInTheDocument();
  });

  it('shows the login-and-retry action when the raw Tradera execution error indicates auth recovery is needed', () => {
    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            failureReason: 'Listing failed.',
            integrationId: 'integration-1',
            connectionId: 'connection-1',
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  error: 'AUTH_REQUIRED: Stored Tradera session expired and Tradera requires manual verification.',
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.getByRole('button', { name: 'Login and retry relist' })).toBeInTheDocument();
  });

  it('does not show manual-login recovery for duplicate-linked Tradera listings with stale failed status', () => {
    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            failureReason: 'Listing failed.',
            integrationId: 'integration-1',
            connectionId: 'connection-1',
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  errorCategory: 'AUTH',
                  metadata: {
                    latestStage: 'duplicate_linked',
                  },
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.queryByRole('button', { name: 'Login and retry relist' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Sync with Tradera' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check Status' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Relist now' })).toBeInTheDocument();
  });

  it('does not show manual-login recovery when a live Tradera run has already duplicate-linked the listing', () => {
    useTraderaLiveExecutionMock.mockReturnValue({
      runId: 'run-1',
      action: 'relist',
      status: 'running',
      latestStage: 'duplicate_linked',
      latestStageUrl: null,
      executionSteps: [],
      rawResult: {
        stage: 'duplicate_linked',
        duplicateMatchStrategy: 'exact-title-single-candidate',
      },
      logTail: [],
      error: null,
    });

    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            failureReason: 'Listing failed.',
            integrationId: 'integration-1',
            connectionId: 'connection-1',
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  errorCategory: 'AUTH',
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.queryByRole('button', { name: 'Login and retry relist' })).toBeNull();
  });

  it('disables Tradera row actions while a live Tradera run is active', () => {
    useTraderaLiveExecutionMock.mockReturnValue({
      runId: 'run-1',
      action: 'sync',
      status: 'running',
      latestStage: 'fields_filled',
      latestStageUrl: null,
      executionSteps: [],
      rawResult: {
        stage: 'fields_filled',
      },
      logTail: [],
      error: null,
    });

    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'active',
            integrationId: 'integration-1',
            connectionId: 'connection-1',
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            marketplaceData: {
              tradera: {
                pendingExecution: {
                  runId: 'run-1',
                  action: 'sync',
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.getByRole('button', { name: 'Sync with Tradera' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Check Status' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Relist now' })).toBeDisabled();
  });

  it('keeps the persisted queued Tradera relist mode visible after the local spinner clears', () => {
    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'queued_relist',
            integrationId: 'integration-1',
            connectionId: 'connection-1',
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            marketplaceData: {
              tradera: {
                pendingExecution: {
                  requestedBrowserMode: 'headed',
                  requestId: 'job-tradera-1',
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.getByRole('button', { name: 'Queued headed relist' })).toBeDisabled();
  });

  it('shows headed and headless relist actions for Playwright programmable listings', () => {
    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            integrationId: 'integration-playwright-1',
            connectionId: 'connection-playwright-1',
            integration: {
              name: 'Playwright',
              slug: 'playwright-programmable',
            },
            marketplaceData: null,
          } as never
        }
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Relist headless' }));
    expect(handleRelistTradera).toHaveBeenCalledWith('listing-1', {
      browserMode: 'headless',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Relist headed' }));
    expect(handleRelistTradera).toHaveBeenCalledWith('listing-1', {
      browserMode: 'headed',
    });
  });

  it('keeps the selected Playwright relist mode visible while queueing', () => {
    useProductListingsUIStateMock.mockReturnValue({
      exportingListing: null,
      inventoryOverrides: {},
      setInventoryOverrides: vi.fn(),
      savingInventoryId: null,
      deletingFromBase: null,
      purgingListing: null,
      syncingTraderaListing: null,
      checkingTraderaStatusListing: null,
      relistingListing: 'listing-1',
      relistingBrowserMode: 'headed',
      openingTraderaLogin: null,
    });

    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            integrationId: 'integration-playwright-1',
            connectionId: 'connection-playwright-1',
            integration: {
              name: 'Playwright',
              slug: 'playwright-programmable',
            },
            marketplaceData: null,
          } as never
        }
      />
    );

    expect(screen.getByRole('button', { name: 'Queuing headed relist...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Relist headless' })).toBeDisabled();
  });

  it('keeps the persisted queued Playwright relist mode visible after the local spinner clears', () => {
    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-1',
            status: 'queued_relist',
            integrationId: 'integration-playwright-1',
            connectionId: 'connection-playwright-1',
            integration: {
              name: 'Playwright',
              slug: 'playwright-programmable',
            },
            marketplaceData: {
              playwright: {
                pendingExecution: {
                  requestedBrowserMode: 'headed',
                  requestId: 'job-playwright-1',
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.getByRole('button', { name: 'Queued headed relist' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Relist headless' })).toBeDisabled();
  });

  it('dispatches Base re-export from the regular listing modal', () => {
    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-base-1',
            status: 'active',
            connectionId: 'connection-base-1',
            integration: {
              name: 'Base.com',
              slug: 'base-com',
            },
            externalListingId: 'base-product-123',
          } as never
        }
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Re-export product' }));

    expect(handleExportAgain).toHaveBeenCalledWith('listing-base-1');
  });

  it('shows an in-flight label while Base re-export is queueing', () => {
    useProductListingsUIStateMock.mockReturnValue({
      exportingListing: 'listing-base-1',
      inventoryOverrides: {},
      setInventoryOverrides: vi.fn(),
      savingInventoryId: null,
      deletingFromBase: null,
      purgingListing: null,
      syncingTraderaListing: null,
      checkingTraderaStatusListing: null,
      relistingListing: null,
      relistingBrowserMode: null,
      openingTraderaLogin: null,
    });

    render(
      <ProductListingActions
        listing={
          {
            id: 'listing-base-1',
            status: 'active',
            connectionId: 'connection-base-1',
            integration: {
              name: 'Base.com',
              slug: 'base-com',
            },
            externalListingId: 'base-product-123',
          } as never
        }
      />
    );

    expect(screen.getByRole('button', { name: 'Queuing re-export...' })).toBeDisabled();
  });
});
