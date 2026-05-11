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
}));

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({ insertOne: mocks.insertOne }),
  })),
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
    shippingMethod: 'Standard',
    shippingPrice: 0,
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

    mocks.getSession.mockResolvedValue(null);
    mocks.insertOne.mockResolvedValue({ insertedId: { toString: () => 'mongo-blik-id' } });
    mocks.createPayUBlikOrder.mockResolvedValue({ payuOrderId: 'PAYU-ORDER-123', statusCode: 'PENDING' });
    mocks.computeDiscount.mockReturnValue(0);
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
      shippingCarrier: 'inpost',
      shippingService: 'inpost_locker_standard',
    })));

    expect(res.status).toBe(400);
    expect(mocks.createPayUBlikOrder).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('persists InPost pickup point with pending payment order', async () => {
    const res = await POST(makeJsonRequest(makePayload({
      shippingMethod: 'InPost Parcel Locker',
      shippingCarrier: 'inpost',
      shippingService: 'inpost_locker_standard',
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

    const res = await POST(makeJsonRequest(makePayload({ promoCode: 'ARCANA10', discount: 9999 })));

    expect(res.status).toBe(201);
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ discount: 150, promoCode: 'ARCANA10' }),
    );
  });
});
