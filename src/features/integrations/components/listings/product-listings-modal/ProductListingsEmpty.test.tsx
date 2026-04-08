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
  useProductListingsDataMock,
  useProductListingsModalsMock,
  useProductListingsActionsMock,
  useProductListingsUIStateMock,
} = vi.hoisted(() => ({
  handleOpenTraderaLoginMock: vi.fn(),
  handleOpenVintedLoginMock: vi.fn(),
  handleSyncTraderaMock: vi.fn(),
  onStartListingMock: vi.fn(),
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

vi.mock('./ProductListingsSyncPanel', () => ({
  ProductListingsSyncPanel: () => <div data-testid='sync-panel' />,
}));

import {
  ProductListingsViewProvider,
  type ProductListingsViewContextValue,
} from './context/ProductListingsViewContext';
import { ProductListingsEmpty } from './ProductListingsEmpty';

const baseViewContextValue: ProductListingsViewContextValue = {
  filteredListings: [],
  integrationScopeLabel: null,
  statusTargetLabel: 'Base.com',
  filterIntegrationSlug: undefined,
  isScopedMarketplaceFlow: false,
  isBaseFilter: false,
  showSync: false,
};

describe('ProductListingsEmpty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleOpenTraderaLoginMock.mockResolvedValue(true);
    handleOpenVintedLoginMock.mockResolvedValue(true);
    handleSyncTraderaMock.mockResolvedValue(undefined);
    useProductListingsDataMock.mockReturnValue({
      product: { id: 'product-1' },
    });
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: null,
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

  it('renders failed Base.com recovery details when there is no saved listing yet', () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'base_quick_export_failed',
        integrationSlug: 'baselinker',
        status: 'failed',
        runId: 'run-base-failed-99',
      },
    });

    render(
      <ProductListingsViewProvider value={baseViewContextValue}>
        <ProductListingsEmpty />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Previous Base.com export failed')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The one-click export did not create a saved marketplace listing. Review the last failure details below, then use the options above to retry with a connection.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.getByText('run-base-failed-99')).toBeInTheDocument();
  });

  it('renders Tradera quick-export recovery details when no listing record exists yet', async () => {
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
    });

    render(
      <ProductListingsViewProvider value={baseViewContextValue}>
        <ProductListingsEmpty />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Tradera quick export needs recovery')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The one-click Tradera export did not leave behind a usable listing record yet. Open the Tradera login window if needed, then choose whether to relist or sync from this modal.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('auth_required')).toBeInTheDocument();
    expect(screen.getByText('job-tradera-1')).toBeInTheDocument();
    expect(screen.getByText('Queue job')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Login to Tradera' }));
    await Promise.resolve();
    expect(handleOpenTraderaLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-tradera-1',
      'conn-tradera-1'
    );
    expect(onStartListingMock).not.toHaveBeenCalled();
  });

  it('does not continue into listing flow when Tradera manual login fails', async () => {
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
    });

    render(
      <ProductListingsViewProvider value={baseViewContextValue}>
        <ProductListingsEmpty />
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

  it('shows configuration failures without login recovery actions when no listing record exists yet', () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        runId: null,
        requestId: 'job-tradera-config',
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
        failureReason:
          'Tradera export requires an active Tradera category mapping for this product category. Fetch Tradera categories in Category Mapper, map the category, and retry.',
      },
    });

    render(
      <ProductListingsViewProvider value={baseViewContextValue}>
        <ProductListingsEmpty />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Tradera quick export needs recovery')).toBeInTheDocument();
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

  it('shows shipping configuration failures with a shipping-groups action when no listing record exists yet', () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: {
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        runId: null,
        requestId: 'job-tradera-shipping-config',
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
        failureReason:
          'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.',
      },
    });

    render(
      <ProductListingsViewProvider value={baseViewContextValue}>
        <ProductListingsEmpty />
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

  it('renders a Tradera quick-export success banner when the row has not synced yet', () => {
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
          filterIntegrationSlug: 'tradera',
          integrationScopeLabel: 'Tradera',
          statusTargetLabel: 'Tradera',
          isScopedMarketplaceFlow: true,
        }}
      >
        <ProductListingsEmpty />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Tradera quick export completed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open listing' })).toHaveAttribute(
      'href',
      'https://www.tradera.com/item/123'
    );
    expect(screen.queryByText('No listings found')).toBeNull();
    expect(screen.queryByText('Not connected.')).toBeNull();
  });

  it('updates the empty-state success banner immediately when quicklist feedback changes in the same tab', () => {
    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filterIntegrationSlug: 'tradera',
          integrationScopeLabel: 'Tradera',
          statusTargetLabel: 'Tradera',
          isScopedMarketplaceFlow: true,
        }}
      >
        <ProductListingsEmpty />
      </ProductListingsViewProvider>
    );

    expect(screen.queryByText('Tradera quick export completed')).toBeNull();

    act(() => {
      persistTraderaQuickListFeedback('product-1', 'completed', {
        listingId: 'listing-2',
        listingUrl: 'https://www.tradera.com/item/789',
        externalListingId: '789',
      });
    });

    expect(screen.getByText('Tradera quick export completed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open listing' })).toHaveAttribute(
      'href',
      'https://www.tradera.com/item/789'
    );
  });

  it('queues a Tradera sync from the empty-state success banner when feedback includes listing ids', async () => {
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
          filterIntegrationSlug: 'tradera',
          integrationScopeLabel: 'Tradera',
          statusTargetLabel: 'Tradera',
          isScopedMarketplaceFlow: true,
        }}
      >
        <ProductListingsEmpty />
      </ProductListingsViewProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sync with Tradera' }));
    await Promise.resolve();

    expect(handleSyncTraderaMock).toHaveBeenCalledWith('listing-1', {
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
  });

  it('renders duplicate-linked Tradera quick-export success copy when the row has not synced yet', () => {
    persistTraderaQuickListFeedback('product-1', 'completed', {
      listingUrl: 'https://www.tradera.com/item/725447805',
      externalListingId: '725447805',
      completedAt: Date.parse('2026-04-06T09:15:00.000Z'),
      duplicateLinked: true,
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filterIntegrationSlug: 'tradera',
          integrationScopeLabel: 'Tradera',
          statusTargetLabel: 'Tradera',
          isScopedMarketplaceFlow: true,
        }}
      >
        <ProductListingsEmpty />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Tradera existing listing linked')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The product matched an existing Tradera listing and has now been linked in this modal. Use the link below to open the live Tradera item.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/^Linked:/)).toBeInTheDocument();
    expect(screen.queryByText(/^Completed:/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Open listing' })).toHaveAttribute(
      'href',
      'https://www.tradera.com/item/725447805'
    );
  });

  it('renders a Vinted quick-export success banner when the row has not synced yet', () => {
    persistVintedQuickListFeedback('product-1', 'completed', {
      listingId: 'listing-vinted-1',
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
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
          isScopedMarketplaceFlow: true,
        }}
      >
        <ProductListingsEmpty />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Vinted.pl quick export completed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open listing' })).toHaveAttribute(
      'href',
      'https://www.vinted.pl/items/456'
    );
    expect(screen.queryByText('No listings found')).toBeNull();
  });

  it('renders Vinted quick-export recovery details with a Vinted login action when no listing exists yet', async () => {
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
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filterIntegrationSlug: 'vinted',
          integrationScopeLabel: 'Vinted.pl',
          statusTargetLabel: 'Vinted.pl',
          isScopedMarketplaceFlow: true,
        }}
      >
        <ProductListingsEmpty />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Vinted.pl quick export needs recovery')).toBeInTheDocument();
    expect(screen.getByText('auth_required')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Login to Vinted.pl' }));
    await Promise.resolve();
    expect(handleOpenVintedLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-vinted-1',
      'conn-vinted-1'
    );
  });

  it('suppresses Vinted recovery UI when the empty state is explicitly scoped to Tradera', () => {
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
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          filterIntegrationSlug: 'tradera',
          integrationScopeLabel: 'Tradera',
          statusTargetLabel: 'Tradera',
          isScopedMarketplaceFlow: true,
        }}
      >
        <ProductListingsEmpty />
      </ProductListingsViewProvider>
    );

    expect(
      screen.queryByText(/Vinted\.pl quick export needs recovery/i)
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Login to Vinted.pl' })).toBeNull();
    expect(screen.getByText('Tradera status')).toBeInTheDocument();
    expect(screen.getByText('Not connected.')).toBeInTheDocument();
  });
});
