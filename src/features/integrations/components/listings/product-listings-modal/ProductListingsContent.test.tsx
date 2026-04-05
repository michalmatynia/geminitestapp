import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { persistTraderaQuickListFeedback } from '@/features/integrations/utils/traderaQuickListFeedback';

const {
  handleOpenTraderaLoginMock,
  onStartListingMock,
  setRecoveryContextMock,
  useProductListingsDataMock,
  useProductListingsModalsMock,
  useProductListingsActionsMock,
  useProductListingsUIStateMock,
} = vi.hoisted(() => ({
  handleOpenTraderaLoginMock: vi.fn(),
  onStartListingMock: vi.fn(),
  setRecoveryContextMock: vi.fn(),
  useProductListingsDataMock: vi.fn(),
  useProductListingsModalsMock: vi.fn(),
  useProductListingsActionsMock: vi.fn(),
  useProductListingsUIStateMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ProductListingsContext', () => ({
  useProductListingsData: () => useProductListingsDataMock(),
  useProductListingsModals: () => useProductListingsModalsMock(),
  useProductListingsActions: () => useProductListingsActionsMock(),
  useProductListingsUIState: () => useProductListingsUIStateMock(),
}));

vi.mock('./ProductListingItem', () => ({
  renderProductListingItem: ({ listing }: { listing: { id: string } }) => (
    <div data-testid={`listing-${listing.id}`} />
  ),
}));

vi.mock('./ProductListingsSyncPanel', () => ({
  ProductListingsSyncPanel: () => <div data-testid='sync-panel' />,
}));

import {
  ProductListingsViewProvider,
  type ProductListingsViewContextValue,
} from './context/ProductListingsViewContext';
import { ProductListingsContent } from './ProductListingsContent';

const baseViewContextValue: ProductListingsViewContextValue = {
  filteredListings: [
    {
      id: 'listing-1',
      status: 'auth_required',
    } as never,
  ],
  integrationScopeLabel: 'Tradera',
  statusTargetLabel: 'Tradera',
  filterIntegrationSlug: 'tradera',
  isScopedMarketplaceFlow: true,
  isBaseFilter: false,
  showSync: false,
};

describe('ProductListingsContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    handleOpenTraderaLoginMock.mockResolvedValue(true);
    useProductListingsDataMock.mockReturnValue({
      product: { id: 'product-1' },
    });
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: null,
      setRecoveryContext: setRecoveryContextMock,
    });
    useProductListingsActionsMock.mockReturnValue({
      handleOpenTraderaLogin: handleOpenTraderaLoginMock,
    });
    useProductListingsUIStateMock.mockReturnValue({
      openingTraderaLogin: null,
    });
  });

  it('renders a Tradera recovery banner when opened from a Tradera recovery path', async () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'tradera_quick_export_auth_required',
        integrationSlug: 'tradera',
        status: 'auth_required',
        runId: null,
        requestId: 'job-tradera-1',
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
      },
      setRecoveryContext: setRecoveryContextMock,
    });

    render(
      <ProductListingsViewProvider value={baseViewContextValue}>
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText(/Tradera quick export requires recovery/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Login and continue listing' })
    ).toBeInTheDocument();
    expect(screen.getByText('Tradera status: auth_required')).toBeInTheDocument();
    expect(screen.getByText('Queue job:')).toBeInTheDocument();
    expect(screen.getByText('job-tradera-1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Login and continue listing' }));
    await Promise.resolve();
    expect(handleOpenTraderaLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-tradera-1',
      'conn-tradera-1'
    );
    expect(onStartListingMock).toHaveBeenCalledWith(
      'integration-tradera-1',
      'conn-tradera-1',
      { autoSubmit: true }
    );
  });

  it('does not continue into listing flow when login recovery fails', async () => {
    handleOpenTraderaLoginMock.mockResolvedValue(false);
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'tradera_quick_export_auth_required',
        integrationSlug: 'tradera',
        status: 'auth_required',
        runId: null,
        requestId: 'job-tradera-1',
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
      },
      setRecoveryContext: setRecoveryContextMock,
    });

    render(
      <ProductListingsViewProvider value={baseViewContextValue}>
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login and continue listing' }));
    await Promise.resolve();

    expect(handleOpenTraderaLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-tradera-1',
      'conn-tradera-1'
    );
    expect(onStartListingMock).not.toHaveBeenCalled();
  });

  it('falls back to the existing Tradera listing connection when recovery context ids are missing', async () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'tradera_quick_export_auth_required',
        integrationSlug: 'tradera',
        status: 'auth_required',
        runId: null,
        requestId: 'job-tradera-1',
      },
      setRecoveryContext: setRecoveryContextMock,
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [
            {
              id: 'listing-1',
              status: 'auth_required',
              integrationId: 'integration-tradera-1',
              connectionId: 'conn-tradera-1',
              integration: {
                id: 'integration-tradera-1',
                slug: 'tradera',
                name: 'Tradera',
              },
            } as never,
          ],
        }}
      >
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login and continue listing' }));
    await Promise.resolve();

    expect(handleOpenTraderaLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-tradera-1',
      'conn-tradera-1'
    );
    expect(onStartListingMock).toHaveBeenCalledWith(
      'integration-tradera-1',
      'conn-tradera-1',
      { autoSubmit: true }
    );
  });

  it('matches the Tradera recovery listing by queue job when multiple Tradera listings exist', async () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'tradera_quick_export_auth_required',
        integrationSlug: 'tradera',
        status: 'auth_required',
        runId: null,
        requestId: 'job-tradera-target',
      },
      setRecoveryContext: setRecoveryContextMock,
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [
            {
              id: 'listing-1',
              status: 'failed',
              integrationId: 'integration-tradera-1',
              connectionId: 'conn-tradera-1',
              integration: {
                id: 'integration-tradera-1',
                slug: 'tradera',
                name: 'Tradera A',
              },
              marketplaceData: {
                tradera: {
                  lastExecution: {
                    requestId: 'job-tradera-other',
                  },
                },
              },
            } as never,
            {
              id: 'listing-2',
              status: 'auth_required',
              integrationId: 'integration-tradera-2',
              connectionId: 'conn-tradera-2',
              integration: {
                id: 'integration-tradera-2',
                slug: 'tradera',
                name: 'Tradera B',
              },
              marketplaceData: {
                tradera: {
                  lastExecution: {
                    requestId: 'job-tradera-target',
                  },
                },
              },
            } as never,
          ],
        }}
      >
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login and continue listing' }));
    await Promise.resolve();

    expect(handleOpenTraderaLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-tradera-2',
      'conn-tradera-2'
    );
    expect(onStartListingMock).toHaveBeenCalledWith(
      'integration-tradera-2',
      'conn-tradera-2',
      { autoSubmit: true }
    );
    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toContain(
      '"requestId":"job-tradera-target"'
    );
    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toContain(
      '"status":"auth_required"'
    );
    expect(setRecoveryContextMock).toHaveBeenCalled();
  });

  it('matches the Tradera recovery listing by run id when queue job is unavailable', async () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        runId: 'run-tradera-target',
        requestId: null,
      },
      setRecoveryContext: setRecoveryContextMock,
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [
            {
              id: 'listing-1',
              status: 'failed',
              integrationId: 'integration-tradera-1',
              connectionId: 'conn-tradera-1',
              integration: {
                id: 'integration-tradera-1',
                slug: 'tradera',
                name: 'Tradera A',
              },
              marketplaceData: {
                tradera: {
                  lastExecution: {
                    metadata: {
                      runId: 'run-tradera-other',
                    },
                  },
                },
              },
            } as never,
            {
              id: 'listing-2',
              status: 'auth_required',
              integrationId: 'integration-tradera-2',
              connectionId: 'conn-tradera-2',
              integration: {
                id: 'integration-tradera-2',
                slug: 'tradera',
                name: 'Tradera B',
              },
              marketplaceData: {
                tradera: {
                  lastExecution: {
                    metadata: {
                      runId: 'run-tradera-target',
                    },
                  },
                },
              },
            } as never,
          ],
        }}
      >
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login and continue listing' }));
    await Promise.resolve();

    expect(handleOpenTraderaLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-tradera-2',
      'conn-tradera-2'
    );
    expect(onStartListingMock).toHaveBeenCalledWith(
      'integration-tradera-2',
      'conn-tradera-2',
      { autoSubmit: true }
    );
    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toContain(
      '"runId":"run-tradera-target"'
    );
    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toContain(
      '"status":"failed"'
    );
    expect(setRecoveryContextMock).toHaveBeenCalled();
  });

  it('prefers the freshest failed Tradera listing when recovery ids are unavailable', async () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        runId: null,
        requestId: null,
      },
      setRecoveryContext: setRecoveryContextMock,
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [
            {
              id: 'listing-1',
              status: 'failed',
              integrationId: 'integration-tradera-1',
              connectionId: 'conn-tradera-1',
              integration: {
                id: 'integration-tradera-1',
                slug: 'tradera',
                name: 'Tradera A',
              },
              marketplaceData: {
                tradera: {
                  lastExecution: {
                    executedAt: '2026-04-02T16:00:00.000Z',
                  },
                },
              },
            } as never,
            {
              id: 'listing-2',
              status: 'auth_required',
              integrationId: 'integration-tradera-2',
              connectionId: 'conn-tradera-2',
              integration: {
                id: 'integration-tradera-2',
                slug: 'tradera',
                name: 'Tradera B',
              },
              marketplaceData: {
                tradera: {
                  lastExecution: {
                    executedAt: '2026-04-02T18:00:00.000Z',
                  },
                },
              },
            } as never,
            {
              id: 'listing-3',
              status: 'active',
              integrationId: 'integration-tradera-3',
              connectionId: 'conn-tradera-3',
              integration: {
                id: 'integration-tradera-3',
                slug: 'tradera',
                name: 'Tradera C',
              },
              marketplaceData: {
                tradera: {
                  lastExecution: {
                    executedAt: '2026-04-02T19:00:00.000Z',
                  },
                },
              },
            } as never,
          ],
        }}
      >
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login and continue listing' }));
    await Promise.resolve();

    expect(handleOpenTraderaLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-tradera-2',
      'conn-tradera-2'
    );
    expect(onStartListingMock).toHaveBeenCalledWith(
      'integration-tradera-2',
      'conn-tradera-2',
      { autoSubmit: true }
    );
  });

  it('shows the failure reason instead of login recovery actions for non-auth Tradera failures', () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        runId: 'run-tradera-config',
        requestId: 'job-tradera-config',
      },
      setRecoveryContext: setRecoveryContextMock,
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [
            {
              id: 'listing-1',
              status: 'failed',
              failureReason:
                'Tradera export requires an active Tradera category mapping for this product category. Fetch Tradera categories in Category Mapper, map the category, and retry.',
              integrationId: 'integration-tradera-1',
              connectionId: 'conn-tradera-1',
              integration: {
                id: 'integration-tradera-1',
                slug: 'tradera',
                name: 'Tradera',
              },
              marketplaceData: {
                tradera: {
                  lastExecution: {
                    requestId: 'job-tradera-config',
                    errorCategory: 'FORM',
                    error:
                      'Tradera export requires an active Tradera category mapping for this product category. Fetch Tradera categories in Category Mapper, map the category, and retry.',
                    metadata: {
                      runId: 'run-tradera-config',
                    },
                  },
                },
              },
            } as never,
          ],
        }}
      >
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Tradera quick export needs attention')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tradera export requires an active Tradera category mapping for this product category. Fetch Tradera categories in Category Mapper, map the category, and retry.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Login and continue listing' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Open Category Mapper' })).toHaveAttribute(
      'href',
      '/admin/integrations/marketplaces/category-mapper?connectionId=conn-tradera-1'
    );
  });

  it('shows a shipping-groups action for Tradera shipping configuration failures', () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        runId: 'run-tradera-shipping-config',
        requestId: 'job-tradera-shipping-config',
      },
      setRecoveryContext: setRecoveryContextMock,
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [
            {
              id: 'listing-1',
              status: 'failed',
              failureReason:
                'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.',
              integrationId: 'integration-tradera-1',
              connectionId: 'conn-tradera-1',
              integration: {
                id: 'integration-tradera-1',
                slug: 'tradera',
                name: 'Tradera',
              },
              marketplaceData: {
                tradera: {
                  lastExecution: {
                    requestId: 'job-tradera-shipping-config',
                    errorCategory: 'FORM',
                    error:
                      'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.',
                    metadata: {
                      runId: 'run-tradera-shipping-config',
                    },
                  },
                },
              },
            } as never,
          ],
        }}
      >
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    expect(
      screen.getByText(
        'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Login and continue listing' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Open Shipping Groups' })).toHaveAttribute(
      'href',
      '/admin/products/settings?section=shipping-groups'
    );
  });

  it('renders a Tradera quick-export success banner with the published listing link', () => {
    persistTraderaQuickListFeedback('product-1', 'completed', {
      listingId: 'listing-1',
      listingUrl: 'https://www.tradera.com/item/123',
      externalListingId: '123',
      completedAt: Date.parse('2026-04-02T11:20:00.000Z'),
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [
            {
              id: 'listing-1',
              status: 'active',
              externalListingId: '123',
              integration: {
                id: 'integration-tradera-1',
                slug: 'tradera',
                name: 'Tradera',
              },
              connection: {
                id: 'conn-tradera-1',
                name: 'Tradera Browser',
              },
              marketplaceData: {
                listingUrl: 'https://www.tradera.com/item/123',
              },
            } as never,
          ],
        }}
      >
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Tradera quick export completed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open listing' })).toHaveAttribute(
      'href',
      'https://www.tradera.com/item/123'
    );
  });
});
