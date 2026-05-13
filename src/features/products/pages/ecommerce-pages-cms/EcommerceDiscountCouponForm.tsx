'use client';

import { Plus, Save } from 'lucide-react';

import type { CouponFormState, CouponType } from './discount-coupons.types';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/ui/primitives.public';

type Props = {
  form: CouponFormState;
  isSaving: boolean;
  onChange: (nextForm: CouponFormState) => void;
  onReset: () => void;
  onSave: () => void;
};

export function EcommerceDiscountCouponForm({
  form,
  isSaving,
  onChange,
  onReset,
  onSave,
}: Props): React.JSX.Element {
  return (
    <Card variant='outline'>
      <CardHeader className='gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0'>
        <div>
          <CardTitle className='text-base'>Coupon Control</CardTitle>
          <p className='mt-1 text-sm text-muted-foreground'>
            Coupons are pushed into local and cloud ecommerce databases.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button type='button' variant='outline' icon={<Plus className='size-4' />} onClick={onReset}>
            New
          </Button>
          <Button
            type='button'
            variant='solid'
            icon={<Save className='size-4' />}
            loading={isSaving}
            loadingText='Saving'
            onClick={onSave}
          >
            Save coupon
          </Button>
        </div>
      </CardHeader>
      <CardContent className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <CouponMainFields form={form} onChange={onChange} />
        <CouponToggleFields form={form} onChange={onChange} />
        <CouponLimitFields form={form} onChange={onChange} />
      </CardContent>
    </Card>
  );
}

function CouponMainFields({
  form,
  onChange,
}: Pick<Props, 'form' | 'onChange'>): React.JSX.Element {
  return (
    <>
      <div className='space-y-2'>
        <Label htmlFor='coupon-code'>Code</Label>
        <Input
          id='coupon-code'
          value={form.code}
          onChange={(event) => onChange({ ...form, code: event.target.value })}
          placeholder='WELCOME20'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='coupon-type'>Type</Label>
        <select
          id='coupon-type'
          className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
          value={form.discountType}
          onChange={(event) =>
            onChange({ ...form, discountType: event.target.value as CouponType })
          }
        >
          <option value='percentage'>Percentage</option>
          <option value='fixed'>Fixed amount</option>
        </select>
      </div>
      <CouponValueField form={form} onChange={onChange} />
    </>
  );
}

function CouponValueField({
  form,
  onChange,
}: Pick<Props, 'form' | 'onChange'>): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='coupon-value'>
        {form.discountType === 'percentage' ? 'Value (%)' : 'Value (minor units)'}
      </Label>
      <Input
        id='coupon-value'
        type='number'
        min='0'
        step={form.discountType === 'percentage' ? '0.01' : '1'}
        value={form.value}
        onChange={(event) => onChange({ ...form, value: event.target.value })}
      />
    </div>
  );
}

function CouponToggleFields({
  form,
  onChange,
}: Pick<Props, 'form' | 'onChange'>): React.JSX.Element {
  return (
    <div className='flex items-end gap-4 pb-2'>
      <CheckboxField
        checked={form.enabled}
        id='coupon-enabled'
        label='Enabled'
        onChange={(enabled) => onChange({ ...form, enabled })}
      />
      <CheckboxField
        checked={form.singleUse}
        id='coupon-single-use'
        label='Single use'
        onChange={(singleUse) => onChange({ ...form, singleUse })}
      />
    </div>
  );
}

function CouponLimitFields({
  form,
  onChange,
}: Pick<Props, 'form' | 'onChange'>): React.JSX.Element {
  return (
    <>
      <DateField
        id='coupon-start'
        label='Starts at'
        value={form.startsAt}
        onChange={(value) => onChange({ ...form, startsAt: value })}
      />
      <DateField
        id='coupon-end'
        label='Ends at'
        value={form.endsAt}
        onChange={(value) => onChange({ ...form, endsAt: value })}
      />
      <NumberField
        id='coupon-min'
        label='Minimum order (minor units)'
        min='0'
        value={form.minOrderAmount}
        onChange={(value) => onChange({ ...form, minOrderAmount: value })}
      />
      <NumberField
        id='coupon-usage'
        label='Usage limit'
        min='1'
        value={form.usageLimit}
        onChange={(value) => onChange({ ...form, usageLimit: value })}
      />
    </>
  );
}

function CheckboxField({
  checked,
  id,
  label,
  onChange,
}: {
  checked: boolean;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
}): React.JSX.Element {
  return (
    <label htmlFor={id} className='flex items-center gap-2 text-sm'>
      <input
        id={id}
        type='checkbox'
        checked={checked}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function DateField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type='datetime-local'
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function NumberField({
  id,
  label,
  min,
  onChange,
  value,
}: {
  id: string;
  label: string;
  min: string;
  onChange: (value: string) => void;
  value: string;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type='number'
        min={min}
        step='1'
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
