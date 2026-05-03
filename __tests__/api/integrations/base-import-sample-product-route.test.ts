import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptSecret } from '@/shared/lib/security/encryption';
import { baseInventoryProductsListObjectPayload } from '@/features/integrations/services/imports/base-import-fixtures';

const listIntegrationsMock = vi.hoisted(() => vi.fn());
const listConnectionsMock = vi.hoisted(() => vi.fn());
const callBaseApiMock = vi.hoisted(() => vi.fn());
const setImportSampleInventoryIdMock = vi.hoisted(() => vi.fn());
const setImportSampleProductIdMock = vi.hoisted(() => vi.fn());
const resolveBaseConnectionTokenMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: vi.fn(async () => ({
    listIntegrations: listIntegrationsMock,
    listConnections: listConnectionsMock,
  })),
  callBaseApi: callBaseApiMock,
  resolveBaseConnectionToken: resolveBaseConnectionTokenMock,
  getImportSampleInventoryId: vi.fn(async () => null),
  getImportSampleProductId: vi.fn(async () => null),
  setImportSampleInventoryId: setImportSampleInventoryIdMock,
  setImportSampleProductId: setImportSampleProductIdMock,
}));

import { POST as sampleProductPost } from '@/app/api/v2/integrations/imports/base/sample-product/route';

const buildSampleProductRequest = (payload: Record<string, unknown>) =>
  new NextRequest('http://localhost/api/v2/integrations/imports/base/sample-product', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

type SampleProductResponse = {
  productId: string | null;
  inventoryId: string | null;
};

describe('base import sample-product route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['INTEGRATION_ENCRYPTION_KEY'] = Buffer.from('b'.repeat(32)).toString('base64');
    const encryptedToken = encryptSecret('token-1');
    listIntegrationsMock.mockResolvedValue([{ id: 'integration-base', slug: 'base-com' }]);
    listConnectionsMock.mockResolvedValue([{ id: 'conn-1', baseApiToken: encryptedToken, password: null }]);
    resolveBaseConnectionTokenMock.mockReturnValue({ token: 'token-1', error: null });
    callBaseApiMock.mockResolvedValue({
      products: [{ product_id: 'p-1' }],
    });
    setImportSampleInventoryIdMock.mockResolvedValue(undefined);
    setImportSampleProductIdMock.mockResolvedValue(undefined);
  });

  it('requires explicit connectionId when productId is not provided', async () => {
    const response = await sampleProductPost(buildSampleProductRequest({
      inventoryId: 'inventory-1',
    }));

    expect(response.status).toBe(400);
    expect(callBaseApiMock).not.toHaveBeenCalled();
  });

  it('loads sample product using selected connection', async () => {
    const response = await sampleProductPost(buildSampleProductRequest({
      inventoryId: 'inventory-1',
      connectionId: 'conn-1',
    }));
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

  it('falls back to keyed product-map entries returned by Base list payloads', async () => {
    callBaseApiMock.mockResolvedValue(baseInventoryProductsListObjectPayload);

    const response = await sampleProductPost(buildSampleProductRequest({
      inventoryId: 'inventory-1',
      connectionId: 'conn-1',
    }));
    const payload = (await response.json()) as SampleProductResponse;

    expect(response.status).toBe(200);
    expect(setImportSampleProductIdMock).toHaveBeenCalledWith('2001');
    expect(payload).toEqual({
      productId: '2001',
      inventoryId: 'inventory-1',
    });
  });
});
