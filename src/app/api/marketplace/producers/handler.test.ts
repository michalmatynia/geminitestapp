import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const {
  getExternalProducerRepositoryMock,
  listByConnectionMock,
} = vi.hoisted(() => ({
  getExternalProducerRepositoryMock: vi.fn(),
  listByConnectionMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getExternalProducerRepository: getExternalProducerRepositoryMock,
}));

import { GET_handler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-marketplace-producers-list-1',
    traceId: 'trace-marketplace-producers-list-1',
    correlationId: 'corr-marketplace-producers-list-1',
    startTime: Date.now(),
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('marketplace producers handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getExternalProducerRepositoryMock.mockReturnValue({
      listByConnection: listByConnectionMock,
    });
  });

  it('lists producers for a connection', async () => {
    listByConnectionMock.mockResolvedValue([
      {
        id: 'producer-1',
        connectionId: 'conn-1',
        externalId: 'external-1',
        name: 'Producer 1',
      },
    ]);

    const request = new NextRequest(
      'http://localhost/api/marketplace/producers?connectionId=conn-1'
    );
    const response = await GET_handler(request, createContext());

    expect(listByConnectionMock).toHaveBeenCalledWith('conn-1');
    await expect(response.json()).resolves.toEqual([
      {
        id: 'producer-1',
        connectionId: 'conn-1',
        externalId: 'external-1',
        name: 'Producer 1',
      },
    ]);
  });

  it('rejects requests without connectionId', async () => {
    const request = new NextRequest('http://localhost/api/marketplace/producers');

    await expect(GET_handler(request, createContext())).rejects.toThrow('connectionId is required');

    expect(listByConnectionMock).not.toHaveBeenCalled();
  });
});
