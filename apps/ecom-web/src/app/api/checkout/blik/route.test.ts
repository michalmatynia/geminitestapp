/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  insertOne: vi.fn(),
  updateOne: vi.fn(),
  createPayUBlikOrder: vi.fn(),
  computeDiscount: vi.fn(),
  getEcommerceProductsDb: vi.fn(),
  findOrderProducts: vi.fn(),
  productProject: vi.fn(),
  productToArray: vi.fn(),
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
  readPaymentProviderAvailability: vi.fn(),
  readShippingProviderAvailability: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({ insertOne: mocks.insertOne, updateOne: mocks.updateOne }),
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

vi.mock('@/lib/providerSettings', () => ({
  readPaymentProviderAvailability: mocks.readPaymentProviderAvailability,
  readShippingProviderAvailability: mocks.readShippingProviderAvailability,
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
        price: 15,
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
    subtotal: 15,
    total: 15,
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
    mocks.updateOne.mockReset();
    mocks.createPayUBlikOrder.mockReset();
    mocks.computeDiscount.mockReset();
    mocks.getEcommerceProductsDb.mockReset();
    mocks.findOrderProducts.mockReset();
    mocks.productProject.mockReset();
    mocks.productToArray.mockReset();
    mocks.checkRateLimit.mockReset();
    mocks.getClientIp.mockReset();
    mocks.readPaymentProviderAvailability.mockReset();
    mocks.readShippingProviderAvailability.mockReset();

    mocks.getSession.mockResolvedValue(null);
    mocks.insertOne.mockResolvedValue({ insertedId: { toString: () => 'mongo-blik-id' } });
    mocks.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    mocks.createPayUBlikOrder.mockResolvedValue({ payuOrderId: 'PAYU-ORDER-123', statusCode: 'PENDING' });
    mocks.computeDiscount.mockReturnValue(0);
    mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
    mocks.getClientIp.mockReturnValue('127.0.0.1');
    mocks.readPaymentProviderAvailability.mockResolvedValue({});
    mocks.readShippingProviderAvailability.mockResolvedValue({});
    mocks.findOrderProducts.mockReturnValue({ project: mocks.productProject });
    mocks.productProject.mockReturnValue({ toArray: mocks.productToArray });
    mocks.productToArray.mockResolvedValue([
      { _id: 'prod-1', price: 15 },
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

    expect(mocks.insertOne.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createPayUBlikOrder.mock.invocationCallOrder[0],
    );
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending_payment',
        userId: 'user-1',
        email: 'buyer@example.com',
      }),
    );
    expect(mocks.createPayUBlikOrder).toHaveBeenCalledWith(
      expect.objectContaining({ blikCode: '123456', totalAmount: 1500, extOrderId: body.orderId }),
    );
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { orderId: body.orderId },
      { $set: { payuOrderId: 'PAYU-ORDER-123' } },
    );
  });

  it('returns the local order when attaching payuOrderId fails after PayU accepts', async () => {
    mocks.updateOne.mockRejectedValueOnce(new Error('temporary write failure'));

    const res = await POST(makeJsonRequest(makePayload()));
    const body = await res.json() as { orderId?: string; payuOrderId?: string; _id?: string };

    expect(res.status).toBe(201);
    expect(body._id).toBe('mongo-blik-id');
    expect(body.payuOrderId).toBe('PAYU-ORDER-123');
    expect(body.orderId).toMatch(/^ARC-\d{4}-[0-9A-F]{8}$/);
    expect(mocks.createPayUBlikOrder).toHaveBeenCalledWith(
      expect.objectContaining({ extOrderId: body.orderId }),
    );
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { orderId: body.orderId },
      { $set: { payuOrderId: 'PAYU-ORDER-123' } },
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

  it('accepts an order when phone is omitted from the shipping address', async () => {
    const payload = makePayload();
    const shippingAddress = { ...payload.shippingAddress as Record<string, unknown> };
    delete shippingAddress.phone;

    const res = await POST(makeJsonRequest({ ...payload, shippingAddress }));

    expect(res.status).toBe(201);
    expect(mocks.createPayUBlikOrder).toHaveBeenCalled();
    expect(mocks.insertOne).toHaveBeenCalled();
  });

  it('rejects incomplete shipping addresses without throwing', async () => {
    const payload = makePayload();
    const shippingAddress = { ...payload.shippingAddress as Record<string, unknown> };
    delete shippingAddress.city;

    const res = await POST(makeJsonRequest(makePayload({ shippingAddress })));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe('A complete shipping address is required');
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
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
      total: 19,
    })));

    expect(res.status).toBe(400);
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('rejects unsafe InPost pickup point codes', async () => {
    const res = await POST(makeJsonRequest(makePayload({
      shippingMethod: 'InPost Parcel Locker',
      shippingMethodId: 'inpost-locker',
      shippingPrice: 4,
      shippingCarrier: 'inpost',
      shippingService: 'inpost_locker_standard',
      total: 19,
      inpostPoint: { id: '<script>', name: '<script>' },
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
      total: 19,
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
    ['Poczta Polska', 'poczta-polska', 'poczta_polska', 'poczta_polska_tracked', 0, 15],
    ['DPD Courier', 'dpd-courier', 'dpd', 'dpd_courier_standard', 10, 25],
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
      total: 15,
    })));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe('Shipping price is invalid.');
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('rejects checkout shipping methods disabled by provider settings', async () => {
    mocks.readShippingProviderAvailability.mockResolvedValue({ dpd: false });

    const res = await POST(makeJsonRequest(makePayload({
      shippingMethod: 'DPD Courier',
      shippingMethodId: 'dpd-courier',
      shippingCarrier: 'dpd',
      shippingService: 'dpd_courier_standard',
      shippingPrice: 10,
      total: 25,
    })));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe('Selected shipping method is not available for this address.');
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('rejects checkout before creating an order when PayU is disabled by provider settings', async () => {
    mocks.readPaymentProviderAvailability.mockResolvedValue({ payu: false });

    const res = await POST(makeJsonRequest(makePayload()));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(503);
    expect(body.error).toBe('BLIK payment is temporarily unavailable.');
    expect(mocks.findOrderProducts).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
  });

  it('returns 422 when PayU rejects the BLIK code', async () => {
    mocks.createPayUBlikOrder.mockRejectedValue(new Error('ERROR_VALUE_INVALID: BLIK code invalid'));

    const res = await POST(makeJsonRequest(makePayload()));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/BLIK/i);
    expect(mocks.insertOne).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending_payment' }));
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { orderId: expect.stringMatching(/^ARC-\d{4}-[0-9A-F]{8}$/), status: 'pending_payment' },
      { $set: { status: 'cancelled' } },
    );
  });

  it('returns 502 on PayU gateway error', async () => {
    mocks.createPayUBlikOrder.mockRejectedValue(new Error('PayU order failed: 503'));

    const res = await POST(makeJsonRequest(makePayload()));

    expect(res.status).toBe(502);
    expect(mocks.insertOne).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending_payment' }));
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { orderId: expect.stringMatching(/^ARC-\d{4}-[0-9A-F]{8}$/), status: 'pending_payment' },
      { $set: { status: 'cancelled' } },
    );
  });

  it('applies server-side promo discount, ignoring any client-supplied discount', async () => {
    mocks.computeDiscount.mockReturnValue(1.5);

    const res = await POST(makeJsonRequest(makePayload({ promoCode: 'ARCANA10', discount: 9999, total: 13.5 })));

    expect(res.status).toBe(201);
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ discount: 1.5, promoCode: 'ARCANA10' }),
    );
  });

  it('uses a server-side fixed discount and validates BLIK totals', async () => {
    const payload = makePayload();
    const items = [...payload.items as Array<Record<string, unknown>>];
    items[0] = { ...items[0], price: 15, quantity: 2 };

    mocks.computeDiscount.mockReturnValue(5);
    const res = await POST(makeJsonRequest({
      ...payload,
      items,
      subtotal: 30,
      promoCode: 'fixed15',
      total: 25,
    }));

    expect(res.status).toBe(201);
    expect(mocks.createPayUBlikOrder).toHaveBeenCalled();
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        discount: 5,
        promoCode: 'FIXED15',
        subtotal: 30,
        total: 25,
      }),
    );
  });

  it('rejects BLIK checkout when a fixed discount total is invalid', async () => {
    const payload = makePayload();
    const items = [...payload.items as Array<Record<string, unknown>>];
    items[0] = { ...items[0], price: 15, quantity: 2 };

    mocks.computeDiscount.mockReturnValue(5);
    const res = await POST(makeJsonRequest({
      ...payload,
      items,
      subtotal: 30,
      promoCode: 'fixed15',
      total: 26,
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
    const res = await POST(makeJsonRequest(makePayload({ items: [{ ...item, price: 12 }], subtotal: 12, total: 12 })));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe('Order totals are invalid.');
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('rejects BLIK checkout when canonical item currencies are mixed', async () => {
    mocks.productToArray.mockResolvedValueOnce([
      { _id: 'prod-1', price: 15, priceCurrencyCode: 'EUR' },
      { _id: 'prod-2', price: 5, priceCurrencyCode: 'PLN' },
    ]);

    const payload = makePayload();
    const [baseItem] = payload.items as Array<Record<string, unknown>>;
    const items = [
      { ...baseItem, productId: 'prod-1', price: 15, quantity: 1 },
      { ...baseItem, productId: 'prod-2', slug: 'moon-pin', name: 'Moon Pin', price: 5, quantity: 1 },
    ];

    const res = await POST(makeJsonRequest({
      ...payload,
      items,
      subtotal: 20,
      total: 20,
    }));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe('Order item currencies are invalid.');
    expect(mocks.computeDiscount).not.toHaveBeenCalled();
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });
});
