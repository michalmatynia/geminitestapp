/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';

const mocks = vi.hoisted(() => ({
  getImageFileRepository: vi.fn(),
  getProductImageFileRepository: vi.fn(),
  getFileStorageSettings: vi.fn(),
  getProductById: vi.fn(),
  getProductRepository: vi.fn(),
  getPublicPathFromStoredPath: vi.fn(),
  createImageFile: vi.fn(),
  getDiskPathFromPublicPath: vi.fn(),
  invalidateProduct: vi.fn(),
  assertProductFastCometImageUploadRedisRuntime: vi.fn(),
  enqueueProductFastCometImageUploadJob: vi.fn(),
  mkdir: vi.fn(),
  parseJsonBody: vi.fn(),
  readFile: vi.fn(),
  replaceProductImages: vi.fn(),
  updateProduct: vi.fn(),
  updateImageFile: vi.fn(),
  uploadBufferToFastComet: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('node:fs', () => ({
  promises: {
    mkdir: mocks.mkdir,
    readFile: mocks.readFile,
    writeFile: mocks.writeFile,
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

vi.mock('@/features/products/workers/productFastCometImageUploadQueue', () => ({
  assertProductFastCometImageUploadRedisRuntime:
    mocks.assertProductFastCometImageUploadRedisRuntime,
  enqueueProductFastCometImageUploadJob: mocks.enqueueProductFastCometImageUploadJob,
  PRODUCT_FASTCOMET_IMAGE_UPLOAD_QUEUE_NAME: 'product-fastcomet-image-upload',
}));

vi.mock('@/shared/lib/files/services/image-file-service', () => ({
  getDiskPathFromPublicPath: mocks.getDiskPathFromPublicPath,
  getImageFileRepository: mocks.getImageFileRepository,
  getProductImageFileRepository: mocks.getProductImageFileRepository,
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
import { serviceUnavailableError } from '@/shared/errors/app-error';

type FastCometUploadRequest = Request & {
  json: () => Promise<unknown>;
};

const createRequest = (body: unknown): FastCometUploadRequest =>
  ({
    json: () => Promise.resolve(body),
  }) as FastCometUploadRequest;

const createQueueUnavailableError = (): Error =>
  serviceUnavailableError(
    'Product FastComet image uploads require Redis runtime.',
    3_000,
    { queue: 'product-fastcomet-image-upload' }
  );

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
        server: 'sparksofsindri.com',
        port: 443,
        username: 'fastcomet-user',
        token: 'token-1',
        authToken: 'token-1',
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
    mocks.getProductImageFileRepository.mockResolvedValue({
      createImageFile: mocks.createImageFile,
      updateImageFile: mocks.updateImageFile,
    });
    mocks.getPublicPathFromStoredPath.mockReturnValue('/uploads/products/SKU/photo.webp');
    mocks.getDiskPathFromPublicPath.mockReturnValue(
      '/repo/public/uploads/products/SKU/photo.webp'
    );
    mocks.mkdir.mockResolvedValue(undefined);
    mocks.readFile.mockResolvedValue(Buffer.from('image-bytes'));
    mocks.assertProductFastCometImageUploadRedisRuntime.mockResolvedValue(undefined);
    mocks.enqueueProductFastCometImageUploadJob.mockResolvedValue('fastcomet-job-1');
    mocks.uploadBufferToFastComet.mockResolvedValue(
      'https://sparksofsindri.com/uploads/products/SKU/photo.webp'
    );
    mocks.writeFile.mockResolvedValue(undefined);
  });

  it('queues a linked local image file FastComet upload in Redis runtime', async () => {
    mocks.getProductById.mockResolvedValueOnce(product);

    const response = await postHandler(
      createRequest({ imageFileId: 'image-file-1', imageSlotIndex: 0 }) as never,
      {} as never,
      { id: ' product-1 ' }
    );
    const json = await response.json();

    expect(mocks.uploadBufferToFastComet).not.toHaveBeenCalled();
    expect(mocks.updateImageFile).not.toHaveBeenCalled();
    expect(mocks.enqueueProductFastCometImageUploadJob).toHaveBeenCalledWith({
      imageFileId: 'image-file-1',
      imageSlotIndex: 0,
      productId: 'product-1',
      requestedAt: expect.any(String),
      userId: null,
    });
    expect(json).toEqual(
      expect.objectContaining({
        status: 'queued',
        imageFile: expect.objectContaining({
          id: 'image-file-1',
          filepath: '/uploads/products/SKU/photo.webp',
        }),
        imageFileId: 'image-file-1',
        imageSlotIndex: 0,
        jobId: 'fastcomet-job-1',
        product,
        queueName: 'product-fastcomet-image-upload',
      })
    );
    expect(response.status).toBe(202);
  });

  it('uploads a linked local image file directly when the Redis queue is unavailable', async () => {
    const fastCometImageFile = {
      ...localImageFile,
      filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      metadata: {
        ...localImageFile.metadata,
        fastCometUploadStatus: 'completed',
        storageSource: 'fastcomet',
      },
      publicUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      storageProvider: 'fastcomet',
      url: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
    };
    const updatedProduct = {
      ...product,
      images: [{ ...product.images[0], imageFile: fastCometImageFile }],
    };
    mocks.getProductById.mockResolvedValueOnce(product).mockResolvedValueOnce(updatedProduct);
    mocks.updateImageFile.mockResolvedValueOnce(fastCometImageFile);
    mocks.enqueueProductFastCometImageUploadJob.mockRejectedValueOnce(createQueueUnavailableError());

    const response = await postHandler(
      createRequest({ imageFileId: 'image-file-1', imageSlotIndex: 0 }) as never,
      {} as never,
      { id: 'product-1' }
    );
    const json = await response.json();

    expect(mocks.uploadBufferToFastComet).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'products',
        filename: 'photo.webp',
        publicPath: '/uploads/products/SKU/photo.webp',
      })
    );
    expect(mocks.updateImageFile).toHaveBeenCalledWith(
      'image-file-1',
      expect.objectContaining({
        filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
        storageProvider: 'fastcomet',
      })
    );
    expect(mocks.invalidateProduct).toHaveBeenCalledWith('product-1');
    expect(json).toEqual(
      expect.objectContaining({
        status: 'ok',
        imageFile: expect.objectContaining({
          id: 'image-file-1',
          storageProvider: 'fastcomet',
        }),
        product: updatedProduct,
        remoteUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      })
    );
    expect(response.status).toBe(200);
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

  it('stages a local file slot and queues the FastComet upload in Redis runtime', async () => {
    const uploadedImageFile = {
      id: 'image-file-2',
      filename: 'generated.png',
      filepath: '/uploads/products/SKU_1/generated.png',
      mimetype: 'image/png',
      metadata: {
        localPublicPath: '/uploads/products/SKU_1/generated.png',
        mirroredLocally: true,
        publicPath: '/uploads/products/SKU_1/generated.png',
        storageSource: 'local',
      },
      publicUrl: '/uploads/products/SKU_1/generated.png',
      size: 11,
      storageProvider: 'local',
      url: '/uploads/products/SKU_1/generated.png',
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

    expect(mocks.uploadBufferToFastComet).not.toHaveBeenCalled();
    const stagedPublicPath = mocks.getDiskPathFromPublicPath.mock.calls[0]?.[0] as string;
    expect(stagedPublicPath).toMatch(/^\/uploads\/products\/SKU_1\/.+\.png$/);
    expect(mocks.mkdir).toHaveBeenCalledWith(
      '/repo/public/uploads/products/SKU',
      { recursive: true }
    );
    expect(mocks.writeFile).toHaveBeenCalledWith(
      '/repo/public/uploads/products/SKU/photo.webp',
      Buffer.from('image-bytes')
    );
    expect(mocks.createImageFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filepath: stagedPublicPath,
        publicUrl: stagedPublicPath,
        storageProvider: 'local',
        url: stagedPublicPath,
      })
    );
    expect(mocks.createImageFile.mock.calls[0]?.[0].metadata).toEqual(
      expect.objectContaining({
        localPublicPath: stagedPublicPath,
        mirroredLocally: true,
        originalFilename: 'fresh.png',
        publicPath: stagedPublicPath,
        storageSource: 'local',
        fastCometUploadStatus: 'queued',
      })
    );
    expect(mocks.updateProduct).toHaveBeenCalledWith('product-1', {
      imageBase64s: [''],
      imageLinks: [''],
    });
    expect(mocks.replaceProductImages).toHaveBeenCalledWith('product-1', ['image-file-2']);
    expect(mocks.invalidateProduct).toHaveBeenCalledWith('product-1');
    expect(mocks.enqueueProductFastCometImageUploadJob).toHaveBeenCalledWith({
      imageFileId: 'image-file-2',
      imageSlotIndex: 0,
      productId: 'product-1',
      requestedAt: expect.any(String),
      userId: null,
    });
    expect(json).toEqual(
      expect.objectContaining({
        imageFile: expect.objectContaining({
          id: 'image-file-2',
          filepath: uploadedImageFile.filepath,
          storageProvider: 'local',
        }),
        product: updatedProduct,
        publicPath: stagedPublicPath,
        jobId: 'fastcomet-job-1',
        queueName: 'product-fastcomet-image-upload',
        status: 'queued',
      })
    );
    expect(response.status).toBe(202);
  });

  it('uploads a new file slot directly when the Redis queue is unavailable', async () => {
    const uploadedImageFile = {
      id: 'image-file-3',
      filename: 'direct.png',
      filepath: 'https://sparksofsindri.com/uploads/products/SKU_1/direct.png',
      mimetype: 'image/png',
      metadata: {
        localPublicPath: '/uploads/products/SKU_1/direct.png',
        mirroredLocally: true,
        publicPath: '/uploads/products/SKU_1/direct.png',
        storageSource: 'fastcomet',
      },
      publicUrl: 'https://sparksofsindri.com/uploads/products/SKU_1/direct.png',
      size: 11,
      storageProvider: 'fastcomet',
      url: 'https://sparksofsindri.com/uploads/products/SKU_1/direct.png',
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
      images: [{ imageFile: uploadedImageFile, imageFileId: 'image-file-3' }],
    };
    mocks.assertProductFastCometImageUploadRedisRuntime.mockRejectedValueOnce(createQueueUnavailableError());
    mocks.getProductById.mockResolvedValueOnce(fileSlotProduct).mockResolvedValueOnce(updatedProduct);
    mocks.createImageFile.mockResolvedValueOnce(uploadedImageFile);
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

    expect(mocks.enqueueProductFastCometImageUploadJob).not.toHaveBeenCalled();
    expect(mocks.uploadBufferToFastComet).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'products',
        mimetype: 'image/png',
      })
    );
    expect(mocks.createImageFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
        publicUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
        storageProvider: 'fastcomet',
        url: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      })
    );
    expect(mocks.updateProduct).toHaveBeenCalledWith('product-1', {
      imageBase64s: [''],
      imageLinks: [''],
    });
    expect(mocks.replaceProductImages).toHaveBeenCalledWith('product-1', ['image-file-3']);
    expect(mocks.invalidateProduct).toHaveBeenCalledWith('product-1');
    expect(json).toEqual(
      expect.objectContaining({
        imageFile: expect.objectContaining({
          id: 'image-file-3',
          storageProvider: 'fastcomet',
        }),
        product: updatedProduct,
        remoteUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
        status: 'ok',
      })
    );
    expect(response.status).toBe(200);
  });

  it('surfaces direct FastComet transport failures as expected upload errors', async () => {
    const fileSlotProduct = {
      id: 'product-1',
      imageBase64s: ['data:image/png;base64,abc'],
      imageLinks: ['https://example.com/old.png'],
      images: [],
      sku: 'SKU 1',
    };
    mocks.assertProductFastCometImageUploadRedisRuntime.mockRejectedValueOnce(createQueueUnavailableError());
    mocks.getProductById.mockResolvedValueOnce(fileSlotProduct);
    mocks.uploadBufferToFastComet.mockRejectedValueOnce(new TypeError('fetch failed'));
    const formData = new FormData();
    formData.append('file', new File(['image-bytes'], 'fresh.png', { type: 'image/png' }));
    formData.append('filename', 'fresh.png');
    formData.append('imageSlotIndex', '0');

    await expect(
      postHandler(
        new Request('http://localhost/api/v2/products/product-1/images/upload-to-fastcomet', {
          body: formData,
          method: 'POST',
        }) as never,
        {} as never,
        { id: 'product-1' }
      )
    ).rejects.toMatchObject({
      expected: true,
      message: 'FastComet upload request failed. Check FastComet File Storage settings and retry.',
    });

    expect(mocks.createImageFile).not.toHaveBeenCalled();
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

  it('rejects the request when fastcomet upload endpoint is not configured', async () => {
    mocks.getFileStorageSettings.mockResolvedValueOnce({
      source: 'local',
      fastComet: {
        baseUrl: '',
        uploadEndpoint: '',
        deleteEndpoint: null,
        server: null,
        port: null,
        username: null,
        token: null,
        authToken: null,
        keepLocalCopy: false,
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
    ).rejects.toThrow('FastComet storage is not configured.');

    expect(mocks.uploadBufferToFastComet).not.toHaveBeenCalled();
  });
});
