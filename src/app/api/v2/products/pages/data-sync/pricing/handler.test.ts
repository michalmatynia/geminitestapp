import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  syncEcommercePricingFromProductsLocalMongo: vi.fn(),
}));

vi.mock('@/features/integrations/services/ecommerce-pricing-sync', () => ({
  syncEcommercePricingFromProductsLocalMongo:
    mocks.syncEcommercePricingFromProductsLocalMongo,
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

describe('products ecommerce data sync pricing handler', () => {
  beforeEach(() => {
    mocks.syncEcommercePricingFromProductsLocalMongo.mockReset();
  });

  it('returns pricing sync results for an authenticated user', async () => {
    mocks.syncEcommercePricingFromProductsLocalMongo.mockResolvedValue({
      sourceCurrencyCount: 2,
      sourcePriceGroupCount: 3,
      syncedAt: '2026-05-13T10:00:00.000Z',
      targets: [{ currencyCount: 2, dbName: 'ecom_local', priceGroupCount: 3, source: 'local' }],
    });

    const response = await postHandler(
      new Request('http://localhost/api/v2/products/pages/data-sync/pricing', {
        method: 'POST',
      }) as NextRequest,
      buildContext('admin-1')
    );
    const body = (await response.json()) as { ok: boolean; sync: { sourceCurrencyCount: number } };

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({
      ok: true,
      sync: expect.objectContaining({ sourceCurrencyCount: 2 }),
    });
  });

  it('rejects unauthenticated sync requests', async () => {
    await expect(
      postHandler(
        new Request('http://localhost/api/v2/products/pages/data-sync/pricing', {
          method: 'POST',
        }) as NextRequest,
        buildContext(null)
      )
    ).rejects.toThrow('Unauthorized');
    expect(mocks.syncEcommercePricingFromProductsLocalMongo).not.toHaveBeenCalled();
  });
});
