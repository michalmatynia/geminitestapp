/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  insertOne: vi.fn(),
  updateOne: vi.fn(),
  createStripePaymentIntent: vi.fn(),
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

vi.mock('@/lib/stripe', () => ({
  createStripePaymentIntent: mocks.createStripePaymentIntent,
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
    orderId: 'ARC-2026-DEADBEEF',
    userId: undefined,
    email: 'buyer@example.com',
    pricedItems: [
      {
        productId: 'prod-1',
        slug: 'arcana-pin',
        name: 'Stargater Pin',
        category: 'Pins',
        size: 'OS',
        price: 15,
        priceDisplay: '€ 15',
        currencyCode: 'EUR',
        quantity: 1,
        imageUrl: '/pin.jpg',
      },
    ],
    shippingSelection: {
      shippingMethod: 'Standard',
      shippingMethodId: 'standard',
      shippingPrice: 0,
      shippingCarrier: 'manual',
      shippingService: 'manual',
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
    subtotal: 15,
    discount: 0,
    promoCode: undefined,
    total: 15,
    currencyCode: 'EUR',
    baseUrl: 'https://shop.example.test',
    ...overrides,
  };
}

function makeJsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/checkout/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('Stripe checkout route', () => {
  beforeEach(() => {
    mocks.insertOne.mockReset();
    mocks.updateOne.mockReset();
    mocks.createStripePaymentIntent.mockReset();
    mocks.checkRateLimit.mockReset();
    mocks.getClientIp.mockReset();
    mocks.readPaymentProviderAvailability.mockReset();
    mocks.buildValidatedCheckoutOrder.mockReset();

    mocks.insertOne.mockResolvedValue({ insertedId: { toString: () => 'mongo-stripe-id' } });
    mocks.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    mocks.createStripePaymentIntent.mockResolvedValue({
      paymentIntentId: 'pi_test_123',
      clientSecret: 'pi_test_123_secret_abc',
      publishableKey: 'pk_test_xxx',
    });
    mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
    mocks.getClientIp.mockReturnValue('127.0.0.1');
    mocks.readPaymentProviderAvailability.mockResolvedValue({ stripe: true });
    mocks.buildValidatedCheckoutOrder.mockResolvedValue({ ok: true, order: makeValidatedOrder() });
  });

  it('creates PaymentIntent and order with pending_payment status', async () => {
    const res = await POST(makeJsonRequest({ email: 'buyer@example.com', items: [] }));
    const body = await res.json() as { orderId?: string; clientSecret?: string; publishableKey?: string; _id?: string };

    expect(res.status).toBe(201);
    expect(body.orderId).toBe('ARC-2026-DEADBEEF');
    expect(body.clientSecret).toBe('pi_test_123_secret_abc');
    expect(body.publishableKey).toBe('pk_test_xxx');
    expect(body._id).toBe('mongo-stripe-id');

    expect(mocks.insertOne.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createStripePaymentIntent.mock.invocationCallOrder[0],
    );
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'ARC-2026-DEADBEEF',
        status: 'pending_payment',
        paymentMethod: 'stripe',
        email: 'buyer@example.com',
      }),
    );
    expect(mocks.createStripePaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1500, currency: 'EUR', extOrderId: 'ARC-2026-DEADBEEF' }),
    );
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { orderId: 'ARC-2026-DEADBEEF' },
      { $set: { stripePaymentIntentId: 'pi_test_123' } },
    );
  });

  it('includes userId in the order document when a session is present', async () => {
    mocks.buildValidatedCheckoutOrder.mockResolvedValue({ ok: true, order: makeValidatedOrder({ userId: 'user-42' }) });

    const res = await POST(makeJsonRequest({ email: 'buyer@example.com', items: [] }));

    expect(res.status).toBe(201);
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-42' }),
    );
  });

  it('omits userId when the user is a guest', async () => {
    const res = await POST(makeJsonRequest({ email: 'buyer@example.com', items: [] }));

    expect(res.status).toBe(201);
    const insertArg = mocks.insertOne.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(insertArg)).not.toContain('userId');
  });

  it('returns 503 when Stripe is disabled in provider settings', async () => {
    mocks.readPaymentProviderAvailability.mockResolvedValue({ stripe: false });

    const res = await POST(makeJsonRequest({ email: 'buyer@example.com', items: [] }));

    expect(res.status).toBe(503);
    expect(mocks.buildValidatedCheckoutOrder).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mocks.checkRateLimit.mockReturnValue({ allowed: false, retryAfterSec: 60 });

    const res = await POST(makeJsonRequest({ email: 'buyer@example.com', items: [] }));

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('returns 400 when checkout-order validation fails', async () => {
    mocks.buildValidatedCheckoutOrder.mockResolvedValue({ ok: false, error: 'A valid email is required', status: 400 });

    const res = await POST(makeJsonRequest({ email: 'bad' }));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe('A valid email is required');
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('returns 400 for non-object request body', async () => {
    const req = new Request('http://localhost/api/checkout/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '"just-a-string"',
    }) as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('cancels the order and returns 502 when Stripe rejects the PaymentIntent', async () => {
    mocks.createStripePaymentIntent.mockRejectedValue(new Error('Your card was declined.'));

    const res = await POST(makeJsonRequest({ email: 'buyer@example.com', items: [] }));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(502);
    expect(body.error).toBe('Your card was declined.');
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { orderId: 'ARC-2026-DEADBEEF', status: 'pending_payment' },
      { $set: { status: 'cancelled' } },
    );
  });

  it('returns the order even when attaching stripePaymentIntentId fails', async () => {
    mocks.updateOne.mockRejectedValueOnce(new Error('transient write error'));

    const res = await POST(makeJsonRequest({ email: 'buyer@example.com', items: [] }));

    expect(res.status).toBe(201);
  });
});
