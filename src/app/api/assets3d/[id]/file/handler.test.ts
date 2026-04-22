import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  existsSyncMock,
  readFileMock,
  getDiskPathFromPublicPathMock,
  isHttpFilepathMock,
  getAsset3DByIdMock,
} = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  readFileMock: vi.fn(),
  getDiskPathFromPublicPathMock: vi.fn(),
  isHttpFilepathMock: vi.fn(),
  getAsset3DByIdMock: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  default: {
    existsSync: existsSyncMock,
  },
}));

vi.mock('fs/promises', () => ({
  readFile: readFileMock,
  default: {
    readFile: readFileMock,
  },
}));

vi.mock('@/features/files/server', () => ({
  getDiskPathFromPublicPath: getDiskPathFromPublicPathMock,
  isHttpFilepath: isHttpFilepathMock,
}));

vi.mock('@/features/viewer3d/server', () => ({
  getAsset3DRepository: () => ({
    getAsset3DById: getAsset3DByIdMock,
  }),
}));

import { getHandler } from './handler';

describe('assets3d file handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serves local files through the shared disk-path guard', async () => {
    getAsset3DByIdMock.mockResolvedValue({
      id: 'asset-1',
      filepath: '/uploads/assets3d/model.glb',
      mimetype: 'model/gltf-binary',
    });
    isHttpFilepathMock.mockReturnValue(false);
    getDiskPathFromPublicPathMock.mockReturnValue('/tmp/model.glb');
    existsSyncMock.mockReturnValue(true);
    readFileMock.mockResolvedValue(Buffer.from('local-model'));

    const response = await getHandler(
      new Request('http://localhost/api/assets3d/asset-1/file') as Parameters<typeof getHandler>[0],
      {} as Parameters<typeof getHandler>[1],
      { id: 'asset-1' }
    );

    expect(getDiskPathFromPublicPathMock).toHaveBeenCalledWith('/uploads/assets3d/model.glb');
    expect(readFileMock).toHaveBeenCalledWith('/tmp/model.glb');
    expect(response.headers.get('Content-Type')).toBe('model/gltf-binary');
    expect(Buffer.from(await response.arrayBuffer()).toString('utf8')).toBe('local-model');
  });

  it('falls back to remote storage URLs when the filepath is absolute', async () => {
    getAsset3DByIdMock.mockResolvedValue({
      id: 'asset-2',
      filepath: 'https://files.example.test/assets/model.glb',
      mimetype: 'model/gltf-binary',
    });
    isHttpFilepathMock.mockReturnValue(true);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('remote-model', {
          status: 200,
          headers: { 'content-type': 'model/gltf-binary' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const response = await getHandler(
      new Request('http://localhost/api/assets3d/asset-2/file') as Parameters<typeof getHandler>[0],
      {} as Parameters<typeof getHandler>[1],
      { id: 'asset-2' }
    );

    expect(fetchMock).toHaveBeenCalledWith('https://files.example.test/assets/model.glb', {
      cache: 'no-store',
    });
    expect(getDiskPathFromPublicPathMock).not.toHaveBeenCalled();
    expect(Buffer.from(await response.arrayBuffer()).toString('utf8')).toBe('remote-model');
    vi.unstubAllGlobals();
  });
});
