import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  existsSyncMock,
  readFileMock,
  getDiskPathFromPublicPathMock,
  getPublicPathFromStoredPathMock,
  isHttpFilepathMock,
  getAsset3DByIdMock,
} = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  readFileMock: vi.fn(),
  getDiskPathFromPublicPathMock: vi.fn(),
  getPublicPathFromStoredPathMock: vi.fn(),
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
  getPublicPathFromStoredPath: getPublicPathFromStoredPathMock,
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
    getPublicPathFromStoredPathMock.mockImplementation((value: string) => value);
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

  it('serves a mirrored upload file before fetching a remote FastComet URL', async () => {
    getAsset3DByIdMock.mockResolvedValue({
      id: 'asset-2',
      filepath: 'https://uploads.milkbardesigners.com/uploads/cms/models/model.gltf',
      mimetype: 'model/gltf+json',
      metadata: {
        publicPath: '/uploads/cms/models/model.gltf',
        storageProfile: 'milkbarCms',
      },
    });
    isHttpFilepathMock.mockReturnValue(true);
    getDiskPathFromPublicPathMock.mockReturnValue('/tmp/model.gltf');
    existsSyncMock.mockReturnValue(true);
    readFileMock.mockResolvedValue(Buffer.from('mirrored-model'));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await getHandler(
      new Request('http://localhost/api/assets3d/asset-2/file') as Parameters<typeof getHandler>[0],
      {} as Parameters<typeof getHandler>[1],
      { id: 'asset-2' }
    );

    expect(getDiskPathFromPublicPathMock).toHaveBeenCalledWith('/uploads/cms/models/model.gltf');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(Buffer.from(await response.arrayBuffer()).toString('utf8')).toBe('mirrored-model');
    vi.unstubAllGlobals();
  });

  it('serves a Milkbar public_html mirror when the runtime upload mirror is missing', async () => {
    getAsset3DByIdMock.mockResolvedValue({
      id: 'asset-public-html',
      filepath: 'https://uploads.milkbardesigners.com/uploads/cms/models/model.gltf',
      mimetype: 'model/gltf+json',
      metadata: {
        publicPath: '/uploads/cms/models/model.gltf',
        storageProfile: 'milkbarCms',
      },
    });
    isHttpFilepathMock.mockReturnValue(true);
    getDiskPathFromPublicPathMock.mockReturnValue('/tmp/missing-model.gltf');
    existsSyncMock.mockImplementation((diskPath: string) => diskPath.includes('public_html'));
    readFileMock.mockResolvedValue(Buffer.from('public-html-model'));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await getHandler(
      new Request('http://localhost/api/assets3d/asset-public-html/file') as Parameters<
        typeof getHandler
      >[0],
      {} as Parameters<typeof getHandler>[1],
      { id: 'asset-public-html' }
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(readFileMock).toHaveBeenCalledWith(
      expect.stringContaining(
        'hosting/fastcomet/milkbardesigners.com/public_html/uploads/cms/models/model.gltf'
      )
    );
    expect(Buffer.from(await response.arrayBuffer()).toString('utf8')).toBe('public-html-model');
    vi.unstubAllGlobals();
  });

  it('falls back to remote storage URLs when the filepath is absolute', async () => {
    getAsset3DByIdMock.mockResolvedValue({
      id: 'asset-3',
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

  it('uses the Milkbar FastComet origin for CMS assets when no mirror exists', async () => {
    getAsset3DByIdMock.mockResolvedValue({
      id: 'asset-4',
      filepath: 'https://uploads.milkbardesigners.com/uploads/cms/models/model.gltf',
      mimetype: 'model/gltf+json',
      metadata: {
        publicPath: '/uploads/cms/models/model.gltf',
        storageProfile: 'milkbarCms',
      },
    });
    isHttpFilepathMock.mockReturnValue(true);
    getDiskPathFromPublicPathMock.mockReturnValue('/tmp/model.gltf');
    existsSyncMock.mockReturnValue(false);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('origin-model', {
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await getHandler(
      new Request('http://localhost/api/assets3d/asset-4/file') as Parameters<typeof getHandler>[0],
      {} as Parameters<typeof getHandler>[1],
      { id: 'asset-4' }
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://milkbardesigners.com/uploads/cms/models/model.gltf');
    expect(Buffer.from(await response.arrayBuffer()).toString('utf8')).toBe('origin-model');
    vi.unstubAllGlobals();
  });
});
