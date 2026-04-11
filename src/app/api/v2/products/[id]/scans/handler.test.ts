import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { listProductScansWithSyncMock } = vi.hoisted(() => ({
  listProductScansWithSyncMock: vi.fn(),
}));

vi.mock('@/features/products/server/product-scans-service', () => ({
  listProductScansWithSync: (...args: unknown[]) => listProductScansWithSyncMock(...args),
}));

import { GET_handler, querySchema } from './handler';

describe('products/[id]/scans handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the list-by-product handler and query schema', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
  });

  it('lists scans for a single product id', async () => {
    listProductScansWithSyncMock.mockResolvedValue([
      { id: 'scan-1', productId: 'product-123', status: 'running' },
    ]);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/v2/products/product-123/scans?limit=15'),
      {
        query: { limit: '15' },
      } as ApiHandlerContext,
      { id: 'product-123' }
    );

    expect(listProductScansWithSyncMock).toHaveBeenCalledWith({
      productId: 'product-123',
      limit: 15,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      scans: [{ id: 'scan-1', productId: 'product-123', status: 'running' }],
    });
  });

  it('uses the default limit when query is missing', async () => {
    listProductScansWithSyncMock.mockResolvedValue([]);

    await GET_handler(
      new NextRequest('http://localhost/api/v2/products/product-123/scans'),
      { query: {} } as ApiHandlerContext,
      { id: 'product-123' }
    );

    expect(listProductScansWithSyncMock).toHaveBeenCalledWith({
      productId: 'product-123',
      limit: 50,
    });
  });
});
