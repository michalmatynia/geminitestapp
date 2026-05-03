import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

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
  formDataToObject: vi.fn(() => ({})),
  CachedProductService: {
    invalidateProduct: invalidateProductMock,
  },
  productService: {
    updateProduct: updateProductMock,
    deleteProduct: deleteProductMock,
  },
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

import { deleteHandler, patchHandler, putHandler } from './handler';

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
      headers: new Headers(),
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest;

    const response = await putHandler(request, buildContext(), { id: 'product-1' });

    expect(response.status).toBe(200);
    expect(invalidateProductMock).toHaveBeenCalledTimes(1);
    expect(invalidateProductMock).toHaveBeenCalledWith('product-1');
    const timingHeader = response.headers.get('Server-Timing');
    expect(timingHeader).toContain('formData;dur=');
    expect(timingHeader).toContain('validation;dur=');
    expect(timingHeader).toContain('serviceUpdate;dur=');
    expect(timingHeader).toContain('total;dur=');
  });

  it('forwards FormData updates with empty parameters to productService for preservation handling', async () => {
    const formData = new FormData();
    formData.append('parameters', '[]');
    const request = {
      headers: new Headers(),
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest;

    const response = await putHandler(request, buildContext(), { id: 'product-1' });

    expect(response.status).toBe(200);
    expect(validateProductUpdateMiddlewareMock).toHaveBeenCalledWith(formData);
    expect(updateProductMock).toHaveBeenCalledTimes(1);
    expect(updateProductMock).toHaveBeenCalledWith('product-1', formData, {});
  });

  it('forwards explicit parameter clear flags through the PUT handler', async () => {
    const formData = new FormData();
    formData.append('parameters', '[]');
    formData.append('forceClearParameters', 'true');
    const request = {
      headers: new Headers(),
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest;

    const response = await putHandler(request, buildContext(), { id: 'product-1' });

    expect(response.status).toBe(200);
    expect(validateProductUpdateMiddlewareMock).toHaveBeenCalledWith(formData);
    expect(updateProductMock).toHaveBeenCalledTimes(1);
    expect(updateProductMock).toHaveBeenCalledWith('product-1', formData, {});
  });

  it('invalidates product cache after successful PATCH', async () => {
    const request = {} as NextRequest;

    const response = await patchHandler(request, buildContext(), { id: 'product-1' });

    expect(response.status).toBe(200);
    expect(updateProductMock).toHaveBeenCalledTimes(1);
    expect(updateProductMock).toHaveBeenCalledWith('product-1', { price: 11.5 }, {});
    expect(invalidateProductMock).toHaveBeenCalledTimes(1);
    expect(invalidateProductMock).toHaveBeenCalledWith('product-1');
  });

  it('forwards stock-only PATCH updates without parameters payload', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({ ok: true, data: { stock: 7 } });
    const request = {} as NextRequest;

    const response = await patchHandler(request, buildContext(), { id: 'product-1' });

    expect(response.status).toBe(200);
    expect(updateProductMock).toHaveBeenCalledTimes(1);
    expect(updateProductMock).toHaveBeenCalledWith('product-1', { stock: 7 }, {});
  });

  it('invalidates product cache after successful DELETE', async () => {
    const request = {} as NextRequest;

    const response = await deleteHandler(request, buildContext(), { id: 'product-1' });

    expect(response.status).toBe(204);
    expect(invalidateProductMock).toHaveBeenCalledTimes(1);
    expect(invalidateProductMock).toHaveBeenCalledWith('product-1');
  });

  it('does not invalidate product cache when PUT fails with not found', async () => {
    const formData = new FormData();
    const request = {
      headers: new Headers(),
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest;
    updateProductMock.mockResolvedValueOnce(null);

    await expect(putHandler(request, buildContext(), { id: 'missing-product' })).rejects.toThrow(
      'Product not found'
    );

    expect(invalidateProductMock).not.toHaveBeenCalled();
  });

  it('accepts JSON PUT updates and forwards the parsed object to productService', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({ ok: true, data: { price: 11.5, stock: 7 } });
    const request = {
      headers: { get: (key: string) => key.toLowerCase() === 'content-type' ? 'application/json' : null },
      json: vi.fn().mockResolvedValue({ price: 11.5, stock: 7 }),
      formData: vi.fn(),
    } as unknown as NextRequest;

    const response = await putHandler(request, buildContext(), { id: 'product-1' });

    expect(response.status).toBe(200);
    expect(parseJsonBodyMock).toHaveBeenCalledTimes(1);
    expect(validateProductUpdateMiddlewareMock).not.toHaveBeenCalled();
    expect(updateProductMock).toHaveBeenCalledWith(
      'product-1',
      { price: 11.5, stock: 7 },
      {}
    );
    expect((request as unknown as { formData: ReturnType<typeof vi.fn> }).formData).not.toHaveBeenCalled();
    expect(invalidateProductMock).toHaveBeenCalledWith('product-1');
    const timingHeader = response.headers.get('Server-Timing');
    expect(timingHeader).toContain('jsonBody;dur=');
    expect(timingHeader).toContain('serviceUpdate;dur=');
  });

  it('returns the JSON validation response for invalid PUT payloads', async () => {
    const validationResponse = new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
    });
    parseJsonBodyMock.mockResolvedValueOnce({ ok: false, response: validationResponse });
    const request = {
      headers: { get: (key: string) => key.toLowerCase() === 'content-type' ? 'application/json' : null },
      json: vi.fn().mockResolvedValue({ price: -1 }),
      formData: vi.fn(),
    } as unknown as NextRequest;

    const response = await putHandler(request, buildContext(), { id: 'product-1' });

    expect(response.status).toBe(400);
    expect(updateProductMock).not.toHaveBeenCalled();
    expect(validateProductUpdateMiddlewareMock).not.toHaveBeenCalled();
    expect((request as unknown as { formData: ReturnType<typeof vi.fn> }).formData).not.toHaveBeenCalled();
    expect(invalidateProductMock).not.toHaveBeenCalled();
    expect(response.headers.get('Server-Timing')).toContain('jsonBody;dur=');
  });
});
