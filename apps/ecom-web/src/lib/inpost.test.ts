/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildShipXShipmentPayload,
  isInpostConfigured,
  isInpostShippingApiConfigured,
  mapInpostEventToOrderStatus,
} from './inpost';
import type { Order } from './orders';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    orderId: 'ARC-2026-ABCD1234',
    email: 'buyer@example.com',
    status: 'processing',
    items: [],
    shippingMethod: 'InPost Parcel Locker',
    shippingPrice: 4,
    shippingCarrier: 'inpost',
    shippingService: 'inpost_locker_standard',
    inpostPoint: {
      id: 'WAW01A',
      name: 'WAW01A',
    },
    shippingAddress: {
      email: 'buyer@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      address: '1 Code Street',
      city: 'Warsaw',
      postcode: '00-001',
      country: 'Poland',
      phone: '+48 123 456 789',
    },
    subtotal: 30,
    discount: 0,
    total: 34,
    createdAt: '2026-05-08T12:00:00.000Z',
    ...overrides,
  };
}

describe('InPost ShipX integration helpers', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports configuration readiness from ShipX env vars', () => {
    vi.stubEnv('INPOST_API_TOKEN', '');
    vi.stubEnv('INPOST_ORGANIZATION_ID', '');

    expect(isInpostConfigured()).toBe(false);

    vi.stubEnv('INPOST_API_TOKEN', 'token-123');
    vi.stubEnv('INPOST_ORGANIZATION_ID', 'org-123');

    expect(isInpostConfigured()).toBe(true);
  });

  it('reports Shipping API readiness from bearer token or OAuth credentials', () => {
    vi.stubEnv('INPOST_API_TOKEN', '');
    vi.stubEnv('INPOST_ORGANIZATION_ID', 'org-123');
    vi.stubEnv('INPOST_OAUTH_CLIENT_ID', '');
    vi.stubEnv('INPOST_OAUTH_CLIENT_SECRET', '');

    expect(isInpostShippingApiConfigured()).toBe(false);

    vi.stubEnv('INPOST_API_TOKEN', 'access-token');
    expect(isInpostShippingApiConfigured()).toBe(true);

    vi.stubEnv('INPOST_API_TOKEN', '');
    vi.stubEnv('INPOST_OAUTH_CLIENT_ID', 'client-id');
    vi.stubEnv('INPOST_OAUTH_CLIENT_SECRET', 'client-secret');
    expect(isInpostShippingApiConfigured()).toBe(true);
  });

  it('builds a parcel-locker shipment payload from an order', () => {
    vi.stubEnv('INPOST_DEFAULT_PARCEL_TEMPLATE', 'medium');
    vi.stubEnv('INPOST_SENDING_METHOD', 'parcel_locker');

    expect(buildShipXShipmentPayload(makeOrder())).toEqual({
      receiver: {
        email: 'buyer@example.com',
        phone: '+48123456789',
        first_name: 'Ada',
        last_name: 'Lovelace',
      },
      parcels: {
        template: 'medium',
      },
      custom_attributes: {
        target_point: 'WAW01A',
        sending_method: 'parcel_locker',
      },
      service: 'inpost_locker_standard',
      reference: 'ARC-2026-ABCD1234',
    });
  });

  it('requires an InPost pickup point before shipment creation', () => {
    expect(() => buildShipXShipmentPayload(makeOrder({ inpostPoint: undefined }))).toThrow(/pickup point/i);
  });

  it('maps tracking event codes to order statuses', () => {
    expect(mapInpostEventToOrderStatus('MMD.1001')).toBe('in-transit');
    expect(mapInpostEventToOrderStatus('FMD.1002')).toBe('in-transit');
    expect(mapInpostEventToOrderStatus('LMD.1001')).toBe('in-transit');
    expect(mapInpostEventToOrderStatus('EOL.1001')).toBe('delivered');
    expect(mapInpostEventToOrderStatus('EOL.1008')).toBe('delivered');
    expect(mapInpostEventToOrderStatus('EOL.9004')).toBe('cancelled');
    expect(mapInpostEventToOrderStatus('CRE.1001')).toBeNull();
  });
});
