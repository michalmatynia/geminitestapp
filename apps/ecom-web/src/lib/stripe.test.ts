/**
 * @vitest-environment node
 */

import { createHmac } from 'crypto';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const providerMocks = vi.hoisted(() => ({
  readStripeProviderSettings: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('./providerSettings', () => ({
  readStripeProviderSettings: providerMocks.readStripeProviderSettings,
}));

import {
  verifyStripeWebhookSignature,
  verifyStripeWebhook,
  createStripePaymentIntent,
} from './stripe';

const TEST_WEBHOOK_SECRET = 'whsec_test_secret_key';
const TEST_SECRET_KEY = 'sk_test_secret_key';
const TEST_PUBLISHABLE_KEY = 'pk_test_publishable_key';

function makeStripeHeader(payload: string, secret: string, ageSeconds = 0): string {
  const timestamp = Math.floor(Date.now() / 1000) - ageSeconds;
  const sig = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${sig}`;
}

describe('verifyStripeWebhookSignature', () => {
  it('returns true for a valid signature', () => {
    const payload = '{"type":"payment_intent.succeeded"}';
    const header = makeStripeHeader(payload, TEST_WEBHOOK_SECRET);
    expect(verifyStripeWebhookSignature(payload, header, TEST_WEBHOOK_SECRET)).toBe(true);
  });

  it('returns false for a wrong secret', () => {
    const payload = '{"type":"payment_intent.succeeded"}';
    const header = makeStripeHeader(payload, TEST_WEBHOOK_SECRET);
    expect(verifyStripeWebhookSignature(payload, header, 'wrong-secret')).toBe(false);
  });

  it('returns false for a tampered payload', () => {
    const payload = '{"type":"payment_intent.succeeded"}';
    const header = makeStripeHeader(payload, TEST_WEBHOOK_SECRET);
    expect(verifyStripeWebhookSignature('{"type":"tampered"}', header, TEST_WEBHOOK_SECRET)).toBe(false);
  });

  it('returns false when the timestamp is older than 300 seconds', () => {
    const payload = '{"type":"payment_intent.succeeded"}';
    const header = makeStripeHeader(payload, TEST_WEBHOOK_SECRET, 301);
    expect(verifyStripeWebhookSignature(payload, header, TEST_WEBHOOK_SECRET)).toBe(false);
  });

  it('returns false for a malformed header with no timestamp', () => {
    expect(verifyStripeWebhookSignature('body', 'v1=abc123', TEST_WEBHOOK_SECRET)).toBe(false);
  });

  it('returns false for a malformed header with no v1 sig', () => {
    expect(verifyStripeWebhookSignature('body', 't=12345', TEST_WEBHOOK_SECRET)).toBe(false);
  });
});

describe('verifyStripeWebhook', () => {
  beforeEach(() => {
    providerMocks.readStripeProviderSettings.mockReset();
    providerMocks.readStripeProviderSettings.mockResolvedValue({
      publishableKey: TEST_PUBLISHABLE_KEY,
      secretKey: TEST_SECRET_KEY,
      webhookSecret: TEST_WEBHOOK_SECRET,
      enabled: true,
    });
  });

  it('returns false when signatureHeader is null', async () => {
    const result = await verifyStripeWebhook('body', null);
    expect(result).toBe(false);
  });

  it('returns false when webhook secret is empty', async () => {
    providerMocks.readStripeProviderSettings.mockResolvedValue({
      publishableKey: TEST_PUBLISHABLE_KEY,
      secretKey: TEST_SECRET_KEY,
      webhookSecret: '',
      enabled: true,
    });

    const payload = '{"type":"payment_intent.succeeded"}';
    const header = makeStripeHeader(payload, TEST_WEBHOOK_SECRET);
    const result = await verifyStripeWebhook(payload, header);
    expect(result).toBe(false);
  });

  it('returns true for a valid webhook signature', async () => {
    const payload = '{"type":"payment_intent.succeeded"}';
    const header = makeStripeHeader(payload, TEST_WEBHOOK_SECRET);
    const result = await verifyStripeWebhook(payload, header);
    expect(result).toBe(true);
  });

  it('returns false for an invalid webhook signature', async () => {
    const payload = '{"type":"payment_intent.succeeded"}';
    const result = await verifyStripeWebhook(payload, 'v1=bad-signature');
    expect(result).toBe(false);
  });
});

describe('createStripePaymentIntent', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    providerMocks.readStripeProviderSettings.mockReset();
    providerMocks.readStripeProviderSettings.mockResolvedValue({
      publishableKey: TEST_PUBLISHABLE_KEY,
      secretKey: TEST_SECRET_KEY,
      webhookSecret: TEST_WEBHOOK_SECRET,
      enabled: true,
    });
  });

  it('creates a payment intent and returns clientSecret + publishableKey', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 'pi_test_abc', client_secret: 'pi_test_abc_secret' }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createStripePaymentIntent({
      amount: 1500,
      currency: 'EUR',
      description: 'Stargater order ARC-2026-TEST',
      extOrderId: 'ARC-2026-TEST',
    });

    expect(result.paymentIntentId).toBe('pi_test_abc');
    expect(result.clientSecret).toBe('pi_test_abc_secret');
    expect(result.publishableKey).toBe(TEST_PUBLISHABLE_KEY);

    const body = new URLSearchParams((fetchMock.mock.calls[0] as [string, { body: string }])[1].body);
    expect(body.get('amount')).toBe('1500');
    expect(body.get('currency')).toBe('eur');
  });

  it('throws when Stripe returns an error response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'Your card was declined.' } }),
        { status: 402 },
      ),
    ));

    await expect(
      createStripePaymentIntent({ amount: 1500, currency: 'EUR', description: 'test' }),
    ).rejects.toThrow('Your card was declined.');
  });

  it('throws when Stripe is disabled in provider settings', async () => {
    providerMocks.readStripeProviderSettings.mockResolvedValue({
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
      enabled: false,
    });

    await expect(
      createStripePaymentIntent({ amount: 1500, currency: 'EUR', description: 'test' }),
    ).rejects.toThrow('Stripe is not configured');
  });

  it('sets Idempotency-Key header when extOrderId is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'pi_idem', client_secret: 'secret' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await createStripePaymentIntent({
      amount: 500,
      currency: 'EUR',
      description: 'test',
      extOrderId: 'ARC-2026-IDEM',
    });

    const headers = (fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }])[1].headers;
    expect(headers['Idempotency-Key']).toBe('ARC-2026-IDEM');
  });
});
