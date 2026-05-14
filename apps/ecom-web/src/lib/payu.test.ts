/**
 * @vitest-environment node
 */

import { createHash } from 'crypto';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const TEST_SECOND_KEY = 'test-payu-second-key';
const providerMocks = vi.hoisted(() => ({
  readPayUProviderSettings: vi.fn(),
}));

vi.stubEnv('PAYU_SECOND_KEY', TEST_SECOND_KEY);

vi.mock('./providerSettings', () => ({
  readPayUProviderSettings: providerMocks.readPayUProviderSettings,
}));

import { createPayUBlikOrder, verifyPayUWebhook, type CreatePayUBlikParams } from './payu';

function makeBlikParams(overrides: Partial<CreatePayUBlikParams> = {}): CreatePayUBlikParams {
  return {
    notifyUrl: 'https://shop.example.test/api/webhooks/payu',
    customerIp: '127.0.0.1',
    description: 'Stargater order ARC-2026-ABCD1234',
    currencyCode: 'PLN',
    totalAmount: 1500,
    buyer: {
      email: 'buyer@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '+48123456789',
      language: 'pl',
    },
    products: [{ name: 'Pin (OS)', unitPrice: 1500, quantity: 1 }],
    blikCode: '123456',
    extOrderId: 'ARC-2026-ABCD1234',
    ...overrides,
  };
}

function mockPayUFetch(orderBody: Record<string, unknown>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token-123' }), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(orderBody), { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function makeSignatureHeader(body: string, key: string): string {
  const sig = createHash('md5').update(body + key).digest('hex');
  return `sender=checkout;signature=${sig};algorithm=MD5;content=DOCUMENT`;
}

describe('verifyPayUWebhook', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    providerMocks.readPayUProviderSettings.mockReset();
    providerMocks.readPayUProviderSettings.mockResolvedValue(null);
    vi.stubEnv('PAYU_SECOND_KEY', TEST_SECOND_KEY);
  });

  const body = JSON.stringify({ order: { status: 'COMPLETED', orderId: 'PAYU-123' } });

  it('returns true for a correctly signed request', async () => {
    const header = makeSignatureHeader(body, TEST_SECOND_KEY);
    await expect(verifyPayUWebhook(body, header)).resolves.toBe(true);
  });

  it('returns false when the signature does not match the body', async () => {
    const header = makeSignatureHeader('tampered-body', TEST_SECOND_KEY);
    await expect(verifyPayUWebhook(body, header)).resolves.toBe(false);
  });

  it('returns false when signed with a different key', async () => {
    const header = makeSignatureHeader(body, 'wrong-key');
    await expect(verifyPayUWebhook(body, header)).resolves.toBe(false);
  });

  it('returns false when signatureHeader is null', async () => {
    await expect(verifyPayUWebhook(body, null)).resolves.toBe(false);
  });

  it('returns false when signatureHeader has no signature field', async () => {
    await expect(verifyPayUWebhook(body, 'sender=checkout;algorithm=MD5')).resolves.toBe(false);
  });

  it('is case-insensitive for the hex digest', async () => {
    const sig = createHash('md5').update(body + TEST_SECOND_KEY).digest('hex').toUpperCase();
    const header = `sender=checkout;signature=${sig};algorithm=MD5`;
    await expect(verifyPayUWebhook(body, header)).resolves.toBe(true);
  });

  it('returns false when PAYU_SECOND_KEY is not set', async () => {
    vi.stubEnv('PAYU_SECOND_KEY', '');
    const header = makeSignatureHeader(body, TEST_SECOND_KEY);
    const result = await verifyPayUWebhook(body, header);
    vi.stubEnv('PAYU_SECOND_KEY', TEST_SECOND_KEY);
    expect(result).toBe(false);
  });
});

describe('createPayUBlikOrder', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    providerMocks.readPayUProviderSettings.mockReset();
    providerMocks.readPayUProviderSettings.mockResolvedValue(null);
    vi.stubEnv('PAYU_POS_ID', 'env-pos-id');
    vi.stubEnv('PAYU_CLIENT_ID', 'env-client-id');
    vi.stubEnv('PAYU_CLIENT_SECRET', 'env-client-secret');
    vi.stubEnv('PAYU_SECOND_KEY', TEST_SECOND_KEY);
  });

  it('returns the PayU order id and normalized status code', async () => {
    const fetchMock = mockPayUFetch({
      orderId: 'PAYU-ORDER-123',
      status: { statusCode: 'SUCCESS' },
    });

    const result = await createPayUBlikOrder(makeBlikParams());

    expect(result).toEqual({ payuOrderId: 'PAYU-ORDER-123', statusCode: 'SUCCESS' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/api/v2_1/orders'),
      expect.objectContaining({
        body: expect.stringContaining('"extOrderId":"ARC-2026-ABCD1234"'),
      }),
    );
  });

  it('uses pushed provider settings before environment credentials', async () => {
    providerMocks.readPayUProviderSettings.mockResolvedValue({
      apiUrl: 'https://payu.example.test',
      clientId: 'stored-client-id',
      clientSecret: 'stored-client-secret',
      enabled: true,
      notifyUrl: '',
      posId: 'stored-pos-id',
      secondKey: TEST_SECOND_KEY,
    });
    const fetchMock = mockPayUFetch({
      orderId: 'PAYU-ORDER-123',
      status: { statusCode: 'SUCCESS' },
    });

    await createPayUBlikOrder(makeBlikParams());

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://payu.example.test/pl/standard/user/oauth/authorize',
      expect.objectContaining({
        body: expect.stringContaining('client_id=stored-client-id'),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://payu.example.test/api/v2_1/orders',
      expect.objectContaining({
        body: expect.stringContaining('"merchantPosId":"stored-pos-id"'),
      }),
    );
  });

  it('does not call PayU when pushed provider settings disable PayU', async () => {
    providerMocks.readPayUProviderSettings.mockResolvedValue({
      apiUrl: 'https://payu.example.test',
      clientId: 'stored-client-id',
      clientSecret: 'stored-client-secret',
      enabled: false,
      notifyUrl: '',
      posId: 'stored-pos-id',
      secondKey: TEST_SECOND_KEY,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(createPayUBlikOrder(makeBlikParams())).rejects.toThrow(/disabled/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails when PayU accepts the request without returning an order id', async () => {
    mockPayUFetch({
      status: { statusCode: 'SUCCESS' },
    });

    await expect(createPayUBlikOrder(makeBlikParams())).rejects.toThrow(/without order ID/i);
  });
});
