import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  deleteEcommerceDiscountCoupon: vi.fn(),
}));

vi.mock('@/features/integrations/services/ecommerce-discount-coupons', () => ({
  deleteEcommerceDiscountCoupon: mocks.deleteEcommerceDiscountCoupon,
}));

import { deleteHandler } from './handler';

const buildContext = (userId: string | null = 'user-1'): ApiHandlerContext => ({
  correlationId: 'correlation-1',
  getElapsedMs: () => 0,
  requestId: 'request-1',
  startTime: 0,
  traceId: 'trace-1',
  userId,
});

describe('products ecommerce discount coupon delete handler', () => {
  beforeEach(() => {
    mocks.deleteEcommerceDiscountCoupon.mockReset();
  });

  it('deletes a discount coupon for an authenticated user', async () => {
    mocks.deleteEcommerceDiscountCoupon.mockResolvedValue({
      code: 'WELCOME20',
      targets: [{ dbName: 'ecom_local', source: 'local' }],
    });

    const response = await deleteHandler(
      new Request('http://localhost/api/v2/products/pages/discount-coupons/WELCOME20', {
        method: 'DELETE',
      }) as NextRequest,
      buildContext('admin-1'),
      { code: 'WELCOME20' }
    );
    const body = (await response.json()) as { code: string; ok: boolean };

    expect(mocks.deleteEcommerceDiscountCoupon).toHaveBeenCalledWith('WELCOME20');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toMatchObject({ ok: true, code: 'WELCOME20' });
  });

  it('rejects unauthenticated delete requests', async () => {
    await expect(
      deleteHandler(
        new Request('http://localhost/api/v2/products/pages/discount-coupons/WELCOME20', {
          method: 'DELETE',
        }) as NextRequest,
        buildContext(null),
        { code: 'WELCOME20' }
      )
    ).rejects.toThrow('Unauthorized');
    expect(mocks.deleteEcommerceDiscountCoupon).not.toHaveBeenCalled();
  });
});
