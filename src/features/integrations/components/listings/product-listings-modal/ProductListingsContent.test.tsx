import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { persistTraderaQuickListFeedback } from '@/features/integrations/utils/traderaQuickListFeedback';
import { persistVintedQuickListFeedback } from '@/features/integrations/utils/vintedQuickListFeedback';

const {
  handleOpenTraderaLoginMock,
  handleOpenVintedLoginMock,
  handleSyncTraderaMock,
  onStartListingMock,
  setRecoveryContextMock,
  useTraderaLiveExecutionMock,
  useProductListingsDataMock,
  useProductListingsModalsMock,
  useProductListingsActionsMock,
  useProductListingsUIStateMock,
} = vi.hoisted(() => ({
  handleOpenTraderaLoginMock: vi.fn(),
  handleOpenVintedLoginMock: vi.fn(),
  handleSyncTraderaMock: vi.fn(),
  onStartListingMock: vi.fn(),
  setRecoveryContextMock: vi.fn(),
  useTraderaLiveExecutionMock: vi.fn(),
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

vi.mock('@/features/integrations/hooks/useTraderaLiveExecution', () => ({
  useTraderaLiveExecution: () => useTraderaLiveExecutionMock(),
}));

vi.mock('./ProductListingItem', () => ({
  renderProductListingItem: ({
    listing,
  }: {
    listing: { id: string; status?: string | null };
  }) => (
    <div data-testid={`listing-${listing.id}`}>{listing.status ?? 'unknown'}</div>
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
    handleOpenVintedLoginMock.mockResolvedValue(true);
    handleSyncTraderaMock.mockResolvedValue(undefined);
    useTraderaLiveExecutionMock.mockReturnValue(null);
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
      handleOpenVintedLogin: handleOpenVintedLoginMock,
      handleSyncTradera: handleSyncTraderaMock,
    });
    useProductListingsUIStateMock.mockReturnValue({
      openingTraderaLogin: null,
      openingVintedLogin: null,
      syncingTraderaListing: null,
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
      screen.getByRole('button', { name: 'Login to Tradera' })
    ).toBeInTheDocument();
    expect(screen.getByText('Tradera status: auth_required')).toBeInTheDocument();
    expect(screen.getByText('Queue job:')).toBeInTheDocument();
    expect(screen.getByText('job-tradera-1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Login to Tradera' }));
    await Promise.resolve();
    expect(handleOpenTraderaLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-tradera-1',
      'conn-tradera-1'
    );
    expect(onStartListingMock).not.toHaveBeenCalled();
  });

  it('shows failed Tradera run logs and history from the recovery run id when no listing row is available', () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        runId: 'run-tradera-failed',
        requestId: 'job-tradera-failed',
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
        failureReason: 'Published listing could not be confirmed in Active listings.',
      },
      setRecoveryContext: setRecoveryContextMock,
    });
    useTraderaLiveExecutionMock.mockReturnValue({
      runId: 'run-tradera-failed',
      action: 'list',
      status: 'failed',
      latestStage: 'publish_verify',
      latestStageUrl: 'https://www.tradera.com/en/my/active',
      requestedSelectorProfile: null,
      resolvedSelectorProfile: null,
      executionSteps: [
        {
          id: 'publish_verify',
          label: 'Verify published listing',
          status: 'error',
          message: 'Published listing could not be confirmed in Active listings.',
        },
      ],
      rawResult: {
        stage: 'publish_verify',
      },
      logTail: ['[user] tradera.quicklist.publish.verify.failed'],
      failureArtifacts: [
        {
          name: 'final.png',
          path: '/tmp/final.png',
          kind: 'screenshot',
          mimeType: 'image/png',
        },
      ],
      runtimePosture: {
        browser: {
          label: 'Brave',
        },
      },
      error: 'FAIL_PUBLISH_VERIFICATION',
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [],
        }}
      >
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Browser run history')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open run history' })).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?query=run-tradera-failed'
    );
    expect(screen.getByText('Failed run steps')).toBeInTheDocument();
    expect(screen.getByText('Verify published listing')).toBeInTheDocument();
    expect(screen.getByText('Tradera failure diagnostics')).toBeInTheDocument();
    expect(
      screen.getByText(/\[user\] tradera\.quicklist\.publish\.verify\.failed/)
    ).toBeInTheDocument();
    expect(screen.getByText(/FAIL_PUBLISH_VERIFICATION/)).toBeInTheDocument();
  });

  it('keeps the failed Tradera run history link visible while diagnostics are unavailable', () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        runId: 'run-tradera-loading',
        requestId: 'job-tradera-loading',
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
        failureReason: 'Published listing could not be confirmed in Active listings.',
      },
      setRecoveryContext: setRecoveryContextMock,
    });
    useTraderaLiveExecutionMock.mockReturnValue(null);

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [],
        }}
      >
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Browser run history')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open run history' })).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?query=run-tradera-loading'
    );
    expect(screen.getByText(/Run diagnostics are loading or unavailable/)).toBeInTheDocument();
  });

  it('renders a Base recovery banner in the listings content when a failed Base export is being recovered', () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'base_quick_export_failed',
        integrationSlug: 'baselinker',
        status: 'failed',
        runId: 'run-base-1',
        failureReason:
          'No Base.com category mapping found for internal category "69da99b1855cd0bfc9a2ab81". Map this category in Category Mapper first.',
      },
      setRecoveryContext: setRecoveryContextMock,
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filterIntegrationSlug: 'baselinker',
          integrationScopeLabel: 'Base.com',
          statusTargetLabel: 'Base.com',
          isBaseFilter: true,
          filteredListings: [
            {
              id: 'listing-base-1',
              status: 'failed',
            } as never,
          ],
        }}
      >
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText(/Previous Base\.com export failed/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        'No Base.com category mapping found for internal category "69da99b1855cd0bfc9a2ab81". Map this category in Category Mapper first.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Base.com status: failed')).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: 'Login to Tradera' }));
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

    fireEvent.click(screen.getByRole('button', { name: 'Login to Tradera' }));
    await Promise.resolve();

    expect(handleOpenTraderaLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-tradera-1',
      'conn-tradera-1'
    );
    expect(onStartListingMock).not.toHaveBeenCalled();
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

    fireEvent.click(screen.getByRole('button', { name: 'Login to Tradera' }));
    await Promise.resolve();

    expect(handleOpenTraderaLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-tradera-2',
      'conn-tradera-2'
    );
    expect(onStartListingMock).not.toHaveBeenCalled();
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

    fireEvent.click(screen.getByRole('button', { name: 'Login to Tradera' }));
    await Promise.resolve();

    expect(handleOpenTraderaLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-tradera-2',
      'conn-tradera-2'
    );
    expect(onStartListingMock).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toContain(
      '"runId":"run-tradera-target"'
    );
    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toContain(
      '"status":"failed"'
    );
    expect(setRecoveryContextMock).toHaveBeenCalled();
  });

  it('prefers the latest checked Tradera status in the scoped panel and rendered listing rows', () => {
    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [
            {
              id: 'listing-tradera-check-status',
              status: 'active',
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
                    action: 'check_status',
                    metadata: {
                      checkedStatus: 'unknown',
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

    expect(screen.getByText('Tradera status: unknown')).toBeInTheDocument();
    expect(screen.getByTestId('listing-listing-tradera-check-status')).toHaveTextContent(
      'unknown'
    );
    expect(screen.queryByText('Tradera status: active')).toBeNull();
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

    fireEvent.click(screen.getByRole('button', { name: 'Login to Tradera' }));
    await Promise.resolve();

    expect(handleOpenTraderaLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-tradera-2',
      'conn-tradera-2'
    );
    expect(onStartListingMock).not.toHaveBeenCalled();
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
    expect(screen.queryByRole('button', { name: 'Login to Tradera' })).toBeNull();
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
    expect(screen.queryByRole('button', { name: 'Login to Tradera' })).toBeNull();
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

  it('updates the success banner immediately when quicklist feedback is persisted in the same tab', () => {
    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [],
        }}
      >
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    expect(screen.queryByText('Tradera quick export completed')).toBeNull();

    act(() => {
      persistTraderaQuickListFeedback('product-1', 'completed', {
        listingId: 'listing-1',
        listingUrl: 'https://www.tradera.com/item/456',
        externalListingId: '456',
      });
    });

    expect(screen.getByText('Tradera quick export completed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open listing' })).toHaveAttribute(
      'href',
      'https://www.tradera.com/item/456'
    );
  });

  it('queues a Tradera sync from the quick-export success banner when the listing row is available', async () => {
    persistTraderaQuickListFeedback('product-1', 'completed', {
      listingId: 'listing-1',
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
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
              integrationId: 'integration-tradera-1',
              connectionId: 'conn-tradera-1',
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

    fireEvent.click(screen.getByRole('button', { name: 'Sync with Tradera' }));
    await Promise.resolve();

    expect(handleSyncTraderaMock).toHaveBeenCalledWith('listing-1', {
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
  });

  it('renders duplicate-linked Tradera quick-export copy when an existing listing was linked', () => {
    persistTraderaQuickListFeedback('product-1', 'completed', {
      listingId: 'listing-1',
      listingUrl: 'https://www.tradera.com/item/725447805',
      externalListingId: '725447805',
      completedAt: Date.parse('2026-04-06T09:15:00.000Z'),
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [
            {
              id: 'listing-1',
              status: 'active',
              externalListingId: '725447805',
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
                listingUrl: 'https://www.tradera.com/item/725447805',
                tradera: {
                  lastExecution: {
                    metadata: {
                      duplicateLinked: true,
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

    expect(screen.getByText('Tradera existing listing linked')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The product is now linked to an existing Tradera listing. Open the live Tradera item directly from here.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/^Linked:/)).toBeInTheDocument();
    expect(screen.queryByText(/^Completed:/)).toBeNull();
  });

  it('renders exact-title relist copy when a Tradera duplicate was linked from one exact match', () => {
    persistTraderaQuickListFeedback('product-1', 'completed', {
      listingId: 'listing-1',
      listingUrl: 'https://www.tradera.com/item/725447805',
      externalListingId: '725447805',
      completedAt: Date.parse('2026-04-06T09:15:00.000Z'),
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [
            {
              id: 'listing-1',
              status: 'active',
              externalListingId: '725447805',
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
                listingUrl: 'https://www.tradera.com/item/725447805',
                tradera: {
                  lastExecution: {
                    metadata: {
                      duplicateLinked: true,
                      duplicateMatchStrategy: 'exact-title-single-candidate',
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

    expect(screen.getByText('Tradera relist matched an existing listing')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Relist linked the single exact-title Tradera match instead of creating a new listing. Open the matched Tradera item directly from here.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/^Linked:/)).toBeInTheDocument();
  });

  it('renders exact-title relist copy when the synced listing only preserves duplicate strategy in rawResult', () => {
    persistTraderaQuickListFeedback('product-1', 'completed', {
      listingId: 'listing-1',
      listingUrl: 'https://www.tradera.com/item/725447805',
      externalListingId: '725447805',
      completedAt: Date.parse('2026-04-06T09:15:00.000Z'),
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [
            {
              id: 'listing-1',
              status: 'active',
              externalListingId: '725447805',
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
                listingUrl: 'https://www.tradera.com/item/725447805',
                tradera: {
                  lastExecution: {
                    metadata: {
                      rawResult: {
                        duplicateLinked: true,
                        duplicateMatchStrategy: 'exact-title-single-candidate',
                      },
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

    expect(screen.getByText('Tradera relist matched an existing listing')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Relist linked the single exact-title Tradera match instead of creating a new listing. Open the matched Tradera item directly from here.'
      )
    ).toBeInTheDocument();
  });

  it('renders exact-title relist copy when only persisted feedback preserves duplicate strategy in rawResult', () => {
    persistTraderaQuickListFeedback('product-1', 'completed', {
      listingId: 'listing-1',
      listingUrl: 'https://www.tradera.com/item/725447805',
      externalListingId: '725447805',
      completedAt: Date.parse('2026-04-06T09:15:00.000Z'),
      metadata: {
        rawResult: {
          duplicateMatchStrategy: 'exact-title-single-candidate',
        },
      },
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filteredListings: [
            {
              id: 'listing-1',
              status: 'active',
              externalListingId: '725447805',
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
                listingUrl: 'https://www.tradera.com/item/725447805',
                tradera: {
                  lastExecution: {
                    metadata: {},
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

    expect(screen.getByText('Tradera relist matched an existing listing')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Relist linked the single exact-title Tradera match instead of creating a new listing. Open the matched Tradera item directly from here.'
      )
    ).toBeInTheDocument();
  });

  it('shows active status immediately in the modal when quick export has completed but the server row is still queued', () => {
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
              status: 'queued',
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

    expect(screen.getByText('Tradera status: active')).toBeInTheDocument();
    expect(screen.getByTestId('listing-listing-1')).toHaveTextContent('active');
  });

  it('suppresses stale Tradera recovery UI when the live run has already duplicate-linked the listing', () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'tradera_quick_export_auth_required',
        integrationSlug: 'tradera',
        status: 'auth_required',
        runId: 'run-tradera-live',
        requestId: 'job-tradera-live',
      },
      setRecoveryContext: setRecoveryContextMock,
    });
    useTraderaLiveExecutionMock.mockReturnValue({
      runId: 'run-tradera-live',
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
              marketplaceData: {
                tradera: {
                  pendingExecution: {
                    runId: 'run-tradera-live',
                    action: 'relist',
                  },
                  lastExecution: {
                    requestId: 'job-tradera-live',
                    metadata: {
                      runId: 'run-tradera-live',
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

    expect(screen.queryByText(/Tradera quick export requires recovery/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Login to Tradera' })).toBeNull();
    expect(screen.getByText('Tradera status: active')).toBeInTheDocument();
    expect(screen.getByTestId('listing-listing-1')).toHaveTextContent('active');
    expect(setRecoveryContextMock).toHaveBeenCalled();
    const updater = setRecoveryContextMock.mock.calls.at(-1)?.[0];
    expect(typeof updater).toBe('function');
    expect(
      updater({
        source: 'tradera_quick_export_auth_required',
        integrationSlug: 'tradera',
        status: 'auth_required',
        runId: 'run-tradera-live',
        requestId: 'job-tradera-live',
      })
    ).toBeNull();
  });

  it('renders a Vinted quick-export success banner when a completed Vinted listing is tracked', () => {
    persistVintedQuickListFeedback('product-1', 'completed', {
      listingId: 'listing-vinted-1',
      listingUrl: 'https://www.vinted.pl/items/456',
      externalListingId: '456',
      completedAt: Date.parse('2026-04-02T11:20:00.000Z'),
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filterIntegrationSlug: 'vinted',
          integrationScopeLabel: 'Vinted.pl',
          statusTargetLabel: 'Vinted.pl',
          filteredListings: [
            {
              id: 'listing-vinted-1',
              status: 'active',
              externalListingId: '456',
              integration: {
                id: 'integration-vinted-1',
                slug: 'vinted',
                name: 'Vinted.pl',
              },
              connection: {
                id: 'conn-vinted-1',
                name: 'Vinted Browser',
              },
              marketplaceData: {
                listingUrl: 'https://www.vinted.pl/items/456',
              },
            } as never,
          ],
        }}
      >
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Vinted.pl quick export completed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open listing' })).toHaveAttribute(
      'href',
      'https://www.vinted.pl/items/456'
    );
  });

  it('shows active status immediately in the modal when Vinted quick export has completed but the server row is still queued', () => {
    persistVintedQuickListFeedback('product-1', 'completed', {
      listingId: 'listing-vinted-1',
      listingUrl: 'https://www.vinted.pl/items/456',
      externalListingId: '456',
      completedAt: Date.parse('2026-04-02T11:20:00.000Z'),
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filterIntegrationSlug: 'vinted',
          integrationScopeLabel: 'Vinted.pl',
          statusTargetLabel: 'Vinted.pl',
          filteredListings: [
            {
              id: 'listing-vinted-1',
              status: 'queued',
              externalListingId: '456',
              integration: {
                id: 'integration-vinted-1',
                slug: 'vinted',
                name: 'Vinted.pl',
              },
              connection: {
                id: 'conn-vinted-1',
                name: 'Vinted Browser',
              },
              marketplaceData: {
                listingUrl: 'https://www.vinted.pl/items/456',
                vinted: {
                  lastExecution: {
                    requestId: 'job-vinted-1',
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

    expect(screen.getByText('Vinted.pl status: active')).toBeInTheDocument();
    expect(screen.getByTestId('listing-listing-vinted-1')).toHaveTextContent('active');
  });

  it('renders a Vinted recovery banner with a Vinted login action when opened from a Vinted recovery path', async () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'vinted_quick_export_auth_required',
        integrationSlug: 'vinted',
        status: 'auth_required',
        runId: null,
        requestId: 'job-vinted-1',
        integrationId: 'integration-vinted-1',
        connectionId: 'conn-vinted-1',
      },
      setRecoveryContext: setRecoveryContextMock,
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filterIntegrationSlug: 'vinted',
          integrationScopeLabel: 'Vinted.pl',
          statusTargetLabel: 'Vinted.pl',
          filteredListings: [
            {
              id: 'listing-vinted-1',
              status: 'auth_required',
              integrationId: 'integration-vinted-1',
              connectionId: 'conn-vinted-1',
              integration: {
                id: 'integration-vinted-1',
                slug: 'vinted',
                name: 'Vinted.pl',
              },
              connection: {
                id: 'conn-vinted-1',
                name: 'Vinted Browser',
              },
            } as never,
          ],
        }}
      >
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText(/Vinted\.pl quick export requires recovery/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Login to Vinted.pl' }));
    await Promise.resolve();
    expect(handleOpenVintedLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-vinted-1',
      'conn-vinted-1'
    );
  });

  it('falls back to the existing Vinted listing connection when recovery context ids are missing', async () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'vinted_quick_export_auth_required',
        integrationSlug: 'vinted',
        status: 'auth_required',
        runId: null,
        requestId: 'job-vinted-1',
      },
      setRecoveryContext: setRecoveryContextMock,
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filterIntegrationSlug: 'vinted',
          integrationScopeLabel: 'Vinted.pl',
          statusTargetLabel: 'Vinted.pl',
          filteredListings: [
            {
              id: 'listing-vinted-1',
              status: 'auth_required',
              integrationId: 'integration-vinted-1',
              connectionId: 'conn-vinted-1',
              failureReason:
                'AUTH_REQUIRED: Stored Vinted session expired and Vinted requires manual verification.',
              integration: {
                id: 'integration-vinted-1',
                slug: 'vinted',
                name: 'Vinted.pl',
              },
              connection: {
                id: 'conn-vinted-1',
                name: 'Vinted Browser',
              },
              marketplaceData: {
                vinted: {
                  lastExecution: {
                    requestId: 'job-vinted-1',
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

    fireEvent.click(screen.getByRole('button', { name: 'Login to Vinted.pl' }));
    await Promise.resolve();

    expect(handleOpenVintedLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-vinted-1',
      'conn-vinted-1'
    );
  });

  it('suppresses Vinted recovery UI when the listings view is explicitly scoped to Tradera', () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'vinted_quick_export_auth_required',
        integrationSlug: 'vinted',
        status: 'auth_required',
        runId: null,
        requestId: 'job-vinted-1',
        integrationId: 'integration-vinted-1',
        connectionId: 'conn-vinted-1',
      },
      setRecoveryContext: setRecoveryContextMock,
    });

    render(
      <ProductListingsViewProvider value={baseViewContextValue}>
        <ProductListingsContent />
      </ProductListingsViewProvider>
    );

    expect(
      screen.queryByText(/Vinted\.pl quick export requires recovery/i)
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Login to Vinted.pl' })).toBeNull();
    expect(screen.getByText('Tradera status: auth_required')).toBeInTheDocument();
  });
});
