import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { persistTraderaQuickListFeedback } from '@/features/products/components/list/columns/buttons/traderaQuickListFeedback';

const { useIntegrationSelectionMock, useProductListingsDataMock, useProductListingsModalsMock } = vi.hoisted(() => ({
  useIntegrationSelectionMock: vi.fn(),
  useProductListingsDataMock: vi.fn(),
  useProductListingsModalsMock: vi.fn(),
}));

vi.mock('@/features/integrations/components/listings/hooks/useIntegrationSelection', () => ({
  useIntegrationSelection: (...args: unknown[]) => useIntegrationSelectionMock(...args),
}));

vi.mock('@/features/integrations/context/ProductListingsContext', () => ({
  useProductListingsData: () => useProductListingsDataMock(),
  useProductListingsModals: () => useProductListingsModalsMock(),
}));

vi.mock('@/shared/ui', () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  IntegrationSelector: () => <div data-testid='integration-selector' />,
  LoadingState: ({ message }: { message?: string }) => <div>{message}</div>,
}));

import {
  ProductListingsViewProvider,
  type ProductListingsViewContextValue,
} from './context/ProductListingsViewContext';
import { ProductListingsStartPanel } from './ProductListingsStartPanel';

const baseViewContextValue: ProductListingsViewContextValue = {
  filteredListings: [],
  statusTargetLabel: 'Integrations',
  filterIntegrationSlug: null,
  isBaseFilter: false,
  showSync: false,
};

describe('ProductListingsStartPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    useProductListingsDataMock.mockReturnValue({
      product: { id: 'product-1' },
    });
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: vi.fn(),
      recoveryContext: null,
    });
    useIntegrationSelectionMock.mockReturnValue({
      integrations: [
        {
          id: 'integration-tradera-1',
          name: 'Tradera',
          slug: 'tradera',
          connections: [{ id: 'conn-tradera-1', name: 'Browser', integrationId: 'integration-tradera-1' }],
        },
      ],
      loading: false,
      selectedIntegrationId: 'integration-tradera-1',
      selectedConnectionId: 'conn-tradera-1',
      selectedIntegration: undefined,
      isBaseComIntegration: false,
      isTraderaIntegration: true,
      setSelectedIntegrationId: vi.fn(),
      setSelectedConnectionId: vi.fn(),
    });
  });

  it('seeds integration selection from Tradera recovery context', () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: vi.fn(),
      recoveryContext: {
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        runId: null,
        integrationId: 'integration-tradera-7',
        connectionId: 'conn-tradera-7',
      },
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          statusTargetLabel: 'Tradera',
          filterIntegrationSlug: 'tradera',
        }}
      >
        <ProductListingsStartPanel />
      </ProductListingsViewProvider>
    );

    expect(useIntegrationSelectionMock).toHaveBeenCalledWith(
      'integration-tradera-7',
      'conn-tradera-7',
      { filterIntegrationSlug: 'tradera' }
    );
  });

  it('falls back to persisted Tradera quick-export feedback when recovery ids are missing', () => {
    persistTraderaQuickListFeedback('product-1', 'failed', {
      requestId: 'job-tradera-persisted',
      integrationId: 'integration-tradera-9',
      connectionId: 'conn-tradera-9',
    });

    useProductListingsModalsMock.mockReturnValue({
      onStartListing: vi.fn(),
      recoveryContext: {
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        runId: null,
        requestId: 'job-tradera-persisted',
      },
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          statusTargetLabel: 'Tradera',
          filterIntegrationSlug: 'tradera',
        }}
      >
        <ProductListingsStartPanel />
      </ProductListingsViewProvider>
    );

    expect(useIntegrationSelectionMock).toHaveBeenCalledWith(
      'integration-tradera-9',
      'conn-tradera-9',
      { filterIntegrationSlug: 'tradera' }
    );
  });

  it('starts listing with the selected integration and connection', () => {
    const onStartListing = vi.fn();
    useProductListingsModalsMock.mockReturnValue({
      onStartListing,
      recoveryContext: null,
    });

    render(
      <ProductListingsViewProvider value={baseViewContextValue}>
        <ProductListingsStartPanel />
      </ProductListingsViewProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'List Product' }));

    expect(onStartListing).toHaveBeenCalledWith('integration-tradera-1', 'conn-tradera-1');
  });

  it('shows marketplace-specific copy for filtered integration flows', () => {
    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          statusTargetLabel: 'Tradera',
          filterIntegrationSlug: 'tradera',
        }}
      >
        <ProductListingsStartPanel />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Tradera options')).toBeInTheDocument();
    expect(screen.getByText('Continue with a Tradera account only.')).toBeInTheDocument();
  });
});
