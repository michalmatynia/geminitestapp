import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { getProductsWithCountMock } = vi.hoisted(() => ({
  getProductsWithCountMock: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProductsWithCount: (...args: unknown[]) => getProductsWithCountMock(...args),
  },
}));

import { GET_handler } from './handler';

describe('products/paged handler', () => {
  it('returns paged result with Server-Timing header', async () => {
    getProductsWithCountMock.mockResolvedValue({
      products: [{ id: 'product-1' }],
      total: 1,
    });

    const response = await GET_handler(
      {} as NextRequest,
      {
        query: { page: 1, pageSize: 12 },
        getElapsedMs: () => 12,
      } as ApiHandlerContext
    );

    expect(response.status).toBe(200);
    const timingHeader = response.headers.get('Server-Timing');
    expect(timingHeader).toContain('service;dur=');
    expect(timingHeader).toContain('total;dur=');
  });
});
