import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearProductCreateRuntimeStatuses,
  getProductCreateRuntimeStatus,
} from '@/features/products/server/product-create-runtime-status';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import type * as ZodModule from 'zod';

const {
  invalidateAllMock,
  getProductBySkuMock,
  createProductMock,
  enqueueProductImagesFastCometUploadOnSaveMock,
  formDataToObjectMock,
  validateProductCreateMiddlewareMock,
} = vi.hoisted(() => ({
  invalidateAllMock: vi.fn(),
  getProductBySkuMock: vi.fn(),
  createProductMock: vi.fn(),
  enqueueProductImagesFastCometUploadOnSaveMock: vi.fn(),
  formDataToObjectMock: vi.fn(),
  validateProductCreateMiddlewareMock: vi.fn(),
}));

vi.mock('@/features/products/performance', () => ({
  CachedProductService: {
    invalidateAll: (...args: unknown[]) => invalidateAllMock(...args),
    getProductBySku: (...args: unknown[]) => getProductBySkuMock(...args),
  },
  performanceMonitor: {
    record: vi.fn(),
  },
}));

vi.mock('@/features/products/server', async () => {
  const { z } = await vi.importActual<typeof ZodModule>('zod');
  return {
    formDataToObject: (...args: unknown[]) => formDataToObjectMock(...args),
    getProductDataProvider: vi.fn(),
    productService: {
      createProduct: (...args: unknown[]) => createProductMock(...args),
    },
    productFilterSchema: z.object({}).passthrough(),
  };
});

vi.mock('@/features/products/validations/middleware', () => ({
  validateProductCreateMiddleware: (...args: unknown[]) => validateProductCreateMiddlewareMock(...args),
}));

vi.mock('./product-fastcomet-save-sync', () => ({
  enqueueProductImagesFastCometUploadOnSave: (...args: unknown[]) =>
    enqueueProductImagesFastCometUploadOnSaveMock(...args),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn(),
}));

vi.mock('@/shared/lib/env', () => ({
  env: {
    DEBUG_API_TIMING: false,
  },
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: vi.fn(),
  },
}));

import { postHandler } from './handler';

const createDeferred = <T,>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error?: unknown) => void;
} => {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const flushRuntimeTasks = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const createContext = (userId: string | null = null): ApiHandlerContext => ({
  requestId: 'test-request',
  traceId: 'test-trace',
  correlationId: 'test-correlation',
  startTime: 0,
  getElapsedMs: () => 0,
  userId,
});

describe('products postHandler', () => {
  beforeEach(() => {
    invalidateAllMock.mockReset();
    getProductBySkuMock.mockReset();
    createProductMock.mockReset();
    enqueueProductImagesFastCometUploadOnSaveMock.mockReset();
    formDataToObjectMock.mockReset();
    validateProductCreateMiddlewareMock.mockReset();
    clearProductCreateRuntimeStatuses();
  });

  it('creates the product and invalidates cached product list state', async () => {
    const createdProduct = {
      id: 'product-1',
      sku: 'KEYCHA9999',
      catalogId: 'catalog-mentios',
      catalogs: [{ catalogId: 'catalog-mentios' }],
    };

    validateProductCreateMiddlewareMock.mockResolvedValue({ success: true, data: {} });
    formDataToObjectMock.mockReturnValue({
      sku: 'KEYCHA9999',
      catalogIds: ['catalog-mentios'],
    });
    createProductMock.mockResolvedValue(createdProduct);

    const formData = new FormData();
    formData.append('sku', 'KEYCHA9999');
    formData.append('catalogIds', 'catalog-mentios');

    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products', {
        method: 'POST',
        body: formData,
      }),
      createContext('user-1')
    );

    expect(validateProductCreateMiddlewareMock).toHaveBeenCalledTimes(1);
    expect(createProductMock).toHaveBeenCalledTimes(1);
    expect(enqueueProductImagesFastCometUploadOnSaveMock).toHaveBeenCalledWith(
      createdProduct,
      'user-1'
    );
    const [submittedFormData, submittedOptions]: [
      FormData,
      { userId: string },
    ] = createProductMock.mock.calls[0];
    expect(submittedFormData.get('sku')).toBe('KEYCHA9999');
    expect(submittedFormData.getAll('catalogIds')).toEqual(['catalog-mentios']);
    expect(submittedOptions).toEqual({ userId: 'user-1' });
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(createdProduct);
  });

  it('enqueues local product images for FastComet after create save', async () => {
    const createdProduct = {
      id: 'product-1',
      sku: 'KEYCHA9999',
      images: [
        {
          imageFileId: 'image-local-1',
          imageFile: {
            id: 'image-local-1',
            filepath: '/uploads/products/KEYCHA9999/photo.webp',
            storageProvider: 'local',
          },
        },
      ],
    };

    validateProductCreateMiddlewareMock.mockResolvedValue({ success: true, data: {} });
    createProductMock.mockResolvedValue(createdProduct);

    const formData = new FormData();
    formData.append('sku', 'KEYCHA9999');

    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products', {
        method: 'POST',
        body: formData,
      }),
      createContext('user-1')
    );

    expect(response.status).toBe(200);
    expect(enqueueProductImagesFastCometUploadOnSaveMock).toHaveBeenCalledTimes(1);
    expect(enqueueProductImagesFastCometUploadOnSaveMock).toHaveBeenCalledWith(
      createdProduct,
      'user-1'
    );
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
  });

  it('queues runtime product creation and exposes completion status', async () => {
    const createdProduct = {
      id: 'product-runtime-1',
      sku: 'KEYCHA9998',
      catalogId: 'catalog-mentios',
      catalogs: [{ catalogId: 'catalog-mentios' }],
    };
    const deferredCreate = createDeferred<typeof createdProduct>();

    validateProductCreateMiddlewareMock.mockResolvedValue({
      success: true,
      data: { sku: 'KEYCHA9998' },
    });
    createProductMock.mockReturnValue(deferredCreate.promise);

    const formData = new FormData();
    formData.append('sku', 'KEYCHA9998');
    formData.append('catalogIds', 'catalog-mentios');

    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products?runtime=1', {
        method: 'POST',
        body: formData,
      }),
      createContext('user-1')
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      queued: true,
      requestId: 'test-request',
      sku: 'KEYCHA9998',
      status: 'queued',
    });
    expect(invalidateAllMock).not.toHaveBeenCalled();

    await flushRuntimeTasks();
    expect(createProductMock).toHaveBeenCalledTimes(1);
    const [, submittedOptions]: [FormData, { userId: string }] = createProductMock.mock.calls[0];
    expect(submittedOptions).toEqual({ userId: 'user-1' });

    deferredCreate.resolve(createdProduct);
    await deferredCreate.promise;
    await flushRuntimeTasks();

    expect(enqueueProductImagesFastCometUploadOnSaveMock).toHaveBeenCalledWith(
      createdProduct,
      'user-1'
    );
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
    expect(getProductCreateRuntimeStatus('test-request')).toMatchObject({
      status: 'completed',
      productId: 'product-runtime-1',
      productSku: 'KEYCHA9998',
    });
  });
});
