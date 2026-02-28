import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  parseJsonBodyMock,
  getProductByIdMock,
  getProductRepositoryMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
  getIntegrationRepositoryMock,
  findListingAcrossProvidersMock,
  getProductListingRepositoryMock,
  createListingMock,
  updateListingExternalIdMock,
  updateListingInventoryIdMock,
  updateListingStatusMock,
} = vi.hoisted(() => {
  const parseJsonBodyMock = vi.fn();

  const getProductByIdMock = vi.fn();
  const getProductRepositoryMock = vi.fn().mockResolvedValue({
    getProductById: getProductByIdMock,
  });

  const getConnectionByIdMock = vi.fn();
  const getIntegrationByIdMock = vi.fn();
  const getIntegrationRepositoryMock = vi.fn().mockResolvedValue({
    getConnectionById: getConnectionByIdMock,
    getIntegrationById: getIntegrationByIdMock,
  });

  const findListingAcrossProvidersMock = vi.fn();

  const createListingMock = vi.fn();
  const getProductListingRepositoryMock = vi.fn().mockResolvedValue({
    createListing: createListingMock,
  });

  const updateListingExternalIdMock = vi.fn();
  const updateListingInventoryIdMock = vi.fn();
  const updateListingStatusMock = vi.fn();

  return {
    parseJsonBodyMock,
    getProductByIdMock,
    getProductRepositoryMock,
    getConnectionByIdMock,
    getIntegrationByIdMock,
    getIntegrationRepositoryMock,
    findListingAcrossProvidersMock,
    getProductListingRepositoryMock,
    createListingMock,
    updateListingExternalIdMock,
    updateListingInventoryIdMock,
    updateListingStatusMock,
  };
});

vi.mock('@/features/products/server', () => ({
  parseJsonBody: parseJsonBodyMock,
  getProductRepository: getProductRepositoryMock,
}));

vi.mock('@/shared/lib/integrations/server', () => ({
  getIntegrationRepository: getIntegrationRepositoryMock,
  findProductListingByProductAndConnectionAcrossProviders: findListingAcrossProvidersMock,
  getProductListingRepository: getProductListingRepositoryMock,
}));

import { POST_handler } from './handler';

const buildContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-base-link-existing',
    startTime: Date.now(),
    userId: null,
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('integrations/products/[id]/base/link-existing POST handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        connectionId: 'conn-base-1',
        inventoryId: 'inv-main',
        externalListingId: 'base-prod-77',
      },
    });

    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-001',
    });

    getConnectionByIdMock.mockResolvedValue({
      id: 'conn-base-1',
      integrationId: 'integration-base',
      name: 'Base Main',
    });

    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-base',
      slug: 'baselinker',
      name: 'Baselinker',
    });

    findListingAcrossProvidersMock.mockResolvedValue(null);
    createListingMock.mockResolvedValue({ id: 'listing-new-1' });

    updateListingExternalIdMock.mockResolvedValue(undefined);
    updateListingInventoryIdMock.mockResolvedValue(undefined);
    updateListingStatusMock.mockResolvedValue(undefined);
  });

  it('creates a new local base listing link when listing does not exist', async () => {
    const response = await POST_handler({} as NextRequest, buildContext(), { id: 'product-1' });

    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(createListingMock).toHaveBeenCalledWith({
      productId: 'product-1',
      integrationId: 'integration-base',
      connectionId: 'conn-base-1',
      status: 'active',
      externalListingId: 'base-prod-77',
      inventoryId: 'inv-main',
      marketplaceData: {
        source: 'manual-link-by-sku',
        marketplace: 'base',
      },
    });
    expect(body).toEqual({
      linked: true,
      listingId: 'listing-new-1',
      externalListingId: 'base-prod-77',
    });
  });

  it('updates existing listing link for product and connection', async () => {
    findListingAcrossProvidersMock.mockResolvedValueOnce({
      listing: {
        id: 'listing-existing-1',
      },
      repository: {
        updateListingExternalId: updateListingExternalIdMock,
        updateListingInventoryId: updateListingInventoryIdMock,
        updateListingStatus: updateListingStatusMock,
      },
    });

    const response = await POST_handler({} as NextRequest, buildContext(), { id: 'product-1' });

    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(updateListingExternalIdMock).toHaveBeenCalledWith('listing-existing-1', 'base-prod-77');
    expect(updateListingInventoryIdMock).toHaveBeenCalledWith('listing-existing-1', 'inv-main');
    expect(updateListingStatusMock).toHaveBeenCalledWith('listing-existing-1', 'active');
    expect(createListingMock).not.toHaveBeenCalled();
    expect(body).toEqual({
      linked: true,
      listingId: 'listing-existing-1',
      externalListingId: 'base-prod-77',
    });
  });

  it('throws 404 when product does not exist', async () => {
    getProductByIdMock.mockResolvedValueOnce(null);

    await expect(
      POST_handler({} as NextRequest, buildContext(), { id: 'product-1' })
    ).rejects.toThrow('Product not found.');

    expect(createListingMock).not.toHaveBeenCalled();
  });

  it('throws 400 when selected connection is not Base.com', async () => {
    getIntegrationByIdMock.mockResolvedValueOnce({
      id: 'integration-x',
      slug: 'allegro',
      name: 'Allegro',
    });

    await expect(
      POST_handler({} as NextRequest, buildContext(), { id: 'product-1' })
    ).rejects.toThrow('Selected connection is not a Base.com integration.');

    expect(createListingMock).not.toHaveBeenCalled();
  });
});
