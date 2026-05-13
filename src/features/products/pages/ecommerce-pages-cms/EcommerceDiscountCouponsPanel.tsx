'use client';

import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';

import { EcommerceDiscountCouponCard } from './EcommerceDiscountCouponCard';
import { EcommerceDiscountCouponForm } from './EcommerceDiscountCouponForm';
import {
  buildCouponPayload,
  COUPONS_ENDPOINT,
  couponToForm,
  EMPTY_COUPON_FORM,
  toErrorMessage,
} from './discount-coupons.helpers';
import type {
  CouponFormState,
  CouponsResponse,
  CouponWriteResponse,
  DiscountCoupon,
} from './discount-coupons.types';
import { api } from '@/shared/lib/api-client';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useToast,
} from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

type SetCoupons = Dispatch<SetStateAction<DiscountCoupon[]>>;
type SetError = Dispatch<SetStateAction<string | null>>;
type SetForm = Dispatch<SetStateAction<CouponFormState>>;
type Toast = ReturnType<typeof useToast>['toast'];

export function EcommerceDiscountCouponsPanel(): React.JSX.Element {
  const model = useDiscountCouponsPanelModel();
  return (
    <div className='space-y-4'>
      {model.error !== null ? (
        <Alert
          variant='error'
          icon={<XCircle className='size-4' aria-hidden='true' />}
          title='Discount coupon update failed'
          description={model.error}
        />
      ) : null}
      <EcommerceDiscountCouponForm
        form={model.form}
        isSaving={model.isSaving}
        onChange={model.setForm}
        onReset={() => model.setForm(EMPTY_COUPON_FORM)}
        onSave={() => {
          void model.handleSave();
        }}
      />
      <CouponList
        coupons={model.coupons}
        couponCountLabel={model.couponCountLabel}
        isLoading={model.isLoading}
        onDelete={(code) => {
          void model.handleDelete(code);
        }}
        onEdit={(nextCoupon) => model.setForm(couponToForm(nextCoupon))}
        onRefresh={() => {
          void model.loadCoupons();
        }}
      />
    </div>
  );
}

function useDiscountCouponsPanelModel(): {
  couponCountLabel: string;
  coupons: DiscountCoupon[];
  error: string | null;
  form: CouponFormState;
  handleDelete: (code: string) => Promise<void>;
  handleSave: () => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  loadCoupons: () => Promise<void>;
  setForm: SetForm;
} {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormState>(EMPTY_COUPON_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const couponCountLabel = useMemo(
    () => `${coupons.length} coupon${coupons.length === 1 ? '' : 's'}`,
    [coupons.length]
  );
  const handleError = useCouponRequestError(setError, toast);
  const loadCoupons = useLoadCoupons({ handleError, setCoupons, setError, setIsLoading });
  const handleSave = useSaveCoupon({ form, handleError, setCoupons, setError, setForm, setIsSaving, toast });
  const handleDelete = useDeleteCoupon({ form, handleError, setCoupons, setError, setForm, toast });

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  return {
    couponCountLabel,
    coupons,
    error,
    form,
    handleDelete,
    handleSave,
    isLoading,
    isSaving,
    loadCoupons,
    setForm,
  };
}

const sortCoupons = (coupons: DiscountCoupon[]): DiscountCoupon[] =>
  [...coupons].sort((left, right) => left.code.localeCompare(right.code));

function useCouponRequestError(setError: SetError, toast: Toast): (error: unknown) => void {
  return useCallback((unknownError: unknown): void => {
    const message = toErrorMessage(unknownError);
    setError(message);
    toast(message, { variant: 'error' });
  }, [setError, toast]);
}

function useLoadCoupons({
  handleError,
  setCoupons,
  setError,
  setIsLoading,
}: {
  handleError: (error: unknown) => void;
  setCoupons: SetCoupons;
  setError: SetError;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
}): () => Promise<void> {
  return useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<CouponsResponse>(COUPONS_ENDPOINT, {
        logError: false,
        timeout: 120_000,
      });
      setCoupons(response.coupons);
    } catch (loadError: unknown) {
      handleError(loadError);
    } finally {
      setIsLoading(false);
    }
  }, [handleError, setCoupons, setError, setIsLoading]);
}

function useSaveCoupon(args: {
  form: CouponFormState;
  handleError: (error: unknown) => void;
  setCoupons: SetCoupons;
  setError: SetError;
  setForm: SetForm;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  toast: Toast;
}): () => Promise<void> {
  return useCallback(async (): Promise<void> => {
    args.setIsSaving(true);
    args.setError(null);
    try {
      const response = await api.put<CouponWriteResponse>(
        COUPONS_ENDPOINT,
        buildCouponPayload(args.form),
        { logError: false, timeout: 120_000 }
      );
      args.setCoupons((current) =>
        sortCoupons([response.coupon, ...current.filter((coupon) => coupon.code !== response.coupon.code)])
      );
      args.setForm(couponToForm(response.coupon));
      args.toast('Discount coupon saved to ecommerce databases.', { variant: 'success' });
    } catch (saveError: unknown) {
      args.handleError(saveError);
    } finally {
      args.setIsSaving(false);
    }
  }, [args]);
}

function useDeleteCoupon(args: {
  form: CouponFormState;
  handleError: (error: unknown) => void;
  setCoupons: SetCoupons;
  setError: SetError;
  setForm: SetForm;
  toast: Toast;
}): (code: string) => Promise<void> {
  return useCallback(async (code: string): Promise<void> => {
    args.setError(null);
    try {
      await api.delete(`${COUPONS_ENDPOINT}/${encodeURIComponent(code)}`, {
        logError: false,
        timeout: 120_000,
      });
      args.setCoupons((current) => current.filter((coupon) => coupon.code !== code));
      if (args.form.code.trim().toUpperCase() === code) args.setForm(EMPTY_COUPON_FORM);
      args.toast('Discount coupon deleted from ecommerce databases.', { variant: 'success' });
    } catch (deleteError: unknown) {
      args.handleError(deleteError);
    }
  }, [args]);
}

function CouponList({
  couponCountLabel,
  coupons,
  isLoading,
  onDelete,
  onEdit,
  onRefresh,
}: {
  couponCountLabel: string;
  coupons: DiscountCoupon[];
  isLoading: boolean;
  onDelete: (code: string) => void;
  onEdit: (coupon: DiscountCoupon) => void;
  onRefresh: () => void;
}): React.JSX.Element {
  return (
    <Card variant='outline'>
      <CardHeader className='gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0'>
        <div className='min-w-0'>
          <CardTitle className='text-base'>Coupons</CardTitle>
          <div className='mt-2 flex flex-wrap items-center gap-2'>
            <Badge variant={coupons.length > 0 ? 'active' : 'neutral'}>{couponCountLabel}</Badge>
            {isLoading ? <Badge variant='info'>Loading</Badge> : null}
          </div>
        </div>
        <Button
          type='button'
          variant='outline'
          icon={<RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />}
          loading={isLoading}
          loadingText='Refreshing'
          onClick={onRefresh}
        >
          Refresh
        </Button>
      </CardHeader>
      <CardContent className='space-y-3'>
        {coupons.length === 0 && !isLoading ? (
          <div className='rounded-md border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground'>
            No discount coupons found.
          </div>
        ) : null}
        {coupons.length > 0 ? (
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <CheckCircle2 className='size-4 text-emerald-400' aria-hidden='true' />
            <span>Coupons are read from ecommerce databases.</span>
          </div>
        ) : null}
        {coupons.map((coupon) => (
          <EcommerceDiscountCouponCard
            key={coupon.code}
            coupon={coupon}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </CardContent>
    </Card>
  );
}
