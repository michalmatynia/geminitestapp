'use client';

import { CreditCard, Landmark, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

import type {
  EcommercePayPalMode,
  EcommerceProviderSettingsInput,
} from '@/shared/contracts/integrations/ecommerce-provider-settings';
import { Label } from '@/shared/ui/primitives.public';

import {
  EnvironmentField,
  ProviderSectionHeader,
  ProviderTextFields,
  type TextFieldConfig,
} from './EcommerceProviderSettingsFormControls';
import type {
  BankTransferSettings,
  PayPalSettings,
  PayuSettings,
  StripeSettings,
} from './EcommerceProviderSettingsPanel.types';

const PAYU_FIELDS: Array<TextFieldConfig<PayuSettings>> = [
  { field: 'apiUrl', id: 'payu-api-url', label: 'API URL' },
  { field: 'posId', id: 'payu-pos-id', label: 'POS ID' },
  { field: 'clientId', id: 'payu-client-id', label: 'Client ID' },
  { field: 'clientSecret', id: 'payu-client-secret', label: 'Client Secret', type: 'password' },
  { field: 'secondKey', id: 'payu-second-key', label: 'Second Key', type: 'password' },
  { field: 'notifyUrl', id: 'payu-notify-url', label: 'Notify URL', className: 'xl:col-span-2' },
];

const STRIPE_FIELDS: Array<TextFieldConfig<StripeSettings>> = [
  { field: 'publishableKey', id: 'stripe-publishable-key', label: 'Publishable Key' },
  { field: 'secretKey', id: 'stripe-secret-key', label: 'Secret Key', type: 'password' },
  { field: 'webhookSecret', id: 'stripe-webhook-secret', label: 'Webhook Secret', type: 'password' },
];

const PAYPAL_FIELDS: Array<TextFieldConfig<PayPalSettings>> = [
  { field: 'clientId', id: 'paypal-client-id', label: 'Client ID' },
  { field: 'clientSecret', id: 'paypal-client-secret', label: 'Client Secret', type: 'password' },
  { field: 'webhookId', id: 'paypal-webhook-id', label: 'Webhook ID' },
];

const BANK_TRANSFER_FIELDS: Array<TextFieldConfig<BankTransferSettings>> = [
  { field: 'accountName', id: 'bank-transfer-account-name', label: 'Account Name' },
  { field: 'iban', id: 'bank-transfer-iban', label: 'IBAN' },
  { field: 'bic', id: 'bank-transfer-bic', label: 'BIC / SWIFT' },
  { field: 'bankName', id: 'bank-transfer-bank-name', label: 'Bank Name' },
];

export function PaymentProviderFields({
  disabled,
  onBankTransferChange,
  onPayPalChange,
  onPayuChange,
  onStripeChange,
  settings,
}: {
  disabled: boolean;
  onBankTransferChange: <K extends keyof BankTransferSettings>(
    field: K,
    value: BankTransferSettings[K]
  ) => void;
  onPayPalChange: <K extends keyof PayPalSettings>(field: K, value: PayPalSettings[K]) => void;
  onPayuChange: <K extends keyof PayuSettings>(field: K, value: PayuSettings[K]) => void;
  onStripeChange: <K extends keyof StripeSettings>(field: K, value: StripeSettings[K]) => void;
  settings: EcommerceProviderSettingsInput['payment'];
}): React.JSX.Element {
  return (
    <section className='rounded-md border border-border/70 bg-background/35 p-4'>
      <div className='flex items-center gap-2 text-sm font-semibold'>
        <ShieldCheck className='size-4 text-blue-400' aria-hidden='true' />
        Payment Providers
      </div>
      <div className='mt-4 space-y-5'>
        <PayuFields disabled={disabled} settings={settings.payu} onChange={onPayuChange} />
        <StripeFields disabled={disabled} settings={settings.stripe} onChange={onStripeChange} />
        <PayPalFields disabled={disabled} settings={settings.paypal} onChange={onPayPalChange} />
        <BankTransferFields
          disabled={disabled}
          settings={settings.bankTransfer}
          onChange={onBankTransferChange}
        />
      </div>
    </section>
  );
}

function PayuFields({
  disabled,
  onChange,
  settings,
}: {
  disabled: boolean;
  onChange: <K extends keyof PayuSettings>(field: K, value: PayuSettings[K]) => void;
  settings: PayuSettings;
}): React.JSX.Element {
  return (
    <PaymentProviderBlock
      disabled={disabled}
      enabled={settings.enabled}
      icon={<ShieldCheck className='size-4' aria-hidden='true' />}
      label='PayU'
      onEnabledChange={(enabled) => onChange('enabled', enabled)}
    >
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <EnvironmentField
          id='payu-environment'
          label='Environment'
          value={settings.environment}
          disabled={disabled}
          onChange={(value) => onChange('environment', value)}
        />
        <ProviderTextFields disabled={disabled} fields={PAYU_FIELDS} onChange={onChange} settings={settings} />
      </div>
    </PaymentProviderBlock>
  );
}

function StripeFields({
  disabled,
  onChange,
  settings,
}: {
  disabled: boolean;
  onChange: <K extends keyof StripeSettings>(field: K, value: StripeSettings[K]) => void;
  settings: StripeSettings;
}): React.JSX.Element {
  return (
    <PaymentProviderBlock
      disabled={disabled}
      enabled={settings.enabled}
      icon={<CreditCard className='size-4' aria-hidden='true' />}
      label='Stripe'
      onEnabledChange={(enabled) => onChange('enabled', enabled)}
    >
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <ProviderTextFields disabled={disabled} fields={STRIPE_FIELDS} onChange={onChange} settings={settings} />
      </div>
    </PaymentProviderBlock>
  );
}

function PayPalFields({
  disabled,
  onChange,
  settings,
}: {
  disabled: boolean;
  onChange: <K extends keyof PayPalSettings>(field: K, value: PayPalSettings[K]) => void;
  settings: PayPalSettings;
}): React.JSX.Element {
  return (
    <PaymentProviderBlock
      disabled={disabled}
      enabled={settings.enabled}
      icon={<CreditCard className='size-4' aria-hidden='true' />}
      label='PayPal'
      onEnabledChange={(enabled) => onChange('enabled', enabled)}
    >
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <PayPalModeField
          disabled={disabled}
          value={settings.mode}
          onChange={(value) => onChange('mode', value)}
        />
        <ProviderTextFields disabled={disabled} fields={PAYPAL_FIELDS} onChange={onChange} settings={settings} />
      </div>
    </PaymentProviderBlock>
  );
}

function BankTransferFields({
  disabled,
  onChange,
  settings,
}: {
  disabled: boolean;
  onChange: <K extends keyof BankTransferSettings>(
    field: K,
    value: BankTransferSettings[K]
  ) => void;
  settings: BankTransferSettings;
}): React.JSX.Element {
  return (
    <PaymentProviderBlock
      disabled={disabled}
      enabled={settings.enabled}
      icon={<Landmark className='size-4' aria-hidden='true' />}
      label='Traditional bank transfer'
      onEnabledChange={(enabled) => onChange('enabled', enabled)}
    >
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <ProviderTextFields
          disabled={disabled}
          fields={BANK_TRANSFER_FIELDS}
          onChange={onChange}
          settings={settings}
        />
      </div>
    </PaymentProviderBlock>
  );
}

function PaymentProviderBlock({
  children,
  disabled,
  enabled,
  icon,
  label,
  onEnabledChange,
}: {
  children: ReactNode;
  disabled: boolean;
  enabled: boolean;
  icon: ReactNode;
  label: string;
  onEnabledChange: (enabled: boolean) => void;
}): React.JSX.Element {
  return (
    <div className='rounded-md border border-border/60 p-3'>
      <ProviderSectionHeader
        disabled={disabled}
        enabled={enabled}
        icon={icon}
        label={label}
        onEnabledChange={onEnabledChange}
      />
      <div className='mt-4'>{children}</div>
    </div>
  );
}

function PayPalModeField({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: EcommercePayPalMode) => void;
  value: EcommercePayPalMode;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='paypal-mode'>Mode</Label>
      <select
        id='paypal-mode'
        className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value as EcommercePayPalMode)}
      >
        <option value='sandbox'>Sandbox</option>
        <option value='live'>Live</option>
      </select>
    </div>
  );
}
