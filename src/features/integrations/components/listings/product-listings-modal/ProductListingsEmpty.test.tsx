import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  handleOpenTraderaLoginMock,
  onStartListingMock,
  useProductListingsModalsMock,
  useProductListingsActionsMock,
  useProductListingsUIStateMock,
} = vi.hoisted(() => ({
  handleOpenTraderaLoginMock: vi.fn(),
  onStartListingMock: vi.fn(),
  useProductListingsModalsMock: vi.fn(),
  useProductListingsActionsMock: vi.fn(),
  useProductListingsUIStateMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ProductListingsContext', () => ({
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
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: onStartListingMock,
      recoveryContext: null,
    });
    useProductListingsActionsMock.mockReturnValue({
      handleOpenTraderaLogin: handleOpenTraderaLoginMock,
    });
    useProductListingsUIStateMock.mockReturnValue({
      openingTraderaLogin: null,
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
        'The last Base.com one-click export failed before a listing record was created. Use the options above to retry or choose a different connection.'
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
        'The last Tradera quick export stopped before a stable listing record was available. Open the Tradera login window if needed, then continue the Tradera listing flow from this modal.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('auth_required')).toBeInTheDocument();
    expect(screen.getByText('job-tradera-1')).toBeInTheDocument();
    expect(screen.getByText('Queue job')).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: 'Login and continue listing' }));
    await Promise.resolve();

    expect(handleOpenTraderaLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-tradera-1',
      'conn-tradera-1'
    );
    expect(onStartListingMock).not.toHaveBeenCalled();
  });
});
