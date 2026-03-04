import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listIntegrationsMock = vi.hoisted(() => vi.fn());
const listConnectionsMock = vi.hoisted(() => vi.fn());
const decryptSecretMock = vi.hoisted(() => vi.fn());
const callBaseApiMock = vi.hoisted(() => vi.fn());
const setImportSampleInventoryIdMock = vi.hoisted(() => vi.fn());
const setImportSampleProductIdMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: vi.fn(async () => ({
    listIntegrations: listIntegrationsMock,
    listConnections: listConnectionsMock,
  })),
  decryptSecret: decryptSecretMock,
  callBaseApi: callBaseApiMock,
  getImportSampleInventoryId: vi.fn(async () => null),
  getImportSampleProductId: vi.fn(async () => null),
  setImportSampleInventoryId: setImportSampleInventoryIdMock,
  setImportSampleProductId: setImportSampleProductIdMock,
}));

import { POST as sampleProductPost } from '@/app/api/v2/integrations/imports/base/sample-product/route';

type SampleProductResponse = {
  productId: string | null;
  inventoryId: string | null;
};

describe('base import sample-product route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listIntegrationsMock.mockResolvedValue([{ id: 'integration-base', slug: 'base-com' }]);
    listConnectionsMock.mockResolvedValue([
      { id: 'conn-1', baseApiToken: 'encrypted-token', password: null },
    ]);
    decryptSecretMock.mockReturnValue('token-1');
    callBaseApiMock.mockResolvedValue({
      products: [{ product_id: 'p-1' }],
    });
    setImportSampleInventoryIdMock.mockResolvedValue(undefined);
    setImportSampleProductIdMock.mockResolvedValue(undefined);
  });

  it('requires explicit connectionId when productId is not provided', async () => {
    const response = await sampleProductPost(
      new NextRequest('http://localhost/api/v2/integrations/imports/base/sample-product', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          inventoryId: 'inventory-1',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(callBaseApiMock).not.toHaveBeenCalled();
  });

  it('loads sample product using selected connection', async () => {
    const response = await sampleProductPost(
      new NextRequest('http://localhost/api/v2/integrations/imports/base/sample-product', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          inventoryId: 'inventory-1',
          connectionId: 'conn-1',
        }),
      })
    );
    const payload = (await response.json()) as SampleProductResponse;

    expect(response.status).toBe(200);
    expect(callBaseApiMock).toHaveBeenCalledWith('token-1', 'getInventoryProductsList', {
      inventory_id: 'inventory-1',
      limit: 1,
    });
    expect(setImportSampleProductIdMock).toHaveBeenCalledWith('p-1');
    expect(setImportSampleInventoryIdMock).toHaveBeenCalledWith('inventory-1');
    expect(payload).toEqual({
      productId: 'p-1',
      inventoryId: 'inventory-1',
    });
  });
});
