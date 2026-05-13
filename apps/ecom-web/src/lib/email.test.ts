/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '@/lib/orders';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));

import { sendOrderConfirmation } from './email';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    orderId: 'ARC-2026-ABCD1234',
    email: 'buyer@example.com',
    status: 'processing',
    items: [
      {
        productId: 'prod-1',
        slug: 'keycha1453',
        name: 'KEYCHA1453',
        category: 'Keychains',
        size: 'One size',
        price: 350,
        priceDisplay: '350 zł',
        currencyCode: 'PLN',
        quantity: 1,
      },
    ],
    shippingMethod: 'Poczta Polska',
    shippingPrice: 20,
    shippingAddress: {
      firstName: 'Buyer',
      lastName: 'Example',
      address: 'Main 1',
      city: 'Warsaw',
      postcode: '00-001',
      country: 'PL',
    },
    subtotal: 350,
    discount: 0,
    total: 370,
    createdAt: '2026-05-13T10:00:00.000Z',
    ...overrides,
  };
}

describe('sendOrderConfirmation', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('RESEND_FROM_EMAIL', 'orders@example.com');
    mocks.send.mockReset();
    mocks.send.mockResolvedValue({});
  });

  it('formats confirmation totals with the saved order item currency', async () => {
    vi.stubEnv('NEXT_PUBLIC_ECOM_URL', 'https://stargater.example.test');

    await sendOrderConfirmation(makeOrder());

    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('370 zł'),
    }));
    const html = (mocks.send.mock.calls[0]?.[0] as { html?: string } | undefined)?.html ?? '';
    expect(html).toContain('350 zł');
    expect(html).toContain('20 zł');
    expect(html).toContain('https://stargater.example.test/pl/order-status?order=ARC-2026-ABCD1234');
    expect(html).not.toContain('EUR ');
  });

  it('normalizes Vercel hostnames when building the order status link', async () => {
    vi.stubEnv('NEXT_PUBLIC_ECOM_URL', '');
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'stargater.net');

    await sendOrderConfirmation(makeOrder());

    const html = (mocks.send.mock.calls[0]?.[0] as { html?: string } | undefined)?.html ?? '';
    expect(html).toContain('https://stargater.net/pl/order-status?order=ARC-2026-ABCD1234');
  });

  it('uses the default order status route for non-Polish delivery countries', async () => {
    vi.stubEnv('NEXT_PUBLIC_ECOM_URL', 'https://stargater.example.test');

    await sendOrderConfirmation(makeOrder({
      shippingAddress: {
        firstName: 'Buyer',
        lastName: 'Example',
        address: 'Main 1',
        city: 'Paris',
        postcode: '75001',
        country: 'FR',
      },
    }));

    const html = (mocks.send.mock.calls[0]?.[0] as { html?: string } | undefined)?.html ?? '';
    expect(html).toContain('https://stargater.example.test/order-status?order=ARC-2026-ABCD1234');
  });

  it('includes InPost Paczkomat and tracking details in confirmation email', async () => {
    await sendOrderConfirmation(makeOrder({
      shippingMethod: 'InPost Parcel Locker',
      shippingCarrier: 'inpost',
      shippingService: 'inpost_locker_standard',
      inpostPoint: {
        id: 'WAW01A',
        name: 'WAW01A',
        addressLine1: 'ul. Testowa 1',
        city: 'Warsaw',
        postCode: '00-001',
      },
      inpostShipment: {
        trackingNumber: 'TRACK123',
      },
    }));

    const html = (mocks.send.mock.calls[0]?.[0] as { html?: string } | undefined)?.html ?? '';
    expect(html).toContain('Delivery:');
    expect(html).toContain('InPost Parcel Locker');
    expect(html).toContain('Paczkomat WAW01A');
    expect(html).toContain('ul. Testowa 1, 00-001 Warsaw');
    expect(html).toContain('Tracking: TRACK123');
  });
});
