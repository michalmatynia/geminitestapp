import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  existsSyncMock,
  getDiskPathFromPublicPathMock,
  getMilkbarFastCometPublicHtmlMirrorPathMock,
  getPublicPathFromStoredPathMock,
  readFileMock,
} = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  getDiskPathFromPublicPathMock: vi.fn(),
  getMilkbarFastCometPublicHtmlMirrorPathMock: vi.fn(),
  getPublicPathFromStoredPathMock: vi.fn(),
  readFileMock: vi.fn(),
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
}));

vi.mock('@/shared/lib/files/services/storage/milkbar-fastcomet-public-html-mirror', () => ({
  getMilkbarFastCometPublicHtmlMirrorPath: getMilkbarFastCometPublicHtmlMirrorPathMock,
}));

import { getHandler } from './handler';

describe('cms media local handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPublicPathFromStoredPathMock.mockImplementation((value: string) => {
      if (value.startsWith('http')) return new URL(value).pathname;
      return value;
    });
    getDiskPathFromPublicPathMock.mockReturnValue('/runtime/cms/visualisation/image.webp');
    getMilkbarFastCometPublicHtmlMirrorPathMock.mockReturnValue(
      '/repo/hosting/fastcomet/uploads.milkbardesigners.com/public_html/uploads/cms/visualisation/image.webp'
    );
  });

  it('serves Milkbar CMS media from the runtime local upload cache', async () => {
    existsSyncMock.mockReturnValue(true);
    readFileMock.mockResolvedValue(Buffer.from('runtime-image'));

    const response = await getHandler(
      new Request('http://localhost/api/cms/media/local') as Parameters<typeof getHandler>[0],
      { query: { path: '/uploads/cms/visualisation/image.webp' } } as Parameters<
        typeof getHandler
      >[1]
    );

    expect(getDiskPathFromPublicPathMock).toHaveBeenCalledWith(
      '/uploads/cms/visualisation/image.webp'
    );
    expect(readFileMock).toHaveBeenCalledWith('/runtime/cms/visualisation/image.webp');
    expect(Buffer.from(await response.arrayBuffer()).toString('utf8')).toBe('runtime-image');
  });

  it('falls back to the public_html mirror when the runtime cache is missing', async () => {
    existsSyncMock.mockImplementation((diskPath: string) => diskPath.includes('public_html'));
    readFileMock.mockResolvedValue(Buffer.from('public-html-image'));

    const response = await getHandler(
      new Request('http://localhost/api/cms/media/local') as Parameters<typeof getHandler>[0],
      { query: { path: 'https://uploads.milkbardesigners.com/uploads/cms/visualisation/image.webp' } } as Parameters<
        typeof getHandler
      >[1]
    );

    expect(getMilkbarFastCometPublicHtmlMirrorPathMock).toHaveBeenCalledWith(
      '/uploads/cms/visualisation/image.webp'
    );
    expect(Buffer.from(await response.arrayBuffer()).toString('utf8')).toBe('public-html-image');
  });

  it('accepts the public path from route params for queryless image previews', async () => {
    existsSyncMock.mockReturnValue(true);
    readFileMock.mockResolvedValue(Buffer.from('param-image'));

    const response = await getHandler(
      new Request('http://localhost/api/cms/media/local/uploads/cms/visualisation/image.webp') as Parameters<
        typeof getHandler
      >[0],
      { params: { path: ['uploads', 'cms', 'visualisation', 'image.webp'] } } as Parameters<
        typeof getHandler
      >[1]
    );

    expect(getDiskPathFromPublicPathMock).toHaveBeenCalledWith(
      '/uploads/cms/visualisation/image.webp'
    );
    expect(Buffer.from(await response.arrayBuffer()).toString('utf8')).toBe('param-image');
  });
});
