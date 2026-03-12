import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listImageFiles: vi.fn(),
  getProductRepository: vi.fn(),
  getProducts: vi.fn(),
  getImageFileRepository: vi.fn(),
  getImageFileById: vi.fn(),
  deleteImageFile: vi.fn(),
  deleteFileFromStorage: vi.fn(),
}));

vi.mock('@/features/files/server', () => ({
  imageFileService: {
    listImageFiles: mocks.listImageFiles,
  },
  getImageFileRepository: mocks.getImageFileRepository,
  deleteFileFromStorage: mocks.deleteFileFromStorage,
}));

vi.mock('@/features/products/server', () => ({
  getProductRepository: mocks.getProductRepository,
}));

import { GET_handler } from '@/app/api/files/handler';
import { DELETE_handler } from '@/app/api/files/[id]/handler';

describe('Files API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProductRepository.mockResolvedValue({
      getProducts: mocks.getProducts,
    });
    mocks.getImageFileRepository.mockResolvedValue({
      getImageFileById: mocks.getImageFileById,
      deleteImageFile: mocks.deleteImageFile,
    });
  });

  it('returns all files with attached product metadata', async () => {
    mocks.listImageFiles.mockResolvedValue([
      {
        id: 'file-1',
        filename: 'test-image1.jpg',
        filepath: '/test-image1.jpg',
        mimetype: 'image/jpeg',
        size: 123,
      },
      {
        id: 'file-2',
        filename: 'another-image.png',
        filepath: '/another-image.png',
        mimetype: 'image/png',
        size: 456,
      },
    ]);
    mocks.getProducts.mockResolvedValue([
      {
        id: 'product-1',
        name_en: 'Product A',
        images: [{ imageFileId: 'file-1' }],
      },
      {
        id: 'product-2',
        name_en: 'Product B',
        images: [],
      },
    ]);

    const res = await GET_handler(new NextRequest('http://localhost/api/files'), {
      query: {},
    } as any);
    const files = (await res.json()) as Array<{
      id: string;
      filename: string;
      products: Array<{ product: { id: string; name: string } }>;
    }>;

    expect(res.status).toBe(200);
    expect(files).toHaveLength(2);
    expect(files[0]).toEqual(
      expect.objectContaining({
        id: 'file-1',
        filename: 'test-image1.jpg',
        products: [{ product: { id: 'product-1', name: 'Product A' } }],
      })
    );
  });

  it('filters files by filename', async () => {
    mocks.listImageFiles.mockResolvedValue([]);
    mocks.getProducts.mockResolvedValue([]);

    await GET_handler(new NextRequest('http://localhost/api/files?filename=test-image'), {
      query: { filename: 'test-image' },
    } as any);

    expect(mocks.listImageFiles).toHaveBeenCalledWith({
      filename: 'test-image',
      tags: [],
    });
  });

  it('filters files by productId', async () => {
    mocks.listImageFiles.mockResolvedValue([
      {
        id: 'file-1',
        filename: 'test-image1.jpg',
        filepath: '/test-image1.jpg',
        mimetype: 'image/jpeg',
        size: 123,
      },
      {
        id: 'file-2',
        filename: 'another-image.png',
        filepath: '/another-image.png',
        mimetype: 'image/png',
        size: 456,
      },
    ]);
    mocks.getProducts.mockResolvedValue([
      {
        id: 'product-1',
        name_en: 'Product A',
        images: [{ imageFileId: 'file-1' }],
      },
      {
        id: 'product-2',
        name_en: 'Product B',
        images: [{ imageFileId: 'file-2' }],
      },
    ]);

    const res = await GET_handler(new NextRequest('http://localhost/api/files?productId=product-1'), {
      query: { productId: 'product-1' },
    } as any);
    const files = (await res.json()) as Array<{ id: string }>;

    expect(files).toEqual([{ id: 'file-1', filename: 'test-image1.jpg', filepath: '/test-image1.jpg', mimetype: 'image/jpeg', size: 123, products: [{ product: { id: 'product-1', name: 'Product A' } }] }]);
  });

  it('filters files by productName via product repository search', async () => {
    mocks.listImageFiles.mockResolvedValue([
      {
        id: 'file-1',
        filename: 'test-image1.jpg',
        filepath: '/test-image1.jpg',
        mimetype: 'image/jpeg',
        size: 123,
      },
    ]);
    mocks.getProducts.mockResolvedValue([
      {
        id: 'product-1',
        name_en: 'Product A',
        images: [{ imageFileId: 'file-1' }],
      },
    ]);

    const res = await GET_handler(
      new NextRequest('http://localhost/api/files?productName=Product%20A'),
      {
        query: { productName: 'Product A' },
      } as any
    );
    const files = (await res.json()) as Array<{ id: string }>;

    expect(mocks.getProducts).toHaveBeenCalledWith({ search: 'Product A' });
    expect(files).toHaveLength(1);
    expect(files[0]?.id).toBe('file-1');
  });

  it('deletes a file through the image repository and storage service', async () => {
    mocks.getImageFileById.mockResolvedValue({
      id: 'file-2',
      filename: 'another-image.png',
      filepath: '/another-image.png',
      mimetype: 'image/png',
      size: 456,
    });
    mocks.deleteImageFile.mockResolvedValue({
      id: 'file-2',
    });

    const res = await DELETE_handler(new NextRequest('http://localhost/api/files/file-2'), {} as any, {
      id: 'file-2',
    });

    expect(res.status).toBe(204);
    expect(mocks.deleteFileFromStorage).toHaveBeenCalledWith('/another-image.png');
    expect(mocks.deleteImageFile).toHaveBeenCalledWith('file-2');
  });

  it('throws not found for an unknown file', async () => {
    mocks.getImageFileById.mockResolvedValue(null);

    await expect(
      DELETE_handler(new NextRequest('http://localhost/api/files/missing'), {} as any, {
        id: 'missing',
      })
    ).rejects.toThrow('File not found');
  });
});
