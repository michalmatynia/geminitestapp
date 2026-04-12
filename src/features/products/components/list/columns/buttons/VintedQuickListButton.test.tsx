import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import { ApiError } from '@/shared/lib/api-client';

import {
  baseQuickExportTestProduct as product,
  createBaseQuickExportTestQueryClient,
} from './BaseQuickExportButton.test-support';

const {
  toastMock,
  apiPostMock,
  mutateAsyncMock,
  preflightVintedQuickListSessionMock,
  ensureVintedBrowserSessionMock,
  resolveConnectionMock,
  invalidateProductListingsAndBadgesMock,
  invalidateProductsMock,
  logClientCatchMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  apiPostMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  preflightVintedQuickListSessionMock: vi.fn(),
  ensureVintedBrowserSessionMock: vi.fn(),
  resolveConnectionMock: vi.fn(),
  invalidateProductListingsAndBadgesMock: vi.fn(),
  invalidateProductsMock: vi.fn(),
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
      post: (...args: unknown[]) => apiPostMock(...args) as Promise<unknown>,
    },
  };
});

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateProductListingsAndBadges: (...args: unknown[]) =>
    invalidateProductListingsAndBadgesMock(...args) as Promise<void>,
  invalidateProducts: (...args: unknown[]) =>
    invalidateProductsMock(...args) as Promise<void>,
}));

vi.mock('@/shared/utils/observability/client-error-logger', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/utils/observability/client-error-logger')>();
  return {
    ...actual,
    logClientCatch: (...args: unknown[]) => logClientCatchMock(...args),
  };
});

vi.mock('@/features/integrations/product-integrations-adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/integrations/product-integrations-adapter')>();
  return {
    ...actual,
    useCreateListingMutation: () => ({
      mutateAsync: mutateAsyncMock,
    }),
    createVintedRecoveryContext: ({
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
      requestId?: string | null;
      integrationId?: string | null;
      connectionId?: string | null;
    }) => ({
      source:
        status === 'auth_required' || status === 'needs_login'
          ? 'vinted_quick_export_auth_required'
          : 'vinted_quick_export_failed',
      integrationSlug: 'vinted',
      status,
      runId,
      failureReason: failureReason ?? null,
      requestId: requestId ?? null,
      integrationId: integrationId ?? null,
      connectionId: connectionId ?? null,
    }),
    isVintedBrowserAuthRequiredMessage: (message: string) =>
      message.toLowerCase().includes('auth_required') ||
      message.toLowerCase().includes('manual verification') ||
      message.toLowerCase().includes('browser challenge') ||
      message.toLowerCase().includes('could not be verified') ||
      message.toLowerCase().includes('verification is incomplete') ||
      message.toLowerCase().includes('vinted session expired'),
    preflightVintedQuickListSession: (...args: unknown[]) =>
      preflightVintedQuickListSessionMock(...args) as Promise<unknown>,
    ensureVintedBrowserSession: (...args: unknown[]) =>
      ensureVintedBrowserSessionMock(...args) as Promise<unknown>,
    useVintedQuickExportConnection: () => ({
      resolveConnection: () => resolveConnectionMock(),
    }),
    useVintedQuickExportPolling: () => undefined,
  };
});

import { VintedQuickListButton } from './VintedQuickListButton';

const renderButton = (
  overrides?: Partial<React.ComponentProps<typeof VintedQuickListButton>>
) => {
  const queryClient = createBaseQuickExportTestQueryClient();
  const props: React.ComponentProps<typeof VintedQuickListButton> = {
    product: product as ProductWithImages,
    prefetchListings: vi.fn(),
    onOpenIntegrations: undefined,
    showVintedBadge: false,
    vintedStatus: 'not_started',
    ...overrides,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <VintedQuickListButton {...props} />
    </QueryClientProvider>
  );
};

describe('VintedQuickListButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    window.sessionStorage.clear();
    resolveConnectionMock.mockResolvedValue({
      preferredConnectionId: null,
      integrations: [],
      vintedConnection: {
        integrationId: 'integration-vinted-1',
        connection: {
          id: 'conn-vinted-1',
          name: 'Vinted browser',
          integrationId: 'integration-vinted-1',
        },
      },
    });
    preflightVintedQuickListSessionMock.mockResolvedValue({
      response: { ok: true, steps: [{ step: 'Saving session', status: 'ok' }] },
      ready: true,
    });
    ensureVintedBrowserSessionMock.mockResolvedValue({
      response: { ok: true, steps: [{ step: 'Saving session', status: 'ok' }] },
      savedSession: true,
    });
    mutateAsyncMock.mockResolvedValue({
      id: 'listing-vinted-1',
      queue: {
        name: 'vinted-listings',
        jobId: 'job-vinted-1',
      },
    });
    apiPostMock.mockResolvedValue({ connectionId: 'conn-vinted-1' });
    invalidateProductListingsAndBadgesMock.mockResolvedValue(undefined);
    invalidateProductsMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a neutral idle tone before the first export attempt', () => {
    renderButton();

    const button = screen.getByRole('button', { name: 'One-click export to Vinted.pl' });
    expect(button.className).toContain('border-gray-500/50');
    expect(button.className).not.toContain('border-amber-400/70');
  });

  it('shows queued feedback after the listing is queued and invalidates listing badges', async () => {
    const prefetchListings = vi.fn();
    renderButton({ prefetchListings });

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Vinted.pl' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        integrationId: 'integration-vinted-1',
        connectionId: 'conn-vinted-1',
      });
    });
    expect(preflightVintedQuickListSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
    });

    const button = screen.getByRole('button', { name: 'One-click export to Vinted.pl' });
    expect(button.className).toContain('border-amber-400/70');
    expect(prefetchListings).toHaveBeenCalledTimes(1);
    expect(invalidateProductListingsAndBadgesMock).toHaveBeenCalled();
    expect(invalidateProductsMock).toHaveBeenCalled();
    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v2/integrations/exports/vinted/default-connection',
      { connectionId: 'conn-vinted-1' }
    );
    expect(window.sessionStorage.getItem('vinted-quick-list-feedback')).toContain(
      '"requestId":"job-vinted-1"'
    );
    expect(window.sessionStorage.getItem('vinted-quick-list-feedback')).toContain(
      '"listingId":"listing-vinted-1"'
    );
  });

  it('persists auth_required feedback when the session preflight requires manual verification', async () => {
    const onOpenIntegrations = vi.fn();
    preflightVintedQuickListSessionMock.mockRejectedValue(
      new Error(
        'Vinted login requires manual verification. Solve the browser challenge and retry.'
      )
    );

    renderButton({ onOpenIntegrations });

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Vinted.pl' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        'Vinted login requires manual verification. Solve the browser challenge and retry.',
        { variant: 'error' }
      );
    });

    const button = screen.getByRole('button', {
      name: 'Open Vinted recovery options (auth_required).',
    });
    expect(button.className).toContain('border-rose-400/70');
    expect(window.sessionStorage.getItem('vinted-quick-list-feedback')).toContain(
      '"auth_required"'
    );
    expect(window.sessionStorage.getItem('vinted-quick-list-feedback')).toContain(
      '"integrationId":"integration-vinted-1"'
    );
    expect(window.sessionStorage.getItem('vinted-quick-list-feedback')).toContain(
      '"connectionId":"conn-vinted-1"'
    );
    expect(onOpenIntegrations).toHaveBeenCalledWith({
      source: 'vinted_quick_export_auth_required',
      integrationSlug: 'vinted',
      status: 'auth_required',
      runId: null,
      failureReason: null,
      requestId: null,
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
    });
  });

  it('does not queue a listing when the Vinted session could not be saved', async () => {
    const onOpenIntegrations = vi.fn();
    preflightVintedQuickListSessionMock.mockResolvedValue({
      response: { ok: true, steps: [] },
      ready: false,
    });
    ensureVintedBrowserSessionMock.mockResolvedValue({
      response: { ok: false, steps: [] },
      savedSession: false,
    });

    renderButton({ onOpenIntegrations });

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Vinted.pl' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        'Vinted login session could not be saved. Complete login verification and retry.',
        { variant: 'error' }
      );
    });

    expect(ensureVintedBrowserSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onOpenIntegrations).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'vinted_quick_export_auth_required',
        integrationSlug: 'vinted',
        status: 'auth_required',
        integrationId: 'integration-vinted-1',
        connectionId: 'conn-vinted-1',
      })
    );
  });

  it('treats softer Vinted verification failures as auth-required recovery states', async () => {
    const onOpenIntegrations = vi.fn();
    preflightVintedQuickListSessionMock.mockRejectedValue(
      new Error('Vinted login could not be verified.')
    );

    renderButton({ onOpenIntegrations });

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Vinted.pl' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Vinted login could not be verified.', {
        variant: 'error',
      });
    });

    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onOpenIntegrations).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'vinted_quick_export_auth_required',
        integrationSlug: 'vinted',
        status: 'auth_required',
        integrationId: 'integration-vinted-1',
        connectionId: 'conn-vinted-1',
      })
    );
    expect(window.sessionStorage.getItem('vinted-quick-list-feedback')).toContain(
      '"auth_required"'
    );
  });

  it('opens integrations instead of persisting failed feedback when the listing already exists', async () => {
    const onOpenIntegrations = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      new ApiError('Product is already listed on this account', 409)
    );

    renderButton({ onOpenIntegrations });

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Vinted.pl' }));

    await waitFor(() => {
      expect(onOpenIntegrations).toHaveBeenCalledTimes(1);
    });

    expect(window.sessionStorage.getItem('vinted-quick-list-feedback')).toBeNull();
    expect(toastMock).toHaveBeenCalledWith('Product is already listed on this account', {
      variant: 'error',
    });
    expect(logClientCatchMock).not.toHaveBeenCalled();
  });

  it('keeps the listing queued when persisting the preferred Vinted connection fails', async () => {
    apiPostMock.mockRejectedValue(new Error('Failed to save default connection'));

    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Vinted.pl' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalled();
    });

    expect(
      screen.getByRole('button', { name: 'One-click export to Vinted.pl' }).className
    ).toContain('border-amber-400/70');
    expect(toastMock).toHaveBeenCalledWith('Vinted listing queued (job job-vinted-1).', {
      variant: 'success',
    });
    expect(logClientCatchMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'VintedQuickListButton',
        action: 'persistPreferredConnection',
        connectionId: 'conn-vinted-1',
        level: 'warn',
      })
    );
  });
});
