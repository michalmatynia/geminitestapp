/**
 * @vitest-environment node
 */

import { createHash } from 'crypto';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const TEST_SECOND_KEY = 'test-payu-second-key';

vi.stubEnv('PAYU_SECOND_KEY', TEST_SECOND_KEY);

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
    vi.stubEnv('PAYU_SECOND_KEY', TEST_SECOND_KEY);
  });

  const body = JSON.stringify({ order: { status: 'COMPLETED', orderId: 'PAYU-123' } });

  it('returns true for a correctly signed request', () => {
    const header = makeSignatureHeader(body, TEST_SECOND_KEY);
    expect(verifyPayUWebhook(body, header)).toBe(true);
  });

  it('returns false when the signature does not match the body', () => {
    const header = makeSignatureHeader('tampered-body', TEST_SECOND_KEY);
    expect(verifyPayUWebhook(body, header)).toBe(false);
  });

  it('returns false when signed with a different key', () => {
    const header = makeSignatureHeader(body, 'wrong-key');
    expect(verifyPayUWebhook(body, header)).toBe(false);
  });

  it('returns false when signatureHeader is null', () => {
    expect(verifyPayUWebhook(body, null)).toBe(false);
  });

  it('returns false when signatureHeader has no signature field', () => {
    expect(verifyPayUWebhook(body, 'sender=checkout;algorithm=MD5')).toBe(false);
  });

  it('is case-insensitive for the hex digest', () => {
    const sig = createHash('md5').update(body + TEST_SECOND_KEY).digest('hex').toUpperCase();
    const header = `sender=checkout;signature=${sig};algorithm=MD5`;
    expect(verifyPayUWebhook(body, header)).toBe(true);
  });

  it('returns false when PAYU_SECOND_KEY is not set', () => {
    vi.stubEnv('PAYU_SECOND_KEY', '');
    const header = makeSignatureHeader(body, TEST_SECOND_KEY);
    const result = verifyPayUWebhook(body, header);
    vi.stubEnv('PAYU_SECOND_KEY', TEST_SECOND_KEY);
    expect(result).toBe(false);
  });
});

describe('createPayUBlikOrder', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
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

  it('fails when PayU accepts the request without returning an order id', async () => {
    mockPayUFetch({
      status: { statusCode: 'SUCCESS' },
    });

    await expect(createPayUBlikOrder(makeBlikParams())).rejects.toThrow(/without order ID/i);
  });
});
