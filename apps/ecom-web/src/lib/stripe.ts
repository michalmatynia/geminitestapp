import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';
import { readStripeProviderSettings, type StripeProviderSettings } from './providerSettings';

const STRIPE_API_URL = 'https://api.stripe.com';
const STRIPE_API_VERSION = '2024-04-10';
const WEBHOOK_TOLERANCE_SECONDS = 300;

type StripeConfig = {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  enabled: boolean;
};

function env(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function firstNonEmpty(...values: string[]): string {
  for (const v of values) {
    if (v.length > 0) return v;
  }
  return '';
}

function getDisabledStripeConfig(): StripeConfig {
  return { publishableKey: '', secretKey: '', webhookSecret: '', enabled: false };
}

function getActiveStripeConfig(settings: StripeProviderSettings | null): StripeConfig {
  return {
    publishableKey: firstNonEmpty(settings?.publishableKey ?? '', env('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')),
    secretKey: firstNonEmpty(settings?.secretKey ?? '', env('STRIPE_SECRET_KEY')),
    webhookSecret: firstNonEmpty(settings?.webhookSecret ?? '', env('STRIPE_WEBHOOK_SECRET')),
    enabled: true,
  };
}

async function getStripeConfig(): Promise<StripeConfig> {
  const settings = await readStripeProviderSettings();
  if (settings !== null && settings.enabled === false) return getDisabledStripeConfig();
  return getActiveStripeConfig(settings);
}

async function stripePost<T>(
  secretKey: string,
  path: string,
  params: URLSearchParams,
  idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Stripe-Version': STRIPE_API_VERSION,
  };
  if (idempotencyKey !== undefined && idempotencyKey !== '') {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  const res = await fetch(`${STRIPE_API_URL}${path}`, {
    method: 'POST',
    headers,
    body: params.toString(),
    cache: 'no-store',
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } }).error?.message ?? `Stripe API error: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export type CreateStripePaymentIntentParams = {
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, string>;
  extOrderId?: string;
};

export type StripePaymentIntentResult = {
  paymentIntentId: string;
  clientSecret: string;
  publishableKey: string;
};

export async function createStripePaymentIntent(
  params: CreateStripePaymentIntentParams,
): Promise<StripePaymentIntentResult> {
  const config = await getStripeConfig();
  if (!config.enabled || config.secretKey === '') {
    throw new Error('Stripe is not configured');
  }

  const body = new URLSearchParams({
    amount: String(params.amount),
    currency: params.currency.toLowerCase(),
    description: params.description,
    'automatic_payment_methods[enabled]': 'true',
  });

  for (const [key, value] of Object.entries(params.metadata ?? {})) {
    body.set(`metadata[${key}]`, value);
  }

  const data = await stripePost<{ id: string; client_secret: string }>(
    config.secretKey,
    '/v1/payment_intents',
    body,
    params.extOrderId,
  );

  return {
    paymentIntentId: data.id,
    clientSecret: data.client_secret,
    publishableKey: config.publishableKey,
  };
}

function parseStripeSignature(header: string): { timestamp: string; sig: string } {
  const parts = header.split(',');
  return {
    timestamp: parts.find((p) => p.startsWith('t='))?.slice(2) ?? '',
    sig: parts.find((p) => p.startsWith('v1='))?.slice(3) ?? '',
  };
}

export function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
): boolean {
  try {
    const { timestamp, sig } = parseStripeSignature(signatureHeader);
    if (timestamp === '' || sig === '') return false;

    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > WEBHOOK_TOLERANCE_SECONDS) return false;

    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'hex');
    const sigBuf = Buffer.from(sig, 'hex');
    if (expectedBuf.length !== sigBuf.length) return false;

    return timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}

export async function verifyStripeWebhook(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (signatureHeader === null) return false;
  const config = await getStripeConfig();
  if (config.webhookSecret === '') return false;
  return verifyStripeWebhookSignature(rawBody, signatureHeader, config.webhookSecret);
}
