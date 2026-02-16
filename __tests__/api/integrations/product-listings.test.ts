import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/integrations/product-listings/route';

const listAllListingsMock = vi.hoisted(() => vi.fn());
const listIntegrationsMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/server', () => ({
  listAllProductListingsAcrossProviders: listAllListingsMock,
  getIntegrationRepository: () => ({
    listIntegrations: listIntegrationsMock,
  }),
}));

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
      new NextRequest('http://localhost/api/integrations/product-listings', {
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
    listIntegrationsMock.mockResolvedValue([
      { id: 'integration-1', slug: 'base-com' },
    ]);
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
      new NextRequest('http://localhost/api/integrations/product-listings', {
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
});
