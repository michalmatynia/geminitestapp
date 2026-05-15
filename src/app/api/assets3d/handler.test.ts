import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAsset3DRepository: vi.fn(),
  uploadAsset3D: vi.fn(),
  validate3DFile: vi.fn(),
}));

vi.mock('@/features/viewer3d/server', () => ({
  getAsset3DRepository: mocks.getAsset3DRepository,
  uploadAsset3D: mocks.uploadAsset3D,
  validate3DFile: mocks.validate3DFile,
}));

import { postHandler } from './handler';

const createUploadRequest = (storageProfile?: string): NextRequest => {
  const formData = new FormData();
  formData.append('file', new File(['model-bytes'], 'project.glb', { type: 'model/gltf-binary' }));
  formData.append('name', 'Project Model');
  if (storageProfile !== undefined) {
    formData.append('storageProfile', storageProfile);
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

  it('uses the Milkbar storage profile only when the CMS request asks for it', async () => {
    const response = await postHandler(createUploadRequest('milkbarCms'), { source: 'test' });
    const [file, options] = mocks.uploadAsset3D.mock.calls[0] ?? [];

    expect(response.status).toBe(201);
    expect(file).toBeDefined();
    expect(options).toMatchObject({
      name: 'Project Model',
      storageProfile: 'milkbarCms',
    });
  });
});
