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
  getAsset3DFromLookupRepositories: getAsset3DByIdMock,
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
        'hosting/fastcomet/uploads.milkbardesigners.com/public_html/uploads/cms/models/model.gltf'
      )
    );
    expect(Buffer.from(await response.arrayBuffer()).toString('utf8')).toBe('public-html-model');
    vi.unstubAllGlobals();
  });

  it('redirects to remote storage URLs when the filepath is absolute', async () => {
    getAsset3DByIdMock.mockResolvedValue({
      id: 'asset-3',
      filepath: 'https://files.example.test/assets/model.glb',
      mimetype: 'model/gltf-binary',
    });
    isHttpFilepathMock.mockReturnValue(true);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await getHandler(
      new Request('http://localhost/api/assets3d/asset-2/file') as Parameters<typeof getHandler>[0],
      {} as Parameters<typeof getHandler>[1],
      { id: 'asset-2' }
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://files.example.test/assets/model.glb');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getDiskPathFromPublicPathMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('proxies Milkbar CMS assets from FastComet when no mirror exists', async () => {
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
      new Response('remote-model', {
        headers: {
          'content-length': '12',
          'content-type': 'model/gltf+json',
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await getHandler(
      new Request('http://localhost/api/assets3d/asset-4/file') as Parameters<typeof getHandler>[0],
      {} as Parameters<typeof getHandler>[1],
      { id: 'asset-4' }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('content-type')).toBe('model/gltf+json');
    expect(response.headers.get('content-length')).toBe('12');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://uploads.milkbardesigners.com/uploads/cms/models/model.gltf',
      {
        cache: 'no-store',
        method: 'GET',
      }
    );
    expect(Buffer.from(await response.arrayBuffer()).toString('utf8')).toBe('remote-model');
    vi.unstubAllGlobals();
  });

  it('checks Milkbar FastComet assets through the local API for HEAD preview probes', async () => {
    getAsset3DByIdMock.mockResolvedValue({
      id: 'asset-head',
      filepath: 'https://uploads.milkbardesigners.com/uploads/cms/models/model.glb',
      mimetype: 'model/gltf-binary',
      metadata: {
        publicPath: '/uploads/cms/models/model.glb',
        storageProfile: 'milkbarCms',
      },
    });
    isHttpFilepathMock.mockReturnValue(true);
    getDiskPathFromPublicPathMock.mockReturnValue('/tmp/model.glb');
    existsSyncMock.mockReturnValue(false);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        headers: {
          'content-length': '123',
          'content-type': 'model/gltf-binary',
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await getHandler(
      new Request('http://localhost/api/assets3d/asset-head/file', {
        method: 'HEAD',
      }) as Parameters<typeof getHandler>[0],
      {} as Parameters<typeof getHandler>[1],
      { id: 'asset-head' }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('model/gltf-binary');
    expect(response.headers.get('content-length')).toBe('123');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://uploads.milkbardesigners.com/uploads/cms/models/model.glb',
      {
        cache: 'no-store',
        method: 'HEAD',
      }
    );
    vi.unstubAllGlobals();
  });
});
