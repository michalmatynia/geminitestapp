'use client';

import { ShieldCheck, Truck } from 'lucide-react';

import {
  EnvironmentField,
  ProviderSectionHeader,
  ProviderTextFields,
  ShippingProviderBlock,
  type TextFieldConfig,
} from './EcommerceProviderSettingsFormControls';
import type { EcommerceProviderSettingsInput } from '@/shared/contracts/integrations/ecommerce-provider-settings';

import type {
  DpdSettings,
  InpostSettings,
  PayuSettings,
  PocztaPolskaSettings,
} from './EcommerceProviderSettingsPanel.types';

const PAYU_FIELDS: Array<TextFieldConfig<PayuSettings>> = [
  { field: 'apiUrl', id: 'payu-api-url', label: 'API URL' },
  { field: 'posId', id: 'payu-pos-id', label: 'POS ID' },
  { field: 'clientId', id: 'payu-client-id', label: 'Client ID' },
  { field: 'clientSecret', id: 'payu-client-secret', label: 'Client Secret', type: 'password' },
  { field: 'secondKey', id: 'payu-second-key', label: 'Second Key', type: 'password' },
  { field: 'notifyUrl', id: 'payu-notify-url', label: 'Notify URL', className: 'xl:col-span-2' },
];

const INPOST_FIELDS: Array<TextFieldConfig<InpostSettings>> = [
  { field: 'apiUrl', id: 'inpost-api-url', label: 'API URL' },
  { field: 'organizationId', id: 'inpost-organization-id', label: 'Organization ID' },
  { field: 'apiToken', id: 'inpost-api-token', label: 'API Token', type: 'password' },
  { field: 'oauthClientId', id: 'inpost-oauth-client-id', label: 'OAuth Client ID' },
  { field: 'oauthClientSecret', id: 'inpost-oauth-client-secret', label: 'OAuth Client Secret', type: 'password' },
  { field: 'oauthTokenUrl', id: 'inpost-oauth-token-url', label: 'OAuth Token URL' },
  { field: 'geowidgetToken', id: 'inpost-geowidget-token', label: 'Geowidget Token', type: 'password' },
  { field: 'defaultParcelTemplate', id: 'inpost-default-parcel-template', label: 'Parcel Template' },
  { field: 'sendingMethod', id: 'inpost-sending-method', label: 'Sending Method' },
  { field: 'webhookSecret', id: 'inpost-webhook-secret', label: 'Webhook Secret', type: 'password', className: 'xl:col-span-2' },
];

const DPD_FIELDS: Array<TextFieldConfig<DpdSettings>> = [
  { field: 'apiUrl', id: 'dpd-api-url', label: 'API URL' },
  { field: 'username', id: 'dpd-username', label: 'Username' },
  { field: 'password', id: 'dpd-password', label: 'Password', type: 'password' },
  { field: 'accountNumber', id: 'dpd-account-number', label: 'Account Number' },
  { field: 'trackingUrlTemplate', id: 'dpd-tracking-template', label: 'Tracking URL Template', className: 'xl:col-span-4' },
];

const POCZTA_FIELDS: Array<TextFieldConfig<PocztaPolskaSettings>> = [
  { field: 'apiUrl', id: 'poczta-api-url', label: 'API URL' },
  { field: 'username', id: 'poczta-username', label: 'Username' },
  { field: 'password', id: 'poczta-password', label: 'Password', type: 'password' },
  { field: 'cardNumber', id: 'poczta-card-number', label: 'Card Number' },
  { field: 'trackingUrlTemplate', id: 'poczta-tracking-template', label: 'Tracking URL Template', className: 'xl:col-span-4' },
];

export function PaymentProviderFields({
  disabled,
  onChange,
  settings,
}: {
  disabled: boolean;
  onChange: <K extends keyof PayuSettings>(field: K, value: PayuSettings[K]) => void;
  settings: PayuSettings;
}): React.JSX.Element {
  return (
    <section className='rounded-md border border-border/70 bg-background/35 p-4'>
      <ProviderSectionHeader
        disabled={disabled}
        enabled={settings.enabled}
        icon={<ShieldCheck className='size-4' aria-hidden='true' />}
        label='PayU'
        onEnabledChange={(enabled) => onChange('enabled', enabled)}
      />
      <div className='mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <EnvironmentField
          id='payu-environment'
          label='Environment'
          value={settings.environment}
          disabled={disabled}
          onChange={(value) => onChange('environment', value)}
        />
        <ProviderTextFields disabled={disabled} fields={PAYU_FIELDS} onChange={onChange} settings={settings} />
      </div>
    </section>
  );
}

export function ShippingProviderFields({
  disabled,
  onDpdChange,
  onInpostChange,
  onPocztaPolskaChange,
  settings,
}: {
  disabled: boolean;
  onDpdChange: <K extends keyof DpdSettings>(field: K, value: DpdSettings[K]) => void;
  onInpostChange: <K extends keyof InpostSettings>(field: K, value: InpostSettings[K]) => void;
  onPocztaPolskaChange: <K extends keyof PocztaPolskaSettings>(
    field: K,
    value: PocztaPolskaSettings[K]
  ) => void;
  settings: EcommerceProviderSettingsInput['shipping'];
}): React.JSX.Element {
  return (
    <section className='rounded-md border border-border/70 bg-background/35 p-4'>
      <div className='flex items-center gap-2 text-sm font-semibold'>
        <Truck className='size-4 text-blue-400' aria-hidden='true' />
        Shipping Providers
      </div>
      <div className='mt-4 space-y-5'>
        <InpostFields disabled={disabled} onChange={onInpostChange} settings={settings.inpost} />
        <CarrierFields
          disabled={disabled}
          enabled={settings.dpd.enabled}
          fields={DPD_FIELDS}
          label='DPD'
          onChange={onDpdChange}
          onEnabledChange={(enabled) => onDpdChange('enabled', enabled)}
          settings={settings.dpd}
        />
        <CarrierFields
          disabled={disabled}
          enabled={settings.pocztaPolska.enabled}
          fields={POCZTA_FIELDS}
          label='Poczta Polska'
          onChange={onPocztaPolskaChange}
          onEnabledChange={(enabled) => onPocztaPolskaChange('enabled', enabled)}
          settings={settings.pocztaPolska}
        />
      </div>
    </section>
  );
}

function InpostFields({
  disabled,
  onChange,
  settings,
}: {
  disabled: boolean;
  onChange: <K extends keyof InpostSettings>(field: K, value: InpostSettings[K]) => void;
  settings: InpostSettings;
}): React.JSX.Element {
  return (
    <ShippingProviderBlock
      disabled={disabled}
      enabled={settings.enabled}
      label='InPost'
      onEnabledChange={(enabled) => onChange('enabled', enabled)}
    >
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <EnvironmentField
          id='inpost-environment'
          label='Environment'
          value={settings.environment}
          disabled={disabled}
          onChange={(value) => onChange('environment', value)}
        />
        <ProviderTextFields disabled={disabled} fields={INPOST_FIELDS} onChange={onChange} settings={settings} />
      </div>
    </ShippingProviderBlock>
  );
}

function CarrierFields<T extends DpdSettings | PocztaPolskaSettings>({
  disabled,
  enabled,
  fields,
  label,
  onChange,
  onEnabledChange,
  settings,
}: {
  disabled: boolean;
  enabled: boolean;
  fields: Array<TextFieldConfig<T>>;
  label: string;
  onChange: <K extends keyof T>(field: K, value: T[K]) => void;
  onEnabledChange: (enabled: boolean) => void;
  settings: T;
}): React.JSX.Element {
  return (
    <ShippingProviderBlock disabled={disabled} enabled={enabled} label={label} onEnabledChange={onEnabledChange}>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <ProviderTextFields disabled={disabled} fields={fields} onChange={onChange} settings={settings} />
      </div>
    </ShippingProviderBlock>
  );
}
