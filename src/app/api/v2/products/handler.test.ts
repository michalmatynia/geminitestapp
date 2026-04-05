import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  invalidateAllMock,
  getProductBySkuMock,
  createProductMock,
  formDataToObjectMock,
  validateProductCreateMiddlewareMock,
} = vi.hoisted(() => ({
  invalidateAllMock: vi.fn(),
  getProductBySkuMock: vi.fn(),
  createProductMock: vi.fn(),
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

vi.mock('@/features/products/server', () => ({
  formDataToObject: (...args: unknown[]) => formDataToObjectMock(...args),
  productService: {
    createProduct: (...args: unknown[]) => createProductMock(...args),
  },
  productFilterSchema: {
    extend: vi.fn(() => ({
      parse: vi.fn((value: unknown) => value),
    })),
  },
}));

vi.mock('@/features/products/validations/middleware', () => ({
  validateProductCreateMiddleware: (...args: unknown[]) => validateProductCreateMiddlewareMock(...args),
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

import { POST_handler } from './handler';

describe('products POST_handler', () => {
  beforeEach(() => {
    invalidateAllMock.mockReset();
    getProductBySkuMock.mockReset();
    createProductMock.mockReset();
    formDataToObjectMock.mockReset();
    validateProductCreateMiddlewareMock.mockReset();
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

    const response = await POST_handler(
      new NextRequest('http://localhost/api/v2/products', {
        method: 'POST',
        body: formData,
      }),
      {
        userId: 'user-1',
      } as ApiHandlerContext
    );

    expect(validateProductCreateMiddlewareMock).toHaveBeenCalledTimes(1);
    expect(createProductMock).toHaveBeenCalledTimes(1);
    const [submittedFormData, submittedOptions] = createProductMock.mock.calls[0] as [
      FormData,
      { userId: string },
    ];
    expect(submittedFormData.get('sku')).toBe('KEYCHA9999');
    expect(submittedFormData.getAll('catalogIds')).toEqual(['catalog-mentios']);
    expect(submittedOptions).toEqual({ userId: 'user-1' });
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(createdProduct);
  });
});
