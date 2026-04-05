import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';

const {
  accessMock,
  copyFileMock,
  mkdtempMock,
  statMock,
  resolveAppBaseUrlMock,
  getPublicPathFromStoredPathMock,
} = vi.hoisted(() => ({
  accessMock: vi.fn(),
  copyFileMock: vi.fn(),
  mkdtempMock: vi.fn(),
  statMock: vi.fn(),
  resolveAppBaseUrlMock: vi.fn(),
  getPublicPathFromStoredPathMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: (...args: unknown[]) => accessMock(...args),
  copyFile: (...args: unknown[]) => copyFileMock(...args),
  mkdtemp: (...args: unknown[]) => mkdtempMock(...args),
  stat: (...args: unknown[]) => statMock(...args),
  default: {
    access: (...args: unknown[]) => accessMock(...args),
    copyFile: (...args: unknown[]) => copyFileMock(...args),
    mkdtemp: (...args: unknown[]) => mkdtempMock(...args),
    stat: (...args: unknown[]) => statMock(...args),
  },
}));

vi.mock('@/shared/lib/files/services/storage/file-storage-service', () => ({
  resolveAppBaseUrl: (...args: unknown[]) => resolveAppBaseUrlMock(...args),
  getPublicPathFromStoredPath: (...args: unknown[]) => getPublicPathFromStoredPathMock(...args),
}));

import {
  MIN_TRADERA_IMAGE_BYTES,
  resolveLocalProductImagePaths,
  resolveProductImageUrls,
  resolveScriptInputImageDiagnostics,
  resolveTraderaProductImageUploadPlan,
  toAbsolutePublicFilePath,
} from './tradera-browser-images';

const createProduct = (overrides: Partial<Record<string, unknown>> = {}): ProductWithImages =>
  ({
    imageLinks: [],
    images: [],
    ...overrides,
  }) as unknown as ProductWithImages;

describe('tradera-browser-images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAppBaseUrlMock.mockReturnValue('http://localhost:3000');
    mkdtempMock.mockResolvedValue('/tmp/tradera-upload-order-test');
    copyFileMock.mockResolvedValue(undefined);
    getPublicPathFromStoredPathMock.mockImplementation((value: string) => {
      const filename = value.trim().split('/').pop() ?? 'image.jpg';
      return `/uploads/${filename}`;
    });
  });

  it('preserves canonical product image order and appends only new imageLinks', () => {
    const product = createProduct({
      imageLinks: ['  /images/extra.jpg  ', '', '/images/one.jpg'],
      images: [
        {
          imageFile: {
            publicUrl: ' /images/one.jpg ',
            url: ' https://cdn.example.com/one-alt.jpg ',
            thumbnailUrl: ' /images/one-thumb.jpg ',
            filepath: ' /uploads/one-local.jpg ',
          },
        },
        {
          imageFile: {
            url: ' /images/two.jpg ',
            filepath: ' /uploads/two-local.jpg ',
          },
        },
      ],
    });

    expect(resolveProductImageUrls(product)).toEqual([
      '/images/one.jpg',
      '/images/two.jpg',
      '/images/extra.jpg',
    ]);
  });

  it('accepts same-host public URLs and rejects remote or invalid absolute URLs', () => {
    expect(toAbsolutePublicFilePath('https://localhost:3000/uploads/example.jpg')).toBe(
      path.join(process.cwd(), 'public', 'uploads/example.jpg')
    );
    expect(toAbsolutePublicFilePath('https://cdn.example.com/uploads/example.jpg')).toBeNull();

    resolveAppBaseUrlMock.mockReturnValue('not a url');
    expect(toAbsolutePublicFilePath('https://localhost:3000/uploads/example.jpg')).toBeNull();
  });

  it('returns ordered staged local image paths only when local coverage is complete', async () => {
    getPublicPathFromStoredPathMock.mockImplementation((value: string) => {
      const normalized = value.trim();
      if (normalized.includes('one-valid')) return '/uploads/one-valid.jpg';
      if (normalized.includes('two-valid')) return '/uploads/two-valid.jpg';
      return '/uploads/other.jpg';
    });

    statMock.mockImplementation(async (candidate: string) => ({
      isFile: () => true,
      size: MIN_TRADERA_IMAGE_BYTES,
    }));

    const product = createProduct({
      sku: 'SKU-1',
      imageLinks: ['https://localhost:3000/uploads/two-valid.jpg'],
      images: [
        {
          imageFile: {
            filepath: ' /uploads/one-valid.jpg ',
            publicUrl: ' https://localhost:3000/uploads/one-valid.jpg ',
          },
        },
      ],
    });

    await expect(resolveLocalProductImagePaths(product)).resolves.toEqual([
      '/tmp/tradera-upload-order-test/SKU-1_01.jpg',
      '/tmp/tradera-upload-order-test/SKU-1_02.jpg',
    ]);
    expect(accessMock).toHaveBeenCalledTimes(2);
    expect(statMock).toHaveBeenCalledTimes(2);
    expect(copyFileMock).toHaveBeenNthCalledWith(
      1,
      path.join(process.cwd(), 'public', 'uploads/one-valid.jpg'),
      '/tmp/tradera-upload-order-test/SKU-1_01.jpg'
    );
    expect(copyFileMock).toHaveBeenNthCalledWith(
      2,
      path.join(process.cwd(), 'public', 'uploads/two-valid.jpg'),
      '/tmp/tradera-upload-order-test/SKU-1_02.jpg'
    );
  });

  it('falls back to ordered downloads when local coverage is partial', async () => {
    getPublicPathFromStoredPathMock.mockImplementation((value: string) => {
      const normalized = value.trim();
      if (normalized.includes('one-valid')) return '/uploads/one-valid.jpg';
      if (normalized.includes('two-remote')) return '/uploads/two-remote.jpg';
      return '/uploads/other.jpg';
    });

    accessMock.mockImplementation(async (candidate: string) => {
      if (candidate.endsWith('/two-remote.jpg')) {
        throw new Error('missing');
      }
    });
    statMock.mockImplementation(async () => ({
      isFile: () => true,
      size: MIN_TRADERA_IMAGE_BYTES,
    }));

    const product = createProduct({
      imageLinks: ['https://cdn.example.com/two-remote.jpg'],
      images: [
        {
          imageFile: {
            filepath: '/uploads/one-valid.jpg',
            publicUrl: 'https://localhost:3000/uploads/one-valid.jpg',
          },
        },
      ],
    });

    await expect(resolveTraderaProductImageUploadPlan(product)).resolves.toEqual({
      imageUrls: [
        'https://localhost:3000/uploads/one-valid.jpg',
        'https://cdn.example.com/two-remote.jpg',
      ],
      localImagePaths: [],
      imageCount: 2,
      localImageCoverageCount: 1,
      imageOrderStrategy: 'download-ordered',
    });
    expect(copyFileMock).not.toHaveBeenCalled();
  });

  it('falls back to ordered downloads when staging local copies fails', async () => {
    copyFileMock.mockRejectedValueOnce(new Error('copy failed'));

    const product = createProduct({
      sku: 'SKU-1',
      imageLinks: ['https://localhost:3000/uploads/two-valid.jpg'],
      images: [
        {
          imageFile: {
            filepath: '/uploads/one-valid.jpg',
            publicUrl: 'https://localhost:3000/uploads/one-valid.jpg',
          },
        },
        {
          imageFile: {
            filepath: '/uploads/two-valid.jpg',
            publicUrl: 'https://localhost:3000/uploads/two-valid.jpg',
          },
        },
      ],
    });

    await expect(resolveTraderaProductImageUploadPlan(product)).resolves.toEqual({
      imageUrls: [
        'https://localhost:3000/uploads/one-valid.jpg',
        'https://localhost:3000/uploads/two-valid.jpg',
      ],
      localImagePaths: [],
      imageCount: 2,
      localImageCoverageCount: 2,
      imageOrderStrategy: 'download-ordered',
    });
  });

  it('reports local, remote, and empty script input diagnostics from trimmed string arrays', () => {
    expect(
      resolveScriptInputImageDiagnostics({
        localImagePaths: ['  /tmp/one.jpg  ', '', 5],
        imageUrls: [' https://cdn.example.com/a.jpg ', '   '],
      })
    ).toEqual({
      imageInputSource: 'local',
      localImagePathCount: 1,
      imageUrlCount: 1,
    });

    expect(
      resolveScriptInputImageDiagnostics({
        localImagePaths: ['   '],
        imageUrls: [' https://cdn.example.com/a.jpg ', ' https://cdn.example.com/b.jpg '],
      })
    ).toEqual({
      imageInputSource: 'remote',
      localImagePathCount: 0,
      imageUrlCount: 2,
    });

    expect(resolveScriptInputImageDiagnostics(null)).toEqual({
      imageInputSource: 'none',
      localImagePathCount: 0,
      imageUrlCount: 0,
    });
  });
});
