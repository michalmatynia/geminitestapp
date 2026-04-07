/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { persistTraderaQuickListFeedback } from '@/features/integrations/utils/traderaQuickListFeedback';
import { persistVintedQuickListFeedback } from '@/features/integrations/utils/vintedQuickListFeedback';

const {
  refetchListingsMock,
  useProductListingsActionsImplMock,
  useTraderaQuickExportPollingMock,
  useVintedQuickExportPollingMock,
} = vi.hoisted(() => ({
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
  useTraderaQuickExportPollingMock: vi.fn(),
  useVintedQuickExportPollingMock: vi.fn(),
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

vi.mock(
  '@/features/integrations/hooks/useTraderaQuickExportPolling',
  () => ({
    useTraderaQuickExportPolling: useTraderaQuickExportPollingMock,
  })
);

vi.mock(
  '@/features/integrations/hooks/useVintedQuickExportPolling',
  () => ({
    useVintedQuickExportPolling: useVintedQuickExportPollingMock,
  })
);

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
    window.sessionStorage.clear();
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

  it('preserves enriched recovery details when the parent rerenders with the same weaker recovery context', () => {
    const initialRecoveryContext = {
      source: 'tradera_quick_export_failed' as const,
      integrationSlug: 'tradera' as const,
      status: 'failed',
      runId: null,
    };

    const { rerender } = render(
      <ProductListingsProvider
        product={
          {
            id: 'product-1',
            name: 'Product 1',
            images: [],
          } as never
        }
        onClose={vi.fn()}
        recoveryContext={initialRecoveryContext}
      >
        <RecoveryContextSummary />
        <RecoveryContextUpdater />
      </ProductListingsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enrich recovery context' }));

    expect(screen.getByTestId('integration-id')).toHaveTextContent('integration-tradera-2');
    expect(screen.getByTestId('connection-id')).toHaveTextContent('conn-tradera-2');
    expect(screen.getByTestId('run-id')).toHaveTextContent('run-tradera-2');

    rerender(
      <ProductListingsProvider
        product={
          {
            id: 'product-1',
            name: 'Product 1',
            images: [],
          } as never
        }
        onClose={vi.fn()}
        recoveryContext={{ ...initialRecoveryContext }}
      >
        <RecoveryContextSummary />
        <RecoveryContextUpdater />
      </ProductListingsProvider>
    );

    expect(screen.getByTestId('integration-id')).toHaveTextContent('integration-tradera-2');
    expect(screen.getByTestId('connection-id')).toHaveTextContent('conn-tradera-2');
    expect(screen.getByTestId('run-id')).toHaveTextContent('run-tradera-2');
  });

  it('updates the recovery banner state when Tradera quicklist feedback fails in the same tab', () => {
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
      </ProductListingsProvider>
    );

    act(() => {
      persistTraderaQuickListFeedback('product-1', 'failed', {
        runId: 'run-tradera-feedback',
        requestId: 'job-tradera-feedback',
        integrationId: 'integration-tradera-feedback',
        connectionId: 'conn-tradera-feedback',
        failureReason: 'Shipping configuration failed.',
      });
    });

    expect(screen.getByTestId('filter-integration-slug')).toHaveTextContent('tradera');
    expect(screen.getByTestId('integration-id')).toHaveTextContent(
      'integration-tradera-feedback'
    );
    expect(screen.getByTestId('connection-id')).toHaveTextContent(
      'conn-tradera-feedback'
    );
    expect(screen.getByTestId('run-id')).toHaveTextContent('run-tradera-feedback');
  });

  it('updates the recovery banner state when Vinted quicklist feedback fails in the same tab', () => {
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
      </ProductListingsProvider>
    );

    act(() => {
      persistVintedQuickListFeedback('product-1', 'failed', {
        runId: 'run-vinted-feedback',
        requestId: 'job-vinted-feedback',
        integrationId: 'integration-vinted-feedback',
        connectionId: 'conn-vinted-feedback',
        failureReason: 'Session expired.',
      });
    });

    expect(screen.getByTestId('filter-integration-slug')).toHaveTextContent('vinted');
    expect(screen.getByTestId('integration-id')).toHaveTextContent(
      'integration-vinted-feedback'
    );
    expect(screen.getByTestId('connection-id')).toHaveTextContent(
      'conn-vinted-feedback'
    );
    expect(screen.getByTestId('run-id')).toHaveTextContent('run-vinted-feedback');
  });
});
