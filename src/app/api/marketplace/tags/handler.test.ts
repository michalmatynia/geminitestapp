import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getExternalTagRepositoryMock,
  listByConnectionMock,
} = vi.hoisted(() => ({
  getExternalTagRepositoryMock: vi.fn(),
  listByConnectionMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getExternalTagRepository: getExternalTagRepositoryMock,
}));

import { getHandler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-marketplace-tags-list-1',
    traceId: 'trace-marketplace-tags-list-1',
    correlationId: 'corr-marketplace-tags-list-1',
    startTime: Date.now(),
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('marketplace tags handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getExternalTagRepositoryMock.mockReturnValue({
      listByConnection: listByConnectionMock,
    });
  });

  it('lists tags for a connection', async () => {
    listByConnectionMock.mockResolvedValue([
      {
        id: 'tag-1',
        connectionId: 'conn-1',
        externalId: 'external-1',
        name: 'Tag 1',
      },
    ]);

    const request = new NextRequest('http://localhost/api/marketplace/tags?connectionId=conn-1');
    const response = await getHandler(request, createContext());

    expect(listByConnectionMock).toHaveBeenCalledWith('conn-1');
    await expect(response.json()).resolves.toEqual([
      {
        id: 'tag-1',
        connectionId: 'conn-1',
        externalId: 'external-1',
        name: 'Tag 1',
      },
    ]);
  });

  it('rejects requests without connectionId', async () => {
    const request = new NextRequest('http://localhost/api/marketplace/tags');

    await expect(getHandler(request, createContext())).rejects.toThrow('connectionId is required');

    expect(listByConnectionMock).not.toHaveBeenCalled();
  });
});
