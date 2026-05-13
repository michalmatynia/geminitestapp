export type CouponType = 'fixed' | 'percentage';
export type CouponTargetSource = 'local' | 'cloud';

export type DiscountCoupon = {
  code: string;
  createdAt: string | null;
  discountType: CouponType;
  enabled: boolean;
  endsAt: string | null;
  minOrderAmount: number | null;
  singleUse: boolean;
  startsAt: string | null;
  targetSources: CouponTargetSource[];
  updatedAt: string | null;
  usageLimit: number | null;
  value: number;
};

export type CouponFormState = {
  code: string;
  discountType: CouponType;
  enabled: boolean;
  endsAt: string;
  minOrderAmount: string;
  singleUse: boolean;
  startsAt: string;
  usageLimit: string;
  value: string;
};

export type CouponsResponse = {
  coupons: DiscountCoupon[];
  ok: boolean;
};

export type CouponWriteResponse = {
  coupon: DiscountCoupon;
  ok: boolean;
};
