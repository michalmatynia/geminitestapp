'use client';

import type { MutationResult } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';

import {
  buildCouponPayload,
  COUPONS_ENDPOINT,
} from './discount-coupons.helpers';
import type {
  CouponFormState,
  CouponsResponse,
  CouponWriteResponse,
} from './discount-coupons.types';

type SaveCouponVariables = {
  form: CouponFormState;
};

type DeleteCouponVariables = {
  code: string;
};

const loadDiscountCoupons = async (): Promise<CouponsResponse> =>
  api.get<CouponsResponse>(COUPONS_ENDPOINT, {
    logError: false,
    timeout: 120_000,
  });

const saveDiscountCoupon = async ({
  form,
}: SaveCouponVariables): Promise<CouponWriteResponse> =>
  api.put<CouponWriteResponse>(COUPONS_ENDPOINT, buildCouponPayload(form), {
    logError: false,
    timeout: 120_000,
  });

const deleteDiscountCoupon = async ({ code }: DeleteCouponVariables): Promise<void> => {
  await api.delete(`${COUPONS_ENDPOINT}/${encodeURIComponent(code)}`, {
    logError: false,
    timeout: 120_000,
  });
};

export const useLoadDiscountCouponsMutation = (): MutationResult<CouponsResponse, void> =>
  createMutationV2<CouponsResponse, void>({
    mutationKey: ['products', 'ecommerce-pages', 'discount-coupons', 'load'],
    mutationFn: loadDiscountCoupons,
    meta: {
      source: 'products.ecommercePages.discountCoupons.load',
      operation: 'detail',
      resource: 'products.ecommerce.discount-coupons',
      domain: 'products',
      description: 'Loads ecommerce discount coupons.',
      errorPresentation: 'inline',
      tags: ['products', 'ecommerce', 'discount-coupons'],
    },
  });

export const useSaveDiscountCouponMutation = (): MutationResult<
  CouponWriteResponse,
  SaveCouponVariables
> =>
  createMutationV2<CouponWriteResponse, SaveCouponVariables>({
    mutationKey: ['products', 'ecommerce-pages', 'discount-coupons', 'save'],
    mutationFn: saveDiscountCoupon,
    meta: {
      source: 'products.ecommercePages.discountCoupons.save',
      operation: 'update',
      resource: 'products.ecommerce.discount-coupons',
      domain: 'products',
      description: 'Creates or updates an ecommerce discount coupon.',
      errorPresentation: 'inline',
      tags: ['products', 'ecommerce', 'discount-coupons'],
    },
  });

export const useDeleteDiscountCouponMutation = (): MutationResult<
  void,
  DeleteCouponVariables
> =>
  createMutationV2<void, DeleteCouponVariables>({
    mutationKey: ['products', 'ecommerce-pages', 'discount-coupons', 'delete'],
    mutationFn: deleteDiscountCoupon,
    meta: {
      source: 'products.ecommercePages.discountCoupons.delete',
      operation: 'delete',
      resource: 'products.ecommerce.discount-coupons',
      domain: 'products',
      description: 'Deletes an ecommerce discount coupon.',
      errorPresentation: 'inline',
      tags: ['products', 'ecommerce', 'discount-coupons'],
    },
  });
