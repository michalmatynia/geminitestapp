import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  fetchBaseProducersMock,
  getExternalProducerRepositoryMock,
  getIntegrationRepositoryMock,
  resolveBaseConnectionTokenMock,
  syncFromBaseMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
} = vi.hoisted(() => ({
  fetchBaseProducersMock: vi.fn(),
  getExternalProducerRepositoryMock: vi.fn(),
  getIntegrationRepositoryMock: vi.fn(),
  resolveBaseConnectionTokenMock: vi.fn(),
  syncFromBaseMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  fetchBaseProducers: fetchBaseProducersMock,
  getExternalProducerRepository: getExternalProducerRepositoryMock,
  getIntegrationRepository: getIntegrationRepositoryMock,
  resolveBaseConnectionToken: resolveBaseConnectionTokenMock,
}));

import { postHandler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-marketplace-producers-fetch-1',
    traceId: 'trace-marketplace-producers-fetch-1',
    correlationId: 'corr-marketplace-producers-fetch-1',
    startTime: Date.now(),
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('marketplace producers fetch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getIntegrationRepositoryMock.mockResolvedValue({
      getConnectionById: getConnectionByIdMock,
      getIntegrationById: getIntegrationByIdMock,
    });
    getExternalProducerRepositoryMock.mockReturnValue({
      syncFromBase: syncFromBaseMock,
    });
    getConnectionByIdMock.mockResolvedValue({
      integrationId: 'integration-1',
      baseApiToken: 'encrypted-token',
      baseLastInventoryId: 'inventory-1',
    });
    getIntegrationByIdMock.mockResolvedValue({
      slug: 'base',
    });
    resolveBaseConnectionTokenMock.mockReturnValue({
      token: 'base-token',
      source: 'baseApiToken',
      error: null,
    });
    fetchBaseProducersMock.mockResolvedValue([
      { id: 'producer-1', name: 'Producer 1' },
      { id: 'producer-2', name: 'Producer 2' },
    ]);
    syncFromBaseMock.mockResolvedValue(2);
  });

  it('fetches and syncs base producers for a supported connection', async () => {
    const request = new NextRequest('http://localhost/api/marketplace/producers/fetch', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await postHandler(request, createContext());

    expect(response.status).toBe(200);
    expect(fetchBaseProducersMock).toHaveBeenCalledWith('base-token', {
      inventoryId: 'inventory-1',
    });
    expect(syncFromBaseMock).toHaveBeenCalledWith('conn-1', [
      { id: 'producer-1', name: 'Producer 1' },
      { id: 'producer-2', name: 'Producer 2' },
    ]);
    await expect(response.json()).resolves.toEqual({
      fetched: 2,
      total: 2,
      message: 'Successfully synced 2 producers from Base.com',
    });
  });

  it('returns an empty response when the upstream producer list is empty', async () => {
    fetchBaseProducersMock.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/marketplace/producers/fetch', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await postHandler(request, createContext());

    expect(response.status).toBe(200);
    expect(syncFromBaseMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      fetched: 0,
      total: 0,
      message:
        'No producers found in Base.com. Verify producer/manufacturer records exist in the selected inventory.',
    });
  });

  it('rejects unsupported marketplace connections before fetching producers', async () => {
    getIntegrationByIdMock.mockResolvedValue({
      slug: 'tradera',
    });

    const request = new NextRequest('http://localhost/api/marketplace/producers/fetch', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    await expect(postHandler(request, createContext())).rejects.toThrow(
      'Only Base.com connections are supported for producer fetch'
    );

    expect(fetchBaseProducersMock).not.toHaveBeenCalled();
    expect(syncFromBaseMock).not.toHaveBeenCalled();
  });
});
