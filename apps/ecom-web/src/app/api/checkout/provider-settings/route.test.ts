/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readEcommerceProviderSettings: vi.fn(),
}));

vi.mock('@/lib/providerSettings', () => ({
  readEcommerceProviderSettings: mocks.readEcommerceProviderSettings,
}));

import { GET } from './route';

function makeProviderSettings(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    payment: {
      payu: {
        apiUrl: 'https://payu.example.test',
        clientId: 'secret-client-id',
        clientSecret: 'secret-client-secret',
        enabled: true,
        notifyUrl: '',
        posId: 'secret-pos-id',
        secondKey: 'secret-second-key',
      },
      stripe: {
        publishableKey: 'pk_test_public-key',
        secretKey: 'sk_test_secret-key',
        webhookSecret: 'whsec_secret',
        enabled: true,
      },
      paypal: {
        clientId: 'paypal-client-id',
        clientSecret: 'secret-paypal-secret',
        webhookId: 'secret-webhook-id',
        mode: 'sandbox',
        enabled: false,
      },
    },
    shipping: {
      dpd: {
        accountNumber: 'secret-account',
        apiUrl: '',
        enabled: true,
        password: 'secret-password',
        trackingUrlTemplate: 'https://dpd.example.test/{trackingNumber}',
        username: 'secret-user',
      },
      inpost: {
        apiToken: 'secret-api-token',
        apiUrl: 'https://shipx.example.test',
        defaultParcelTemplate: 'medium',
        enabled: true,
        geowidgetToken: 'public-widget-token',
        oauthClientId: 'secret-client-id',
        oauthClientSecret: 'secret-client-secret',
        oauthTokenUrl: 'https://oauth.example.test',
        organizationId: 'secret-org',
        sendingMethod: 'parcel_locker',
        webhookSecret: 'secret-webhook',
      },
      pocztaPolska: {
        apiUrl: '',
        cardNumber: 'secret-card',
        enabled: true,
        password: 'secret-password',
        trackingUrlTemplate: 'https://poczta.example.test/{trackingNumber}',
        username: 'secret-user',
      },
    },
    ...overrides,
  };
}

describe('GET /api/checkout/provider-settings', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mocks.readEcommerceProviderSettings.mockReset();
    mocks.readEcommerceProviderSettings.mockResolvedValue(null);
  });

  it('returns only public InPost checkout settings from pushed provider settings', async () => {
    mocks.readEcommerceProviderSettings.mockResolvedValue(makeProviderSettings());

    const response = await GET();
    const body = await response.json() as {
      shipping?: { inpost?: { enabled?: boolean; geowidgetToken?: string } };
    };

    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({
      payment: {
        payu: {
          enabled: true,
        },
        stripe: {
          enabled: true,
          publishableKey: 'pk_test_public-key',
        },
        paypal: {
          enabled: false,
          clientId: '',
          mode: 'sandbox',
        },
      },
      shipping: {
        dpd: {
          enabled: true,
        },
        inpost: {
          enabled: true,
          geowidgetToken: 'public-widget-token',
        },
        pocztaPolska: {
          enabled: true,
        },
      },
    });
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(mocks.readEcommerceProviderSettings).toHaveBeenCalledTimes(1);
  });

  it('falls back to the public environment token when provider settings are not pushed yet', async () => {
    vi.stubEnv('NEXT_PUBLIC_INPOST_GEO_WIDGET_TOKEN', 'env-widget-token');
    mocks.readEcommerceProviderSettings.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json() as {
      shipping?: { inpost?: { enabled?: boolean; geowidgetToken?: string } };
    };

    expect(body.shipping?.inpost).toEqual({
      enabled: true,
      geowidgetToken: 'env-widget-token',
    });
  });

  it('returns public shipping provider availability from pushed settings', async () => {
    const base = makeProviderSettings();
    const shipping = base['shipping'] as Record<string, Record<string, unknown>>;
    mocks.readEcommerceProviderSettings.mockResolvedValue({
      ...base,
      shipping: {
        ...shipping,
        dpd: {
          ...shipping['dpd'],
          enabled: false,
        },
        pocztaPolska: {
          ...shipping['pocztaPolska'],
          enabled: false,
        },
      },
    });

    const response = await GET();
    const body = await response.json() as {
      shipping?: {
        dpd?: { enabled?: boolean };
        inpost?: { enabled?: boolean };
        pocztaPolska?: { enabled?: boolean };
      };
    };

    expect(body.shipping).toMatchObject({
      dpd: { enabled: false },
      inpost: { enabled: true },
      pocztaPolska: { enabled: false },
    });
  });

  it('returns public payment provider availability from pushed settings', async () => {
    const base = makeProviderSettings();
    const payment = base['payment'] as Record<string, Record<string, unknown>>;
    mocks.readEcommerceProviderSettings.mockResolvedValue({
      ...base,
      payment: {
        ...payment,
        payu: {
          ...payment['payu'],
          enabled: false,
        },
      },
    });

    const response = await GET();
    const body = await response.json() as {
      payment?: { payu?: { enabled?: boolean } };
    };

    expect(body.payment?.payu).toEqual({ enabled: false });
  });

  it('falls back to the env token when DB settings have an empty geowidgetToken', async () => {
    vi.stubEnv('NEXT_PUBLIC_INPOST_GEO_WIDGET_TOKEN', 'env-widget-token');
    const base = makeProviderSettings();
    const shipping = base['shipping'] as Record<string, Record<string, unknown>>;
    mocks.readEcommerceProviderSettings.mockResolvedValue({
      ...base,
      shipping: {
        ...shipping,
        inpost: {
          ...shipping['inpost'],
          geowidgetToken: '',
        },
      },
    });

    const response = await GET();
    const body = await response.json() as {
      shipping?: { inpost?: { enabled?: boolean; geowidgetToken?: string } };
    };

    expect(body.shipping?.inpost).toEqual({
      enabled: true,
      geowidgetToken: 'env-widget-token',
    });
  });

  it('does not expose a token when pushed settings disable InPost', async () => {
    const base = makeProviderSettings();
    const shipping = base['shipping'] as Record<string, Record<string, unknown>>;
    mocks.readEcommerceProviderSettings.mockResolvedValue({
      ...base,
      shipping: {
        ...shipping,
        inpost: {
          ...shipping['inpost'],
          enabled: false,
        },
      },
    });

    const response = await GET();
    const body = await response.json() as {
      shipping?: { inpost?: { enabled?: boolean; geowidgetToken?: string } };
    };

    expect(body.shipping?.inpost).toEqual({
      enabled: false,
      geowidgetToken: '',
    });
  });
});
