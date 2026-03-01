import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  getIntegrationRepositoryMock,
  getProductListingRepositoryMock,
  parseJsonBodyMock,
  listIntegrationsMock,
  getListingsByProductIdsMock,
  listAllListingsMock,
} = vi.hoisted(() => ({
  getIntegrationRepositoryMock: vi.fn(),
  getProductListingRepositoryMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  listIntegrationsMock: vi.fn(),
  getListingsByProductIdsMock: vi.fn(),
  listAllListingsMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: (...args: unknown[]) => getIntegrationRepositoryMock(...args),
  getProductListingRepository: (...args: unknown[]) => getProductListingRepositoryMock(...args),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
}));

import { GET_handler, POST_handler } from './handler';

describe('integrations/product-listings handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getIntegrationRepositoryMock.mockResolvedValue({
      listIntegrations: listIntegrationsMock,
    });
    getProductListingRepositoryMock.mockResolvedValue({
      getListingsByProductIds: getListingsByProductIdsMock,
      listAllListings: listAllListingsMock,
    });
    listIntegrationsMock.mockResolvedValue([
      { id: 'int-base', slug: 'base' },
      { id: 'int-tradera', slug: 'tradera' },
    ]);
    listAllListingsMock.mockResolvedValue([]);
  });

  it('uses active provider repository for scoped product ids and keeps badge shape', async () => {
    getListingsByProductIdsMock.mockResolvedValue([
      { productId: 'p1', status: 'running', integrationId: 'int-base', marketplaceData: null },
      { productId: 'p1', status: 'active', integrationId: 'int-base', marketplaceData: null },
      { productId: 'p1', status: 'queued', integrationId: 'int-tradera', marketplaceData: null },
    ]);

    const request = new NextRequest(
      'http://localhost:3000/api/integrations/product-listings?productIds=p1,p2'
    );
    const response = await GET_handler(request, {} as ApiHandlerContext);

    expect(getProductListingRepositoryMock).toHaveBeenCalledTimes(1);
    expect(getListingsByProductIdsMock).toHaveBeenCalledWith(['p1', 'p2']);
    expect(listAllListingsMock).not.toHaveBeenCalled();

    expect(response.status).toBe(200);
    expect(response.headers.get('Server-Timing')).toContain('total;dur=');
    await expect(response.json()).resolves.toEqual({
      p1: { base: 'active', tradera: 'queued' },
    });
  });

  it('uses parsed product ids in POST path', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        productIds: ['p1'],
      },
    });
    getListingsByProductIdsMock.mockResolvedValue([
      { productId: 'p1', status: 'active', integrationId: 'int-base', marketplaceData: null },
    ]);

    const response = await POST_handler({} as NextRequest, {} as ApiHandlerContext);

    expect(getListingsByProductIdsMock).toHaveBeenCalledWith(['p1']);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      p1: { base: 'active' },
    });
  });
});
