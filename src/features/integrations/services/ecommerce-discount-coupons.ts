import 'server-only';

import type { Document } from 'mongodb';

import { validationError } from '@/shared/errors/app-error';

import {
  getAllEcommerceExportDbTargetsForWrite,
  type EcommerceExportDbTarget,
} from './ecommerce-product-export.config';

const ECOM_DISCOUNTS_COLLECTION = 'ecom_discounts';

export type EcommerceDiscountCouponType = 'fixed' | 'percentage';

export type EcommerceDiscountCouponInput = {
  code: string;
  discountType: EcommerceDiscountCouponType;
  enabled: boolean;
  endsAt: string | null;
  minOrderAmount: number | null;
  singleUse: boolean;
  startsAt: string | null;
  usageLimit: number | null;
  value: number;
};

export type EcommerceDiscountCoupon = EcommerceDiscountCouponInput & {
  createdAt: string | null;
  targetSources: EcommerceExportDbTarget['source'][];
  updatedAt: string | null;
};

export type EcommerceDiscountCouponTargetResult = {
  dbName: string;
  source: EcommerceExportDbTarget['source'];
};

export type EcommerceDiscountCouponListResult = {
  coupons: EcommerceDiscountCoupon[];
  targets: EcommerceDiscountCouponTargetResult[];
};

export type EcommerceDiscountCouponWriteResult = {
  coupon: EcommerceDiscountCoupon;
  targets: EcommerceDiscountCouponTargetResult[];
};

type EcommerceDiscountCouponDocument = Document & {
  code?: unknown;
  createdAt?: unknown;
  discountType?: unknown;
  enabled?: unknown;
  endsAt?: unknown;
  minOrderAmount?: unknown;
  singleUse?: unknown;
  startsAt?: unknown;
  updatedAt?: unknown;
  usageLimit?: unknown;
  value?: unknown;
};

const isDiscountCouponType = (value: unknown): value is EcommerceDiscountCouponType =>
  value === 'fixed' || value === 'percentage';

const trimString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeCouponCode = (code: string): string =>
  code.trim().toUpperCase().replace(/\s+/g, '');

const nullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const nullablePositiveInteger = (value: unknown): number | null => {
  const numberValue = nullableNumber(value);
  if (numberValue === null) return null;
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const readBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const toDateOrNull = (value: string | null): Date | null => {
  if (value === null) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw validationError('Coupon date is invalid.', { value });
  }
  return date;
};

const toIsoStringOrNull = (value: unknown): string | null => {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const normalizeCouponDateInput = (value: string | null): string | null =>
  toDateOrNull(value)?.toISOString() ?? null;

const normalizeNullableRoundedNumber = (value: number | null, min: number): number | null =>
  value === null ? null : Math.max(min, Math.round(value));

const normalizeCouponInput = (
  input: EcommerceDiscountCouponInput
): EcommerceDiscountCouponInput => {
  const code = normalizeCouponCode(input.code);
  if (code.length === 0) {
    throw validationError('Coupon code is required.');
  }
  if (!isDiscountCouponType(input.discountType)) {
    throw validationError('Coupon discount type is invalid.', { discountType: input.discountType });
  }
  if (!Number.isFinite(input.value) || input.value <= 0) {
    throw validationError('Coupon value must be greater than zero.', { value: input.value });
  }
  return {
    ...input,
    code,
    endsAt: normalizeCouponDateInput(input.endsAt),
    minOrderAmount: normalizeNullableRoundedNumber(input.minOrderAmount, 0),
    startsAt: normalizeCouponDateInput(input.startsAt),
    usageLimit: normalizeNullableRoundedNumber(input.usageLimit, 1),
    value: normalizeCouponValue(input.discountType, input.value),
  };
};

const normalizeCouponValue = (
  discountType: EcommerceDiscountCouponType,
  value: number
): number => {
  if (discountType === 'fixed') return Math.round(value);
  if (value > 1) return value / 100;
  return value;
};

const targetResult = (
  target: EcommerceExportDbTarget
): EcommerceDiscountCouponTargetResult => ({
  dbName: target.dbName,
  source: target.source,
});

const toCoupon = (
  doc: EcommerceDiscountCouponDocument,
  source: EcommerceExportDbTarget['source']
): EcommerceDiscountCoupon | null => {
  const code = normalizeCouponCode(trimString(doc.code));
  const value = nullableNumber(doc.value);
  if (code.length === 0 || value === null) return null;
  const discountType = isDiscountCouponType(doc.discountType) ? doc.discountType : 'percentage';
  return {
    code,
    discountType,
    enabled: readBoolean(doc.enabled, true),
    endsAt: toIsoStringOrNull(doc.endsAt),
    minOrderAmount: nullableNumber(doc.minOrderAmount),
    singleUse: readBoolean(doc.singleUse, false),
    startsAt: toIsoStringOrNull(doc.startsAt),
    usageLimit: nullablePositiveInteger(doc.usageLimit),
    value: normalizeCouponValue(discountType, value),
    createdAt: toIsoStringOrNull(doc.createdAt),
    targetSources: [source],
    updatedAt: toIsoStringOrNull(doc.updatedAt),
  };
};

const mergeCoupon = (
  byCode: Map<string, EcommerceDiscountCoupon>,
  coupon: EcommerceDiscountCoupon
): void => {
  const current = byCode.get(coupon.code);
  if (current === undefined) {
    byCode.set(coupon.code, coupon);
    return;
  }
  byCode.set(coupon.code, {
    ...current,
    targetSources: Array.from(new Set([...current.targetSources, ...coupon.targetSources])),
  });
};

export const listEcommerceDiscountCoupons =
  async (): Promise<EcommerceDiscountCouponListResult> => {
    const targets = await getAllEcommerceExportDbTargetsForWrite();
    const byCode = new Map<string, EcommerceDiscountCoupon>();
    await Promise.all(
      targets.map(async (target) => {
        const docs = await target.db
          .collection<EcommerceDiscountCouponDocument>(ECOM_DISCOUNTS_COLLECTION)
          .find({})
          .sort({ code: 1 })
          .toArray();
        docs.forEach((doc) => {
          const coupon = toCoupon(doc, target.source);
          if (coupon !== null) mergeCoupon(byCode, coupon);
        });
      })
    );
    return {
      coupons: Array.from(byCode.values()).sort((left, right) =>
        left.code.localeCompare(right.code)
      ),
      targets: targets.map(targetResult),
    };
  };

export const saveEcommerceDiscountCoupon = async (
  input: EcommerceDiscountCouponInput
): Promise<EcommerceDiscountCouponWriteResult> => {
  const coupon = normalizeCouponInput(input);
  const targets = await getAllEcommerceExportDbTargetsForWrite();
  const now = new Date();
  await Promise.all(
    targets.map(async (target) => {
      await target.db.collection(ECOM_DISCOUNTS_COLLECTION).updateOne(
        { code: coupon.code },
        {
          $set: {
            code: coupon.code,
            discountType: coupon.discountType,
            enabled: coupon.enabled,
            endsAt: toDateOrNull(coupon.endsAt),
            minOrderAmount: coupon.minOrderAmount,
            singleUse: coupon.singleUse,
            startsAt: toDateOrNull(coupon.startsAt),
            updatedAt: now,
            usageLimit: coupon.usageLimit,
            value: coupon.value,
          },
          $setOnInsert: {
            _id: coupon.code,
            createdAt: now,
          },
        },
        { upsert: true }
      );
    })
  );
  return {
    coupon: {
      ...coupon,
      createdAt: null,
      targetSources: targets.map((target) => target.source),
      updatedAt: now.toISOString(),
    },
    targets: targets.map(targetResult),
  };
};

export const deleteEcommerceDiscountCoupon = async (
  code: string
): Promise<{ code: string; targets: EcommerceDiscountCouponTargetResult[] }> => {
  const normalizedCode = normalizeCouponCode(code);
  if (normalizedCode.length === 0) throw validationError('Coupon code is required.');
  const targets = await getAllEcommerceExportDbTargetsForWrite();
  await Promise.all(
    targets.map((target) =>
      target.db.collection(ECOM_DISCOUNTS_COLLECTION).deleteOne({ code: normalizedCode })
    )
  );
  return { code: normalizedCode, targets: targets.map(targetResult) };
};
