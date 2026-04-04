import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  fetchBaseTagsMock,
  getExternalTagRepositoryMock,
  getIntegrationRepositoryMock,
  resolveBaseConnectionTokenMock,
  syncFromBaseMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
} = vi.hoisted(() => ({
  fetchBaseTagsMock: vi.fn(),
  getExternalTagRepositoryMock: vi.fn(),
  getIntegrationRepositoryMock: vi.fn(),
  resolveBaseConnectionTokenMock: vi.fn(),
  syncFromBaseMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  fetchBaseTags: fetchBaseTagsMock,
  getExternalTagRepository: getExternalTagRepositoryMock,
  getIntegrationRepository: getIntegrationRepositoryMock,
  resolveBaseConnectionToken: resolveBaseConnectionTokenMock,
}));

import { POST_handler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-marketplace-tags-fetch-1',
    traceId: 'trace-marketplace-tags-fetch-1',
    correlationId: 'corr-marketplace-tags-fetch-1',
    startTime: Date.now(),
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('marketplace tags fetch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getIntegrationRepositoryMock.mockResolvedValue({
      getConnectionById: getConnectionByIdMock,
      getIntegrationById: getIntegrationByIdMock,
    });
    getExternalTagRepositoryMock.mockReturnValue({
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
    fetchBaseTagsMock.mockResolvedValue([
      { id: 'tag-1', name: 'Tag 1' },
      { id: 'tag-2', name: 'Tag 2' },
    ]);
    syncFromBaseMock.mockResolvedValue(2);
  });

  it('fetches and syncs base tags for a supported connection', async () => {
    const request = new NextRequest('http://localhost/api/marketplace/tags/fetch', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST_handler(request, createContext());

    expect(response.status).toBe(200);
    expect(fetchBaseTagsMock).toHaveBeenCalledWith('base-token', {
      inventoryId: 'inventory-1',
    });
    expect(syncFromBaseMock).toHaveBeenCalledWith('conn-1', [
      { id: 'tag-1', name: 'Tag 1' },
      { id: 'tag-2', name: 'Tag 2' },
    ]);
    await expect(response.json()).resolves.toEqual({
      fetched: 2,
      total: 2,
      message: 'Successfully synced 2 tags from Base.com',
    });
  });

  it('returns an empty response when the upstream tag list is empty', async () => {
    fetchBaseTagsMock.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/marketplace/tags/fetch', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST_handler(request, createContext());

    expect(response.status).toBe(200);
    expect(syncFromBaseMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      fetched: 0,
      total: 0,
      message:
        'No tags found in Base.com. Verify tag/label records exist in the selected inventory.',
    });
  });

  it('rejects unsupported marketplace connections before fetching tags', async () => {
    getIntegrationByIdMock.mockResolvedValue({
      slug: 'tradera',
    });

    const request = new NextRequest('http://localhost/api/marketplace/tags/fetch', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    await expect(POST_handler(request, createContext())).rejects.toThrow(
      'Only Base.com connections are supported for tag fetch'
    );

    expect(fetchBaseTagsMock).not.toHaveBeenCalled();
    expect(syncFromBaseMock).not.toHaveBeenCalled();
  });
});
