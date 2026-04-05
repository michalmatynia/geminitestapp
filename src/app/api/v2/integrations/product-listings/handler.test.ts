import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getListingsByProductIdsMock,
  listAllListingsMock,
  listIntegrationsMock,
} = vi.hoisted(() => ({
  getListingsByProductIdsMock: vi.fn(),
  listAllListingsMock: vi.fn(),
  listIntegrationsMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getProductListingRepository: async () => ({
    getListingsByProductIds: (...args: unknown[]) => getListingsByProductIdsMock(...args),
    listAllListings: (...args: unknown[]) => listAllListingsMock(...args),
  }),
  getIntegrationRepository: async () => ({
    listIntegrations: (...args: unknown[]) => listIntegrationsMock(...args),
  }),
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
    getListingsByProductIdsMock.mockResolvedValue([
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
    getListingsByProductIdsMock.mockResolvedValue([
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
});
