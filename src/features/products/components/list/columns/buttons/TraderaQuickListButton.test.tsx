import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';
import { ApiError } from '@/shared/lib/api-client';

import {
  baseQuickExportTestProduct as product,
  createBaseQuickExportTestQueryClient,
} from './BaseQuickExportButton.test-support';

const {
  toastMock,
  apiGetMock,
  apiPostMock,
  apiPutMock,
  mutateAsyncMock,
  preflightTraderaQuickListSessionMock,
  ensureTraderaBrowserSessionMock,
  fetchIntegrationsWithConnectionsMock,
  fetchPreferredTraderaConnectionMock,
  invalidateProductListingsAndBadgesMock,
  logClientCatchMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  preflightTraderaQuickListSessionMock: vi.fn(),
  ensureTraderaBrowserSessionMock: vi.fn(),
  fetchIntegrationsWithConnectionsMock: vi.fn(),
  fetchPreferredTraderaConnectionMock: vi.fn(),
  invalidateProductListingsAndBadgesMock: vi.fn(),
  logClientCatchMock: vi.fn(),
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/shared/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/api-client')>();
  return {
    ...actual,
    api: {
      get: (...args: unknown[]) => apiGetMock(...args) as Promise<unknown>,
      post: (...args: unknown[]) => apiPostMock(...args) as Promise<unknown>,
      put: (...args: unknown[]) => apiPutMock(...args) as Promise<unknown>,
    },
  };
});

vi.mock('@/shared/utils/observability/client-error-logger', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/utils/observability/client-error-logger')>();
  return {
    ...actual,
    logClientCatch: (...args: unknown[]) => logClientCatchMock(...args),
  };
});

vi.mock('@/features/integrations/components/listings/hooks/useIntegrationSelection', () => ({
  fetchIntegrationsWithConnections: (...args: unknown[]) =>
    fetchIntegrationsWithConnectionsMock(...args) as Promise<unknown>,
  fetchPreferredTraderaConnection: (...args: unknown[]) =>
    fetchPreferredTraderaConnectionMock(...args) as Promise<unknown>,
  integrationSelectionQueryKeys: {
    withConnections: ['integrations', 'with-connections'],
    traderaDefaultConnection: ['integrations', 'tradera', 'default-connection'],
  },
}));

vi.mock('@/features/integrations/constants/slugs', () => ({
  isTraderaBrowserIntegrationSlug: (value: string | null | undefined) =>
    (value ?? '').trim().toLowerCase() === 'tradera',
}));

vi.mock('@/features/integrations/hooks/useProductListingMutations', () => ({
  useCreateListingMutation: () => ({
    mutateAsync: mutateAsyncMock,
  }),
}));

vi.mock('@/features/integrations/utils/tradera-browser-session', () => ({
  preflightTraderaQuickListSession: (...args: unknown[]) =>
    preflightTraderaQuickListSessionMock(...args) as Promise<unknown>,
  ensureTraderaBrowserSession: (...args: unknown[]) =>
    ensureTraderaBrowserSessionMock(...args) as Promise<unknown>,
  isTraderaBrowserAuthRequiredMessage: (message: string) =>
    message.toLowerCase().includes('auth') ||
    message.toLowerCase().includes('captcha') ||
    message.toLowerCase().includes('manual verification'),
}));

vi.mock('@/features/integrations/utils/product-listings-recovery', () => ({
  createTraderaRecoveryContext: ({
    status,
    runId,
    failureReason,
    requestId,
    integrationId,
    connectionId,
  }: {
    status: string;
    runId: string | null;
    failureReason?: string | null;
    requestId: string | null;
    integrationId: string | null;
    connectionId: string | null;
  }) => ({
    source: `tradera_quick_export_${status}`,
    integrationSlug: 'tradera',
    status,
    runId,
    failureReason: failureReason ?? null,
    requestId,
    integrationId,
    connectionId,
  }),
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateProductListingsAndBadges: (...args: unknown[]) =>
    invalidateProductListingsAndBadgesMock(...args) as Promise<void>,
}));

import { TraderaQuickListButton } from './TraderaQuickListButton';

const renderButton = (
  overrides?: Partial<React.ComponentProps<typeof TraderaQuickListButton>>
) => {
  const queryClient = createBaseQuickExportTestQueryClient();
  const props: React.ComponentProps<typeof TraderaQuickListButton> = {
    product: product as ProductWithImages,
    prefetchListings: vi.fn(),
    onOpenIntegrations: undefined,
    showTraderaBadge: false,
    traderaStatus: 'not_started',
    ...overrides,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <TraderaQuickListButton {...props} />
    </QueryClientProvider>
  );
};

describe('TraderaQuickListButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    window.sessionStorage.clear();
    fetchPreferredTraderaConnectionMock.mockResolvedValue({ connectionId: null });
    preflightTraderaQuickListSessionMock.mockResolvedValue({
      response: { ok: true, steps: [{ step: 'Saving session', status: 'ok' }] },
      ready: true,
    });
    ensureTraderaBrowserSessionMock.mockResolvedValue({
      response: { ok: true, steps: [{ step: 'Saving session', status: 'ok' }] },
      savedSession: true,
    });
    fetchIntegrationsWithConnectionsMock.mockResolvedValue([
      {
        id: 'integration-tradera-1',
        name: 'Tradera',
        slug: 'tradera',
        connections: [
          {
            id: 'conn-tradera-1',
            name: 'Tradera browser',
            integrationId: 'integration-tradera-1',
            traderaBrowserMode: 'scripted',
            hasPlaywrightListingScript: true,
            hasPlaywrightStorageState: true,
            playwrightStorageStateUpdatedAt: '2026-04-02T10:00:00.000Z',
          },
        ],
      },
    ]);
    apiPostMock.mockImplementation((url: string) => {
      if (url === '/api/v2/integrations/exports/tradera/default-connection') {
        return Promise.resolve({ connectionId: 'conn-tradera-1' });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });
    apiGetMock.mockResolvedValue([]);
    apiPutMock.mockImplementation((url: string) => {
      if (url === '/api/v2/integrations/connections/conn-tradera-1') {
        return Promise.resolve({
          id: 'conn-tradera-1',
          integrationId: 'integration-tradera-1',
          name: 'Tradera browser',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
          hasPlaywrightListingScript: true,
        });
      }
      return Promise.reject(new Error(`Unexpected PUT ${url}`));
    });
    mutateAsyncMock.mockResolvedValue({
      queue: {
        name: 'tradera-listings',
        jobId: 'job-tradera-1',
      },
    });
    invalidateProductListingsAndBadgesMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a neutral idle tone before the first export attempt', () => {
    renderButton();

    const button = screen.getByRole('button', { name: 'One-click export to Tradera' });
    expect(button.className).toContain('border-gray-500/50');
    expect(button.className).not.toContain('border-cyan-400/70');
  });

  it('shows queued feedback after the listing is queued and invalidates listing badges', async () => {
    const prefetchListings = vi.fn();
    renderButton({ prefetchListings });

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Tradera' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
      });
    });
    expect(preflightTraderaQuickListSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });

    const button = screen.getByRole('button', { name: 'One-click export to Tradera' });
    expect(button.className).toContain('border-amber-400/70');
    expect(prefetchListings).toHaveBeenCalledTimes(1);
    expect(invalidateProductListingsAndBadgesMock).toHaveBeenCalled();
    expect(apiPostMock).toHaveBeenCalledWith('/api/v2/integrations/exports/tradera/default-connection', {
      connectionId: 'conn-tradera-1',
    });
    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toContain(
      '"requestId":"job-tradera-1"'
    );
  });

  it('persists auth_required feedback when the session preflight requires manual verification', async () => {
    const onOpenIntegrations = vi.fn();
    preflightTraderaQuickListSessionMock.mockRejectedValue(
      new Error('Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.')
    );

    renderButton({ onOpenIntegrations });

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Tradera' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.',
        { variant: 'error' }
      );
    });

    const button = screen.getByRole('button', {
      name: 'Open Tradera recovery options (auth_required).',
    });
    expect(button.className).toContain('border-rose-400/70');
    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toContain(
      '"auth_required"'
    );
    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toContain(
      '"integrationId":"integration-tradera-1"'
    );
    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toContain(
      '"connectionId":"conn-tradera-1"'
    );
    expect(onOpenIntegrations).toHaveBeenCalledWith({
      source: 'tradera_quick_export_auth_required',
      integrationSlug: 'tradera',
      status: 'auth_required',
      runId: null,
      failureReason: null,
      requestId: null,
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
  });

  it('does not queue a listing when the Tradera session could not be saved', async () => {
    const onOpenIntegrations = vi.fn();
    preflightTraderaQuickListSessionMock.mockResolvedValue({
      response: { ok: true, steps: [] },
      ready: false,
    });
    ensureTraderaBrowserSessionMock.mockResolvedValue({
      response: { ok: false, steps: [] },
      savedSession: false,
    });

    renderButton({ onOpenIntegrations });

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Tradera' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        'Tradera login session could not be saved. Complete login verification and retry.',
        { variant: 'error' }
      );
    });

    expect(ensureTraderaBrowserSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onOpenIntegrations).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'tradera_quick_export_auth_required',
        integrationSlug: 'tradera',
        status: 'auth_required',
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
      })
    );
  });

  it('clears persisted queued feedback when the server-backed badge takes over', async () => {
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'queued',
          expiresAt: Date.now() + 60_000,
        },
      })
    );

    const { rerender } = renderButton();

    expect(screen.getByRole('button', { name: 'One-click export to Tradera' }).className).toContain(
      'border-amber-400/70'
    );

    rerender(
      <QueryClientProvider client={createBaseQuickExportTestQueryClient()}>
        <TraderaQuickListButton
          product={product as ProductWithImages}
          prefetchListings={vi.fn()}
          showTraderaBadge={true}
          traderaStatus='queued'
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'One-click export to Tradera' })).toBeNull();
    });
    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toBeNull();
  });

  it('clears stale queued feedback when the tracked product no longer exists', async () => {
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'queued',
          requestId: 'job-tradera-1',
          expiresAt: Date.now() + 60_000,
        },
      })
    );
    apiGetMock.mockRejectedValue(new ApiError('Product not found', 404));

    renderButton();

    await waitFor(() => {
      expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toBeNull();
    });
    expect(logClientCatchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'One-click export to Tradera' }).className).toContain(
      'border-gray-500/50'
    );
  });

  it('keeps persisted failed recovery context when a failure badge takes over', async () => {
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'failed',
          expiresAt: Date.now() + 60_000,
          integrationId: 'integration-tradera-1',
          connectionId: 'conn-tradera-1',
        },
      })
    );

    const { rerender } = renderButton();

    expect(screen.getByRole('button', { name: 'Open Tradera recovery options (failed).' })).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={createBaseQuickExportTestQueryClient()}>
        <TraderaQuickListButton
          product={product as ProductWithImages}
          prefetchListings={vi.fn()}
          showTraderaBadge={true}
          traderaStatus='auth_required'
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Open Tradera recovery options (failed).' })).toBeNull();
    });
    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toContain(
      '"connectionId":"conn-tradera-1"'
    );
  });

  it('prefers the saved Tradera default connection when it exists', async () => {
    fetchPreferredTraderaConnectionMock.mockResolvedValue({ connectionId: 'conn-tradera-2' });
    fetchIntegrationsWithConnectionsMock.mockResolvedValue([
      {
        id: 'integration-tradera-1',
        name: 'Tradera',
        slug: 'tradera',
        connections: [
          {
            id: 'conn-tradera-1',
            name: 'Alpha',
            integrationId: 'integration-tradera-1',
            traderaBrowserMode: 'scripted',
            hasPlaywrightListingScript: true,
          },
          {
            id: 'conn-tradera-2',
            name: 'Zulu',
            integrationId: 'integration-tradera-1',
            traderaBrowserMode: 'scripted',
            hasPlaywrightListingScript: true,
          },
        ],
      },
    ]);
    apiPostMock.mockImplementation((url: string) => {
      if (url === '/api/v2/integrations/exports/tradera/default-connection') {
        return Promise.resolve({ connectionId: 'conn-tradera-2' });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Tradera' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-2',
      });
    });
  });

  it('keeps the listing queued when persisting the preferred connection fails', async () => {
    preflightTraderaQuickListSessionMock.mockResolvedValue({
      response: { ok: true, sessionReady: true, steps: [] },
      ready: true,
    });
    apiPostMock.mockImplementation((url: string) => {
      if (url === '/api/v2/integrations/exports/tradera/default-connection') {
        return Promise.reject(new Error('Failed to save default connection'));
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Tradera' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalled();
    });

    expect(screen.getByRole('button', { name: 'One-click export to Tradera' }).className).toContain(
      'border-amber-400/70'
    );
    expect(toastMock).toHaveBeenCalledWith('Tradera listing queued (job job-tradera-1).', {
      variant: 'success',
    });
  });

  it('falls back to another scripted Tradera connection when the preferred one is not script-ready', async () => {
    fetchPreferredTraderaConnectionMock.mockResolvedValue({ connectionId: 'conn-tradera-2' });
    fetchIntegrationsWithConnectionsMock.mockResolvedValue([
      {
        id: 'integration-tradera-1',
        name: 'Tradera',
        slug: 'tradera',
        connections: [
          {
            id: 'conn-tradera-1',
            name: 'Scripted Alpha',
            integrationId: 'integration-tradera-1',
            traderaBrowserMode: 'scripted',
            hasPlaywrightListingScript: true,
          },
          {
            id: 'conn-tradera-2',
            name: 'Builtin Zulu',
            integrationId: 'integration-tradera-1',
            traderaBrowserMode: 'builtin',
            hasPlaywrightListingScript: false,
          },
        ],
      },
    ]);
    apiPostMock.mockImplementation((url: string) => {
      if (url === '/api/v2/integrations/exports/tradera/default-connection') {
        return Promise.resolve({ connectionId: 'conn-tradera-1' });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Tradera' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
      });
    });
    expect(apiPutMock).not.toHaveBeenCalled();
  });

  it('auto-upgrades a builtin Tradera browser connection to scripted mode before queueing', async () => {
    fetchPreferredTraderaConnectionMock.mockResolvedValue({ connectionId: 'conn-tradera-1' });
    fetchIntegrationsWithConnectionsMock.mockResolvedValue([
      {
        id: 'integration-tradera-1',
        name: 'Tradera',
        slug: 'tradera',
        connections: [
          {
            id: 'conn-tradera-1',
            name: 'Builtin only',
            integrationId: 'integration-tradera-1',
            traderaBrowserMode: 'builtin',
            hasPlaywrightListingScript: false,
          },
        ],
      },
    ]);

    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Tradera' }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith('/api/v2/integrations/connections/conn-tradera-1', {
        name: 'Builtin only',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: expect.stringContaining('export default async function run'),
      });
    });

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
      });
    });
  });

  it('opens integrations when no Tradera browser connection is configured', async () => {
    const onOpenIntegrations = vi.fn();
    fetchIntegrationsWithConnectionsMock.mockResolvedValue([]);

    renderButton({ onOpenIntegrations });

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Tradera' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        'No Tradera browser connection configured for Quicklist. Add a Tradera browser connection first.',
        {
          variant: 'error',
        }
      );
    });
    expect(onOpenIntegrations).toHaveBeenCalledTimes(1);
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('converts stale queued feedback into a retryable failure state', () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'queued',
          expiresAt: Date.now() - 1_000,
        },
      })
    );

    renderButton();

    const button = screen.getByRole('button', { name: 'Open Tradera recovery options (failed).' });
    expect(button.className).toContain('border-rose-400/70');
    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toContain('"failed"');
  });

  it('degrades queued feedback to failed when no server badge takes over within the grace window', async () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'queued',
          expiresAt: Date.now() + 45_000,
        },
      })
    );

    renderButton();

    expect(screen.getByRole('button', { name: 'One-click export to Tradera' }).className).toContain(
      'border-amber-400/70'
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(46_000);
    });

    expect(screen.getByRole('button', { name: 'Open Tradera recovery options (failed).' }).className).toContain(
      'border-rose-400/70'
    );
  });

  it('uses the server queued status when the row runtime already sees a queued Tradera listing', async () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'queued',
          expiresAt: Date.now() + 45_000,
        },
      })
    );

    renderButton({
      showTraderaBadge: false,
      traderaStatus: 'queued',
    });

    expect(screen.getByRole('button', { name: 'One-click export to Tradera' }).className).toContain(
      'border-amber-400/70'
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(46_000);
    });

    expect(screen.getByRole('button', { name: 'One-click export to Tradera' }).className).toContain(
      'border-amber-400/70'
    );
    expect(
      screen.queryByRole('button', { name: 'Open Tradera recovery options (failed).' })
    ).toBeNull();
  });

  it('uses the server auth_required status for recovery even without local feedback', () => {
    const onOpenIntegrations = vi.fn();
    renderButton({
      onOpenIntegrations,
      showTraderaBadge: false,
      traderaStatus: 'auth_required',
    });

    const button = screen.getByRole('button', {
      name: 'Open Tradera recovery options (auth_required).',
    });
    expect(button.className).toContain('border-rose-400/70');

    fireEvent.click(button);

    expect(onOpenIntegrations).toHaveBeenCalledWith({
      source: 'tradera_quick_export_auth_required',
      integrationSlug: 'tradera',
      status: 'auth_required',
      runId: null,
      failureReason: null,
      requestId: null,
      integrationId: null,
      connectionId: null,
    });
  });

  it('opens recovery options instead of retrying when local quick-list feedback is failed', () => {
    const onOpenIntegrations = vi.fn();
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'failed',
          expiresAt: Date.now() + 30 * 60 * 1000,
          runId: 'run-tradera-1',
          requestId: 'job-tradera-1',
        },
      })
    );

    renderButton({ onOpenIntegrations });

    fireEvent.click(screen.getByRole('button', { name: 'Open Tradera recovery options (failed).' }));

    expect(onOpenIntegrations).toHaveBeenCalledTimes(1);
    expect(onOpenIntegrations).toHaveBeenCalledWith({
      source: 'tradera_quick_export_failed',
      integrationSlug: 'tradera',
      status: 'failed',
      runId: 'run-tradera-1',
      failureReason: null,
      requestId: 'job-tradera-1',
      integrationId: null,
      connectionId: null,
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('opens integrations instead of persisting failed feedback when the listing already exists', async () => {
    const onOpenIntegrations = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      new ApiError('Product is already listed on this account', 409)
    );

    renderButton({ onOpenIntegrations });

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Tradera' }));

    await waitFor(() => {
      expect(onOpenIntegrations).toHaveBeenCalledTimes(1);
    });

    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toBeNull();
    expect(toastMock).toHaveBeenCalledWith('Product is already listed on this account', {
      variant: 'error',
    });
  });

  it('shows error toast but does not open integrations modal for non-auth setup errors', async () => {
    const onOpenIntegrations = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      new ApiError(
        'Tradera export requires an active Tradera category mapping for this product category. Fetch Tradera categories in Category Mapper, map the category, and retry.',
        400
      )
    );

    renderButton({ onOpenIntegrations });

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Tradera' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        'Tradera export requires an active Tradera category mapping for this product category. Fetch Tradera categories in Category Mapper, map the category, and retry.',
        { variant: 'error' }
      );
    });

    // Non-auth errors should NOT auto-open the integrations modal — the user
    // can click the failure-state button to access recovery options instead.
    expect(onOpenIntegrations).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem('tradera-quick-list-feedback')).toContain(
      '"failureReason":"Tradera export requires an active Tradera category mapping for this product category. Fetch Tradera categories in Category Mapper, map the category, and retry."'
    );
  });
});
