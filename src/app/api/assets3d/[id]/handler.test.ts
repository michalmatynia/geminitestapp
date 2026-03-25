import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { getAsset3DRepositoryMock, deleteAsset3DMock, parseJsonBodyMock } = vi.hoisted(() => ({
  getAsset3DRepositoryMock: vi.fn(),
  deleteAsset3DMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
}));

vi.mock('@/features/viewer3d/server', () => ({
  getAsset3DRepository: getAsset3DRepositoryMock,
  deleteAsset3D: deleteAsset3DMock,
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

import { DELETE_handler, GET_handler, PATCH_handler } from './handler';

describe('assets3d by-id handler module', () => {
  const repository = {
    getAsset3DById: vi.fn(),
    updateAsset3D: vi.fn(),
  };

  const requestContext = {
    requestId: 'request-assets3d-1',
    traceId: 'trace-assets3d-1',
    correlationId: 'corr-assets3d-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  } as ApiHandlerContext;

  beforeEach(() => {
    vi.clearAllMocks();
    getAsset3DRepositoryMock.mockReturnValue(repository);
    deleteAsset3DMock.mockResolvedValue(true);
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: { name: 'Updated asset' },
    });
  });

  it('returns the requested asset', async () => {
    repository.getAsset3DById.mockResolvedValue({
      id: 'asset-1',
      name: 'Preview asset',
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/assets3d/asset-1'),
      requestContext,
      { id: 'asset-1' }
    );

    expect(repository.getAsset3DById).toHaveBeenCalledWith('asset-1');
    await expect(response.json()).resolves.toEqual({
      id: 'asset-1',
      name: 'Preview asset',
    });
  });

  it('throws not found when a requested asset is missing', async () => {
    repository.getAsset3DById.mockResolvedValue(null);

    await expect(
      GET_handler(new NextRequest('http://localhost/api/assets3d/missing'), requestContext, {
        id: 'missing',
      })
    ).rejects.toThrow('3D asset not found');
  });

  it('returns the parse-json error response for invalid patch payloads', async () => {
    const parseErrorResponse = new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
    parseJsonBodyMock.mockResolvedValue({
      ok: false,
      response: parseErrorResponse,
    });

    const response = await PATCH_handler(
      new NextRequest('http://localhost/api/assets3d/asset-1', { method: 'PATCH' }),
      requestContext,
      { id: 'asset-1' }
    );

    expect(response).toBe(parseErrorResponse);
    expect(repository.updateAsset3D).not.toHaveBeenCalled();
  });

  it('updates an asset when the patch body is valid', async () => {
    repository.updateAsset3D.mockResolvedValue({
      id: 'asset-1',
      name: 'Updated asset',
    });

    const response = await PATCH_handler(
      new NextRequest('http://localhost/api/assets3d/asset-1', { method: 'PATCH' }),
      requestContext,
      { id: 'asset-1' }
    );

    expect(parseJsonBodyMock).toHaveBeenCalledTimes(1);
    expect(repository.updateAsset3D).toHaveBeenCalledWith('asset-1', {
      name: 'Updated asset',
    });
    await expect(response.json()).resolves.toEqual({
      id: 'asset-1',
      name: 'Updated asset',
    });
  });

  it('deletes an asset and returns success', async () => {
    const response = await DELETE_handler(
      new NextRequest('http://localhost/api/assets3d/asset-1', { method: 'DELETE' }),
      requestContext,
      { id: 'asset-1' }
    );

    expect(deleteAsset3DMock).toHaveBeenCalledWith('asset-1');
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it('throws not found when deleting a missing asset', async () => {
    deleteAsset3DMock.mockResolvedValue(false);

    await expect(
      DELETE_handler(new NextRequest('http://localhost/api/assets3d/missing', { method: 'DELETE' }), requestContext, {
        id: 'missing',
      })
    ).rejects.toThrow('3D asset not found');
  });
});
