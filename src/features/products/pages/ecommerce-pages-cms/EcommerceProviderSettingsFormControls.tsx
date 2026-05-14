'use client';

import { Truck } from 'lucide-react';
import type { ReactNode } from 'react';

import type { EcommerceProviderEnvironment } from '@/shared/contracts/integrations/ecommerce-provider-settings';
import { Input, Label, Switch } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

type StringKey<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

export type TextFieldConfig<T> = {
  className?: string;
  field: StringKey<T>;
  id: string;
  label: string;
  type?: 'password' | 'text';
};

export function ProviderTextFields<T extends Record<string, unknown>>({
  disabled,
  fields,
  onChange,
  settings,
}: {
  disabled: boolean;
  fields: Array<TextFieldConfig<T>>;
  onChange: <K extends keyof T>(field: K, value: T[K]) => void;
  settings: T;
}): React.JSX.Element {
  return (
    <>
      {fields.map((field) => (
        <TextField
          key={field.id}
          className={field.className}
          disabled={disabled}
          id={field.id}
          label={field.label}
          type={field.type}
          value={settings[field.field] as string}
          onChange={(value) => onChange(field.field, value as T[typeof field.field])}
        />
      ))}
    </>
  );
}

export function ProviderSectionHeader({
  disabled,
  enabled,
  icon,
  label,
  onEnabledChange,
}: {
  disabled: boolean;
  enabled: boolean;
  icon: ReactNode;
  label: string;
  onEnabledChange: (enabled: boolean) => void;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <div className='flex items-center gap-2 text-sm font-semibold'>
        <span className='text-blue-400'>{icon}</span>
        <span>{label}</span>
      </div>
      <div className='flex items-center gap-2 text-sm'>
        <Switch
          aria-label={`${label} enabled`}
          checked={enabled}
          disabled={disabled}
          onCheckedChange={onEnabledChange}
        />
        <span>Enabled</span>
      </div>
    </div>
  );
}

export function ShippingProviderBlock({
  children,
  disabled,
  enabled,
  label,
  onEnabledChange,
}: {
  children: ReactNode;
  disabled: boolean;
  enabled: boolean;
  label: string;
  onEnabledChange: (enabled: boolean) => void;
}): React.JSX.Element {
  return (
    <div className='rounded-md border border-border/60 p-3'>
      <ProviderSectionHeader
        disabled={disabled}
        enabled={enabled}
        icon={<Truck className='size-4' aria-hidden='true' />}
        label={label}
        onEnabledChange={onEnabledChange}
      />
      <div className='mt-4'>{children}</div>
    </div>
  );
}

export function EnvironmentField({
  disabled,
  id,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: EcommerceProviderEnvironment) => void;
  value: EcommerceProviderEnvironment;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value as EcommerceProviderEnvironment)}
      >
        <option value='sandbox'>Sandbox</option>
        <option value='production'>Production</option>
      </select>
    </div>
  );
}

function TextField({
  className,
  disabled,
  id,
  label,
  onChange,
  type = 'text',
  value,
}: {
  className?: string;
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  type?: 'password' | 'text';
  value: string;
}): React.JSX.Element {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={type === 'password' ? 'new-password' : 'off'}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
