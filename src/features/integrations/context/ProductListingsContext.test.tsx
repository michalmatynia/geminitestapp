/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { refetchListingsMock, useProductListingsActionsImplMock } = vi.hoisted(() => ({
  refetchListingsMock: vi.fn(),
  useProductListingsActionsImplMock: vi.fn(() => ({
    handleDeleteFromBase: vi.fn(),
    handlePurgeListing: vi.fn(),
    handleSaveInventoryId: vi.fn(),
    handleSyncBaseImages: vi.fn(),
    handleRelistTradera: vi.fn(),
    handleOpenTraderaLogin: vi.fn(),
    handleExportAgain: vi.fn(),
    handleExportImagesOnly: vi.fn(),
    handleImageRetry: vi.fn(),
    refetchListings: vi.fn(),
  })),
}));

vi.mock('@/features/integrations/hooks/useListingQueries', () => ({
  useProductListings: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    refetch: refetchListingsMock,
  }),
}));

vi.mock('./useProductListingsActionsImpl', () => ({
  useProductListingsActionsImpl: useProductListingsActionsImplMock,
}));

import { ProductListingsProvider, useProductListingsModals } from './ProductListingsContext';

function RecoveryContextSummary(): React.JSX.Element {
  const { recoveryContext, filterIntegrationSlug } = useProductListingsModals();

  return (
    <div>
      <div data-testid='filter-integration-slug'>{filterIntegrationSlug ?? 'none'}</div>
      <div data-testid='integration-id'>{recoveryContext?.integrationId ?? 'none'}</div>
      <div data-testid='connection-id'>{recoveryContext?.connectionId ?? 'none'}</div>
      <div data-testid='run-id'>{recoveryContext?.runId ?? 'none'}</div>
    </div>
  );
}

function RecoveryContextUpdater(): React.JSX.Element {
  const { setRecoveryContext } = useProductListingsModals();

  return (
    <button
      type='button'
      onClick={() => {
        setRecoveryContext((current) => ({
          ...(current ?? {
            source: 'tradera_quick_export_failed',
            integrationSlug: 'tradera',
            status: 'failed',
          }),
          integrationId: 'integration-tradera-2',
          connectionId: 'conn-tradera-2',
          runId: 'run-tradera-2',
        }));
      }}
    >
      Enrich recovery context
    </button>
  );
}

describe('ProductListingsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shares recovery-context updates with later consumers in the same open modal', () => {
    render(
      <ProductListingsProvider
        product={
          {
            id: 'product-1',
            name: 'Product 1',
            images: [],
          } as never
        }
        onClose={vi.fn()}
        recoveryContext={{
          source: 'tradera_quick_export_failed',
          integrationSlug: 'tradera',
          status: 'failed',
          runId: null,
        }}
      >
        <RecoveryContextSummary />
        <RecoveryContextUpdater />
      </ProductListingsProvider>
    );

    expect(screen.getByTestId('filter-integration-slug')).toHaveTextContent('tradera');
    expect(screen.getByTestId('integration-id')).toHaveTextContent('none');
    expect(screen.getByTestId('connection-id')).toHaveTextContent('none');
    expect(screen.getByTestId('run-id')).toHaveTextContent('none');

    fireEvent.click(screen.getByRole('button', { name: 'Enrich recovery context' }));

    expect(screen.getByTestId('filter-integration-slug')).toHaveTextContent('tradera');
    expect(screen.getByTestId('integration-id')).toHaveTextContent('integration-tradera-2');
    expect(screen.getByTestId('connection-id')).toHaveTextContent('conn-tradera-2');
    expect(screen.getByTestId('run-id')).toHaveTextContent('run-tradera-2');
  });

  it('keeps an explicit filterIntegrationSlug over recovery-context fallback', () => {
    render(
      <ProductListingsProvider
        product={
          {
            id: 'product-1',
            name: 'Product 1',
            images: [],
          } as never
        }
        onClose={vi.fn()}
        filterIntegrationSlug='playwright-programmable'
        recoveryContext={{
          source: 'tradera_quick_export_failed',
          integrationSlug: 'tradera',
          status: 'failed',
          runId: null,
        }}
      >
        <RecoveryContextSummary />
      </ProductListingsProvider>
    );

    expect(screen.getByTestId('filter-integration-slug')).toHaveTextContent(
      'playwright-programmable'
    );
  });

  it('updates the scoped marketplace when recovery context is added after mount', () => {
    render(
      <ProductListingsProvider
        product={
          {
            id: 'product-1',
            name: 'Product 1',
            images: [],
          } as never
        }
        onClose={vi.fn()}
      >
        <RecoveryContextSummary />
        <RecoveryContextUpdater />
      </ProductListingsProvider>
    );

    expect(screen.getByTestId('filter-integration-slug')).toHaveTextContent('none');

    fireEvent.click(screen.getByRole('button', { name: 'Enrich recovery context' }));

    expect(screen.getByTestId('filter-integration-slug')).toHaveTextContent('tradera');
    expect(screen.getByTestId('integration-id')).toHaveTextContent('integration-tradera-2');
    expect(screen.getByTestId('connection-id')).toHaveTextContent('conn-tradera-2');
    expect(screen.getByTestId('run-id')).toHaveTextContent('run-tradera-2');
  });
});
