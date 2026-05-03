/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { persistTraderaQuickListFeedback } from '@/features/integrations/utils/traderaQuickListFeedback';
import { persistVintedQuickListFeedback } from '@/features/integrations/utils/vintedQuickListFeedback';

const {
  getAiPathRunMock,
  listAiPathRunsMock,
  refetchListingsMock,
  useProductListingsActionsImplMock,
  useTraderaQuickExportPollingMock,
  useVintedQuickExportPollingMock,
} = vi.hoisted(() => ({
  getAiPathRunMock: vi.fn(),
  listAiPathRunsMock: vi.fn(),
  refetchListingsMock: vi.fn(),
  useProductListingsActionsImplMock: vi.fn(() => ({
    handleDeleteFromBase: vi.fn(),
    handlePurgeListing: vi.fn(),
    handleSaveInventoryId: vi.fn(),
    handleSyncBaseImages: vi.fn(),
    handleCheckTraderaStatus: vi.fn(),
    handleRelistTradera: vi.fn(),
    handleOpenTraderaLogin: vi.fn(),
    handleOpenVintedLogin: vi.fn(),
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

vi.mock('@/shared/lib/ai-paths/api/client', () => ({
  getAiPathRun: (...args: unknown[]) => getAiPathRunMock(...args),
  listAiPathRuns: (...args: unknown[]) => listAiPathRunsMock(...args),
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
      <div data-testid='failure-reason'>
        {recoveryContext && 'failureReason' in recoveryContext
          ? recoveryContext.failureReason ?? 'none'
          : 'none'}
      </div>
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
    getAiPathRunMock.mockResolvedValue({
      ok: false,
      error: 'not found',
    });
    listAiPathRunsMock.mockResolvedValue({
      ok: true,
      data: { runs: [] },
    });
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

  it('does not hydrate Tradera recovery context from duplicate-linked feedback that still carries stale failed status', () => {
    act(() => {
      persistTraderaQuickListFeedback('product-1', 'failed', {
        runId: 'run-tradera-feedback',
        requestId: 'job-tradera-feedback',
        integrationId: 'integration-tradera-feedback',
        connectionId: 'conn-tradera-feedback',
        failureReason: 'Old failed state.',
        metadata: {
          rawResult: {
            duplicateMatchStrategy: 'exact-title-single-candidate',
          },
        },
      });
    });

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

    expect(screen.getByTestId('filter-integration-slug')).toHaveTextContent('none');
    expect(screen.getByTestId('integration-id')).toHaveTextContent('none');
    expect(screen.getByTestId('connection-id')).toHaveTextContent('none');
    expect(screen.getByTestId('run-id')).toHaveTextContent('none');
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

  it('ignores stale Vinted quicklist feedback when the modal is explicitly scoped to Tradera', () => {
    act(() => {
      persistVintedQuickListFeedback('product-1', 'failed', {
        runId: 'run-vinted-feedback',
        requestId: 'job-vinted-feedback',
        integrationId: 'integration-vinted-feedback',
        connectionId: 'conn-vinted-feedback',
        failureReason: 'Session expired.',
      });
    });

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
        filterIntegrationSlug='tradera'
      >
        <RecoveryContextSummary />
      </ProductListingsProvider>
    );

    expect(screen.getByTestId('filter-integration-slug')).toHaveTextContent('tradera');
    expect(screen.getByTestId('integration-id')).toHaveTextContent('none');
    expect(screen.getByTestId('connection-id')).toHaveTextContent('none');
    expect(screen.getByTestId('run-id')).toHaveTextContent('none');
  });

  it('suppresses stale incoming Tradera recovery context on mount when persisted feedback already normalized it to completed', () => {
    act(() => {
      persistTraderaQuickListFeedback('product-1', 'completed', {
        runId: 'run-tradera-feedback',
        requestId: 'job-tradera-feedback',
        integrationId: 'integration-tradera-feedback',
        connectionId: 'conn-tradera-feedback',
        duplicateMatchStrategy: 'exact-title-single-candidate',
      });
    });

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
          runId: 'run-tradera-feedback',
          requestId: 'job-tradera-feedback',
          integrationId: 'integration-tradera-feedback',
          connectionId: 'conn-tradera-feedback',
        }}
      >
        <RecoveryContextSummary />
      </ProductListingsProvider>
    );

    expect(screen.getByTestId('filter-integration-slug')).toHaveTextContent('none');
    expect(screen.getByTestId('integration-id')).toHaveTextContent('none');
    expect(screen.getByTestId('connection-id')).toHaveTextContent('none');
    expect(screen.getByTestId('run-id')).toHaveTextContent('none');
  });

  it('hydrates Base recovery details from the failed run when the run id is already known', async () => {
    getAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: {
          id: 'run-base-1',
          status: 'failed',
          errorMessage:
            'No Base.com category mapping found for internal category "69da99b1855cd0bfc9a2ab81". Map this category in Category Mapper first.',
          meta: {
            requestId: 'request-base-1',
            connectionId: 'conn-base-1',
          },
        },
        nodes: [],
        events: [],
      },
    });

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
          source: 'base_quick_export_failed',
          integrationSlug: 'baselinker',
          status: 'failed',
          runId: 'run-base-1',
        }}
      >
        <RecoveryContextSummary />
      </ProductListingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('failure-reason')).toHaveTextContent(
        'No Base.com category mapping found for internal category "69da99b1855cd0bfc9a2ab81". Map this category in Category Mapper first.'
      );
    });

    expect(screen.getByTestId('connection-id')).toHaveTextContent('conn-base-1');
    expect(screen.getByTestId('run-id')).toHaveTextContent('run-base-1');
  });

  it('hydrates Base recovery details from the latest failed Base run when the run id is missing', async () => {
    listAiPathRunsMock.mockResolvedValue({
      ok: true,
      data: {
        runs: [
          {
            id: 'run-base-older',
            pathId: 'integration-base-export',
            status: 'failed',
            entityId: 'product-1',
            errorMessage: 'Older Base failure.',
            updatedAt: '2026-04-14T10:00:00.000Z',
          },
          {
            id: 'run-base-latest',
            pathId: 'integration-base-export',
            status: 'failed',
            entityId: 'product-1',
            errorMessage:
              'No Base.com category mapping found for internal category "69da99b1855cd0bfc9a2ab81". Map this category in Category Mapper first.',
            updatedAt: '2026-04-15T10:00:00.000Z',
            meta: {
              connectionId: 'conn-base-latest',
            },
          },
        ],
      },
    });

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
          source: 'base_quick_export_failed',
          integrationSlug: 'baselinker',
          status: 'failed',
          runId: null,
        }}
      >
        <RecoveryContextSummary />
      </ProductListingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('failure-reason')).toHaveTextContent(
        'No Base.com category mapping found for internal category "69da99b1855cd0bfc9a2ab81". Map this category in Category Mapper first.'
      );
    });

    expect(screen.getByTestId('run-id')).toHaveTextContent('run-base-latest');
    expect(screen.getByTestId('connection-id')).toHaveTextContent('conn-base-latest');
  });
});
