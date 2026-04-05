import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

const { parseObjectJsonBodyMock } = vi.hoisted(() => ({
  parseObjectJsonBodyMock: vi.fn(),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseObjectJsonBody: (...args: unknown[]) => parseObjectJsonBodyMock(...args),
}));

import {
  buildProductsValidationHealthResponse,
  buildProductsValidationResponse,
  resolveProductsValidationPayload,
} from './handler.helpers';

describe('product validation handler helpers', () => {
  it('returns parser failures unchanged', async () => {
    const response = new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
    });
    parseObjectJsonBodyMock.mockResolvedValueOnce({
      ok: false,
      response,
    });

    await expect(
      resolveProductsValidationPayload(new NextRequest('http://localhost'))
    ).resolves.toEqual({
      ok: false,
      response,
    });
  });

  it('requires products to be an array when parsing succeeds', async () => {
    parseObjectJsonBodyMock.mockResolvedValueOnce({
      ok: true,
      data: {
        products: [{ sku: 'SKU-1' }],
      },
    });

    await expect(
      resolveProductsValidationPayload(new NextRequest('http://localhost'))
    ).resolves.toEqual({
      ok: true,
      products: [{ sku: 'SKU-1' }],
    });

    parseObjectJsonBodyMock.mockResolvedValueOnce({
      ok: true,
      data: {
        products: { sku: 'SKU-1' },
      },
    });

    await expect(
      resolveProductsValidationPayload(new NextRequest('http://localhost'))
    ).rejects.toMatchObject({
      message: 'Products must be an array',
      httpStatus: 400,
    });
  });

  it('builds validation and health responses', () => {
    expect(
      buildProductsValidationResponse({
        summary: {
          total: 2,
          successful: 1,
          failed: 1,
        },
        results: [
          { index: 0, result: { success: true } },
          { index: 1, result: { success: false } },
        ],
      })
    ).toEqual({
      summary: {
        total: 2,
        successful: 1,
        failed: 1,
      },
      results: [
        { index: 0, result: { success: true } },
        { index: 1, result: { success: false } },
      ],
      globalErrors: [],
    });

    expect(buildProductsValidationHealthResponse()).toEqual({
      status: 'ok',
      validation: { engine: 'zod-schema' },
    });
  });
});
