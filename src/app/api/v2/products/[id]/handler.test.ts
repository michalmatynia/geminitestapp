import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  updateProductMock,
  deleteProductMock,
  validateProductUpdateMiddlewareMock,
  parseJsonBodyMock,
  invalidateProductMock,
  logSystemEventMock,
} = vi.hoisted(() => ({
  updateProductMock: vi.fn(),
  deleteProductMock: vi.fn(),
  validateProductUpdateMiddlewareMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  invalidateProductMock: vi.fn(),
  logSystemEventMock: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    updateProduct: updateProductMock,
    deleteProduct: deleteProductMock,
  },
}));

vi.mock('@/features/products/validations/middleware', () => ({
  validateProductUpdateMiddleware: validateProductUpdateMiddlewareMock,
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

vi.mock('@/features/products/server', () => ({
  CachedProductService: {
    invalidateProduct: invalidateProductMock,
  },
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

import { DELETE_handler, PATCH_handler, PUT_handler } from './handler';

const buildContext = (userId: string | null = null): ApiHandlerContext =>
  ({
    requestId: 'req-products-id-handler',
    startTime: Date.now(),
    userId,
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('products/[id] handler cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    validateProductUpdateMiddlewareMock.mockResolvedValue({ success: true });
    parseJsonBodyMock.mockResolvedValue({ ok: true, data: { price: 11.5 } });
    updateProductMock.mockResolvedValue({ id: 'product-1', name_en: 'Updated' });
    deleteProductMock.mockResolvedValue({ id: 'product-1', name_en: 'Deleted' });
  });

  it('invalidates product cache after successful PUT', async () => {
    const formData = new FormData();
    formData.append('name_en', 'Updated');
    const request = {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest;

    const response = await PUT_handler(request, buildContext(), { id: 'product-1' });

    expect(response.status).toBe(200);
    expect(invalidateProductMock).toHaveBeenCalledTimes(1);
    expect(invalidateProductMock).toHaveBeenCalledWith('product-1');
    const timingHeader = response.headers.get('Server-Timing');
    expect(timingHeader).toContain('formData;dur=');
    expect(timingHeader).toContain('validation;dur=');
    expect(timingHeader).toContain('serviceUpdate;dur=');
    expect(timingHeader).toContain('total;dur=');
  });

  it('invalidates product cache after successful PATCH', async () => {
    const request = {} as NextRequest;

    const response = await PATCH_handler(request, buildContext(), { id: 'product-1' });

    expect(response.status).toBe(200);
    expect(updateProductMock).toHaveBeenCalledTimes(1);
    expect(updateProductMock).toHaveBeenCalledWith('product-1', { price: 11.5 }, {});
    expect(invalidateProductMock).toHaveBeenCalledTimes(1);
    expect(invalidateProductMock).toHaveBeenCalledWith('product-1');
  });

  it('forwards stock-only PATCH updates without parameters payload', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({ ok: true, data: { stock: 7 } });
    const request = {} as NextRequest;

    const response = await PATCH_handler(request, buildContext(), { id: 'product-1' });

    expect(response.status).toBe(200);
    expect(updateProductMock).toHaveBeenCalledTimes(1);
    expect(updateProductMock).toHaveBeenCalledWith('product-1', { stock: 7 }, {});
  });

  it('invalidates product cache after successful DELETE', async () => {
    const request = {} as NextRequest;

    const response = await DELETE_handler(request, buildContext(), { id: 'product-1' });

    expect(response.status).toBe(204);
    expect(invalidateProductMock).toHaveBeenCalledTimes(1);
    expect(invalidateProductMock).toHaveBeenCalledWith('product-1');
  });

  it('does not invalidate product cache when PUT fails with not found', async () => {
    const formData = new FormData();
    const request = {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest;
    updateProductMock.mockResolvedValueOnce(null);

    await expect(PUT_handler(request, buildContext(), { id: 'missing-product' })).rejects.toThrow(
      'Product not found'
    );

    expect(invalidateProductMock).not.toHaveBeenCalled();
  });
});
