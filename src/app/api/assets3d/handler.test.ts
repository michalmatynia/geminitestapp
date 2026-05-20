import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cacheTag: vi.fn(),
  getAsset3DRepository: vi.fn(),
  assertMilkbarAsset3DFastCometUploadRedisRuntime: vi.fn(),
  deleteMilkbarAsset3DInRedisRuntime: vi.fn(),
  revalidateTag: vi.fn(),
  uploadAsset3D: vi.fn(),
  uploadMilkbarAsset3DInRedisRuntime: vi.fn(),
  validate3DFile: vi.fn(),
}));

vi.mock('next/cache', () => ({
  cacheTag: mocks.cacheTag,
  revalidateTag: mocks.revalidateTag,
}));

vi.mock('@/features/viewer3d/server', () => ({
  getAsset3DRepository: mocks.getAsset3DRepository,
  uploadAsset3D: mocks.uploadAsset3D,
  validate3DFile: mocks.validate3DFile,
}));

vi.mock('@/features/viewer3d/workers/milkbarAsset3DFastCometUploadQueue', () => ({
  assertMilkbarAsset3DFastCometUploadRedisRuntime:
    mocks.assertMilkbarAsset3DFastCometUploadRedisRuntime,
  uploadMilkbarAsset3DInRedisRuntime: mocks.uploadMilkbarAsset3DInRedisRuntime,
}));

vi.mock('@/features/viewer3d/workers/milkbarAsset3DDeleteQueue', () => ({
  deleteMilkbarAsset3DInRedisRuntime: mocks.deleteMilkbarAsset3DInRedisRuntime,
}));

import { postHandler } from './handler';

const createUploadRequest = (
  storageProfile?: string,
  replaceAssetId?: string
): NextRequest => {
  const formData = new FormData();
  formData.append('file', new File(['model-bytes'], 'project.glb', { type: 'model/gltf-binary' }));
  formData.append('name', 'Project Model');
  if (storageProfile !== undefined) {
    formData.append('storageProfile', storageProfile);
  }
  if (replaceAssetId !== undefined) {
    formData.append('replaceAssetId', replaceAssetId);
  }

  return new NextRequest('http://localhost/api/assets3d', {
    method: 'POST',
    body: formData,
  });
};

describe('assets3d postHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate3DFile.mockReturnValue({ valid: true });
    mocks.uploadAsset3D.mockResolvedValue({
      id: 'asset-1',
      name: 'Project Model',
      description: null,
      categoryId: null,
      createdAt: new Date('2026-05-15T00:00:00.000Z'),
      updatedAt: new Date('2026-05-15T00:00:00.000Z'),
    });
    mocks.uploadMilkbarAsset3DInRedisRuntime.mockResolvedValue({
      id: 'asset-1',
      name: 'Project Model',
      description: null,
      categoryId: null,
      createdAt: new Date('2026-05-15T00:00:00.000Z'),
      updatedAt: new Date('2026-05-15T00:00:00.000Z'),
    });
    mocks.deleteMilkbarAsset3DInRedisRuntime.mockResolvedValue({
      assetId: 'old-asset',
      status: 'deleted',
    });
  });

  it('keeps normal 3D uploads on the default storage profile', async () => {
    const response = await postHandler(createUploadRequest(), { source: 'test' });
    const [file, options] = mocks.uploadAsset3D.mock.calls[0] ?? [];

    expect(response.status).toBe(201);
    expect(file).toBeDefined();
    expect(options).toMatchObject({
      name: 'Project Model',
      storageProfile: 'default',
    });
  });

  it('stages Milkbar 3D uploads locally without queueing the FastComet Redis runtime job', async () => {
    const response = await postHandler(createUploadRequest('milkbarCms'), { source: 'test' });
    const [file, options] = mocks.uploadAsset3D.mock.calls[0] ?? [];

    expect(response.status).toBe(201);
    expect(file).toBeDefined();
    expect(mocks.assertMilkbarAsset3DFastCometUploadRedisRuntime).not.toHaveBeenCalled();
    expect(options).toMatchObject({
      metadata: { fastCometUploadStatus: 'queued' },
      name: 'Project Model',
      storageProfile: 'milkbarCms',
      storageSource: 'local',
    });
    expect(mocks.uploadMilkbarAsset3DInRedisRuntime).not.toHaveBeenCalled();
  });

  it('deletes the previous Milkbar model in Redis before staging the replacement upload', async () => {
    const response = await postHandler(
      createUploadRequest('milkbarCms', 'old-asset'),
      { source: 'test' }
    );

    expect(response.status).toBe(201);
    expect(mocks.deleteMilkbarAsset3DInRedisRuntime).toHaveBeenCalledWith({
      assetId: 'old-asset',
      requestedAt: expect.any(String),
    });
    expect(mocks.deleteMilkbarAsset3DInRedisRuntime.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.uploadAsset3D.mock.invocationCallOrder[0] ?? 0);
    expect(mocks.uploadMilkbarAsset3DInRedisRuntime).not.toHaveBeenCalled();
  });

  it('does not stage a replacement upload when deleting the previous Milkbar model fails', async () => {
    mocks.deleteMilkbarAsset3DInRedisRuntime.mockRejectedValueOnce(new Error('delete failed'));

    await expect(
      postHandler(createUploadRequest('milkbarCms', 'old-asset'), { source: 'test' })
    ).rejects.toThrow('delete failed');

    expect(mocks.uploadAsset3D).not.toHaveBeenCalled();
    expect(mocks.uploadMilkbarAsset3DInRedisRuntime).not.toHaveBeenCalled();
  });
});
