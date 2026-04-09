import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock, apiPostMock, toastMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  toastMock: vi.fn(),
}));

const { invalidateQueriesMock } = vi.hoisted(() => ({
  invalidateQueriesMock: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}));

vi.mock('@/shared/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/api-client')>();
  return {
    ...actual,
    api: {
      get: (...args: unknown[]) => apiGetMock(...args),
      post: (...args: unknown[]) => apiPostMock(...args),
    },
  };
});

vi.mock('@/shared/ui/app-modal', () => ({
  AppModal: ({
    isOpen,
    title,
    subtitle,
    headerActions,
    children,
  }: {
    isOpen: boolean;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    headerActions?: React.ReactNode;
    children?: React.ReactNode;
  }) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        <div>{subtitle}</div>
        <div>{headerActions}</div>
        <div>{children}</div>
      </div>
    ) : null,
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  StatusBadge: ({ label }: { label: string }) => <span>{label}</span>,
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

import { TraderaStatusCheckModal } from './TraderaStatusCheckModal';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const buildTraderaPreflightResponse = () => ({
  ok: true,
  sessionReady: true,
  steps: [{ step: 'Preflight validation', status: 'ok' }],
});

const buildTraderaSessionRefreshResponse = () => ({
  ok: true,
  steps: [{ step: 'Saving session', status: 'ok' }],
});

const makeListing = (overrides: Record<string, unknown>) => ({
  id: 'listing-default',
  productId: 'product-default',
  integrationId: 'integration-tradera-browser',
  connectionId: 'connection-1',
  externalListingId: '721891408',
  inventoryId: null,
  status: 'active',
  listedAt: '2026-04-01T10:00:00.000Z',
  expiresAt: null,
  nextRelistAt: null,
  relistPolicy: null,
  relistAttempts: 0,
  lastRelistedAt: null,
  lastStatusCheckAt: '2026-04-01T11:00:00.000Z',
  marketplaceData: null,
  failureReason: null,
  exportHistory: [],
  createdAt: '2026-04-01T09:00:00.000Z',
  updatedAt: '2026-04-01T11:00:00.000Z',
  integration: {
    id: 'integration-tradera-browser',
    name: 'Tradera',
    slug: 'tradera',
  },
  connection: {
    id: 'connection-1',
    name: 'Primary Tradera',
  },
  ...overrides,
});

describe('TraderaStatusCheckModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateQueriesMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('queues all eligible Tradera browser listings at once', async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.includes('/products/product-1/listings')) {
        return Promise.resolve([
          makeListing({
            id: 'listing-browser-1',
            productId: 'product-1',
          }),
        ]);
      }
      if (url.includes('/products/product-2/listings')) {
        return Promise.resolve([
          makeListing({
            id: 'listing-api-2',
            productId: 'product-2',
            integrationId: 'integration-tradera-api',
            integration: {
              id: 'integration-tradera-api',
              name: 'Tradera API',
              slug: 'tradera-api',
            },
          }),
        ]);
      }
      if (url.includes('/products/product-3/listings')) {
        return Promise.resolve([
          makeListing({
            id: 'listing-browser-3',
            productId: 'product-3',
            lastStatusCheckAt: '2026-04-01T12:00:00.000Z',
          }),
        ]);
      }
      return Promise.resolve([]);
    });

    apiPostMock.mockImplementation((url: string) => {
      if (url.includes('/connections/')) {
        return Promise.resolve(buildTraderaPreflightResponse());
      }
      if (url === '/api/v2/integrations/product-listings/tradera-status-check') {
        return Promise.resolve({
          total: 2,
          queued: 1,
          alreadyQueued: 1,
          skipped: 0,
          failed: 0,
          results: [
            {
              productId: 'product-1',
              listingId: 'listing-browser-1',
              status: 'queued',
              queue: {
                name: 'tradera-listings',
                jobId: 'job-1',
                enqueuedAt: '2026-04-01T12:01:00.000Z',
              },
            },
            {
              productId: 'product-3',
              listingId: 'listing-browser-3',
              status: 'already_queued',
              message: 'Live status check already queued for this listing.',
            },
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected api.post call: ${url}`));
    });

    render(
      <TraderaStatusCheckModal
        isOpen
        onClose={() => {}}
        productIds={['product-1', 'product-2', 'product-3']}
        products={[
          { id: 'product-1', name_en: 'Product One' } as never,
          { id: 'product-2', name_en: 'Product Two' } as never,
          { id: 'product-3', name_en: 'Product Three' } as never,
        ]}
      />
    );

    await screen.findByText('Product One');
    expect(
      screen.getByText('Live check requires a Tradera browser listing.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check All Live' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/v2/integrations/product-listings/tradera-status-check',
        {
          productIds: ['product-1', 'product-3'],
        }
      );
    });

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        'Tradera live checks: 1 queued, 1 already queued.',
        { variant: 'success' }
      );
    });

    await waitFor(() => {
      expect(invalidateQueriesMock).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.integrations.listings('product-1'),
      });
      expect(invalidateQueriesMock).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.integrations.listings('product-3'),
      });
      expect(invalidateQueriesMock).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.integrations.productListingsBadges(),
      });
    });
  });

  it('shows skipped row feedback returned by the batch API', async () => {
    apiGetMock.mockResolvedValue([
      makeListing({
        id: 'listing-browser-1',
        productId: 'product-1',
      }),
    ]);
    apiPostMock.mockImplementation((url: string) => {
      if (url.includes('/connections/')) {
        return Promise.resolve(buildTraderaPreflightResponse());
      }
      if (url === '/api/v2/integrations/product-listings/tradera-status-check') {
        return Promise.resolve({
          total: 1,
          queued: 0,
          alreadyQueued: 0,
          skipped: 1,
          failed: 0,
          results: [
            {
              productId: 'product-1',
              listingId: 'listing-browser-1',
              status: 'skipped',
              message: 'No Tradera browser listing available for live status check.',
            },
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected api.post call: ${url}`));
    });

    render(
      <TraderaStatusCheckModal
        isOpen
        onClose={() => {}}
        productIds={['product-1']}
        products={[{ id: 'product-1', name_en: 'Product One' } as never]}
      />
    );

    await screen.findByText('Product One');
    fireEvent.click(screen.getByRole('button', { name: 'Check All Live' }));

    await waitFor(() => {
      expect(
        screen.getByText('No Tradera browser listing available for live status check.')
      ).toBeInTheDocument();
    });
    expect(toastMock).toHaveBeenCalledWith(
      'Tradera live checks: 1 skipped.',
      { variant: 'success' }
    );
  });

  it('invalidates listing and badge queries when a single live check is queued', async () => {
    apiGetMock.mockResolvedValue([
      makeListing({
        id: 'listing-browser-1',
        productId: 'product-1',
      }),
    ]);
    apiPostMock.mockImplementation((url: string) => {
      if (url.includes('/connections/')) {
        return Promise.resolve(buildTraderaPreflightResponse());
      }
      if (
        url ===
        '/api/v2/integrations/products/product-1/listings/listing-browser-1/check-status'
      ) {
        return Promise.resolve({
          queued: true,
          listingId: 'listing-browser-1',
          queue: {
            name: 'tradera-listings',
            jobId: 'job-1',
            enqueuedAt: '2026-04-01T12:01:00.000Z',
          },
        });
      }
      return Promise.reject(new Error(`Unexpected api.post call: ${url}`));
    });

    render(
      <TraderaStatusCheckModal
        isOpen
        onClose={() => {}}
        productIds={['product-1']}
        products={[{ id: 'product-1', name_en: 'Product One' } as never]}
      />
    );

    await screen.findByText('Product One');
    fireEvent.click(screen.getByRole('button', { name: 'Check Live' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/v2/integrations/products/product-1/listings/listing-browser-1/check-status',
        {}
      );
    });

    await waitFor(() => {
      expect(invalidateQueriesMock).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.integrations.listings('product-1'),
      });
      expect(invalidateQueriesMock).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.integrations.productListingsBadges(),
      });
    });
  });

  it('requires a Tradera login refresh before queueing a live check when preflight reports auth_required', async () => {
    apiGetMock
      .mockResolvedValueOnce([
        makeListing({
          id: 'listing-browser-1',
          productId: 'product-1',
        }),
      ])
      .mockResolvedValueOnce([
        makeListing({
          id: 'listing-browser-1',
          productId: 'product-1',
        }),
      ]);
    apiPostMock.mockImplementation((url: string, body?: Record<string, unknown>) => {
      if (url.includes('/connections/') && url.endsWith('/test')) {
        if (body?.mode === 'manual_session_refresh') {
          return Promise.resolve(buildTraderaSessionRefreshResponse());
        }
        return Promise.reject(
          new Error(
            'AUTH_REQUIRED: Stored Tradera session expired or is missing. Login to Tradera and retry the live check.'
          )
        );
      }
      return Promise.reject(new Error(`Unexpected api.post call: ${url}`));
    });

    render(
      <TraderaStatusCheckModal
        isOpen
        onClose={() => {}}
        productIds={['product-1']}
        products={[{ id: 'product-1', name_en: 'Product One' } as never]}
      />
    );

    await screen.findByText('Product One');
    fireEvent.click(screen.getByRole('button', { name: 'Check Live' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'AUTH_REQUIRED: Stored Tradera session expired or is missing. Login to Tradera and retry the live check.'
        )
      ).toBeInTheDocument();
    });
    expect(
      apiPostMock
        .mock.calls.map(([url]) => url)
        .filter(
          (url) =>
            url ===
            '/api/v2/integrations/products/product-1/listings/listing-browser-1/check-status'
        )
    ).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Login to Tradera' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Login to Tradera' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/v2/integrations/integration-tradera-browser/connections/connection-1/test',
        {
          mode: 'manual_session_refresh',
          manualTimeoutMs: 240000,
        },
        {
          timeout: 270000,
        }
      );
    });
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Tradera login session refreshed.', {
        variant: 'success',
      });
    });
  });

  it('marks batch live checks as needing login when preflight fails before queueing', async () => {
    apiGetMock.mockResolvedValue([
      makeListing({
        id: 'listing-browser-1',
        productId: 'product-1',
      }),
    ]);
    apiPostMock.mockRejectedValue(
      new Error(
        'AUTH_REQUIRED: Stored Tradera session expired or is missing. Login to Tradera and retry the live check.'
      )
    );

    render(
      <TraderaStatusCheckModal
        isOpen
        onClose={() => {}}
        productIds={['product-1']}
        products={[{ id: 'product-1', name_en: 'Product One' } as never]}
      />
    );

    await screen.findByText('Product One');
    fireEvent.click(screen.getByRole('button', { name: 'Check All Live' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Tradera live checks: 1 need login.', {
        variant: 'warning',
      });
    });
    expect(
      apiPostMock
        .mock.calls.map(([url]) => url)
        .filter((url) => url === '/api/v2/integrations/product-listings/tradera-status-check')
    ).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Login to Tradera' })).toBeInTheDocument();
  });

  it('updates the modal row immediately when the refreshed listing already has the new check result', async () => {
    apiGetMock
      .mockResolvedValueOnce([
        makeListing({
          id: 'listing-browser-1',
          productId: 'product-1',
          lastStatusCheckAt: '2026-04-01T11:00:00.000Z',
          updatedAt: '2026-04-01T11:00:00.000Z',
        }),
      ])
      .mockResolvedValueOnce([
        makeListing({
          id: 'listing-browser-1',
          productId: 'product-1',
          status: 'ended',
          lastStatusCheckAt: '2026-04-01T12:05:00.000Z',
          updatedAt: '2026-04-01T12:05:00.000Z',
          marketplaceData: {
            tradera: {
              pendingExecution: null,
              lastExecution: {
                action: 'check_status',
                metadata: {
                  executionSteps: [
                    {
                      id: 'open_overview',
                      label: 'Open My Overview',
                      status: 'success',
                      message: 'Tradera My Overview opened successfully.',
                    },
                    {
                      id: 'resolve_status',
                      label: 'Resolve final Tradera status',
                      status: 'success',
                      message: 'Resolved Tradera status as ended from Unsold items with raw tag "ended".',
                    },
                  ],
                },
              },
            },
          },
        }),
      ]);

    apiPostMock.mockImplementation((url: string) => {
      if (url.includes('/connections/')) {
        return Promise.resolve(buildTraderaPreflightResponse());
      }
      if (
        url ===
        '/api/v2/integrations/products/product-1/listings/listing-browser-1/check-status'
      ) {
        return Promise.resolve({
          queued: true,
          listingId: 'listing-browser-1',
          queue: {
            name: 'tradera-listings',
            jobId: 'job-1',
            enqueuedAt: '2026-04-01T12:01:00.000Z',
          },
        });
      }
      return Promise.reject(new Error(`Unexpected api.post call: ${url}`));
    });

    render(
      <TraderaStatusCheckModal
        isOpen
        onClose={() => {}}
        productIds={['product-1']}
        products={[{ id: 'product-1', name_en: 'Product One' } as never]}
      />
    );

    await screen.findByText('Product One');
    fireEvent.click(screen.getByRole('button', { name: 'Check Live' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/v2/integrations/products/product-1/listings/listing-browser-1/check-status',
        {}
      );
    });
    expect(apiGetMock).toHaveBeenNthCalledWith(
      1,
      '/api/v2/integrations/products/product-1/listings',
      { cache: 'no-store' }
    );
    await waitFor(() => {
      expect(apiGetMock).toHaveBeenNthCalledWith(
        2,
        '/api/v2/integrations/products/product-1/listings',
        { cache: 'no-store' }
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Checked' })).toBeInTheDocument();
    });
    expect(screen.getByText('Ended')).toBeInTheDocument();
    expect(screen.getByText('Latest check steps')).toBeInTheDocument();
    expect(screen.getByText('Open My Overview')).toBeInTheDocument();
    expect(screen.getByText('Resolve final Tradera status')).toBeInTheDocument();
  });

  it('updates the modal as soon as polling sees the completed status check', async () => {
    apiGetMock
      .mockResolvedValueOnce([
        makeListing({
          id: 'listing-browser-1',
          productId: 'product-1',
          lastStatusCheckAt: '2026-04-01T11:00:00.000Z',
          updatedAt: '2026-04-01T11:00:00.000Z',
        }),
      ])
      .mockResolvedValueOnce([
        makeListing({
          id: 'listing-browser-1',
          productId: 'product-1',
          lastStatusCheckAt: '2026-04-01T11:00:00.000Z',
          updatedAt: '2026-04-01T11:05:00.000Z',
          marketplaceData: {
            tradera: {
              pendingExecution: {
                action: 'check_status',
              },
            },
          },
        }),
      ])
      .mockResolvedValueOnce([
        makeListing({
          id: 'listing-browser-1',
          productId: 'product-1',
          status: 'ended',
          lastStatusCheckAt: '2026-04-01T12:10:00.000Z',
          updatedAt: '2026-04-01T12:10:00.000Z',
          marketplaceData: {
            tradera: {
              pendingExecution: null,
            },
          },
        }),
      ]);

    apiPostMock.mockImplementation((url: string) => {
      if (url.includes('/connections/')) {
        return Promise.resolve(buildTraderaPreflightResponse());
      }
      if (
        url ===
        '/api/v2/integrations/products/product-1/listings/listing-browser-1/check-status'
      ) {
        return Promise.resolve({
          queued: true,
          listingId: 'listing-browser-1',
          queue: {
            name: 'tradera-listings',
            jobId: 'job-1',
            enqueuedAt: '2026-04-01T12:01:00.000Z',
          },
        });
      }
      return Promise.reject(new Error(`Unexpected api.post call: ${url}`));
    });

    render(
      <TraderaStatusCheckModal
        isOpen
        onClose={() => {}}
        productIds={['product-1']}
        products={[{ id: 'product-1', name_en: 'Product One' } as never]}
      />
    );

    await screen.findByText('Product One');
    fireEvent.click(screen.getByRole('button', { name: 'Check Live' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Checking…' })).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: 'Checked' })).toBeInTheDocument();
      },
      { timeout: 5_000 }
    );
    expect(screen.getByText('Ended')).toBeInTheDocument();
  });
});
