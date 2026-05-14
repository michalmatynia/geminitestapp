/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  insertOne: vi.fn(),
  updateOne: vi.fn(),
  createPayPalOrder: vi.fn(),
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
  readPaymentProviderAvailability: vi.fn(),
  buildValidatedCheckoutOrder: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({ insertOne: mocks.insertOne, updateOne: mocks.updateOne }),
  })),
}));

vi.mock('@/lib/paypal', () => ({
  createPayPalOrder: mocks.createPayPalOrder,
}));

vi.mock('@/lib/db-indexes', () => ({
  ensureAppIndexes: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: mocks.getClientIp,
}));

vi.mock('@/lib/providerSettings', () => ({
  readPaymentProviderAvailability: mocks.readPaymentProviderAvailability,
}));

vi.mock('@/lib/checkout-order', () => ({
  buildValidatedCheckoutOrder: mocks.buildValidatedCheckoutOrder,
  isRecord: (value: unknown) => typeof value === 'object' && value !== null && !Array.isArray(value),
  toMinorCurrencyUnit: (amount: number) => Math.round(amount * 100),
}));

import { POST } from './route';

function makeValidatedOrder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    orderId: 'ARC-2026-AABBCCDD',
    userId: undefined,
    email: 'buyer@example.com',
    pricedItems: [
      {
        productId: 'prod-2',
        slug: 'stargater-tee',
        name: 'Stargater Tee',
        category: 'Clothing',
        size: 'M',
        price: 25,
        priceDisplay: '€ 25',
        currencyCode: 'EUR',
        quantity: 2,
        imageUrl: '/tee.jpg',
      },
    ],
    shippingSelection: {
      shippingMethod: 'Express',
      shippingMethodId: 'express',
      shippingPrice: 10,
      shippingCarrier: 'dpd',
      shippingService: 'dpd_express',
    },
    shippingAddress: {
      email: 'buyer@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      address: '1 Code Street',
      city: 'Warsaw',
      postcode: '00-001',
      country: 'Poland',
    },
    inpostPoint: null,
    subtotal: 50,
    discount: 0,
    promoCode: undefined,
    total: 60,
    currencyCode: 'EUR',
    baseUrl: 'https://shop.example.test',
    ...overrides,
  };
}

function makeJsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/checkout/paypal/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('PayPal create order route', () => {
  beforeEach(() => {
    mocks.insertOne.mockReset();
    mocks.updateOne.mockReset();
    mocks.createPayPalOrder.mockReset();
    mocks.checkRateLimit.mockReset();
    mocks.getClientIp.mockReset();
    mocks.readPaymentProviderAvailability.mockReset();
    mocks.buildValidatedCheckoutOrder.mockReset();

    mocks.insertOne.mockResolvedValue({ insertedId: { toString: () => 'mongo-paypal-id' } });
    mocks.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    mocks.createPayPalOrder.mockResolvedValue({
      paypalOrderId: 'PP-ORDER-ABC123',
      approveUrl: 'https://www.paypal.com/checkoutnow?token=PP-ORDER-ABC123',
    });
    mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
    mocks.getClientIp.mockReturnValue('127.0.0.1');
    mocks.readPaymentProviderAvailability.mockResolvedValue({ paypal: true });
    mocks.buildValidatedCheckoutOrder.mockResolvedValue({ ok: true, order: makeValidatedOrder() });
  });

  it('creates PayPal order and persists with pending_payment status', async () => {
    const res = await POST(makeJsonRequest({ email: 'buyer@example.com', items: [] }));
    const body = await res.json() as { orderId?: string; paypalOrderId?: string; _id?: string };

    expect(res.status).toBe(201);
    expect(body.orderId).toBe('ARC-2026-AABBCCDD');
    expect(body.paypalOrderId).toBe('PP-ORDER-ABC123');
    expect(body._id).toBe('mongo-paypal-id');

    expect(mocks.insertOne.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createPayPalOrder.mock.invocationCallOrder[0],
    );
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'ARC-2026-AABBCCDD',
        status: 'pending_payment',
        paymentMethod: 'paypal',
        email: 'buyer@example.com',
        total: 60,
        shippingPrice: 10,
      }),
    );
    expect(mocks.createPayPalOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 6000,
        currency: 'EUR',
        extOrderId: 'ARC-2026-AABBCCDD',
        returnUrl: expect.stringContaining('/checkout'),
        cancelUrl: expect.stringContaining('/checkout'),
      }),
    );
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { orderId: 'ARC-2026-AABBCCDD' },
      { $set: { paypalOrderId: 'PP-ORDER-ABC123' } },
    );
  });

  it('includes userId in order when session is present', async () => {
    mocks.buildValidatedCheckoutOrder.mockResolvedValue({
      ok: true,
      order: makeValidatedOrder({ userId: 'user-77' }),
    });

    const res = await POST(makeJsonRequest({ email: 'buyer@example.com', items: [] }));

    expect(res.status).toBe(201);
    expect(mocks.insertOne).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-77' }));
  });

  it('returns 503 when PayPal is disabled', async () => {
    mocks.readPaymentProviderAvailability.mockResolvedValue({ paypal: false });

    const res = await POST(makeJsonRequest({ email: 'buyer@example.com', items: [] }));

    expect(res.status).toBe(503);
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mocks.checkRateLimit.mockReturnValue({ allowed: false, retryAfterSec: 45 });

    const res = await POST(makeJsonRequest({ email: 'buyer@example.com', items: [] }));

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('45');
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('returns 400 for non-object body', async () => {
    const req = new Request('http://localhost/api/checkout/paypal/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'null',
    }) as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('cancels the order and returns 502 when PayPal rejects order creation', async () => {
    mocks.createPayPalOrder.mockRejectedValue(new Error('INSTRUMENT_DECLINED'));

    const res = await POST(makeJsonRequest({ email: 'buyer@example.com', items: [] }));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(502);
    expect(body.error).toBe('INSTRUMENT_DECLINED');
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { orderId: 'ARC-2026-AABBCCDD', status: 'pending_payment' },
      { $set: { status: 'cancelled' } },
    );
  });

  it('still returns the order when attaching paypalOrderId fails', async () => {
    mocks.updateOne.mockRejectedValueOnce(new Error('transient write error'));

    const res = await POST(makeJsonRequest({ email: 'buyer@example.com', items: [] }));

    expect(res.status).toBe(201);
  });
});
