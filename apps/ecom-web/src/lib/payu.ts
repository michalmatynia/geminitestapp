import { createHash, timingSafeEqual } from 'crypto';

import { readPayUProviderSettings, type PayUProviderSettings } from './providerSettings';

const DEFAULT_PAYU_API_URL = 'https://secure.snd.payu.com';

type PayUConfig = {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  enabled: boolean;
  posId: string;
  secondKey: string;
};

function env(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function firstNonEmpty(...values: string[]): string {
  for (const value of values) {
    if (value.length > 0) return value;
  }
  return '';
}

function getDisabledPayUConfig(apiUrl: string): PayUConfig {
  return {
    apiUrl: firstNonEmpty(apiUrl, DEFAULT_PAYU_API_URL),
    clientId: '',
    clientSecret: '',
    enabled: false,
    posId: '',
    secondKey: '',
  };
}

function storedPayUValue(
  settings: PayUProviderSettings | null,
  key: keyof Omit<PayUProviderSettings, 'enabled'>
): string {
  return settings === null ? '' : settings[key];
}

function getActivePayUConfig(settings: PayUProviderSettings | null): PayUConfig {
  return {
    apiUrl: firstNonEmpty(storedPayUValue(settings, 'apiUrl'), env('PAYU_API_URL'), DEFAULT_PAYU_API_URL),
    clientId: firstNonEmpty(storedPayUValue(settings, 'clientId'), env('PAYU_CLIENT_ID')),
    clientSecret: firstNonEmpty(storedPayUValue(settings, 'clientSecret'), env('PAYU_CLIENT_SECRET')),
    enabled: true,
    posId: firstNonEmpty(storedPayUValue(settings, 'posId'), env('PAYU_POS_ID')),
    secondKey: firstNonEmpty(storedPayUValue(settings, 'secondKey'), env('PAYU_SECOND_KEY')),
  };
}

async function getPayUConfig(): Promise<PayUConfig> {
  const settings = await readPayUProviderSettings();
  if (settings !== null && settings.enabled === false) {
    return getDisabledPayUConfig(settings.apiUrl);
  }

  return getActivePayUConfig(settings);
}

async function getPayUToken(config: PayUConfig): Promise<string> {
  const res = await fetch(`${config.apiUrl}/pl/standard/user/oauth/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }).toString(),
    cache: 'no-store',
  });
  if (res.ok === false) throw new Error(`PayU auth failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export interface PayUProduct {
  name: string;
  unitPrice: number; // in smallest currency unit (grosz / cents)
  quantity: number;
}

export interface PayUBuyer {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  language?: string;
}

export interface CreatePayUBlikParams {
  notifyUrl: string;
  customerIp: string;
  description: string;
  currencyCode: string;
  totalAmount: number; // in smallest currency unit
  buyer: PayUBuyer;
  products: PayUProduct[];
  blikCode: string;
  extOrderId?: string; // our own order reference
}

export interface PayUOrderResult {
  payuOrderId: string;
  statusCode: string;
}

type PayUOrderBody = {
  notifyUrl: string;
  customerIp: string;
  merchantPosId: string;
  description: string;
  currencyCode: string;
  totalAmount: number;
  buyer: PayUBuyer;
  products: PayUProduct[];
  payMethods: {
    payMethod: {
      type: 'PBL';
      value: 'BLIK';
      authorizationCode: string;
    };
  };
  extOrderId?: string;
};

function buildPayUOrderBody(params: CreatePayUBlikParams, config: PayUConfig): PayUOrderBody {
  const body: PayUOrderBody = {
    notifyUrl: params.notifyUrl,
    customerIp: params.customerIp,
    merchantPosId: config.posId,
    description: params.description,
    currencyCode: params.currencyCode,
    totalAmount: params.totalAmount,
    buyer: params.buyer,
    products: params.products,
    payMethods: {
      payMethod: {
        type: 'PBL',
        value: 'BLIK',
        authorizationCode: params.blikCode,
      },
    },
  };

  const extOrderId = params.extOrderId;
  if (extOrderId !== undefined && extOrderId !== '') {
    body.extOrderId = extOrderId;
  }
  return body;
}

function isPayUSuccessStatus(status: number, statusCode: string): boolean {
  if (status === 302) return true;
  if (status === 201) return true;
  return statusCode === 'SUCCESS';
}

function normalizePayUStatusCode(statusCode: string): string {
  return statusCode === '' ? 'PENDING' : statusCode;
}

function parsePayUOrderResponse(body: string): {
  orderId?: string;
  status?: { statusCode: string; statusDesc?: string };
  redirectUri?: string;
} {
  try {
    return JSON.parse(body) as {
      orderId?: string;
      status?: { statusCode: string; statusDesc?: string };
      redirectUri?: string;
    };
  } catch {
    throw new Error('PayU returned invalid JSON');
  }
}

function parseNonEmptyPayUOrderResponse(body: string, status: number): ReturnType<typeof parsePayUOrderResponse> {
  if (body === '') throw new Error(`PayU returned empty body: ${status}`);
  return parsePayUOrderResponse(body);
}

function payuStatusCode(data: ReturnType<typeof parsePayUOrderResponse>): string {
  return data.status?.statusCode ?? '';
}

function assertPayUSuccess(status: number, statusCode: string, statusDesc: string | undefined): void {
  if (!isPayUSuccessStatus(status, statusCode)) {
    throw new Error(statusDesc ?? `PayU order failed: ${status} ${statusCode}`);
  }
}

function readPayUOrderId(data: ReturnType<typeof parsePayUOrderResponse>, status: number, statusCode: string): string {
  const payuOrderId = data.orderId?.trim() ?? '';
  if (payuOrderId.length === 0) {
    throw new Error(`PayU returned success without order ID: ${status} ${normalizePayUStatusCode(statusCode)}`);
  }
  return payuOrderId;
}

function getSuccessfulPayUOrderResult(
  status: number,
  data: ReturnType<typeof parsePayUOrderResponse>,
): PayUOrderResult {
  const statusCode = payuStatusCode(data);
  assertPayUSuccess(status, statusCode, data.status?.statusDesc);

  return {
    payuOrderId: readPayUOrderId(data, status, statusCode),
    statusCode: normalizePayUStatusCode(statusCode),
  };
}

export async function createPayUBlikOrder(
  params: CreatePayUBlikParams,
): Promise<PayUOrderResult> {
  const config = await getPayUConfig();
  if (!config.enabled) throw new Error('PayU provider is disabled.');
  if (config.posId === '' || config.clientId === '' || config.clientSecret === '') {
    throw new Error('PayU POS ID, client ID, and client secret are not configured.');
  }
  const token = await getPayUToken(config);

  const res = await fetch(`${config.apiUrl}/api/v2_1/orders`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(buildPayUOrderBody(params, config)),
    cache: 'no-store',
  });

  // PayU returns 302 on success (follow manually) or 201 in sandbox
  const body = await res.text();
  const data = parseNonEmptyPayUOrderResponse(body, res.status);
  return getSuccessfulPayUOrderResult(res.status, data);
}

// Verifies the OpenPayU-Signature header for incoming IPN webhooks.
// Header format: sender=checkout;signature=<hex>;algorithm=MD5;content=DOCUMENT
export async function verifyPayUWebhook(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const config = await getPayUConfig();
  const secondKey = config.enabled ? config.secondKey : '';
  if (signatureHeader === null || secondKey === '') return false;

  const sigMatch = /signature=([a-f0-9]{32})/i.exec(signatureHeader);
  if (sigMatch === null) return false;
  const signature = sigMatch[1];
  if (signature === '') return false;

  const expected = createHash('md5')
    .update(rawBody + secondKey)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected.toLowerCase(), 'utf8');
  const actualBuffer = Buffer.from(signature.toLowerCase(), 'utf8');

  return (
    expectedBuffer.length === actualBuffer.length
    && timingSafeEqual(expectedBuffer, actualBuffer)
  );
}
