import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ORDERS_COLLECTION, type Order } from '@/lib/orders';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { ensureAppIndexes } from '@/lib/db-indexes';
import { buildValidatedCheckoutOrder, isRecord } from '@/lib/checkout-order';
import {
  readBankTransferProviderSettings,
  type BankTransferProviderSettings,
} from '@/lib/providerSettings';

type BankTransferDetails = {
  accountName: string;
  bankName: string;
  bic: string;
  enabled: boolean;
  iban: string;
};

function firstNonEmpty(...values: string[]): string {
  for (const value of values) {
    if (value.trim() !== '') return value.trim();
  }
  return '';
}

function readEnvBankTransferDetails(): BankTransferDetails {
  const iban = process.env['BANK_TRANSFER_IBAN']?.trim() ?? '';
  const accountName = process.env['BANK_TRANSFER_ACCOUNT_NAME']?.trim() ?? '';
  const hasRequiredDetails = iban !== '' && accountName !== '';
  return {
    enabled: (process.env['BANK_TRANSFER_ENABLED']?.trim() === 'true' || hasRequiredDetails) && hasRequiredDetails,
    accountName,
    iban,
    bic: process.env['BANK_TRANSFER_BIC']?.trim() ?? '',
    bankName: process.env['BANK_TRANSFER_BANK_NAME']?.trim() ?? '',
  };
}

function resolveBankTransferDetails(settings: BankTransferProviderSettings | null): BankTransferDetails {
  const envDetails = readEnvBankTransferDetails();
  if (settings === null) return envDetails;

  const accountName = firstNonEmpty(settings.accountName, envDetails.accountName);
  const iban = firstNonEmpty(settings.iban, envDetails.iban);
  const bic = firstNonEmpty(settings.bic, envDetails.bic);
  const bankName = firstNonEmpty(settings.bankName, envDetails.bankName);

  return {
    accountName,
    bankName,
    bic,
    enabled: settings.enabled && accountName !== '' && iban !== '',
    iban,
  };
}

async function readBankTransferDetails(): Promise<BankTransferDetails> {
  return resolveBankTransferDetails(await readBankTransferProviderSettings());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  void ensureAppIndexes();
  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = checkRateLimit(`bank_transfer:${ip}`, 10, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }

  const bankDetails = await readBankTransferDetails();
  if (!bankDetails.enabled) {
    return NextResponse.json({ error: 'Bank transfer is not available.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const result = await buildValidatedCheckoutOrder(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const {
    orderId, userId, email, pricedItems,
    shippingSelection, shippingAddress, inpostPoint,
    subtotal, discount, promoCode, total,
  } = result.order;

  const now = new Date().toISOString();
  const order: Omit<Order, '_id'> = {
    orderId,
    ...(userId !== undefined ? { userId } : {}),
    email,
    status: 'pending_payment',
    paymentMethod: 'bank_transfer',
    items: pricedItems,
    shippingMethod: shippingSelection.shippingMethod,
    shippingPrice: shippingSelection.shippingPrice,
    shippingCarrier: shippingSelection.shippingCarrier,
    shippingService: shippingSelection.shippingService,
    ...(inpostPoint !== null ? { inpostPoint } : {}),
    shippingAddress,
    subtotal,
    discount,
    promoCode,
    total,
    createdAt: now,
  };

  try {
    const db = await getDb();
    await db.collection(ORDERS_COLLECTION).insertOne(order);
  } catch {
    return NextResponse.json({ error: 'Failed to create order. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({
    orderId,
    email,
    total,
    bankDetails: {
      accountName: bankDetails.accountName,
      iban: bankDetails.iban,
      bic: bankDetails.bic,
      bankName: bankDetails.bankName,
      reference: orderId,
    },
  });
}
