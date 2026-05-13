'use client';

import { Pencil, Trash2 } from 'lucide-react';

import {
  formatCouponValue,
  formatStableDate,
} from './discount-coupons.helpers';
import type { DiscountCoupon } from './discount-coupons.types';
import { Badge, Button } from '@/shared/ui/primitives.public';

type Props = {
  coupon: DiscountCoupon;
  onDelete: (code: string) => void;
  onEdit: (coupon: DiscountCoupon) => void;
};

export function EcommerceDiscountCouponCard({
  coupon,
  onDelete,
  onEdit,
}: Props): React.JSX.Element {
  return (
    <div className='flex flex-col gap-3 rounded-md border border-border/70 bg-background/35 p-3 lg:flex-row lg:items-center lg:justify-between'>
      <div className='min-w-0 space-y-2'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='font-mono text-sm font-semibold text-foreground'>{coupon.code}</span>
          <Badge variant={coupon.enabled ? 'active' : 'neutral'}>
            {coupon.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
          <Badge variant='info'>{formatCouponValue(coupon)}</Badge>
          {coupon.singleUse ? <Badge variant='warning'>Single use</Badge> : null}
        </div>
        <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
          <span>Starts {formatStableDate(coupon.startsAt)}</span>
          <span>Ends {formatStableDate(coupon.endsAt)}</span>
          <span>Min {coupon.minOrderAmount ?? 'none'}</span>
          <span>Limit {coupon.usageLimit ?? 'none'}</span>
        </div>
        <div className='flex flex-wrap gap-2'>
          {coupon.targetSources.map((source) => (
            <Badge key={source} variant='neutral'>
              {source === 'local' ? 'Local' : 'Cloud'}
            </Badge>
          ))}
        </div>
      </div>
      <div className='flex shrink-0 gap-2'>
        <Button
          type='button'
          size='sm'
          variant='outline'
          icon={<Pencil className='size-4' />}
          onClick={() => onEdit(coupon)}
        >
          Edit
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          icon={<Trash2 className='size-4' />}
          onClick={() => onDelete(coupon.code)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
