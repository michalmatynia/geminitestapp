import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';

const {
  accessMock,
  statMock,
  resolveAppBaseUrlMock,
  getPublicPathFromStoredPathMock,
} = vi.hoisted(() => ({
  accessMock: vi.fn(),
  statMock: vi.fn(),
  resolveAppBaseUrlMock: vi.fn(),
  getPublicPathFromStoredPathMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: (...args: unknown[]) => accessMock(...args),
  stat: (...args: unknown[]) => statMock(...args),
  default: {
    access: (...args: unknown[]) => accessMock(...args),
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
    getPublicPathFromStoredPathMock.mockImplementation((value: string) => {
      const filename = value.trim().split('/').pop() ?? 'image.jpg';
      return `/uploads/${filename}`;
    });
  });

  it('deduplicates and trims product image URLs from links and image file fields', () => {
    const product = createProduct({
      imageLinks: ['  /images/one.jpg  ', '', 'https://cdn.example.com/two.jpg'],
      images: [
        {
          imageFile: {
            publicUrl: ' /images/one.jpg ',
            url: ' https://cdn.example.com/two.jpg ',
            thumbnailUrl: ' /images/thumb.jpg ',
            filepath: ' /uploads/local.jpg ',
          },
        },
      ],
    });

    expect(resolveProductImageUrls(product)).toEqual([
      '/images/one.jpg',
      'https://cdn.example.com/two.jpg',
      '/images/thumb.jpg',
      '/uploads/local.jpg',
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

  it('returns only readable local image paths that meet the byte threshold', async () => {
    getPublicPathFromStoredPathMock.mockImplementation((value: string) => {
      const normalized = value.trim();
      if (normalized.includes('valid')) return '/uploads/valid.jpg';
      if (normalized.includes('small')) return '/uploads/small.jpg';
      if (normalized.includes('missing')) return '/uploads/missing.jpg';
      return '/uploads/other.jpg';
    });

    accessMock.mockImplementation(async (candidate: string) => {
      if (candidate.endsWith('/missing.jpg')) {
        throw new Error('missing');
      }
    });
    statMock.mockImplementation(async (candidate: string) => ({
      isFile: () => !candidate.endsWith('/not-file.jpg'),
      size: candidate.endsWith('/small.jpg') ? MIN_TRADERA_IMAGE_BYTES - 1 : MIN_TRADERA_IMAGE_BYTES,
    }));

    const product = createProduct({
      imageLinks: [
        ' /uploads/valid.jpg ',
        'https://localhost:3000/uploads/valid.jpg',
        '/uploads/small.jpg',
        '/uploads/missing.jpg',
      ],
      images: [
        {
          imageFile: {
            filepath: ' /uploads/valid.jpg ',
            publicUrl: ' https://localhost:3000/uploads/valid.jpg ',
            url: ' /uploads/small.jpg ',
          },
        },
      ],
    });

    await expect(resolveLocalProductImagePaths(product)).resolves.toEqual([
      path.join(process.cwd(), 'public', 'uploads/valid.jpg'),
    ]);
    expect(accessMock).toHaveBeenCalledTimes(3);
    expect(statMock).toHaveBeenCalledTimes(2);
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
