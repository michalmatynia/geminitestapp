import { createHash, timingSafeEqual } from 'crypto';

// Read static config eagerly — these don't change at runtime.
const PAYU_API_URL = process.env.PAYU_API_URL ?? 'https://secure.snd.payu.com';
const PAYU_POS_ID = process.env.PAYU_POS_ID ?? '';
const PAYU_CLIENT_ID = process.env.PAYU_CLIENT_ID ?? '';
const PAYU_CLIENT_SECRET = process.env.PAYU_CLIENT_SECRET ?? '';
// Read lazily in verifyPayUWebhook so tests can stub it with vi.stubEnv.
const getSecondKey = (): string => process.env.PAYU_SECOND_KEY ?? '';

async function getPayUToken(): Promise<string> {
  const res = await fetch(`${PAYU_API_URL}/pl/standard/user/oauth/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: PAYU_CLIENT_ID,
      client_secret: PAYU_CLIENT_SECRET,
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

function buildPayUOrderBody(params: CreatePayUBlikParams): PayUOrderBody {
  const body: PayUOrderBody = {
    notifyUrl: params.notifyUrl,
    customerIp: params.customerIp,
    merchantPosId: PAYU_POS_ID,
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

export async function createPayUBlikOrder(
  params: CreatePayUBlikParams,
): Promise<PayUOrderResult> {
  const token = await getPayUToken();

  const res = await fetch(`${PAYU_API_URL}/api/v2_1/orders`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(buildPayUOrderBody(params)),
    cache: 'no-store',
  });

  // PayU returns 302 on success (follow manually) or 201 in sandbox
  const body = await res.text();
  if (body === '') throw new Error(`PayU returned empty body: ${res.status}`);

  const data = parsePayUOrderResponse(body);

  const statusCode = data.status?.statusCode ?? '';
  if (!isPayUSuccessStatus(res.status, statusCode)) {
    throw new Error(data.status?.statusDesc ?? `PayU order failed: ${res.status} ${statusCode}`);
  }

  return {
    payuOrderId: data.orderId ?? '',
    statusCode: normalizePayUStatusCode(statusCode),
  };
}

// Verifies the OpenPayU-Signature header for incoming IPN webhooks.
// Header format: sender=checkout;signature=<hex>;algorithm=MD5;content=DOCUMENT
export function verifyPayUWebhook(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secondKey = getSecondKey();
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
