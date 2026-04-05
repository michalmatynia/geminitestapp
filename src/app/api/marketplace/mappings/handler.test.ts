import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getCategoryMappingRepositoryMock,
  listByConnectionMock,
  getByExternalCategoryMock,
  updateMock,
  createMock,
} = vi.hoisted(() => ({
  getCategoryMappingRepositoryMock: vi.fn(),
  listByConnectionMock: vi.fn(),
  getByExternalCategoryMock: vi.fn(),
  updateMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock('@/features/integrations/services/category-mapping-repository', () => ({
  getCategoryMappingRepository: getCategoryMappingRepositoryMock,
}));

import { GET_handler, POST_handler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-marketplace-mappings-1',
    traceId: 'trace-marketplace-mappings-1',
    correlationId: 'corr-marketplace-mappings-1',
    startTime: Date.now(),
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('marketplace mappings handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCategoryMappingRepositoryMock.mockReturnValue({
      listByConnection: listByConnectionMock,
      getByExternalCategory: getByExternalCategoryMock,
      update: updateMock,
      create: createMock,
    });
  });

  it('lists mappings for a connection and optional catalog', async () => {
    listByConnectionMock.mockResolvedValue([
      {
        id: 'mapping-1',
        connectionId: 'conn-1',
        externalCategoryId: 'external-1',
        internalCategoryId: 'internal-1',
        catalogId: 'catalog-1',
      },
    ]);

    const request = new NextRequest(
      'http://localhost/api/marketplace/mappings?connectionId=conn-1&catalogId=catalog-1'
    );

    const response = await GET_handler(request, createContext());

    expect(listByConnectionMock).toHaveBeenCalledWith('conn-1', 'catalog-1');
    await expect(response.json()).resolves.toEqual([
      {
        id: 'mapping-1',
        connectionId: 'conn-1',
        externalCategoryId: 'external-1',
        internalCategoryId: 'internal-1',
        catalogId: 'catalog-1',
      },
    ]);
  });

  it('updates an existing category mapping on post', async () => {
    getByExternalCategoryMock.mockResolvedValue({
      id: 'mapping-1',
    });
    updateMock.mockResolvedValue({
      id: 'mapping-1',
      connectionId: 'conn-1',
      externalCategoryId: 'external-1',
      internalCategoryId: 'internal-2',
      catalogId: 'catalog-1',
      isActive: true,
    });

    const request = new NextRequest('http://localhost/api/marketplace/mappings', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
        externalCategoryId: 'external-1',
        internalCategoryId: 'internal-2',
        catalogId: 'catalog-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST_handler(request, createContext());

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith('mapping-1', {
      internalCategoryId: 'internal-2',
      isActive: true,
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates a new category mapping when one does not exist', async () => {
    getByExternalCategoryMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'mapping-2',
      connectionId: 'conn-1',
      externalCategoryId: 'external-2',
      internalCategoryId: 'internal-3',
      catalogId: 'catalog-1',
      isActive: true,
    });

    const request = new NextRequest('http://localhost/api/marketplace/mappings', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
        externalCategoryId: 'external-2',
        internalCategoryId: 'internal-3',
        catalogId: 'catalog-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST_handler(request, createContext());

    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith({
      connectionId: 'conn-1',
      externalCategoryId: 'external-2',
      internalCategoryId: 'internal-3',
      catalogId: 'catalog-1',
    });
    await expect(response.json()).resolves.toMatchObject({
      id: 'mapping-2',
    });
  });
});
