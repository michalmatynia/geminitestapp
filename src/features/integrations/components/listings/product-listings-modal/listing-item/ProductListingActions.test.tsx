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
} = vi.hoisted(() => ({
  useProductListingsUIStateMock: vi.fn(),
  useProductListingsActionsMock: vi.fn(),
  useProductListingsModalsMock: vi.fn(),
  useImageRetryPresetsMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ProductListingsContext', () => ({
  useProductListingsUIState: () => useProductListingsUIStateMock(),
  useProductListingsActions: () => useProductListingsActionsMock(),
  useProductListingsModals: () => useProductListingsModalsMock(),
}));

vi.mock('@/features/integrations/components/listings/useImageRetryPresets', () => ({
  useImageRetryPresets: () => useImageRetryPresetsMock(),
}));

import { ProductListingActions } from './ProductListingActions';

describe('ProductListingActions', () => {
  const handleOpenTraderaLogin = vi.fn();
  const handleRelistTradera = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    handleOpenTraderaLogin.mockResolvedValue(true);
    handleRelistTradera.mockResolvedValue(undefined);
    useImageRetryPresetsMock.mockReturnValue([]);
    useProductListingsUIStateMock.mockReturnValue({
      exportingListing: null,
      inventoryOverrides: {},
      setInventoryOverrides: vi.fn(),
      savingInventoryId: null,
      deletingFromBase: null,
      purgingListing: null,
      relistingListing: null,
      relistingBrowserMode: null,
      openingTraderaLogin: null,
    });
    useProductListingsActionsMock.mockReturnValue({
      handleExportAgain: vi.fn(),
      handleExportImagesOnly: vi.fn(),
      handleSaveInventoryId: vi.fn(),
      handleRelistTradera,
      handleOpenTraderaLogin,
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
    expect(handleOpenTraderaLogin).toHaveBeenCalledWith(
      'listing-1',
      'integration-1',
      'connection-1'
    );
    expect(handleRelistTradera).toHaveBeenCalledWith('listing-1', {
      browserMode: 'headed',
      skipSessionPreflight: true,
    });
  });

  it('does not queue relist when manual login recovery fails', async () => {
    handleOpenTraderaLogin.mockResolvedValue(false);

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

    expect(handleOpenTraderaLogin).toHaveBeenCalledWith(
      'listing-1',
      'integration-1',
      'connection-1'
    );
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
    expect(screen.getByRole('button', { name: 'Relist now' })).toBeInTheDocument();
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
});
