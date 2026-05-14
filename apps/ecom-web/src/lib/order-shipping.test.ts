/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import type { Order } from '@/lib/orders';
import { getOrderShippingDetails, getOrderShippingSummary, getOrderTrackingNumber, getOrderTrackingUrl } from './order-shipping';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    orderId: 'ARC-2026-ABCD1234',
    email: 'buyer@example.com',
    status: 'processing',
    items: [],
    shippingMethod: 'Poczta Polska',
    shippingPrice: 0,
    shippingCarrier: 'poczta_polska',
    shippingService: 'poczta_polska_tracked',
    shippingAddress: {},
    subtotal: 100,
    discount: 0,
    total: 100,
    createdAt: '2026-05-13T10:00:00.000Z',
    ...overrides,
  };
}

describe('order shipping display helpers', () => {
  it('does not duplicate carrier labels already present in the shipping method', () => {
    expect(getOrderShippingSummary(makeOrder(), 'en')).toBe('Poczta Polska');
    expect(getOrderShippingSummary(makeOrder({
      shippingMethod: 'DPD Courier',
      shippingCarrier: 'dpd',
      shippingService: 'dpd_courier_standard',
    }), 'en')).toBe('DPD Courier');
  });

  it('adds carrier labels for custom shipping method names', () => {
    expect(getOrderShippingSummary(makeOrder({
      shippingMethod: 'Express',
      shippingCarrier: 'dpd',
    }), 'en')).toBe('Express / DPD');
  });

  it('includes Paczkomat details and tracking for InPost orders', () => {
    const order = makeOrder({
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
        shipmentUrl: 'https://inpost.example.test/shipments/TRACK123',
      },
    });
    const details = getOrderShippingDetails(order, 'en');

    expect(details).toEqual([
      'InPost Parcel Locker',
      'Paczkomat WAW01A',
      'ul. Testowa 1, 00-001 Warsaw',
      'Tracking: TRACK123',
    ]);
    expect(getOrderShippingSummary(order, 'en', { includeTracking: false })).toBe(
      'InPost Parcel Locker / Paczkomat WAW01A / ul. Testowa 1, 00-001 Warsaw',
    );
    expect(getOrderTrackingUrl(order)).toBe('https://inpost.example.test/shipments/TRACK123');
  });

  it('prefers inpostShipment.trackingUrl over shipmentUrl for customer-facing link', () => {
    const order = makeOrder({
      shippingMethod: 'InPost Parcel Locker',
      shippingCarrier: 'inpost',
      inpostShipment: {
        trackingNumber: 'TRACK999',
        trackingUrl: 'https://inpost.pl/sledzenie-przesylek?number=TRACK999',
        shipmentUrl: 'https://api.inpost-shipx-pl.easypack24.net/v1/shipments/TRACK999',
      },
    });

    expect(getOrderTrackingUrl(order)).toBe('https://inpost.pl/sledzenie-przesylek?number=TRACK999');
  });

  it('uses generic courier shipment tracking when present', () => {
    const order = makeOrder({
      shippingMethod: 'DPD Courier',
      shippingCarrier: 'dpd',
      shipment: {
        trackingNumber: 'DPD123',
        trackingUrl: 'https://track.example.test/DPD123',
      },
    });

    expect(getOrderShippingSummary(order, 'en')).toBe('DPD Courier / Tracking: DPD123');
    expect(getOrderTrackingNumber(order)).toBe('DPD123');
    expect(getOrderTrackingUrl(order)).toBe('https://track.example.test/DPD123');
  });

  it('does not expose unsafe tracking URLs', () => {
    const order = makeOrder({
      shippingMethod: 'DPD Courier',
      shippingCarrier: 'dpd',
      shipment: {
        trackingNumber: 'DPD123',
        trackingUrl: 'javascript:alert(1)',
      },
      inpostShipment: {
        trackingNumber: 'TRACK123',
        shipmentUrl: 'ftp://inpost.example.test/shipments/TRACK123',
      },
    });

    expect(getOrderTrackingNumber(order)).toBe('DPD123');
    expect(getOrderTrackingUrl(order)).toBeUndefined();
  });
});
