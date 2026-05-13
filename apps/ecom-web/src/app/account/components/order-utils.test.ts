/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import type { Order } from '@/lib/orders';
import { toDisplayOrder } from './order-utils';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    orderId: 'ARC-2026-ABCD1234',
    email: 'buyer@example.com',
    status: 'processing',
    items: [{
      productId: 'product-1',
      slug: 'keycha1453',
      name: 'KEYCHA1453',
      category: 'Accessories',
      size: 'One Size',
      price: 45,
      priceDisplay: '45 PLN',
      currencyCode: 'PLN',
      quantity: 2,
      imageUrl: '/images/keycha1453.jpg',
    }],
    shippingMethod: 'InPost Parcel Locker',
    shippingPrice: 8,
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
      shipmentUrl: 'https://inpost.example.test/shipments/TRACK123',
    },
    shippingAddress: {},
    subtotal: 90,
    discount: 0,
    total: 98,
    createdAt: '2026-05-13T10:00:00.000Z',
    ...overrides,
  };
}

describe('account order display mapper', () => {
  it('keeps shipping point and tracking details visible for InPost orders', () => {
    const display = toDisplayOrder(makeOrder(), 'en');

    expect(display.id).toBe('ARC-2026-ABCD1234');
    expect(display.total).toBe('98 zł');
    expect(display.shippingLine).toBe('InPost Parcel Locker / Paczkomat WAW01A / ul. Testowa 1, 00-001 Warsaw');
    expect(display.trackingNumber).toBe('TRACK123');
    expect(display.trackingUrl).toBe('https://inpost.example.test/shipments/TRACK123');
    expect(display.items).toEqual([{
      id: 'product-1-keycha1453-One Size',
      name: 'KEYCHA1453',
      qty: 2,
      price: '90 zł',
      imageUrl: '/images/keycha1453.jpg',
    }]);
  });

  it('formats non-InPost courier orders with the canonical shipping summary', () => {
    const display = toDisplayOrder(makeOrder({
      shippingMethod: 'DPD Courier',
      shippingCarrier: 'dpd',
      shippingService: 'dpd_courier_standard',
      inpostPoint: undefined,
      inpostShipment: undefined,
      shipment: {
        carrier: 'dpd',
        service: 'dpd_courier_standard',
        trackingNumber: 'DPD123',
        trackingUrl: 'https://tracktrace.dpd.com.pl/parcelDetails?p1=DPD123&typ=1',
      },
    }), 'pl');

    expect(display.shippingLine).toBe('DPD Courier');
    expect(display.trackingNumber).toBe('DPD123');
    expect(display.trackingUrl).toBe('https://tracktrace.dpd.com.pl/parcelDetails?p1=DPD123&typ=1');
    expect(display.total).toBe('98 zł');
  });
});
