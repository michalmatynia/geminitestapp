import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  getTagMappingRepositoryMock,
  listByConnectionMock,
  getByInternalTagMock,
  updateMock,
  createMock,
} = vi.hoisted(() => ({
  getTagMappingRepositoryMock: vi.fn(),
  listByConnectionMock: vi.fn(),
  getByInternalTagMock: vi.fn(),
  updateMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getTagMappingRepository: getTagMappingRepositoryMock,
}));

import { GET_handler, POST_handler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-marketplace-tag-mappings-1',
    traceId: 'trace-marketplace-tag-mappings-1',
    correlationId: 'corr-marketplace-tag-mappings-1',
    startTime: Date.now(),
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('marketplace tag mappings handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTagMappingRepositoryMock.mockReturnValue({
      listByConnection: listByConnectionMock,
      getByInternalTag: getByInternalTagMock,
      update: updateMock,
      create: createMock,
    });
  });

  it('lists tag mappings for a connection', async () => {
    listByConnectionMock.mockResolvedValue([
      {
        id: 'mapping-1',
        connectionId: 'conn-1',
        externalTagId: 'external-1',
        internalTagId: 'internal-1',
      },
    ]);

    const request = new NextRequest(
      'http://localhost/api/marketplace/tag-mappings?connectionId=conn-1'
    );

    const response = await GET_handler(request, createContext());

    expect(listByConnectionMock).toHaveBeenCalledWith('conn-1');
    await expect(response.json()).resolves.toEqual([
      {
        id: 'mapping-1',
        connectionId: 'conn-1',
        externalTagId: 'external-1',
        internalTagId: 'internal-1',
      },
    ]);
  });

  it('updates an existing tag mapping on post', async () => {
    getByInternalTagMock.mockResolvedValue({
      id: 'mapping-1',
    });
    updateMock.mockResolvedValue({
      id: 'mapping-1',
      connectionId: 'conn-1',
      externalTagId: 'external-2',
      internalTagId: 'internal-1',
      isActive: true,
    });

    const request = new NextRequest('http://localhost/api/marketplace/tag-mappings', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
        externalTagId: 'external-2',
        internalTagId: 'internal-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST_handler(request, createContext());

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith('mapping-1', {
      externalTagId: 'external-2',
      isActive: true,
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates a new tag mapping when one does not exist', async () => {
    getByInternalTagMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'mapping-2',
      connectionId: 'conn-1',
      externalTagId: 'external-3',
      internalTagId: 'internal-2',
      isActive: true,
    });

    const request = new NextRequest('http://localhost/api/marketplace/tag-mappings', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
        externalTagId: 'external-3',
        internalTagId: 'internal-2',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST_handler(request, createContext());

    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith({
      connectionId: 'conn-1',
      externalTagId: 'external-3',
      internalTagId: 'internal-2',
    });
    await expect(response.json()).resolves.toMatchObject({
      id: 'mapping-2',
    });
  });
});
