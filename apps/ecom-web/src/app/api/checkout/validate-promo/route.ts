import { type NextRequest, NextResponse } from 'next/server';
import { lookupPromoDiscount } from '@/lib/promo';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const normalizePromoCode = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase().replace(/\s+/g, '');
};

function parseEmail(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const email = (body as Record<string, unknown>)['email'];
  return typeof email === 'string' ? email.trim() : null;
}

function parseSubtotal(body: unknown): number {
  if (typeof body !== 'object' || body === null) {
    return 0;
  }
  const subtotalRaw = (body as Record<string, unknown>)['subtotal'];
  if (typeof subtotalRaw !== 'number' || !Number.isFinite(subtotalRaw)) {
    return 0;
  }
  return Math.round(subtotalRaw);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = checkRateLimit(`promo:${ip}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const code = normalizePromoCode((body as Record<string, unknown>)['code']);
  const email = parseEmail(body);
  const subtotal = parseSubtotal(body);

  if (code === '') {
    return NextResponse.json({ valid: false });
  }

  const resolved = await lookupPromoDiscount(code, subtotal, email);
  if (resolved === null) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    discountType: resolved.discountType,
    discountValue: resolved.discountValue,
    discountAmount: resolved.discountAmount,
    discountPct: resolved.discountType === 'percentage' ? resolved.discountValue : resolved.discountPct,
  });
}
