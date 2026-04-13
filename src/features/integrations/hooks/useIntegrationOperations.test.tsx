import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateListingBadges: vi.fn(),
}));

import {
  resolveEffectiveListingBadgesPayload,
  resolveListingBadgeRefetchInterval,
  useIntegrationListingBadges,
  useIntegrationModalOperations,
  useIntegrationOperations,
} from './useIntegrationOperations';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useIntegrationOperations listing badges query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    apiGetMock.mockResolvedValue({});
  });

  it('loads listing badges via GET with normalized productIds', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useIntegrationOperations([' product-2 ', 'product-1', 'product-2']), {
      wrapper,
    });

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        '/api/v2/integrations/product-listings?productIds=product-1%2Cproduct-2',
        { cache: 'no-store' }
      );
    });
  });

  it('keeps modal operations detached from the listing badges query', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useIntegrationModalOperations(), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('exposes listing badges directly for provider-side runtime polling', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useIntegrationListingBadges([' product-2 ', 'product-1', 'product-2']), {
      wrapper,
    });

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        '/api/v2/integrations/product-listings?productIds=product-1%2Cproduct-2',
        { cache: 'no-store' }
      );
    });
  });

  it('keeps listing badge polling cold when explicitly disabled', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useIntegrationListingBadges([' product-2 ', 'product-1', 'product-2'], {
          enabled: false,
        }),
      {
        wrapper,
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('parses programmable Playwright marketplace statuses alongside Base and Tradera badges', async () => {
    apiGetMock.mockResolvedValue({
      'product-1': {
        base: 'active',
        tradera: 'queued',
        playwrightProgrammable: ' Processing ',
      },
    });

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useIntegrationListingBadges(['product-1']), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.playwrightProgrammableBadgeIds.has('product-1')).toBe(true);
      expect(result.current.playwrightProgrammableBadgeStatuses.get('product-1')).toBe('processing');
    });

    expect(result.current.integrationBadgeStatuses.get('product-1')).toBe('active');
    expect(result.current.traderaBadgeStatuses.get('product-1')).toBe('queued');
  });

  it('prefers completed persisted Tradera feedback over a stale server auth_required badge', async () => {
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'completed',
          expiresAt: Date.now() + 60_000,
          duplicateMatchStrategy: 'exact-title-single-candidate',
        },
      })
    );
    apiGetMock.mockResolvedValue({
      'product-1': {
        tradera: 'auth_required',
      },
    });

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useIntegrationListingBadges(['product-1']), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.traderaBadgeStatuses.get('product-1')).toBe('active');
    });
    expect(result.current.traderaBadgeIds.has('product-1')).toBe(true);
  });

  it('normalizes stale recovery badge payloads against persisted quick-export feedback', () => {
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'completed',
          expiresAt: Date.now() + 60_000,
        },
      })
    );

    expect(
      resolveEffectiveListingBadgesPayload({
        'product-1': {
          tradera: 'auth_required',
        },
      })
    ).toEqual({
      'product-1': {
        tradera: 'active',
      },
    });
  });

  it('does not keep polling when no marketplace badges are present', () => {
    expect(resolveListingBadgeRefetchInterval({})).toBe(false);
  });

  it('does not keep polling for already-successful marketplace badges', () => {
    expect(
      resolveListingBadgeRefetchInterval({
        'product-1': {
          tradera: 'active',
        },
      })
    ).toBe(false);
  });

  it('keeps a low-frequency reconciliation poll for terminal marketplace badges', () => {
    expect(
      resolveListingBadgeRefetchInterval({
        'product-1': {
          tradera: 'auth_required',
        },
      })
    ).toBe(30_000);
  });

  it('does not keep reconciliation polling once persisted feedback normalizes a stale Tradera recovery badge to active', () => {
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'completed',
          expiresAt: Date.now() + 60_000,
        },
      })
    );

    expect(
      resolveListingBadgeRefetchInterval(
        resolveEffectiveListingBadgesPayload({
          'product-1': {
            tradera: 'auth_required',
          },
        })
      )
    ).toBe(false);
  });

  it('keeps the faster poll for in-flight marketplace badges', () => {
    expect(
      resolveListingBadgeRefetchInterval({
        'product-1': {
          tradera: 'queued_relist',
        },
      })
    ).toBe(10_000);
  });
});
