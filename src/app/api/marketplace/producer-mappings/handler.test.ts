import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const {
  getProducerMappingRepositoryMock,
  listByConnectionMock,
  getByInternalProducerMock,
  updateMock,
  createMock,
} = vi.hoisted(() => ({
  getProducerMappingRepositoryMock: vi.fn(),
  listByConnectionMock: vi.fn(),
  getByInternalProducerMock: vi.fn(),
  updateMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getProducerMappingRepository: getProducerMappingRepositoryMock,
}));

import { GET_handler, POST_handler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-marketplace-producer-mappings-1',
    traceId: 'trace-marketplace-producer-mappings-1',
    correlationId: 'corr-marketplace-producer-mappings-1',
    startTime: Date.now(),
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('marketplace producer mappings handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProducerMappingRepositoryMock.mockReturnValue({
      listByConnection: listByConnectionMock,
      getByInternalProducer: getByInternalProducerMock,
      update: updateMock,
      create: createMock,
    });
  });

  it('lists producer mappings for a connection', async () => {
    listByConnectionMock.mockResolvedValue([
      {
        id: 'mapping-1',
        connectionId: 'conn-1',
        externalProducerId: 'external-1',
        internalProducerId: 'internal-1',
      },
    ]);

    const request = new NextRequest(
      'http://localhost/api/marketplace/producer-mappings?connectionId=conn-1'
    );

    const response = await GET_handler(request, createContext());

    expect(listByConnectionMock).toHaveBeenCalledWith('conn-1');
    await expect(response.json()).resolves.toEqual([
      {
        id: 'mapping-1',
        connectionId: 'conn-1',
        externalProducerId: 'external-1',
        internalProducerId: 'internal-1',
      },
    ]);
  });

  it('updates an existing producer mapping on post', async () => {
    getByInternalProducerMock.mockResolvedValue({
      id: 'mapping-1',
    });
    updateMock.mockResolvedValue({
      id: 'mapping-1',
      connectionId: 'conn-1',
      externalProducerId: 'external-2',
      internalProducerId: 'internal-1',
      isActive: true,
    });

    const request = new NextRequest('http://localhost/api/marketplace/producer-mappings', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
        externalProducerId: 'external-2',
        internalProducerId: 'internal-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST_handler(request, createContext());

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith('mapping-1', {
      externalProducerId: 'external-2',
      isActive: true,
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates a new producer mapping when one does not exist', async () => {
    getByInternalProducerMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'mapping-2',
      connectionId: 'conn-1',
      externalProducerId: 'external-3',
      internalProducerId: 'internal-2',
      isActive: true,
    });

    const request = new NextRequest('http://localhost/api/marketplace/producer-mappings', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
        externalProducerId: 'external-3',
        internalProducerId: 'internal-2',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST_handler(request, createContext());

    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith({
      connectionId: 'conn-1',
      externalProducerId: 'external-3',
      internalProducerId: 'internal-2',
    });
    await expect(response.json()).resolves.toMatchObject({
      id: 'mapping-2',
    });
  });
});
