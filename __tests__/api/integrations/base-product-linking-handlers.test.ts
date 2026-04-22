import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { postHandler as linkExistingHandler } from '@/app/api/v2/integrations/products/[id]/base/link-existing/handler';
import { postHandler as skuCheckHandler } from '@/app/api/v2/integrations/products/[id]/base/sku-check/handler';
import type {
  BaseProductLinkExistingResponse,
  BaseProductSkuCheckResponse,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const checkBaseSkuExistsMock = vi.hoisted(() => vi.fn());
const resolveBaseConnectionTokenMock = vi.hoisted(() => vi.fn());
const findProductListingByProductAndConnectionAcrossProvidersMock = vi.hoisted(() => vi.fn());
const getConnectionByIdMock = vi.hoisted(() => vi.fn());
const getIntegrationByIdMock = vi.hoisted(() => vi.fn());
const createListingMock = vi.hoisted(() => vi.fn());
const getProductByIdMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/server', () => ({
  checkBaseSkuExists: checkBaseSkuExistsMock,
  resolveBaseConnectionToken: resolveBaseConnectionTokenMock,
  findProductListingByProductAndConnectionAcrossProviders:
    findProductListingByProductAndConnectionAcrossProvidersMock,
  getIntegrationRepository: vi.fn(async () => ({
    getConnectionById: getConnectionByIdMock,
    getIntegrationById: getIntegrationByIdMock,
  })),
  getProductListingRepository: vi.fn(async () => ({
    createListing: createListingMock,
  })),
}));

vi.mock('@/features/products/server', async () => {
  const actual = await vi.importActual<typeof import('@/features/products/server')>(
    '@/features/products/server'
  );
  return {
    ...actual,
    getProductRepository: vi.fn(async () => ({
      getProductById: getProductByIdMock,
    })),
  };
});

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

const buildSkuCheckRequest = (payload: Record<string, unknown>) =>
  new NextRequest('http://localhost/api/v2/integrations/products/product-1/base/sku-check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

const buildLinkExistingRequest = (payload: Record<string, unknown>) =>
  new NextRequest(
    'http://localhost/api/v2/integrations/products/product-1/base/link-existing',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

describe('base product linking handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProductByIdMock.mockResolvedValue({ id: 'product-1', sku: 'SKU-001' });
    getConnectionByIdMock.mockResolvedValue({
      id: 'conn-1',
      integrationId: 'integration-base',
      baseApiToken: 'encrypted-token',
    });
    getIntegrationByIdMock.mockResolvedValue({ id: 'integration-base', slug: 'base-com' });
    resolveBaseConnectionTokenMock.mockReturnValue({ token: 'token-1', error: null });
    checkBaseSkuExistsMock.mockResolvedValue({ exists: true, productId: 'base-123' });
    findProductListingByProductAndConnectionAcrossProvidersMock.mockResolvedValue(null);
    createListingMock.mockResolvedValue({ id: 'listing-1' });
  });

  it('returns the centralized Base SKU check response', async () => {
    const response = await skuCheckHandler(
      buildSkuCheckRequest({
        connectionId: 'conn-1',
        inventoryId: 'inv-1',
      }),
      mockContext,
      { id: 'product-1' }
    );
    const payload = (await response.json()) as BaseProductSkuCheckResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      sku: 'SKU-001',
      exists: true,
      existingProductId: 'base-123',
    });
  });

  it('returns the centralized link-existing response when creating a listing link', async () => {
    const response = await linkExistingHandler(
      buildLinkExistingRequest({
        connectionId: 'conn-1',
        inventoryId: 'inv-1',
        externalListingId: 'base-123',
      }),
      mockContext,
      { id: 'product-1' }
    );
    const payload = (await response.json()) as BaseProductLinkExistingResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      linked: true,
      listingId: 'listing-1',
      externalListingId: 'base-123',
    });
    expect(createListingMock).toHaveBeenCalledWith({
      productId: 'product-1',
      integrationId: 'integration-base',
      connectionId: 'conn-1',
      status: 'active',
      externalListingId: 'base-123',
      inventoryId: 'inv-1',
      marketplaceData: {
        source: 'manual-link-by-sku',
        marketplace: 'base',
      },
    });
  });
});
