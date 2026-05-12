/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

import { POST } from './route';
import { GET as getMyOrders } from './me/route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  sendOrderConfirmation: vi.fn(),
  fulfillInpostOrder: vi.fn(),
  insertOne: vi.fn(),
  find: vi.fn(),
  sort: vi.fn(),
  toArray: vi.fn(),
  getEcommerceProductsDb: vi.fn(),
  findOrderProducts: vi.fn(),
  findDiscount: vi.fn(),
  productProject: vi.fn(),
  productToArray: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/email', () => ({
  sendOrderConfirmation: mocks.sendOrderConfirmation,
}));

vi.mock('@/lib/inpost', () => ({
  fulfillInpostOrder: mocks.fulfillInpostOrder,
}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({
      insertOne: mocks.insertOne,
      find: mocks.find,
    }),
  })),
  getEcommerceProductsDb: mocks.getEcommerceProductsDb,
}));

function makeOrderPayload(): Record<string, unknown> {
  return {
    email: 'Buyer@Example.com',
    items: [
      {
        productId: 'prod-1',
        slug: 'arcana-pin',
        name: 'Stargater Pin',
        category: 'Pins',
        size: 'OS',
        price: 15,
        priceDisplay: '€ 15',
        quantity: 2,
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
    subtotal: 30,
    discount: 0,
    total: 30,
  };
}

function makeJsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

const mockEcommerceDiscountLookup = (
  code: string,
  doc: Record<string, unknown> | null
): void => {
  mocks.findDiscount.mockImplementation(async ({ code: query }: { code: string }) => {
    if (query === code) return doc;
    return null;
  });
};

describe('orders API', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.sendOrderConfirmation.mockReset();
    mocks.fulfillInpostOrder.mockReset();
    mocks.insertOne.mockReset();
    mocks.find.mockReset();
    mocks.sort.mockReset();
    mocks.toArray.mockReset();
    mocks.getEcommerceProductsDb.mockReset();
    mocks.findOrderProducts.mockReset();
    mocks.findDiscount.mockReset();
    mocks.productProject.mockReset();
    mocks.productToArray.mockReset();
    mocks.getSession.mockResolvedValue(null);
    mocks.sendOrderConfirmation.mockResolvedValue(undefined);
    mocks.fulfillInpostOrder.mockResolvedValue(null);
    mocks.insertOne.mockResolvedValue({ insertedId: { toString: () => 'mongo-order-id' } });
    mocks.sort.mockReturnValue({ toArray: mocks.toArray });
    mocks.find.mockReturnValue({ sort: mocks.sort });
    mocks.toArray.mockResolvedValue([]);
    mocks.findOrderProducts.mockReturnValue({ project: mocks.productProject });
    mocks.productProject.mockReturnValue({ toArray: mocks.productToArray });
    mocks.findDiscount.mockResolvedValue(null);
    mocks.productToArray.mockResolvedValue([
      { _id: 'prod-1', price: 15 },
    ]);
    mocks.getEcommerceProductsDb.mockResolvedValue({
      collection: () => ({
        find: mocks.findOrderProducts,
      }),
    });
  });

  it('uses a fixed discount from the ecommerce database when creating an order', async () => {
    mockEcommerceDiscountLookup('FIXED15', {
      code: 'FIXED15',
      enabled: true,
      discountType: 'fixed',
      value: 500,
      startsAt: null,
      endsAt: null,
      minOrderAmount: null,
      usageLimit: null,
      singleUse: false,
    });

    mocks.getEcommerceProductsDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'ecom_discounts') return { findOne: mocks.findDiscount };
        return {
          find: mocks.findOrderProducts,
        };
      },
    });

    mocks.productToArray.mockResolvedValueOnce([{ _id: 'prod-1', price: 1500 }]);
    const payload = makeOrderPayload();
    const items = [...payload.items as Array<Record<string, unknown>>];
    items[0] = { ...items[0], price: 1500, quantity: 2 };

    const response = await POST(makeJsonRequest({
      ...payload,
      items,
      subtotal: 3000,
      promoCode: 'fixed15',
      discount: 999,
      total: 2500,
    }));

    expect(response.status).toBe(201);
    expect(mocks.findDiscount).toHaveBeenCalledWith({ code: 'FIXED15' });
    expect(mocks.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      promoCode: 'FIXED15',
      discount: 500,
      subtotal: 3000,
      total: 2500,
    }));
  });

  it('normalizes and uppercases a spaced fixed discount code during checkout validation', async () => {
    mockEcommerceDiscountLookup('FIXED15', {
      code: 'FIXED15',
      enabled: true,
      discountType: 'fixed',
      value: 500,
      startsAt: null,
      endsAt: null,
      minOrderAmount: null,
      usageLimit: null,
      singleUse: false,
    });

    mocks.getEcommerceProductsDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'ecom_discounts') return { findOne: mocks.findDiscount };
        return {
          find: mocks.findOrderProducts,
        };
      },
    });

    mocks.productToArray.mockResolvedValueOnce([{ _id: 'prod-1', price: 1500 }]);
    const payload = makeOrderPayload();
    const items = [...payload.items as Array<Record<string, unknown>>];
    items[0] = { ...items[0], price: 1500, quantity: 2 };

    const response = await POST(makeJsonRequest({
      ...payload,
      items,
      subtotal: 3000,
      promoCode: 'FIX ED15',
      discount: 999,
      total: 2500,
    }));

    expect(response.status).toBe(201);
    expect(mocks.findDiscount).toHaveBeenCalledWith({ code: 'FIXED15' });
    expect(mocks.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      promoCode: 'FIXED15',
      discount: 500,
      subtotal: 3000,
      total: 2500,
    }));
  });

  it('rejects order totals that do not match a DB-backed fixed discount', async () => {
    mockEcommerceDiscountLookup('FIXED15', {
      code: 'FIXED15',
      enabled: true,
      discountType: 'fixed',
      value: 500,
      startsAt: null,
      endsAt: null,
      minOrderAmount: null,
      usageLimit: null,
      singleUse: false,
    });

    mocks.getEcommerceProductsDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'ecom_discounts') return { findOne: mocks.findDiscount };
        return {
          find: mocks.findOrderProducts,
        };
      },
    });

    mocks.productToArray.mockResolvedValueOnce([{ _id: 'prod-1', price: 1500 }]);
    const payload = makeOrderPayload();
    const items = [...payload.items as Array<Record<string, unknown>>];
    items[0] = { ...items[0], price: 1500, quantity: 2 };

    const response = await POST(makeJsonRequest({
      ...payload,
      items,
      subtotal: 3000,
      promoCode: 'FIXED15',
      discount: 0,
      total: 2600,
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Order totals are invalid.' });
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('creates an order, persists it, and queues confirmation email', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1' });

    const response = await POST(makeJsonRequest(makeOrderPayload()));
    const body = await response.json() as { orderId?: string; _id?: string };

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ _id: 'mongo-order-id' });
    expect(body.orderId).toMatch(/^ARC-\d{4}-[0-9A-F]{8}$/);
    expect(mocks.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      email: 'buyer@example.com',
      status: 'processing',
      shippingMethod: 'Standard',
      subtotal: 30,
      total: 30,
    }));
    expect(mocks.sendOrderConfirmation).toHaveBeenCalledWith(expect.objectContaining({
      _id: 'mongo-order-id',
      email: 'buyer@example.com',
    }));
    expect(mocks.fulfillInpostOrder).toHaveBeenCalledWith(expect.objectContaining({
      shippingCarrier: 'manual',
    }));
  });

  it('rejects an order when client item price is manipulated', async () => {
    const payload = makeOrderPayload();
    const items = [...payload.items as Array<Record<string, unknown>>];
    items[0] = { ...items[0], price: 10 };

    const response = await POST(makeJsonRequest({ ...payload, items }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Order items are invalid.' });
    expect(mocks.insertOne).not.toHaveBeenCalled();
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('requires a pickup point for InPost orders', async () => {
    const response = await POST(makeJsonRequest({
      ...makeOrderPayload(),
      shippingCarrier: 'inpost',
      shippingService: 'inpost_locker_standard',
    }));

    expect(response.status).toBe(400);
    expect(mocks.insertOne).not.toHaveBeenCalled();
    expect(mocks.fulfillInpostOrder).not.toHaveBeenCalled();
  });

  it('persists sanitized InPost pickup point metadata', async () => {
    const response = await POST(makeJsonRequest({
      ...makeOrderPayload(),
      shippingMethod: 'InPost Parcel Locker',
      shippingCarrier: 'inpost',
      shippingService: 'inpost_locker_standard',
      inpostPoint: {
        id: 'WAW01A',
        name: 'WAW01A',
        addressLine1: 'ul. Testowa 1',
        city: 'Warsaw',
        postCode: '00-001',
        ignored: '<script>',
      },
    }));

    expect(response.status).toBe(201);
    expect(mocks.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      shippingCarrier: 'inpost',
      shippingService: 'inpost_locker_standard',
      inpostPoint: {
        id: 'WAW01A',
        name: 'WAW01A',
        addressLine1: 'ul. Testowa 1',
        addressLine2: undefined,
        city: 'Warsaw',
        description: undefined,
        latitude: undefined,
        longitude: undefined,
        postCode: '00-001',
      },
    }));
  });

  it('rejects invalid order payloads before persistence', async () => {
    const response = await POST(makeJsonRequest({ ...makeOrderPayload(), email: 'bad-email' }));

    expect(response.status).toBe(400);
    expect(mocks.insertOne).not.toHaveBeenCalled();
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('returns authenticated user order history sorted newest first', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1' });
    mocks.toArray.mockResolvedValue([
      {
        _id: { toString: () => 'mongo-order-id' },
        orderId: 'ARC-2026-1234',
        userId: 'user-1',
        email: 'buyer@example.com',
        status: 'processing',
        items: [],
        shippingMethod: 'Standard',
        shippingPrice: 0,
        shippingAddress: {},
        subtotal: 30,
        discount: 0,
        total: 30,
        createdAt: '2026-05-08T12:00:00.000Z',
      },
    ]);

    const response = await getMyOrders();
    const body = await response.json() as Array<{ _id?: string; orderId?: string }>;

    expect(response.status).toBe(200);
    expect(mocks.find).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(mocks.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(body[0]).toMatchObject({ _id: 'mongo-order-id', orderId: 'ARC-2026-1234' });
  });

  it('requires authentication for order history', async () => {
    const response = await getMyOrders();

    expect(response.status).toBe(401);
  });
});
