import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  syncEcommerceCategoriesFromProductsLocalMongo: vi.fn(),
}));

vi.mock('@/features/integrations/services/ecommerce-category-sync', () => ({
  syncEcommerceCategoriesFromProductsLocalMongo:
    mocks.syncEcommerceCategoriesFromProductsLocalMongo,
}));

import { postHandler } from './handler';

const buildContext = (userId: string | null = 'user-1'): ApiHandlerContext => ({
  correlationId: 'correlation-1',
  getElapsedMs: () => 0,
  requestId: 'request-1',
  startTime: 0,
  traceId: 'trace-1',
  userId,
});

describe('products ecommerce data sync categories handler', () => {
  beforeEach(() => {
    mocks.syncEcommerceCategoriesFromProductsLocalMongo.mockReset();
  });

  it('returns category sync results for an authenticated user', async () => {
    mocks.syncEcommerceCategoriesFromProductsLocalMongo.mockResolvedValue({
      sourceCategoryCount: 2,
      syncedAt: '2026-05-13T10:00:00.000Z',
      targets: [{ categoryCount: 2, dbName: 'ecom_local', source: 'local' }],
    });

    const response = await postHandler(
      new Request('http://localhost/api/v2/products/pages/data-sync/categories', {
        method: 'POST',
      }) as NextRequest,
      buildContext('admin-1')
    );
    const body = (await response.json()) as { ok: boolean; sync: { sourceCategoryCount: number } };

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({
      ok: true,
      sync: expect.objectContaining({ sourceCategoryCount: 2 }),
    });
  });

  it('rejects unauthenticated sync requests', async () => {
    await expect(
      postHandler(
        new Request('http://localhost/api/v2/products/pages/data-sync/categories', {
          method: 'POST',
        }) as NextRequest,
        buildContext(null)
      )
    ).rejects.toThrow('Unauthorized');
    expect(mocks.syncEcommerceCategoriesFromProductsLocalMongo).not.toHaveBeenCalled();
  });
});
