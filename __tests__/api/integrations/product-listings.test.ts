import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '@/app/api/v2/integrations/product-listings/route';

const listByProductIdsMock = vi.hoisted(() => vi.fn());
const listAllListingsMock = vi.hoisted(() => vi.fn());
const listIntegrationsMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: () => ({
    listIntegrations: listIntegrationsMock,
  }),
  getProductListingRepository: () => ({
    getListingsByProductIds: listByProductIdsMock,
    listAllListings: listAllListingsMock,
  }),
}));

const buildProductListingsPostRequest = (productIds: string[]) =>
  new NextRequest('http://localhost/api/v2/integrations/product-listings', {
    method: 'POST',
    body: JSON.stringify({ productIds }),
  });

describe('api/integrations/product-listings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to listing marketplaceData when integration slug lookup is unavailable', async () => {
    listIntegrationsMock.mockResolvedValue([]);
    listAllListingsMock.mockResolvedValue([
      {
        productId: 'product-1',
        status: 'active',
        integrationId: 'missing-integration',
        marketplaceData: {
          source: 'base-import',
        },
      },
    ]);

    const response = await GET(
      new NextRequest('http://localhost/api/v2/integrations/product-listings', {
        method: 'GET',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      'product-1': {
        base: 'active',
      },
    });
  });

  it('prefers integration slug mapping when available', async () => {
    listIntegrationsMock.mockResolvedValue([{ id: 'integration-1', slug: 'base-com' }]);
    listAllListingsMock.mockResolvedValue([
      {
        productId: 'product-2',
        status: 'queued',
        integrationId: 'integration-1',
        marketplaceData: {
          source: 'manual-listing',
          marketplace: 'tradera',
        },
      },
    ]);

    const response = await GET(
      new NextRequest('http://localhost/api/v2/integrations/product-listings', {
        method: 'GET',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      'product-2': {
        base: 'queued',
      },
    });
  });

  it('returns listing badges via POST payload productIds', async () => {
    listIntegrationsMock.mockResolvedValue([{ id: 'integration-1', slug: 'base-com' }]);
    listByProductIdsMock.mockResolvedValue([
      {
        productId: 'product-3',
        status: 'active',
        integrationId: 'integration-1',
        marketplaceData: null,
      },
    ]);

    const response = await POST(
      buildProductListingsPostRequest(['product-3', 'product-3'])
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listByProductIdsMock).toHaveBeenCalledWith(['product-3']);
    expect(payload).toEqual({
      'product-3': {
        base: 'active',
      },
    });
  });

  it('returns 400 for invalid POST payload', async () => {
    const response = await POST(
      buildProductListingsPostRequest([])
    );

    expect(response.status).toBe(400);
  });
});
