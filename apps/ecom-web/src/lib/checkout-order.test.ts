/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  computeDiscount: vi.fn(),
  getCanonicalProductPricing: vi.fn(),
  getSession: vi.fn(),
  readShippingProviderAvailability: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/mentios', () => ({
  getCanonicalProductPricing: mocks.getCanonicalProductPricing,
}));

vi.mock('@/lib/promo', () => ({
  computeDiscount: mocks.computeDiscount,
}));

vi.mock('@/lib/providerSettings', () => ({
  readShippingProviderAvailability: mocks.readShippingProviderAvailability,
}));

vi.mock('@/lib/cms', async () => {
  const checkoutContent = await vi.importActual<typeof import('@/data/checkoutContent')>('@/data/checkoutContent');
  return {
    getCheckoutContent: vi.fn(async () => checkoutContent.CHECKOUT_CONTENT_DEFAULTS),
  };
});

import { buildValidatedCheckoutOrder, toMinorCurrencyUnit } from './checkout-order';

function makeCheckoutPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'buyer@example.com',
    items: [
      {
        productId: 'prod-1',
        slug: 'tech-priest',
        name: 'Tech Priest',
        category: 'Gaming Keycap',
        size: 'OS',
        price: 19.040000000000003,
        priceDisplay: '€ 19.04',
        currencyCode: 'EUR',
        quantity: 1,
        imageUrl: '/keycap.jpg',
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
    },
    subtotal: 19.040000000000003,
    total: 19.040000000000003,
    ...overrides,
  };
}

describe('buildValidatedCheckoutOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.computeDiscount.mockResolvedValue(0);
    mocks.getCanonicalProductPricing.mockResolvedValue(
      new Map([['prod-1', { currencyCode: 'EUR', price: 19.04 }]]),
    );
    mocks.getSession.mockResolvedValue(null);
    mocks.readShippingProviderAvailability.mockResolvedValue({});
    process.env.NEXT_PUBLIC_BASE_URL = 'https://shop.example.test';
  });

  it('preserves fractional EUR product prices during checkout validation', async () => {
    const result = await buildValidatedCheckoutOrder(makeCheckoutPayload());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.subtotal).toBe(19.04);
    expect(result.order.total).toBe(19.04);
    expect(result.order.currencyCode).toBe('EUR');
    expect(result.order.pricedItems[0]).toMatchObject({
      price: 19.04,
      priceDisplay: '€ 19.04',
      currencyCode: 'EUR',
    });
    expect(mocks.getCanonicalProductPricing).toHaveBeenCalledWith(['prod-1'], 'EUR');
  });

  it('rejects totals calculated from a rounded-down EUR item price', async () => {
    const [item] = makeCheckoutPayload()['items'] as [Record<string, unknown>];
    const result = await buildValidatedCheckoutOrder(makeCheckoutPayload({
      items: [{ ...item, price: 19 }],
      subtotal: 19,
      total: 19,
    }));

    expect(result).toEqual({ ok: false, error: 'Order totals are invalid.', status: 400 });
  });
});

describe('toMinorCurrencyUnit', () => {
  it('converts major currency values to gateway minor units', () => {
    expect(toMinorCurrencyUnit(19.040000000000003)).toBe(1904);
    expect(toMinorCurrencyUnit(60)).toBe(6000);
  });
});
