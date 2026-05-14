/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  collection: vi.fn(),
  findOne: vi.fn(),
  getEcommerceProductsDb: vi.fn(),
}));

vi.mock('./mongodb', () => ({
  getEcommerceProductsDb: mocks.getEcommerceProductsDb,
}));

import {
  readEcommerceProviderSettings,
  readPaymentProviderAvailability,
  readShippingProviderAvailability,
} from './providerSettings';

const SETTINGS_KEY = 'payment_shipping_provider_settings_v1';

function makeSettings(): Record<string, unknown> {
  return {
    payment: {
      payu: {
        apiUrl: 'https://payu.example.test',
        clientId: 'payu-client',
        clientSecret: 'payu-secret',
        enabled: true,
        notifyUrl: '',
        posId: 'payu-pos',
        secondKey: 'payu-second-key',
      },
    },
    shipping: {
      dpd: {
        accountNumber: 'dpd-account',
        apiUrl: 'https://dpd.example.test',
        enabled: false,
        password: 'dpd-password',
        trackingUrlTemplate: 'https://dpd.example.test/{trackingNumber}',
        username: 'dpd-user',
      },
      inpost: {
        apiToken: 'inpost-token',
        apiUrl: 'https://shipx.example.test',
        defaultParcelTemplate: 'medium',
        enabled: true,
        geowidgetToken: 'geo-token',
        oauthClientId: 'inpost-client',
        oauthClientSecret: 'inpost-secret',
        oauthTokenUrl: 'https://oauth.example.test',
        organizationId: 'org-1',
        sendingMethod: 'parcel_locker',
        webhookSecret: 'webhook-secret',
      },
      pocztaPolska: {
        apiUrl: 'https://poczta.example.test',
        cardNumber: 'card-1',
        enabled: false,
        password: 'poczta-password',
        trackingUrlTemplate: 'https://poczta.example.test/{trackingNumber}',
        username: 'poczta-user',
      },
    },
  };
}

describe('ecommerce provider settings reader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.collection.mockReturnValue({ findOne: mocks.findOne });
    mocks.getEcommerceProductsDb.mockResolvedValue({ collection: mocks.collection });
    mocks.findOne.mockResolvedValue(null);
  });

  it('reads and normalizes pushed provider settings from ecom_settings', async () => {
    mocks.findOne.mockResolvedValue({ _id: SETTINGS_KEY, key: SETTINGS_KEY, value: makeSettings() });

    const settings = await readEcommerceProviderSettings();

    expect(mocks.collection).toHaveBeenCalledWith('ecom_settings');
    expect(mocks.findOne).toHaveBeenCalledWith({
      $or: [{ key: SETTINGS_KEY }, { _id: SETTINGS_KEY }],
    });
    expect(settings).toMatchObject({
      payment: { payu: { clientId: 'payu-client', enabled: true } },
      shipping: {
        dpd: { enabled: false, trackingUrlTemplate: 'https://dpd.example.test/{trackingNumber}' },
        inpost: { enabled: true, geowidgetToken: 'geo-token' },
        pocztaPolska: { enabled: false },
      },
    });
  });

  it('parses settings when the pushed value is stored as JSON text', async () => {
    mocks.findOne.mockResolvedValue({ key: SETTINGS_KEY, value: JSON.stringify(makeSettings()) });

    await expect(readShippingProviderAvailability()).resolves.toEqual({
      dpd: false,
      inpost: true,
      poczta_polska: false,
    });
    expect(mocks.findOne).toHaveBeenCalledTimes(1);
  });

  it('returns empty availability when provider settings are absent or unreadable', async () => {
    await expect(readPaymentProviderAvailability()).resolves.toEqual({});

    mocks.getEcommerceProductsDb.mockRejectedValue(new Error('database unavailable'));
    await expect(readShippingProviderAvailability()).resolves.toEqual({});
  });
});
