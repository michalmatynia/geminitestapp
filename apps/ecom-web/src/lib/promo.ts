const PROMO_CODES: Record<string, number> = {
  ARCANA10: 0.10,
  ARCANA15: 0.15,
  WELCOME20: 0.20,
};

export function validatePromoCode(code: string | null | undefined): number {
  if (!code) return 0;
  return PROMO_CODES[code.trim().toUpperCase()] ?? 0;
}

export function computeDiscount(subtotal: number, promoCode: string | null | undefined): number {
  const pct = validatePromoCode(promoCode);
  if (pct === 0) return 0;
  return Math.round(subtotal * pct);
}

export function isValidPromoCode(code: string): boolean {
  return code.trim().toUpperCase() in PROMO_CODES;
}

export function getPromoDiscountPct(code: string): number {
  return PROMO_CODES[code.trim().toUpperCase()] ?? 0;
}
