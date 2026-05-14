/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const providerMocks = vi.hoisted(() => ({
  readPayPalProviderSettings: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('./providerSettings', () => ({
  readPayPalProviderSettings: providerMocks.readPayPalProviderSettings,
}));

import {
  createPayPalOrder,
  capturePayPalOrder,
  verifyPayPalWebhook,
  getPayPalClientId,
  getPayPalMode,
  type CreatePayPalOrderParams,
} from './paypal';

const TEST_CLIENT_ID = 'paypal-client-id';
const TEST_CLIENT_SECRET = 'paypal-client-secret';
const TEST_WEBHOOK_ID = 'paypal-webhook-id';

const ENABLED_SETTINGS = {
  clientId: TEST_CLIENT_ID,
  clientSecret: TEST_CLIENT_SECRET,
  webhookId: TEST_WEBHOOK_ID,
  mode: 'sandbox' as const,
  enabled: true,
};

function makeOrderParams(overrides: Partial<CreatePayPalOrderParams> = {}): CreatePayPalOrderParams {
  return {
    amount: 6000,
    currency: 'EUR',
    description: 'Stargater order ARC-2026-DEADBEEF',
    extOrderId: 'ARC-2026-DEADBEEF',
    returnUrl: 'https://shop.example.test/checkout?paypal_return=1',
    cancelUrl: 'https://shop.example.test/checkout',
    items: [{ name: 'Pin (OS)', unit_amount: { currency_code: 'EUR', value: '15.00' }, quantity: '1' }],
    ...overrides,
  };
}

function mockPayPalFetch(...responses: Response[]): ReturnType<typeof vi.fn> {
  let mock = vi.fn();
  for (const res of responses) {
    mock = mock.mockResolvedValueOnce(res);
  }
  vi.stubGlobal('fetch', mock);
  return mock;
}

function authResponse(): Response {
  return new Response(JSON.stringify({ access_token: 'pp-token-abc' }), { status: 200 });
}

describe('createPayPalOrder', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    providerMocks.readPayPalProviderSettings.mockReset();
    providerMocks.readPayPalProviderSettings.mockResolvedValue(ENABLED_SETTINGS);
  });

  it('returns paypalOrderId and approveUrl on success', async () => {
    mockPayPalFetch(
      authResponse(),
      new Response(JSON.stringify({
        id: 'PP-ORDER-ABC123',
        links: [
          { rel: 'approve', href: 'https://www.sandbox.paypal.com/checkoutnow?token=PP-ORDER-ABC123' },
        ],
      }), { status: 201 }),
    );

    const result = await createPayPalOrder(makeOrderParams());
    expect(result.paypalOrderId).toBe('PP-ORDER-ABC123');
    expect(result.approveUrl).toContain('PP-ORDER-ABC123');
  });

  it('throws when PayPal returns a non-ok status', async () => {
    mockPayPalFetch(
      authResponse(),
      new Response(JSON.stringify({ name: 'INVALID_REQUEST', message: 'Amount is invalid.' }), { status: 400 }),
    );

    await expect(createPayPalOrder(makeOrderParams())).rejects.toThrow('Amount is invalid.');
  });

  it('throws when PayPal is disabled', async () => {
    providerMocks.readPayPalProviderSettings.mockResolvedValue({ ...ENABLED_SETTINGS, enabled: false });

    await expect(createPayPalOrder(makeOrderParams())).rejects.toThrow('PayPal is not configured');
  });

  it('sets PayPal-Request-Id idempotency header', async () => {
    const fetchMock = mockPayPalFetch(
      authResponse(),
      new Response(JSON.stringify({ id: 'PP-IDEM', links: [] }), { status: 201 }),
    );

    await createPayPalOrder(makeOrderParams({ extOrderId: 'ARC-2026-IDEM' }));

    const orderCall = fetchMock.mock.calls[1] as [string, { headers: Record<string, string> }];
    expect(orderCall[1].headers['PayPal-Request-Id']).toBe('ARC-2026-IDEM');
  });
});

describe('capturePayPalOrder', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    providerMocks.readPayPalProviderSettings.mockReset();
    providerMocks.readPayPalProviderSettings.mockResolvedValue(ENABLED_SETTINGS);
  });

  it('returns status COMPLETED on successful capture', async () => {
    mockPayPalFetch(
      authResponse(),
      new Response(JSON.stringify({ id: 'PP-CAPTURE-XYZ', status: 'COMPLETED' }), { status: 201 }),
    );

    const result = await capturePayPalOrder('PP-ORDER-ABC');
    expect(result.status).toBe('COMPLETED');
    expect(result.paypalOrderId).toBe('PP-CAPTURE-XYZ');
  });

  it('returns DECLINED status when PayPal responds with 422', async () => {
    mockPayPalFetch(
      authResponse(),
      new Response(JSON.stringify({ id: 'PP-CAPTURE-XYZ', status: 'DECLINED' }), { status: 422 }),
    );

    const result = await capturePayPalOrder('PP-ORDER-DECLINED');
    expect(result.status).toBe('DECLINED');
  });

  it('throws on non-ok non-422 status', async () => {
    mockPayPalFetch(
      authResponse(),
      new Response(JSON.stringify({ message: 'PayPal capture failed: 500' }), { status: 500 }),
    );

    await expect(capturePayPalOrder('PP-ORDER-ERR')).rejects.toThrow('PayPal capture failed: 500');
  });
});

describe('verifyPayPalWebhook', () => {
  const WEBHOOK_HEADERS = {
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
    'paypal-transmission-id': 'tx-id-test',
    'paypal-transmission-sig': 'sig-abc',
    'paypal-transmission-time': '2026-05-13T00:00:00Z',
  };

  beforeEach(() => {
    vi.unstubAllGlobals();
    providerMocks.readPayPalProviderSettings.mockReset();
    providerMocks.readPayPalProviderSettings.mockResolvedValue(ENABLED_SETTINGS);
  });

  it('returns true when PayPal responds with SUCCESS', async () => {
    mockPayPalFetch(
      authResponse(),
      new Response(JSON.stringify({ verification_status: 'SUCCESS' }), { status: 200 }),
    );

    const result = await verifyPayPalWebhook('{"event_type":"test"}', WEBHOOK_HEADERS);
    expect(result).toBe(true);
  });

  it('returns false when verification_status is not SUCCESS', async () => {
    mockPayPalFetch(
      authResponse(),
      new Response(JSON.stringify({ verification_status: 'FAILURE' }), { status: 200 }),
    );

    const result = await verifyPayPalWebhook('{"event_type":"test"}', WEBHOOK_HEADERS);
    expect(result).toBe(false);
  });

  it('returns false when PayPal is disabled', async () => {
    providerMocks.readPayPalProviderSettings.mockResolvedValue({ ...ENABLED_SETTINGS, enabled: false });

    const result = await verifyPayPalWebhook('{}', WEBHOOK_HEADERS);
    expect(result).toBe(false);
  });

  it('returns false when webhookId is empty', async () => {
    providerMocks.readPayPalProviderSettings.mockResolvedValue({ ...ENABLED_SETTINGS, webhookId: '' });

    const result = await verifyPayPalWebhook('{}', WEBHOOK_HEADERS);
    expect(result).toBe(false);
  });
});

describe('getPayPalClientId', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    providerMocks.readPayPalProviderSettings.mockReset();
  });

  it('returns clientId from provider settings when present', async () => {
    providerMocks.readPayPalProviderSettings.mockResolvedValue(ENABLED_SETTINGS);
    expect(await getPayPalClientId()).toBe(TEST_CLIENT_ID);
  });

  it('falls back to env var when settings return null', async () => {
    vi.stubEnv('NEXT_PUBLIC_PAYPAL_CLIENT_ID', 'env-paypal-client');
    providerMocks.readPayPalProviderSettings.mockResolvedValue(null);
    expect(await getPayPalClientId()).toBe('env-paypal-client');
  });
});

describe('getPayPalMode', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    providerMocks.readPayPalProviderSettings.mockReset();
  });

  it('returns live when settings specify live', async () => {
    providerMocks.readPayPalProviderSettings.mockResolvedValue({ ...ENABLED_SETTINGS, mode: 'live' });
    expect(await getPayPalMode()).toBe('live');
  });

  it('returns sandbox by default when settings return null', async () => {
    providerMocks.readPayPalProviderSettings.mockResolvedValue(null);
    expect(await getPayPalMode()).toBe('sandbox');
  });

  it('returns live when env var is set to live and settings are null', async () => {
    vi.stubEnv('PAYPAL_MODE', 'live');
    providerMocks.readPayPalProviderSettings.mockResolvedValue(null);
    expect(await getPayPalMode()).toBe('live');
  });
});
