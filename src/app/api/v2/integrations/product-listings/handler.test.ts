import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listAllListingsMock,
  listProductListingsByProductIdsMock,
  listIntegrationsMock,
} = vi.hoisted(() => ({
  listAllListingsMock: vi.fn(),
  listProductListingsByProductIdsMock: vi.fn(),
  listIntegrationsMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: async () => ({
    listIntegrations: (...args: unknown[]) => listIntegrationsMock(...args),
  }),
}));

vi.mock('@/features/integrations/services/product-listing-repository', () => ({
  listAllProductListingsAcrossProviders: (...args: unknown[]) => listAllListingsMock(...args),
  listProductListingsByProductIdsAcrossProviders: (...args: unknown[]) =>
    listProductListingsByProductIdsMock(...args),
}));

vi.mock('@/features/integrations/services/base-listing-canonicalization', () => ({
  applyCanonicalBaseBadgeFallback: async (payload: unknown) => payload,
  isCanonicalBaseIntegrationSlug: (value: string | null | undefined) =>
    ['baselinker', 'base', 'base-com'].includes((value ?? '').trim().toLowerCase()),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: vi.fn(),
}));

import { GET_handler } from './handler';

describe('integration product listings handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listIntegrationsMock.mockResolvedValue([
      {
        id: 'integration-tradera-1',
        slug: 'tradera',
      },
    ]);
    listAllListingsMock.mockResolvedValue([]);
  });

  it('prefers the newer auth_required Tradera status over an older queued listing', async () => {
    listProductListingsByProductIdsMock.mockResolvedValue([
      {
        id: 'listing-queued',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        status: 'queued',
        updatedAt: '2026-04-02T18:00:00.000Z',
      },
      {
        id: 'listing-auth',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        status: 'auth_required',
        updatedAt: '2026-04-02T18:05:00.000Z',
      },
    ]);

    const response = await GET_handler(
      new NextRequest(
        'http://localhost:3000/api/v2/integrations/product-listings?productIds=product-1'
      ),
      {
        query: { productIds: ['product-1'] },
      } as never
    );

    const payload = await response.json();

    expect(payload).toEqual({
      'product-1': {
        tradera: 'auth_required',
      },
    });
  });

  it('keeps an active Tradera badge when an older live listing still exists', async () => {
    listProductListingsByProductIdsMock.mockResolvedValue([
      {
        id: 'listing-active',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        status: 'active',
        updatedAt: '2026-04-02T18:00:00.000Z',
      },
      {
        id: 'listing-failed',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        status: 'auth_required',
        updatedAt: '2026-04-02T18:10:00.000Z',
      },
    ]);

    const response = await GET_handler(
      new NextRequest(
        'http://localhost:3000/api/v2/integrations/product-listings?productIds=product-1'
      ),
      {
        query: { productIds: ['product-1'] },
      } as never
    );

    const payload = await response.json();

    expect(payload).toEqual({
      'product-1': {
        tradera: 'active',
      },
    });
  });

  it('surfaces processing while a Tradera live status check is pending', async () => {
    listProductListingsByProductIdsMock.mockResolvedValue([
      {
        id: 'listing-active',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        status: 'active',
        updatedAt: '2026-04-02T18:00:00.000Z',
        marketplaceData: {
          tradera: {
            pendingExecution: {
              action: 'check_status',
              requestId: 'job-check-1',
              queuedAt: '2026-04-02T18:00:00.000Z',
            },
          },
        },
      },
    ]);

    const response = await GET_handler(
      new NextRequest(
        'http://localhost:3000/api/v2/integrations/product-listings?productIds=product-1'
      ),
      {
        query: { productIds: ['product-1'] },
      } as never
    );

    const payload = await response.json();

    expect(payload).toEqual({
      'product-1': {
        tradera: 'processing',
      },
    });
  });
});
