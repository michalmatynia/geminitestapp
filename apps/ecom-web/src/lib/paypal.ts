import 'server-only';

import { readPayPalProviderSettings } from './providerSettings';

const PAYPAL_LIVE_URL = 'https://api-m.paypal.com';
const PAYPAL_SANDBOX_URL = 'https://api-m.sandbox.paypal.com';

type PayPalConfig = {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  mode: 'sandbox' | 'live';
  enabled: boolean;
  apiUrl: string;
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

function apiUrlForMode(mode: 'sandbox' | 'live'): string {
  return mode === 'live' ? PAYPAL_LIVE_URL : PAYPAL_SANDBOX_URL;
}

async function getPayPalConfig(): Promise<PayPalConfig> {
  const settings = await readPayPalProviderSettings();
  const mode: 'sandbox' | 'live' =
    settings?.mode ?? (env('PAYPAL_MODE') === 'live' ? 'live' : 'sandbox');
  if (settings !== null && settings.enabled === false) {
    return { clientId: '', clientSecret: '', webhookId: '', mode, enabled: false, apiUrl: apiUrlForMode(mode) };
  }
  return {
    clientId: firstNonEmpty(settings?.clientId ?? '', env('PAYPAL_CLIENT_ID')),
    clientSecret: firstNonEmpty(settings?.clientSecret ?? '', env('PAYPAL_CLIENT_SECRET')),
    webhookId: firstNonEmpty(settings?.webhookId ?? '', env('PAYPAL_WEBHOOK_ID')),
    mode,
    enabled: true,
    apiUrl: apiUrlForMode(mode),
  };
}

async function getAccessToken(config: PayPalConfig): Promise<string> {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const res = await fetch(`${config.apiUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function toDecimalAmount(grosz: number): string {
  return (grosz / 100).toFixed(2);
}

export type PayPalLineItem = {
  name: string;
  unit_amount: { currency_code: string; value: string };
  quantity: string;
};

export type CreatePayPalOrderParams = {
  amount: number;
  currency: string;
  items: PayPalLineItem[];
  description: string;
  extOrderId: string;
  returnUrl: string;
  cancelUrl: string;
};

export type PayPalOrderResult = {
  paypalOrderId: string;
  approveUrl: string;
};

export type CapturePayPalOrderResult = {
  paypalOrderId: string;
  status: string;
};

export async function createPayPalOrder(params: CreatePayPalOrderParams): Promise<PayPalOrderResult> {
  const config = await getPayPalConfig();
  if (!config.enabled || config.clientId === '') throw new Error('PayPal is not configured');

  const token = await getAccessToken(config);
  const amountStr = toDecimalAmount(params.amount);

  const res = await fetch(`${config.apiUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': params.extOrderId,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.extOrderId,
          description: params.description,
          amount: {
            currency_code: params.currency,
            value: amountStr,
            breakdown: { item_total: { currency_code: params.currency, value: amountStr } },
          },
          items: params.items,
        },
      ],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
        brand_name: 'Stargater',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    }),
    cache: 'no-store',
  });

  const data = (await res.json()) as {
    id?: string;
    links?: Array<{ rel: string; href: string }>;
    message?: string;
    name?: string;
  };

  if (!res.ok) throw new Error(data.message ?? `PayPal order creation failed: ${res.status}`);

  const approveUrl = data.links?.find((l) => l.rel === 'approve')?.href ?? '';
  return { paypalOrderId: data.id ?? '', approveUrl };
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<CapturePayPalOrderResult> {
  const config = await getPayPalConfig();
  if (!config.enabled || config.clientId === '') throw new Error('PayPal is not configured');

  const token = await getAccessToken(config);
  const res = await fetch(`${config.apiUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const data = (await res.json()) as {
    id?: string;
    status?: string;
    message?: string;
    name?: string;
  };

  if (!res.ok && res.status !== 422) {
    throw new Error(data.message ?? `PayPal capture failed: ${res.status}`);
  }

  return {
    paypalOrderId: data.id ?? paypalOrderId,
    status: data.status ?? 'DECLINED',
  };
}

export async function verifyPayPalWebhook(
  rawBody: string,
  headers: {
    'paypal-auth-algo'?: string | null;
    'paypal-cert-url'?: string | null;
    'paypal-transmission-id'?: string | null;
    'paypal-transmission-sig'?: string | null;
    'paypal-transmission-time'?: string | null;
  },
): Promise<boolean> {
  try {
    const config = await getPayPalConfig();
    if (!config.enabled || config.webhookId === '') return false;

    const token = await getAccessToken(config);
    const res = await fetch(`${config.apiUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        client_id: config.clientId,
        webhook_id: config.webhookId,
        webhook_event: JSON.parse(rawBody) as unknown,
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
      }),
      cache: 'no-store',
    });

    const data = (await res.json()) as { verification_status?: string };
    return data.verification_status === 'SUCCESS';
  } catch {
    return false;
  }
}

export async function getPayPalClientId(): Promise<string> {
  const settings = await readPayPalProviderSettings();
  return firstNonEmpty(settings?.clientId ?? '', env('NEXT_PUBLIC_PAYPAL_CLIENT_ID'));
}

export async function getPayPalMode(): Promise<'sandbox' | 'live'> {
  const settings = await readPayPalProviderSettings();
  if (settings?.mode === 'live') return 'live';
  return env('PAYPAL_MODE') === 'live' ? 'live' : 'sandbox';
}
