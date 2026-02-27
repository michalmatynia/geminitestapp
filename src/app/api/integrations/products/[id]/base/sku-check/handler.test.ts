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
  checkBaseSkuExistsMock,
  resolveBaseConnectionTokenMock,
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

  const checkBaseSkuExistsMock = vi.fn();
  const resolveBaseConnectionTokenMock = vi.fn();

  return {
    parseJsonBodyMock,
    getProductByIdMock,
    getProductRepositoryMock,
    getConnectionByIdMock,
    getIntegrationByIdMock,
    getIntegrationRepositoryMock,
    checkBaseSkuExistsMock,
    resolveBaseConnectionTokenMock,
  };
});

vi.mock('@/features/products/server', () => ({
  parseJsonBody: parseJsonBodyMock,
  getProductRepository: getProductRepositoryMock,
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: getIntegrationRepositoryMock,
  checkBaseSkuExists: checkBaseSkuExistsMock,
}));

vi.mock('@/features/integrations/services/base-token-resolver', () => ({
  resolveBaseConnectionToken: resolveBaseConnectionTokenMock,
}));

import { POST_handler } from './handler';

const buildContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-base-sku-check',
    startTime: Date.now(),
    userId: null,
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('integrations/products/[id]/base/sku-check POST handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        connectionId: 'conn-base-1',
        inventoryId: 'inv-main',
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

    resolveBaseConnectionTokenMock.mockReturnValue({
      token: 'token-123',
      error: null,
    });

    checkBaseSkuExistsMock.mockResolvedValue({ exists: false });
  });

  it('returns exists=false when SKU is missing in Base.com inventory', async () => {
    const response = await POST_handler(
      {} as NextRequest,
      buildContext(),
      { id: 'product-1' }
    );

    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual({
      sku: 'SKU-001',
      exists: false,
      existingProductId: null,
    });

    expect(checkBaseSkuExistsMock).toHaveBeenCalledWith(
      'token-123',
      'inv-main',
      'SKU-001'
    );
  });

  it('returns exists=true and existingProductId when SKU exists in Base.com', async () => {
    checkBaseSkuExistsMock.mockResolvedValueOnce({
      exists: true,
      productId: '  base-prod-88  ',
    });

    const response = await POST_handler(
      {} as NextRequest,
      buildContext(),
      { id: 'product-1' }
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual({
      sku: 'SKU-001',
      exists: true,
      existingProductId: 'base-prod-88',
    });
  });

  it('throws 400 when product has no SKU', async () => {
    getProductByIdMock.mockResolvedValueOnce({
      id: 'product-1',
      sku: '   ',
    });

    await expect(
      POST_handler({} as NextRequest, buildContext(), { id: 'product-1' })
    ).rejects.toThrow('Product SKU is required to check Base.com availability.');

    expect(checkBaseSkuExistsMock).not.toHaveBeenCalled();
  });

  it('throws 404 when connection does not exist', async () => {
    getConnectionByIdMock.mockResolvedValueOnce(null);

    await expect(
      POST_handler({} as NextRequest, buildContext(), { id: 'product-1' })
    ).rejects.toThrow('Connection not found.');

    expect(checkBaseSkuExistsMock).not.toHaveBeenCalled();
  });

  it('throws 400 when Base token is missing', async () => {
    resolveBaseConnectionTokenMock.mockReturnValueOnce({
      token: null,
      error: 'No Base API token configured.',
    });

    await expect(
      POST_handler({} as NextRequest, buildContext(), { id: 'product-1' })
    ).rejects.toThrow('No Base API token configured.');

    expect(checkBaseSkuExistsMock).not.toHaveBeenCalled();
  });
});
