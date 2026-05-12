/* eslint-disable max-lines */

import { getDb, getEcommerceProductsDb } from '@/lib/mongodb';
import { ORDERS_COLLECTION } from '@/lib/orders';
import { getRedisConnection as getRedisConnectionUnsafe } from '@/shared/lib/queue';

import type { Db } from 'mongodb';

const PROMO_CODES: Readonly<Record<string, number | undefined>> = {
  ARCANA10: 0.10,
  ARCANA15: 0.15,
  WELCOME20: 0.20,
};

const PROMO_COLLECTION = 'ecom_discounts';
const DISCOUNT_COUPON_REDIS_KEY_PREFIX = 'ecommerce:discount-coupon';

type DiscountCouponType = 'fixed' | 'percentage';

type DiscountCouponDoc = {
  code?: unknown;
  discountType?: unknown;
  value?: unknown;
  enabled?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  minOrderAmount?: unknown;
  usageLimit?: unknown;
  singleUse?: unknown;
};

type PromoLookupResult = {
  found: boolean;
  evaluation: PromoEvaluation | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export type PromoEvaluation = {
  discountType: DiscountCouponType;
  discountValue: number;
  discountAmount: number;
  discountPct: number;
};

const isDiscountCouponType = (value: unknown): value is DiscountCouponType =>
  value === 'fixed' || value === 'percentage';

const TRUE_DISCOUNT_VALUES = new Set(['true', '1', 'yes', 'on']);
const FALSE_DISCOUNT_VALUES = new Set(['false', '0', 'no', 'off']);

type RedisDiscountCouponClient = {
  get: (key: string) => Promise<string | null>;
};
type GetRedisConnection = () => RedisDiscountCouponClient | null;

const getRedisConnection = getRedisConnectionUnsafe as GetRedisConnection;

const normalizeDiscountType = (value: unknown): DiscountCouponType => {
  if (isDiscountCouponType(value)) return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'fixed' || normalized === 'percentage') return normalized;
  return 'percentage';
};

const isOutOfPromoWindow = (
  startsAt: Date | null,
  endsAt: Date | null,
  now: Date,
): boolean => {
  if (startsAt !== null) {
    if (now < startsAt) return true;
  }
  if (endsAt !== null) {
    if (now > endsAt) return true;
  }
  return false;
};

const readCode = (code: string | null | undefined): string => {
  if (typeof code !== 'string') return '';
  return code.trim().toUpperCase().replace(/\s+/g, '');
};

const parseDbDate = (value: unknown): Date | null => {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
};

const toNumberValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeOptionalPositiveInteger = (value: unknown): number | null => {
  const numberValue = toNumberValue(value);
  if (numberValue === null) return null;
  if (!Number.isInteger(numberValue) || numberValue <= 0) return null;
  return numberValue;
};

const readBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (TRUE_DISCOUNT_VALUES.has(normalized)) return true;
    if (FALSE_DISCOUNT_VALUES.has(normalized)) return false;
  }
  return fallback;
};

const normalizePercentageValue = (value: number): number | null => {
  if (value <= 0) return null;
  return value > 1 ? value / 100 : value;
};

const readPromoEmail = (value: string | null | undefined): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const parseCachedPromoRecord = (value: string): DiscountCouponDoc | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const getDiscountCouponRedisKey = (code: string): string =>
  `${DISCOUNT_COUPON_REDIS_KEY_PREFIX}:${code}`;

const collectActivePromoFromRecord = async (
  code: string,
  subtotal: number,
  email: string,
  record: DiscountCouponDoc
): Promise<PromoEvaluation | null> => {
  const now = new Date();
  const startsAt = parseDbDate(record.startsAt);
  const endsAt = parseDbDate(record.endsAt);
  if (isOutOfPromoWindow(startsAt, endsAt, now)) return null;
  if (record.enabled === false) return null;

  const rawType = normalizeDiscountType(record.discountType);
  const rawValue = toNumberValue(record.value);
  if (rawValue === null) return null;

  const minOrderAmount = toNumberValue(record.minOrderAmount);
  if (minOrderAmount !== null) {
    if (subtotal < minOrderAmount) return null;
  }

  const usageLimit = normalizeOptionalPositiveInteger(record.usageLimit);
  const singleUse = readBoolean(record.singleUse, false);

  const isUsageBlocked = await isPromoUsageLimited({
    code,
    usageLimit,
    singleUse,
    email,
  });

  if (isUsageBlocked) return null;

  return toEvaluation(rawType, rawValue, subtotal);
};

const isPromoUsageLimited = async (params: {
  code: string;
  usageLimit: number | null;
  singleUse: boolean;
  email: string;
}): Promise<boolean> => {
    if (params.usageLimit === null && !params.singleUse) return false;

    const singleUseActive = params.singleUse;
    const usageLimit = params.usageLimit;

  try {
    const db = await getDb();
    const orders = db.collection(ORDERS_COLLECTION);

    if (singleUseActive && params.email.length > 0) {
      const existing = await orders.findOne({
        promoCode: params.code,
        email: params.email,
        status: { $ne: 'cancelled' },
      });
      if (existing !== null) return true;
    }

    if (usageLimit === null) return false;

    const usedCount = await orders.countDocuments({
      promoCode: params.code,
      status: { $ne: 'cancelled' },
    });

    return usedCount >= usageLimit;
  } catch {
    return false;
  }
};

const toEvaluation = (
  discountType: DiscountCouponType,
  discountValue: number,
  subtotal: number,
): PromoEvaluation | null => {
  const roundedSubtotal = Math.round(Math.max(0, subtotal));
  if (discountType === 'percentage') {
    const normalizedPct = normalizePercentageValue(discountValue);
    if (normalizedPct === null) return null;
    const discountAmount = Math.round(roundedSubtotal * normalizedPct);
    const discountPct = roundedSubtotal > 0 ? discountAmount / roundedSubtotal : 0;
    return {
      discountType,
      discountValue: normalizedPct,
      discountAmount,
      discountPct,
    };
  }

  const fixed = Math.max(0, Math.round(discountValue));
  if (!Number.isFinite(fixed) || fixed <= 0) return null;
  const discountAmount = Math.min(roundedSubtotal, fixed);
  const discountPct = roundedSubtotal > 0 ? discountAmount / roundedSubtotal : 0;
  return {
    discountType,
    discountValue: fixed,
    discountAmount,
    discountPct,
  };
};

const collectActivePromoFromDb = async (
  code: string,
  subtotal: number,
  email?: string
): Promise<PromoLookupResult> => {
  const db: Db = await getEcommerceProductsDb();
  const doc = await db.collection<DiscountCouponDoc>(PROMO_COLLECTION).findOne({ code });
  if (doc === null) return { found: false, evaluation: null };
  return {
    found: true,
    evaluation: await collectActivePromoFromRecord(code, subtotal, readPromoEmail(email), doc),
  };
};

const collectActivePromoFromRedis = async (
  code: string,
  subtotal: number,
  email: string
): Promise<PromoLookupResult> => {
  const redisClient = getRedisConnection();
  if (redisClient === null) return { found: false, evaluation: null };

  try {
    const cached = await redisClient.get(getDiscountCouponRedisKey(code));
    if (cached === null) return { found: false, evaluation: null };

    const parsed = parseCachedPromoRecord(cached);
    if (parsed === null) return { found: false, evaluation: null };
    return {
      found: true,
      evaluation: await collectActivePromoFromRecord(
        code,
        subtotal,
        readPromoEmail(email),
        parsed
      ),
    };
  } catch {
    return { found: false, evaluation: null };
  }
};

const evaluateStaticPromo = (code: string, subtotal: number): PromoEvaluation | null => {
  const pct = PROMO_CODES[code];
  if (pct === undefined) return null;
  return toEvaluation('percentage', pct, subtotal);
};

export async function validatePromoCode(code: string | null | undefined, subtotal = 0): Promise<number> {
  const normalized = readCode(code);
  if (normalized === '') return 0;
  const dynamic = await lookupPromoDiscount(normalized, subtotal);
  if (dynamic === null) return 0;
  return dynamic.discountType === 'percentage' ? dynamic.discountValue : 0;
}

export async function computeDiscount(
  subtotal: number,
  promoCode: string | null | undefined,
  email?: string | null
): Promise<number> {
  const normalized = readCode(promoCode);
  const result = await lookupPromoDiscount(normalized, subtotal, readPromoEmail(email));
  if (result === null) return 0;
  return result.discountAmount;
}

export async function isValidPromoCode(
  code: string | null | undefined,
  subtotal = 0,
  email?: string | null
): Promise<boolean> {
  const normalized = readCode(code);
  if (normalized === '') return false;
  return (await lookupPromoDiscount(normalized, subtotal, readPromoEmail(email))) !== null;
}

export async function getPromoDiscountPct(
  code: string | null | undefined,
  subtotal = 0,
  email?: string | null
): Promise<number> {
  const normalized = readCode(code);
  const result = await lookupPromoDiscount(normalized, subtotal, readPromoEmail(email));
  return result?.discountType === 'percentage' ? result.discountValue : result?.discountPct ?? 0;
}

export async function lookupPromoDiscount(
  code: string | null | undefined,
  subtotal = 0,
  email?: string | null
): Promise<PromoEvaluation | null> {
  const normalized = readCode(code);
  if (normalized === '') return null;
  const normalizedEmail = readPromoEmail(email);

  const fromRedis = await collectActivePromoFromRedis(
    normalized,
    subtotal,
    normalizedEmail
  );
  if (fromRedis.found) return fromRedis.evaluation;

  try {
    const fromDb = await collectActivePromoFromDb(
      normalized,
      subtotal,
      normalizedEmail
    );
    if (fromDb.found) return fromDb.evaluation;
  } catch {
    // Fallback to local static list when ecommerce DB is unavailable.
  }

  return evaluateStaticPromo(normalized, subtotal);
}
