import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { parseObjectJsonBodyMock, validateProductsBatchMock } = vi.hoisted(() => ({
  parseObjectJsonBodyMock: vi.fn(),
  validateProductsBatchMock: vi.fn(),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseObjectJsonBody: (...args: unknown[]) => parseObjectJsonBodyMock(...args),
}));

vi.mock('@/shared/lib/products/validations', () => ({
  validateProductsBatch: (...args: unknown[]) => validateProductsBatchMock(...args),
}));

import { GET_handler, POST_handler } from './handler';

describe('product validation handler module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseObjectJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        products: [{ sku: 'SKU-1' }],
      },
    });
    validateProductsBatchMock.mockResolvedValue({
      summary: {
        total: 1,
        successful: 1,
        failed: 0,
      },
      results: [
        {
          index: 0,
          result: { success: true },
        },
      ],
    });
  });

  it('exports the supported handlers', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof POST_handler).toBe('function');
  });

  it('returns the validation health response', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/v2/products/validation'),
      {} as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      validation: { engine: 'zod-schema' },
    });
  });

  it('returns the parser response when request parsing fails', async () => {
    parseObjectJsonBodyMock.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { status: 400 }),
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/v2/products/validation', {
        method: 'POST',
      }),
      {} as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid JSON payload' });
    expect(validateProductsBatchMock).not.toHaveBeenCalled();
  });

  it('rejects non-array products payloads', async () => {
    parseObjectJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        products: { sku: 'SKU-1' },
      },
    });

    await expect(
      POST_handler(
        new NextRequest('http://localhost/api/v2/products/validation', {
          method: 'POST',
        }),
        {} as never
      )
    ).rejects.toMatchObject({
      message: 'Products must be an array',
      httpStatus: 400,
    });

    expect(validateProductsBatchMock).not.toHaveBeenCalled();
  });

  it('returns the normalized batch validation response', async () => {
    const response = await POST_handler(
      new NextRequest('http://localhost/api/v2/products/validation', {
        method: 'POST',
      }),
      {} as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      summary: {
        total: 1,
        successful: 1,
        failed: 0,
      },
      results: [
        {
          index: 0,
          result: { success: true },
        },
      ],
      globalErrors: [],
    });
    expect(validateProductsBatchMock).toHaveBeenCalledWith([{ sku: 'SKU-1' }], 'create');
  });
});
