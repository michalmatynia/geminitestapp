import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getExternalCategoryRepositoryMock,
  listByConnectionMock,
  getTreeByConnectionMock,
} = vi.hoisted(() => ({
  getExternalCategoryRepositoryMock: vi.fn(),
  listByConnectionMock: vi.fn(),
  getTreeByConnectionMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getExternalCategoryRepository: getExternalCategoryRepositoryMock,
}));

import { getHandler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-marketplace-categories-list-1',
    traceId: 'trace-marketplace-categories-list-1',
    correlationId: 'corr-marketplace-categories-list-1',
    startTime: Date.now(),
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('marketplace categories handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getExternalCategoryRepositoryMock.mockReturnValue({
      listByConnection: listByConnectionMock,
      getTreeByConnection: getTreeByConnectionMock,
    });
  });

  it('lists flat categories for a connection by default', async () => {
    listByConnectionMock.mockResolvedValue([
      {
        id: 'cat-1',
        connectionId: 'conn-1',
        externalId: 'external-1',
        name: 'Category 1',
      },
    ]);

    const request = new NextRequest(
      'http://localhost/api/marketplace/categories?connectionId=conn-1'
    );

    const response = await getHandler(request, createContext());

    expect(listByConnectionMock).toHaveBeenCalledWith('conn-1');
    expect(getTreeByConnectionMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual([
      {
        id: 'cat-1',
        connectionId: 'conn-1',
        externalId: 'external-1',
        name: 'Category 1',
      },
    ]);
  });

  it('lists tree categories when tree=true is requested', async () => {
    getTreeByConnectionMock.mockResolvedValue([
      {
        id: 'cat-1',
        connectionId: 'conn-1',
        externalId: 'external-1',
        name: 'Category 1',
        children: [],
      },
    ]);

    const request = new NextRequest(
      'http://localhost/api/marketplace/categories?connectionId=conn-1&tree=true'
    );

    const response = await getHandler(request, createContext());

    expect(getTreeByConnectionMock).toHaveBeenCalledWith('conn-1');
    expect(listByConnectionMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual([
      {
        id: 'cat-1',
        connectionId: 'conn-1',
        externalId: 'external-1',
        name: 'Category 1',
        children: [],
      },
    ]);
  });

  it('rejects requests without connectionId', async () => {
    const request = new NextRequest('http://localhost/api/marketplace/categories');

    await expect(getHandler(request, createContext())).rejects.toThrow('connectionId is required');

    expect(listByConnectionMock).not.toHaveBeenCalled();
    expect(getTreeByConnectionMock).not.toHaveBeenCalled();
  });
});
