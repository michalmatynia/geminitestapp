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

describe('products/scans handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the list handler and query schema', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
  });

  it('lists scans by ids and product ids', async () => {
    listProductScansWithSyncMock.mockResolvedValue([
      { id: 'scan-1', productId: 'product-1', status: 'completed' },
    ]);

    const response = await GET_handler(
      new NextRequest(
        'http://localhost/api/v2/products/scans?ids=scan-1,scan-2&productIds=product-1,product-2&limit=12'
      ),
      {
        query: {
          ids: 'scan-1,scan-2',
          productIds: 'product-1,product-2',
          limit: '12',
        },
      } as ApiHandlerContext
    );

    expect(listProductScansWithSyncMock).toHaveBeenCalledWith({
      ids: ['scan-1', 'scan-2'],
      productIds: ['product-1', 'product-2'],
      limit: 12,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      scans: [{ id: 'scan-1', productId: 'product-1', status: 'completed' }],
    });
  });

  it('falls back to the default limit when none is supplied', async () => {
    listProductScansWithSyncMock.mockResolvedValue([]);

    await GET_handler(
      new NextRequest('http://localhost/api/v2/products/scans'),
      { query: {} } as ApiHandlerContext
    );

    expect(listProductScansWithSyncMock).toHaveBeenCalledWith({
      ids: undefined,
      productIds: undefined,
      limit: 50,
    });
  });
});
