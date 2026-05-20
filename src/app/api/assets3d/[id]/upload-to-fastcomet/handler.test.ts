import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { revalidateTagMock, uploadMilkbarAsset3DInRedisRuntimeMock } = vi.hoisted(() => ({
  revalidateTagMock: vi.fn(),
  uploadMilkbarAsset3DInRedisRuntimeMock: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidateTag: revalidateTagMock,
}));

vi.mock('@/features/viewer3d/workers/milkbarAsset3DFastCometUploadQueue', () => ({
  uploadMilkbarAsset3DInRedisRuntime: uploadMilkbarAsset3DInRedisRuntimeMock,
}));

import { postHandler } from './handler';

const requestContext = {
  requestId: 'request-fastcomet-upload-1',
  traceId: 'trace-fastcomet-upload-1',
  correlationId: 'corr-fastcomet-upload-1',
  startTime: Date.now(),
  getElapsedMs: () => 1,
} as ApiHandlerContext;

describe('assets3d FastComet upload handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadMilkbarAsset3DInRedisRuntimeMock.mockResolvedValue({
      id: 'asset-1',
      name: 'Milkbar model',
      metadata: {
        fastCometUploadStatus: 'completed',
        storageProfile: 'milkbarCms',
        storageSource: 'fastcomet',
      },
    });
  });

  it('uploads the asset and revalidates asset detail cache tags', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/assets3d/asset-1/upload-to-fastcomet', {
        method: 'POST',
      }),
      requestContext,
      { id: 'asset-1' }
    );

    expect(uploadMilkbarAsset3DInRedisRuntimeMock).toHaveBeenCalledWith({
      assetId: 'asset-1',
      requestedAt: expect.any(String),
    });
    expect(revalidateTagMock).toHaveBeenCalledWith('assets3d-list', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('assets3d-detail:asset-1', 'max');
    await expect(response.json()).resolves.toEqual({
      asset: {
        id: 'asset-1',
        metadata: {
          fastCometUploadStatus: 'completed',
          storageProfile: 'milkbarCms',
          storageSource: 'fastcomet',
        },
        name: 'Milkbar model',
      },
    });
  });
});
