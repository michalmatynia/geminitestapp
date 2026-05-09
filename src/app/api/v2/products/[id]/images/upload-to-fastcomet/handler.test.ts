/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';

const mocks = vi.hoisted(() => ({
  getImageFileRepository: vi.fn(),
  getFileStorageSettings: vi.fn(),
  getProductById: vi.fn(),
  getProductRepository: vi.fn(),
  getPublicPathFromStoredPath: vi.fn(),
  createImageFile: vi.fn(),
  getDiskPathFromPublicPath: vi.fn(),
  invalidateProduct: vi.fn(),
  parseJsonBody: vi.fn(),
  readFile: vi.fn(),
  replaceProductImages: vi.fn(),
  updateProduct: vi.fn(),
  updateImageFile: vi.fn(),
  uploadBufferToFastComet: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('node:fs', () => ({
  promises: {
    readFile: mocks.readFile,
  },
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: mocks.parseJsonBody,
}));

vi.mock('@/features/products/performance/cached-service', () => ({
  CachedProductService: {
    invalidateProduct: mocks.invalidateProduct,
  },
}));

vi.mock('@/shared/lib/files/services/image-file-service', () => ({
  getDiskPathFromPublicPath: mocks.getDiskPathFromPublicPath,
  getImageFileRepository: mocks.getImageFileRepository,
}));

vi.mock('@/shared/lib/files/services/storage/file-storage-service', () => ({
  getFileStorageSettings: mocks.getFileStorageSettings,
  getPublicPathFromStoredPath: mocks.getPublicPathFromStoredPath,
  uploadBufferToFastComet: mocks.uploadBufferToFastComet,
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: mocks.getProductRepository,
}));

import { postHandler } from './handler';

type FastCometUploadRequest = Request & {
  json: () => Promise<unknown>;
};

const createRequest = (body: unknown): FastCometUploadRequest =>
  ({
    json: () => Promise.resolve(body),
  }) as FastCometUploadRequest;

const localImageFile = {
  id: 'image-file-1',
  filename: 'photo.webp',
  filepath: '/uploads/products/SKU/photo.webp',
  mimetype: 'image/webp',
  metadata: { sourceUrl: 'https://shop.example/photo.webp', storageSource: 'local' },
  publicUrl: '/uploads/products/SKU/photo.webp',
  size: 123,
  storageProvider: 'local',
  url: '/uploads/products/SKU/photo.webp',
  width: null,
  height: null,
};

const product = {
  id: 'product-1',
  images: [
    {
      assignedAt: '2026-05-09T00:00:00.000Z',
      imageFile: localImageFile,
      imageFileId: 'image-file-1',
      productId: 'product-1',
    },
  ],
};

describe('product image upload-to-fastcomet handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFileStorageSettings.mockResolvedValue({
      source: 'fastcomet',
      fastComet: {
        baseUrl: 'https://sparksofsindri.com',
        uploadEndpoint: 'https://sparksofsindri.com/api/uploads/index.php',
        deleteEndpoint: null,
        authToken: null,
        keepLocalCopy: true,
        timeoutMs: 20_000,
        resolveIp: null,
      },
    });
    mocks.parseJsonBody.mockImplementation(
      async (req: FastCometUploadRequest, schema: z.ZodType): Promise<unknown> => {
        const parsed = schema.safeParse(await req.json());
        if (!parsed.success) {
          return { ok: false, response: new Response(null, { status: 400 }) };
        }
        return { ok: true, data: parsed.data };
      }
    );
    mocks.getProductRepository.mockResolvedValue({
      getProductById: mocks.getProductById,
      replaceProductImages: mocks.replaceProductImages,
      updateProduct: mocks.updateProduct,
    });
    mocks.getImageFileRepository.mockResolvedValue({
      createImageFile: mocks.createImageFile,
      updateImageFile: mocks.updateImageFile,
    });
    mocks.getPublicPathFromStoredPath.mockReturnValue('/uploads/products/SKU/photo.webp');
    mocks.getDiskPathFromPublicPath.mockReturnValue(
      '/repo/public/uploads/products/SKU/photo.webp'
    );
    mocks.readFile.mockResolvedValue(Buffer.from('image-bytes'));
    mocks.uploadBufferToFastComet.mockResolvedValue(
      'https://sparksofsindri.com/uploads/products/SKU/photo.webp'
    );
  });

  it('uploads a linked local image file to FastComet and refreshes the product image snapshot', async () => {
    const updatedImageFile = {
      ...localImageFile,
      filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      metadata: {
        ...localImageFile.metadata,
        localPublicPath: '/uploads/products/SKU/photo.webp',
        mirroredLocally: true,
        previousFilepath: '/uploads/products/SKU/photo.webp',
        publicPath: '/uploads/products/SKU/photo.webp',
        storageSource: 'fastcomet',
        uploadedToFastCometAt: '2026-05-09T00:00:00.000Z',
      },
      publicUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      storageProvider: 'fastcomet',
      url: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
    };
    const updatedProduct = {
      ...product,
      images: [
        {
          ...product.images[0],
          imageFile: updatedImageFile,
        },
      ],
    };
    mocks.getProductById.mockResolvedValueOnce(product).mockResolvedValueOnce(updatedProduct);
    mocks.updateImageFile.mockResolvedValueOnce(updatedImageFile);

    const response = await postHandler(
      createRequest({ imageFileId: 'image-file-1', imageSlotIndex: 0 }) as never,
      {} as never,
      { id: ' product-1 ' }
    );
    const json = await response.json();

    expect(mocks.getDiskPathFromPublicPath).toHaveBeenCalledWith(
      '/uploads/products/SKU/photo.webp'
    );
    expect(mocks.readFile).toHaveBeenCalledWith(
      '/repo/public/uploads/products/SKU/photo.webp'
    );
    expect(mocks.uploadBufferToFastComet).toHaveBeenCalledWith({
      buffer: Buffer.from('image-bytes'),
      category: 'products',
      filename: 'photo.webp',
      mimetype: 'image/webp',
      publicPath: '/uploads/products/SKU/photo.webp',
    });
    expect(mocks.updateImageFile).toHaveBeenCalledWith(
      'image-file-1',
      expect.objectContaining({
        filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
        publicUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
        storageProvider: 'fastcomet',
        url: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      })
    );
    expect(mocks.updateImageFile.mock.calls[0]?.[1].metadata).toEqual(
      expect.objectContaining({
        localPublicPath: '/uploads/products/SKU/photo.webp',
        previousFilepath: '/uploads/products/SKU/photo.webp',
        publicPath: '/uploads/products/SKU/photo.webp',
        storageSource: 'fastcomet',
      })
    );
    expect(mocks.replaceProductImages).toHaveBeenCalledWith('product-1', ['image-file-1']);
    expect(mocks.invalidateProduct).toHaveBeenCalledWith('product-1');
    expect(json).toEqual(
      expect.objectContaining({
        status: 'ok',
        imageFile: expect.objectContaining({
          id: 'image-file-1',
          filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
          storageProvider: 'fastcomet',
        }),
        product: updatedProduct,
        publicPath: '/uploads/products/SKU/photo.webp',
        remoteUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      })
    );
  });

  it('returns existing FastComet image files without uploading again', async () => {
    const fastCometProduct = {
      ...product,
      images: [
        {
          ...product.images[0],
          imageFile: {
            ...localImageFile,
            filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
            metadata: { storageSource: 'fastcomet' },
            storageProvider: 'fastcomet',
          },
        },
      ],
    };
    mocks.getProductById.mockResolvedValueOnce(fastCometProduct);

    const response = await postHandler(
      createRequest({ imageFileId: 'image-file-1', imageSlotIndex: 0 }) as never,
      {} as never,
      { id: 'product-1' }
    );
    const json = await response.json();

    expect(mocks.uploadBufferToFastComet).not.toHaveBeenCalled();
    expect(mocks.updateImageFile).not.toHaveBeenCalled();
    expect(mocks.getFileStorageSettings).not.toHaveBeenCalled();
    expect(json).toEqual(
      expect.objectContaining({
        alreadyUploaded: true,
        status: 'ok',
      })
    );
  });

  it('uploads a local file slot directly to FastComet and links it to the product slot', async () => {
    const uploadedImageFile = {
      id: 'image-file-2',
      filename: 'generated.png',
      filepath: 'https://sparksofsindri.com/uploads/products/SKU_1/generated.png',
      mimetype: 'image/png',
      metadata: {
        publicPath: '/uploads/products/SKU_1/generated.png',
        storageSource: 'fastcomet',
      },
      publicUrl: 'https://sparksofsindri.com/uploads/products/SKU_1/generated.png',
      size: 11,
      storageProvider: 'fastcomet',
      url: 'https://sparksofsindri.com/uploads/products/SKU_1/generated.png',
    };
    const fileSlotProduct = {
      id: 'product-1',
      imageBase64s: ['data:image/png;base64,abc'],
      imageLinks: ['https://example.com/old.png'],
      images: [],
      sku: 'SKU 1',
    };
    const updatedProduct = {
      ...fileSlotProduct,
      imageBase64s: [''],
      imageLinks: [''],
      images: [{ imageFile: uploadedImageFile, imageFileId: 'image-file-2' }],
    };
    mocks.getProductById.mockResolvedValueOnce(fileSlotProduct).mockResolvedValueOnce(updatedProduct);
    mocks.createImageFile.mockResolvedValueOnce(uploadedImageFile);
    mocks.uploadBufferToFastComet.mockResolvedValueOnce(uploadedImageFile.filepath);
    const formData = new FormData();
    formData.append('file', new File(['image-bytes'], 'fresh.png', { type: 'image/png' }));
    formData.append('filename', 'fresh.png');
    formData.append('imageSlotIndex', '0');

    const response = await postHandler(
      new Request('http://localhost/api/v2/products/product-1/images/upload-to-fastcomet', {
        body: formData,
        method: 'POST',
      }) as never,
      {} as never,
      { id: 'product-1' }
    );
    const json = await response.json();
    const uploadArgs = mocks.uploadBufferToFastComet.mock.calls[0]?.[0] as {
      buffer: Buffer;
      category: string;
      filename: string;
      mimetype: string;
      publicPath: string;
    };

    expect(uploadArgs.buffer).toEqual(Buffer.from('image-bytes'));
    expect(uploadArgs.category).toBe('products');
    expect(uploadArgs.filename).toMatch(/\.png$/);
    expect(uploadArgs.mimetype).toBe('image/png');
    expect(uploadArgs.publicPath).toMatch(/^\/uploads\/products\/SKU_1\/.+\.png$/);
    expect(mocks.createImageFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filepath: uploadedImageFile.filepath,
        publicUrl: uploadedImageFile.filepath,
        storageProvider: 'fastcomet',
        url: uploadedImageFile.filepath,
      })
    );
    expect(mocks.createImageFile.mock.calls[0]?.[0].metadata).toEqual(
      expect.objectContaining({
        originalFilename: 'fresh.png',
        publicPath: uploadArgs.publicPath,
        storageSource: 'fastcomet',
      })
    );
    expect(mocks.updateProduct).toHaveBeenCalledWith('product-1', {
      imageBase64s: [''],
      imageLinks: [''],
    });
    expect(mocks.replaceProductImages).toHaveBeenCalledWith('product-1', ['image-file-2']);
    expect(mocks.invalidateProduct).toHaveBeenCalledWith('product-1');
    expect(json).toEqual(
      expect.objectContaining({
        imageFile: expect.objectContaining({
          id: 'image-file-2',
          filepath: uploadedImageFile.filepath,
          storageProvider: 'fastcomet',
        }),
        product: updatedProduct,
        publicPath: uploadArgs.publicPath,
        remoteUrl: uploadedImageFile.filepath,
        status: 'ok',
      })
    );
  });

  it('rejects image files that are not linked at the requested slot', async () => {
    mocks.getProductById.mockResolvedValueOnce(product);

    await expect(
      postHandler(
        createRequest({ imageFileId: 'other-image-file', imageSlotIndex: 0 }) as never,
        {} as never,
        { id: 'product-1' }
      )
    ).rejects.toThrow('Image file is not linked at the requested product image slot.');

    expect(mocks.uploadBufferToFastComet).not.toHaveBeenCalled();
  });

  it('rejects the request when the file storage source is not fastcomet', async () => {
    mocks.getFileStorageSettings.mockResolvedValueOnce({
      source: 'local',
      fastComet: {
        baseUrl: 'https://sparksofsindri.com',
        uploadEndpoint: 'https://sparksofsindri.com/api/uploads/index.php',
        deleteEndpoint: null,
        authToken: null,
        keepLocalCopy: true,
        timeoutMs: 20_000,
        resolveIp: null,
      },
    });
    mocks.getProductById.mockResolvedValueOnce(product);

    await expect(
      postHandler(
        createRequest({ imageFileId: 'image-file-1', imageSlotIndex: 0 }) as never,
        {} as never,
        { id: 'product-1' }
      )
    ).rejects.toThrow('FastComet storage is not enabled.');

    expect(mocks.uploadBufferToFastComet).not.toHaveBeenCalled();
  });
});
