/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { postBaseImportParametersHandler } from '@/app/api/v2/integrations/imports/base/parameters/handler';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const listIntegrationsMock = vi.hoisted(() => vi.fn());
const listConnectionsMock = vi.hoisted(() => vi.fn());
const decryptSecretMock = vi.hoisted(() => vi.fn());
const callBaseApiMock = vi.hoisted(() => vi.fn());
const setImportParameterCacheMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: vi.fn(async () => ({
    listIntegrations: listIntegrationsMock,
    listConnections: listConnectionsMock,
  })),
  decryptSecret: decryptSecretMock,
  callBaseApi: callBaseApiMock,
  getImportParameterCache: vi.fn(async () => null),
  setImportParameterCache: setImportParameterCacheMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  ErrorSystem: {
    captureException: vi.fn(),
  },
}));

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

type BaseImportParametersResponse = {
  keys: string[];
  values: Record<string, string>;
  productId?: string;
  inventoryId: string;
};

describe('base import parameters handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listIntegrationsMock.mockResolvedValue([{ id: 'integration-base', slug: 'base-com' }]);
    listConnectionsMock.mockResolvedValue([
      { id: 'conn-1', baseApiToken: 'encrypted-token', password: null },
    ]);
    decryptSecretMock.mockReturnValue('token-1');
    setImportParameterCacheMock.mockResolvedValue(undefined);
  });

  it('hydrates cache from multiple sample products when productId is not provided', async () => {
    callBaseApiMock.mockImplementation(async (_token: string, method: string): Promise<unknown> => {
      if (method === 'getInventoryProductsList') {
        return {
          products: [{ product_id: 'p-1' }, { product_id: 'p-2' }],
        };
      }
      if (method === 'getInventoryProductsData') {
        return {
          products: [
            {
              product_id: 'p-1',
              text_fields: {
                features: {
                  Material: 'Steel',
                },
              },
            },
            {
              product_id: 'p-2',
              text_fields: {
                features: {
                  Color: 'Black',
                },
              },
            },
          ],
        };
      }
      throw new Error(`Unexpected method: ${method}`);
    });

    const response = await postBaseImportParametersHandler(
      new NextRequest('http://localhost/api/integrations/imports/base/parameters', {
        method: 'POST',
        body: JSON.stringify({
          inventoryId: 'inventory-1',
          connectionId: 'conn-1',
          sampleSize: 2,
        }),
      }),
      mockContext
    );
    const payload = (await response.json()) as BaseImportParametersResponse;

    expect(response.status).toBe(200);
    expect(payload.keys).toEqual(
      expect.arrayContaining(['text_fields.features.Material', 'text_fields.features.Color'])
    );
    expect(payload.values).toMatchObject({
      'text_fields.features.Material': 'Steel',
      'text_fields.features.Color': 'Black',
    });
    expect(setImportParameterCacheMock).toHaveBeenCalledWith(
      expect.objectContaining({
        inventoryId: 'inventory-1',
        productId: 'p-1',
      })
    );
    expect(callBaseApiMock).toHaveBeenNthCalledWith(1, 'token-1', 'getInventoryProductsList', {
      inventory_id: 'inventory-1',
      limit: 2,
    });
    expect(callBaseApiMock).toHaveBeenNthCalledWith(2, 'token-1', 'getInventoryProductsData', {
      inventory_id: 'inventory-1',
      products: ['p-1', 'p-2'],
    });
  });

  it('keeps explicit productId flow for single-product key extraction', async () => {
    callBaseApiMock.mockResolvedValue({
      products: [
        {
          product_id: 'p-99',
          text_fields: {
            features: {
              Brand: 'Acme',
            },
          },
        },
      ],
    });

    const response = await postBaseImportParametersHandler(
      new NextRequest('http://localhost/api/integrations/imports/base/parameters', {
        method: 'POST',
        body: JSON.stringify({
          inventoryId: 'inventory-1',
          productId: 'p-99',
          connectionId: 'conn-1',
        }),
      }),
      mockContext
    );
    const payload = (await response.json()) as BaseImportParametersResponse;

    expect(response.status).toBe(200);
    expect(payload.productId).toBe('p-99');
    expect(payload.keys).toEqual(expect.arrayContaining(['text_fields.features.Brand']));
    expect(callBaseApiMock).toHaveBeenCalledTimes(1);
    expect(callBaseApiMock).toHaveBeenCalledWith('token-1', 'getInventoryProductsData', {
      inventory_id: 'inventory-1',
      products: ['p-99'],
    });
  });
});
