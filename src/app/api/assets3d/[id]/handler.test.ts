import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  findAsset3DRepositoryAssetMock,
  getAsset3DFromLookupRepositoriesMock,
  getAsset3DRepositoryMock,
  deleteAsset3DMock,
  deleteMilkbarAsset3DInRedisRuntimeMock,
  parseJsonBodyMock,
  cacheLifeMock,
  cacheTagMock,
  revalidateTagMock,
} = vi.hoisted(() => ({
  findAsset3DRepositoryAssetMock: vi.fn(),
  getAsset3DFromLookupRepositoriesMock: vi.fn(),
  getAsset3DRepositoryMock: vi.fn(),
  deleteAsset3DMock: vi.fn(),
  deleteMilkbarAsset3DInRedisRuntimeMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  cacheLifeMock: vi.fn(),
  cacheTagMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock('@/features/viewer3d/server', () => ({
  findAsset3DRepositoryAsset: findAsset3DRepositoryAssetMock,
  getAsset3DFromLookupRepositories: getAsset3DFromLookupRepositoriesMock,
  getAsset3DRepository: getAsset3DRepositoryMock,
  deleteAsset3D: deleteAsset3DMock,
}));

vi.mock('@/features/viewer3d/workers/milkbarAsset3DDeleteQueue', () => ({
  deleteMilkbarAsset3DInRedisRuntime: deleteMilkbarAsset3DInRedisRuntimeMock,
  isMilkbarAsset3DRecord: (asset: { metadata?: Record<string, unknown> } | null | undefined) =>
    asset?.metadata?.['storageProfile'] === 'milkbarCms',
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

vi.mock('next/cache', () => ({
  cacheLife: cacheLifeMock,
  cacheTag: cacheTagMock,
  revalidateTag: revalidateTagMock,
}));

import { deleteHandler, getHandler, patchHandler } from './handler';

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
    repository.getAsset3DById.mockResolvedValue({ id: 'asset-1', name: 'Preview asset' });
    getAsset3DFromLookupRepositoriesMock.mockImplementation((id: string) =>
      repository.getAsset3DById(id)
    );
    findAsset3DRepositoryAssetMock.mockImplementation(async (id: string) => {
      const asset = await repository.getAsset3DById(id);
      return asset === null ? null : { repository, asset };
    });
    deleteAsset3DMock.mockResolvedValue(true);
    deleteMilkbarAsset3DInRedisRuntimeMock.mockResolvedValue({
      assetId: 'asset-1',
      status: 'deleted',
    });
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

    const response = await getHandler(
      new NextRequest('http://localhost/api/assets3d/asset-1'),
      requestContext,
      { id: 'asset-1' }
    );

    expect(repository.getAsset3DById).toHaveBeenCalledWith('asset-1');
    expect(cacheTagMock).toHaveBeenCalledWith('assets3d-detail:asset-1');
    await expect(response.json()).resolves.toEqual({
      id: 'asset-1',
      name: 'Preview asset',
    });
  });

  it('throws not found when a requested asset is missing', async () => {
    repository.getAsset3DById.mockResolvedValue(null);

    await expect(
      getHandler(new NextRequest('http://localhost/api/assets3d/missing'), requestContext, {
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

    const response = await patchHandler(
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

    const response = await patchHandler(
      new NextRequest('http://localhost/api/assets3d/asset-1', { method: 'PATCH' }),
      requestContext,
      { id: 'asset-1' }
    );

    expect(parseJsonBodyMock).toHaveBeenCalledTimes(1);
    expect(repository.updateAsset3D).toHaveBeenCalledWith('asset-1', {
      name: 'Updated asset',
    });
    expect(revalidateTagMock).toHaveBeenCalledWith('assets3d-list', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('assets3d-detail:asset-1', 'max');
    await expect(response.json()).resolves.toEqual({
      id: 'asset-1',
      name: 'Updated asset',
    });
  });

  it('deletes an asset and returns success', async () => {
    const response = await deleteHandler(
      new NextRequest('http://localhost/api/assets3d/asset-1', { method: 'DELETE' }),
      requestContext,
      { id: 'asset-1' }
    );

    expect(deleteAsset3DMock).toHaveBeenCalledWith('asset-1');
    expect(revalidateTagMock).toHaveBeenCalledWith('assets3d-list', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('assets3d-detail:asset-1', 'max');
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it('propagates delete failures without revalidating stale cache', async () => {
    deleteAsset3DMock.mockRejectedValueOnce(new Error('FastComet delete failed'));

    await expect(
      deleteHandler(
        new NextRequest('http://localhost/api/assets3d/asset-1', { method: 'DELETE' }),
        requestContext,
        { id: 'asset-1' }
      )
    ).rejects.toThrow('FastComet delete failed');

    expect(revalidateTagMock).not.toHaveBeenCalledWith('assets3d-list', 'max');
    expect(revalidateTagMock).not.toHaveBeenCalledWith('assets3d-detail:asset-1', 'max');
  });

  it('deletes Milkbar CMS assets in Redis runtime', async () => {
    repository.getAsset3DById.mockResolvedValue({
      id: 'asset-1',
      name: 'Milkbar model',
      metadata: { storageProfile: 'milkbarCms' },
    });

    const response = await deleteHandler(
      new NextRequest('http://localhost/api/assets3d/asset-1', { method: 'DELETE' }),
      requestContext,
      { id: 'asset-1' }
    );

    expect(deleteMilkbarAsset3DInRedisRuntimeMock).toHaveBeenCalledWith({
      assetId: 'asset-1',
      requestedAt: expect.any(String),
    });
    expect(deleteAsset3DMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).toHaveBeenCalledWith('assets3d-list', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('assets3d-detail:asset-1', 'max');
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it('throws not found when deleting a missing asset', async () => {
    deleteAsset3DMock.mockResolvedValue(false);

    await expect(
      deleteHandler(new NextRequest('http://localhost/api/assets3d/missing', { method: 'DELETE' }), requestContext, {
        id: 'missing',
      })
    ).rejects.toThrow('3D asset not found');
  });
});
