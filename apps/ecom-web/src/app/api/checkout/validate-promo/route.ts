import { NextRequest, NextResponse } from 'next/server';
import { isValidPromoCode, getPromoDiscountPct } from '@/lib/promo';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

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

  const code = typeof (body as Record<string, unknown>)['code'] === 'string'
    ? ((body as Record<string, unknown>)['code'] as string).trim()
    : '';

  if (!code) {
    return NextResponse.json({ valid: false });
  }

  const valid = isValidPromoCode(code);
  return NextResponse.json(valid
    ? { valid: true, discountPct: getPromoDiscountPct(code) }
    : { valid: false },
  );
}
