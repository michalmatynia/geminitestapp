/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  insertOne: vi.fn(),
  createPayUBlikOrder: vi.fn(),
  computeDiscount: vi.fn(),
  getEcommerceProductsDb: vi.fn(),
  findOrderProducts: vi.fn(),
  productProject: vi.fn(),
  productToArray: vi.fn(),
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({ insertOne: mocks.insertOne }),
  })),
  getEcommerceProductsDb: mocks.getEcommerceProductsDb,
}));

vi.mock('@/lib/payu', () => ({
  createPayUBlikOrder: mocks.createPayUBlikOrder,
}));

vi.mock('@/lib/promo', () => ({
  computeDiscount: mocks.computeDiscount,
}));

vi.mock('@/lib/db-indexes', () => ({
  ensureAppIndexes: vi.fn(),
}));

vi.mock('@/lib/cms', async () => {
  const checkoutContent = await vi.importActual<typeof import('@/data/checkoutContent')>('@/data/checkoutContent');
  return {
    getCheckoutContent: vi.fn(async () => checkoutContent.CHECKOUT_CONTENT_DEFAULTS),
  };
});

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: mocks.getClientIp,
}));

function makePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'buyer@example.com',
    blikCode: '123456',
    items: [
      {
        productId: 'prod-1',
        slug: 'arcana-pin',
        name: 'Stargater Pin',
        category: 'Pins',
        size: 'OS',
        price: 1500,
        priceDisplay: '€ 15',
        quantity: 1,
        imageUrl: '/pin.jpg',
      },
    ],
    shippingMethod: 'Poczta Polska',
    shippingMethodId: 'poczta-polska',
    shippingPrice: 0,
    shippingCarrier: 'poczta_polska',
    shippingService: 'poczta_polska_tracked',
    shippingAddress: {
      email: 'buyer@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      address: '1 Code Street',
      city: 'Warsaw',
      postcode: '00-001',
      country: 'Poland',
      phone: '+48123456789',
    },
    subtotal: 1500,
    total: 1500,
    ...overrides,
  };
}

function makeJsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/checkout/blik', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('BLIK checkout route', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.insertOne.mockReset();
    mocks.createPayUBlikOrder.mockReset();
    mocks.computeDiscount.mockReset();
    mocks.getEcommerceProductsDb.mockReset();
    mocks.findOrderProducts.mockReset();
    mocks.productProject.mockReset();
    mocks.productToArray.mockReset();
    mocks.checkRateLimit.mockReset();
    mocks.getClientIp.mockReset();

    mocks.getSession.mockResolvedValue(null);
    mocks.insertOne.mockResolvedValue({ insertedId: { toString: () => 'mongo-blik-id' } });
    mocks.createPayUBlikOrder.mockResolvedValue({ payuOrderId: 'PAYU-ORDER-123', statusCode: 'PENDING' });
    mocks.computeDiscount.mockReturnValue(0);
    mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
    mocks.getClientIp.mockReturnValue('127.0.0.1');
    mocks.findOrderProducts.mockReturnValue({ project: mocks.productProject });
    mocks.productProject.mockReturnValue({ toArray: mocks.productToArray });
    mocks.productToArray.mockResolvedValue([
      { _id: 'prod-1', price: 1500 },
    ]);
    mocks.getEcommerceProductsDb.mockResolvedValue({
      collection: () => ({
        find: mocks.findOrderProducts,
      }),
    });

    process.env.NEXT_PUBLIC_BASE_URL = 'https://shop.example.test';
    delete process.env.NEXT_PUBLIC_ECOM_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
  });

  it('creates order via PayU and persists with pending_payment status', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1' });

    const res = await POST(makeJsonRequest(makePayload()));
    const body = await res.json() as { orderId?: string; payuOrderId?: string; _id?: string };

    expect(res.status).toBe(201);
    expect(body._id).toBe('mongo-blik-id');
    expect(body.payuOrderId).toBe('PAYU-ORDER-123');
    expect(body.orderId).toMatch(/^ARC-\d{4}-[0-9A-F]{8}$/);

    expect(mocks.createPayUBlikOrder).toHaveBeenCalledWith(
      expect.objectContaining({ blikCode: '123456', totalAmount: 1500 }),
    );
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending_payment',
        payuOrderId: 'PAYU-ORDER-123',
        userId: 'user-1',
        email: 'buyer@example.com',
      }),
    );
  });

  it('rejects non-6-digit BLIK code', async () => {
    const res = await POST(makeJsonRequest(makePayload({ blikCode: '12345' })));

    expect(res.status).toBe(400);
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('rejects alphabetic BLIK code', async () => {
    const res = await POST(makeJsonRequest(makePayload({ blikCode: '12345X' })));

    expect(res.status).toBe(400);
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
  });

  it('rejects invalid email', async () => {
    const res = await POST(makeJsonRequest(makePayload({ email: 'not-an-email' })));

    expect(res.status).toBe(400);
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
  });

  it('rejects empty item list', async () => {
    const res = await POST(makeJsonRequest(makePayload({ items: [] })));

    expect(res.status).toBe(400);
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
  });

  it('requires a pickup point for InPost locker checkout', async () => {
    const res = await POST(makeJsonRequest(makePayload({
      shippingMethod: 'InPost Parcel Locker',
      shippingMethodId: 'inpost-locker',
      shippingPrice: 4,
      shippingCarrier: 'inpost',
      shippingService: 'inpost_locker_standard',
      total: 1504,
    })));

    expect(res.status).toBe(400);
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('persists InPost pickup point with pending payment order', async () => {
    const res = await POST(makeJsonRequest(makePayload({
      shippingMethod: 'InPost Parcel Locker',
      shippingMethodId: 'inpost-locker',
      shippingPrice: 4,
      shippingCarrier: 'inpost',
      shippingService: 'inpost_locker_standard',
      total: 1504,
      inpostPoint: {
        id: 'WAW01A',
        name: 'WAW01A',
        addressLine1: 'ul. Testowa 1',
      },
    })));

    expect(res.status).toBe(201);
    expect(mocks.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      shippingCarrier: 'inpost',
      shippingService: 'inpost_locker_standard',
      inpostPoint: expect.objectContaining({ id: 'WAW01A', name: 'WAW01A' }),
    }));
  });

  it.each([
    ['Poczta Polska', 'poczta-polska', 'poczta_polska', 'poczta_polska_tracked', 0, 1500],
    ['DPD Courier', 'dpd-courier', 'dpd', 'dpd_courier_standard', 10, 1510],
  ])('persists %s carrier metadata for BLIK checkout', async (
    shippingMethod,
    shippingMethodId,
    shippingCarrier,
    shippingService,
    shippingPrice,
    total,
  ) => {
    const res = await POST(makeJsonRequest(makePayload({
      shippingMethod,
      shippingMethodId,
      shippingCarrier,
      shippingService,
      shippingPrice,
      total,
    })));

    expect(res.status).toBe(201);
    expect(mocks.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      shippingMethod,
      shippingCarrier,
      shippingService,
      shippingPrice,
      total,
    }));
  });

  it('rejects manipulated BLIK shipping prices before PayU order creation', async () => {
    const res = await POST(makeJsonRequest(makePayload({
      shippingMethod: 'DPD Courier',
      shippingMethodId: 'dpd-courier',
      shippingCarrier: 'dpd',
      shippingService: 'dpd_courier_standard',
      shippingPrice: 0,
      total: 1500,
    })));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe('Shipping price is invalid.');
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('returns 422 when PayU rejects the BLIK code', async () => {
    mocks.createPayUBlikOrder.mockRejectedValue(new Error('ERROR_VALUE_INVALID: BLIK code invalid'));

    const res = await POST(makeJsonRequest(makePayload()));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/BLIK/i);
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('returns 502 on PayU gateway error', async () => {
    mocks.createPayUBlikOrder.mockRejectedValue(new Error('PayU order failed: 503'));

    const res = await POST(makeJsonRequest(makePayload()));

    expect(res.status).toBe(502);
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('applies server-side promo discount, ignoring any client-supplied discount', async () => {
    mocks.computeDiscount.mockReturnValue(150);

    const res = await POST(makeJsonRequest(makePayload({ promoCode: 'ARCANA10', discount: 9999, total: 1350 })));

    expect(res.status).toBe(201);
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ discount: 150, promoCode: 'ARCANA10' }),
    );
  });

  it('uses a server-side fixed discount and validates BLIK totals', async () => {
    const payload = makePayload();
    const items = [...payload.items as Array<Record<string, unknown>>];
    items[0] = { ...items[0], price: 1500, quantity: 2 };

    mocks.computeDiscount.mockReturnValue(500);
    const res = await POST(makeJsonRequest({
      ...payload,
      items,
      subtotal: 3000,
      promoCode: 'fixed15',
      total: 2500,
    }));

    expect(res.status).toBe(201);
    expect(mocks.createPayUBlikOrder).toHaveBeenCalled();
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        discount: 500,
        promoCode: 'FIXED15',
        subtotal: 3000,
        total: 2500,
      }),
    );
  });

  it('rejects BLIK checkout when a fixed discount total is invalid', async () => {
    const payload = makePayload();
    const items = [...payload.items as Array<Record<string, unknown>>];
    items[0] = { ...items[0], price: 1500, quantity: 2 };

    mocks.computeDiscount.mockReturnValue(500);
    const res = await POST(makeJsonRequest({
      ...payload,
      items,
      subtotal: 3000,
      promoCode: 'fixed15',
      total: 2600,
    }));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Order totals are invalid.' });
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('requires webhook callback base URL configuration', async () => {
    const previousEnv = {
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      NEXT_PUBLIC_ECOM_URL: process.env.NEXT_PUBLIC_ECOM_URL,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      VERCEL_URL: process.env.VERCEL_URL,
    };

    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.NEXT_PUBLIC_ECOM_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;

    try {
      const res = await POST(makeJsonRequest(makePayload()));
      const body = await res.json() as { error?: string };

      expect(res.status).toBe(500);
      expect(body.error).toContain('Payment callback URL is not configured');
      expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
      expect(mocks.insertOne).not.toHaveBeenCalled();
    } finally {
      if (previousEnv.NEXT_PUBLIC_BASE_URL === undefined) {
        delete process.env.NEXT_PUBLIC_BASE_URL;
      } else {
        process.env.NEXT_PUBLIC_BASE_URL = previousEnv.NEXT_PUBLIC_BASE_URL;
      }
      if (previousEnv.NEXT_PUBLIC_ECOM_URL === undefined) {
        delete process.env.NEXT_PUBLIC_ECOM_URL;
      } else {
        process.env.NEXT_PUBLIC_ECOM_URL = previousEnv.NEXT_PUBLIC_ECOM_URL;
      }
      if (previousEnv.VERCEL_PROJECT_PRODUCTION_URL === undefined) {
        delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      } else {
        process.env.VERCEL_PROJECT_PRODUCTION_URL = previousEnv.VERCEL_PROJECT_PRODUCTION_URL;
      }
      if (previousEnv.VERCEL_URL === undefined) {
        delete process.env.VERCEL_URL;
      } else {
        process.env.VERCEL_URL = previousEnv.VERCEL_URL;
      }
    }
  });

  it('rejects an order when client totals follow a manipulated item price', async () => {
    const [item] = makePayload().items as [Record<string, unknown>];
    const res = await POST(makeJsonRequest(makePayload({ items: [{ ...item, price: 1200 }], subtotal: 1200, total: 1200 })));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe('Order totals are invalid.');
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('rejects BLIK checkout when canonical item currencies are mixed', async () => {
    mocks.productToArray.mockResolvedValueOnce([
      { _id: 'prod-1', price: 1500, priceCurrencyCode: 'EUR' },
      { _id: 'prod-2', price: 500, priceCurrencyCode: 'PLN' },
    ]);

    const payload = makePayload();
    const [baseItem] = payload.items as Array<Record<string, unknown>>;
    const items = [
      { ...baseItem, productId: 'prod-1', price: 1500, quantity: 1 },
      { ...baseItem, productId: 'prod-2', slug: 'moon-pin', name: 'Moon Pin', price: 500, quantity: 1 },
    ];

    const res = await POST(makeJsonRequest({
      ...payload,
      items,
      subtotal: 2000,
      total: 2000,
    }));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe('Order item currencies are invalid.');
    expect(mocks.computeDiscount).not.toHaveBeenCalled();
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });
});
