import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  listEcommerceDiscountCoupons: vi.fn(),
  saveEcommerceDiscountCoupon: vi.fn(),
}));

vi.mock('@/features/integrations/services/ecommerce-discount-coupons', () => ({
  listEcommerceDiscountCoupons: mocks.listEcommerceDiscountCoupons,
  saveEcommerceDiscountCoupon: mocks.saveEcommerceDiscountCoupon,
}));

import { ecommerceDiscountCouponSchema, getHandler, putHandler } from './handler';

const buildContext = (
  userId: string | null = 'user-1',
  body: unknown = undefined
): ApiHandlerContext => ({
  body,
  correlationId: 'correlation-1',
  getElapsedMs: () => 0,
  requestId: 'request-1',
  startTime: 0,
  traceId: 'trace-1',
  userId,
});

describe('products ecommerce discount coupons handler', () => {
  beforeEach(() => {
    mocks.listEcommerceDiscountCoupons.mockReset();
    mocks.saveEcommerceDiscountCoupon.mockReset();
  });

  it('returns discount coupons for an authenticated user', async () => {
    mocks.listEcommerceDiscountCoupons.mockResolvedValue({
      coupons: [{ code: 'WELCOME20' }],
      targets: [{ dbName: 'ecom_local', source: 'local' }],
    });

    const response = await getHandler(
      new Request('http://localhost/api/v2/products/pages/discount-coupons') as NextRequest,
      buildContext('admin-1')
    );
    const body = (await response.json()) as { coupons: Array<{ code: string }>; ok: boolean };

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({
      ok: true,
      coupons: [{ code: 'WELCOME20' }],
      targets: [{ dbName: 'ecom_local', source: 'local' }],
    });
  });

  it('saves a parsed discount coupon payload', async () => {
    const payload = {
      code: 'WELCOME20',
      discountType: 'percentage',
      enabled: true,
      endsAt: null,
      minOrderAmount: null,
      singleUse: false,
      startsAt: null,
      usageLimit: null,
      value: 0.2,
    };
    mocks.saveEcommerceDiscountCoupon.mockResolvedValue({
      coupon: payload,
      targets: [{ dbName: 'ecom_local', source: 'local' }],
    });

    const response = await putHandler(
      new Request('http://localhost/api/v2/products/pages/discount-coupons', {
        method: 'PUT',
      }) as NextRequest,
      buildContext('admin-1', payload)
    );
    const body = (await response.json()) as { coupon: { code: string }; ok: boolean };

    expect(mocks.saveEcommerceDiscountCoupon).toHaveBeenCalledWith(payload);
    expect(body).toMatchObject({ ok: true, coupon: { code: 'WELCOME20' } });
  });

  it('rejects unauthenticated coupon requests', async () => {
    await expect(
      getHandler(
        new Request('http://localhost/api/v2/products/pages/discount-coupons') as NextRequest,
        buildContext(null)
      )
    ).rejects.toThrow('Unauthorized');
    expect(mocks.listEcommerceDiscountCoupons).not.toHaveBeenCalled();
  });

  it('validates coupon payload shape', () => {
    expect(
      ecommerceDiscountCouponSchema.safeParse({
        code: 'WELCOME20',
        discountType: 'percentage',
        enabled: true,
        endsAt: null,
        minOrderAmount: null,
        singleUse: false,
        startsAt: null,
        usageLimit: null,
        value: 0.2,
      }).success
    ).toBe(true);
  });
});
