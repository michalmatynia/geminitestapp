import type { CouponFormState, DiscountCoupon } from './discount-coupons.types';

export const COUPONS_ENDPOINT = '/api/v2/products/pages/discount-coupons';

export const EMPTY_COUPON_FORM: CouponFormState = {
  code: '',
  discountType: 'percentage',
  enabled: true,
  endsAt: '',
  minOrderAmount: '',
  singleUse: false,
  startsAt: '',
  usageLimit: '',
  value: '',
};

export const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const formatStableDate = (value: string | null): string => {
  if (value === null) return 'No limit';
  return value.replace('T', ' ').slice(0, 16);
};

const toDateTimeLocalValue = (value: string | null): string => {
  if (value === null) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
};

const toIsoOrNull = (value: string): string | null => {
  if (value.trim().length === 0) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const toNullableNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const couponValueToFormValue = (coupon: DiscountCoupon): string =>
  coupon.discountType === 'percentage' ? String(coupon.value * 100) : String(coupon.value);

export const couponToForm = (coupon: DiscountCoupon): CouponFormState => ({
  code: coupon.code,
  discountType: coupon.discountType,
  enabled: coupon.enabled,
  endsAt: toDateTimeLocalValue(coupon.endsAt),
  minOrderAmount: coupon.minOrderAmount === null ? '' : String(coupon.minOrderAmount),
  singleUse: coupon.singleUse,
  startsAt: toDateTimeLocalValue(coupon.startsAt),
  usageLimit: coupon.usageLimit === null ? '' : String(coupon.usageLimit),
  value: couponValueToFormValue(coupon),
});

export const formatCouponValue = (coupon: DiscountCoupon): string =>
  coupon.discountType === 'percentage' ? `${coupon.value * 100}%` : `${coupon.value}`;

export const buildCouponPayload = (
  form: CouponFormState
): Omit<DiscountCoupon, 'createdAt' | 'targetSources' | 'updatedAt'> => {
  const value = Number(form.value);
  return {
    code: form.code,
    discountType: form.discountType,
    enabled: form.enabled,
    endsAt: toIsoOrNull(form.endsAt),
    minOrderAmount: toNullableNumber(form.minOrderAmount),
    singleUse: form.singleUse,
    startsAt: toIsoOrNull(form.startsAt),
    usageLimit: toNullableNumber(form.usageLimit),
    value: form.discountType === 'percentage' ? value / 100 : value,
  };
};
