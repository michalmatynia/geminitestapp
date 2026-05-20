import type { EcommerceProviderSettingsInput } from '@/shared/contracts/integrations/ecommerce-provider-settings';

export const PROVIDER_SETTINGS_ENDPOINT = '/api/v2/products/pages/provider-settings';

export type ProviderSettingsTarget = {
  dbName: string;
  matchedCount: number;
  modifiedCount: number;
  source: 'local' | 'cloud';
  upsertedCount: number;
};

export type ProviderSettingsResponse = {
  key: string;
  lastPushedAt: string | null;
  ok: boolean;
  settings: EcommerceProviderSettingsInput;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type ProviderSettingsWriteResponse = ProviderSettingsResponse & {
  pushed: boolean;
  targets: ProviderSettingsTarget[];
};

export type ProviderSettingsMeta = Pick<
  ProviderSettingsResponse,
  'lastPushedAt' | 'updatedAt' | 'updatedBy'
>;

export type PayuSettings = EcommerceProviderSettingsInput['payment']['payu'];
export type StripeSettings = EcommerceProviderSettingsInput['payment']['stripe'];
export type PayPalSettings = EcommerceProviderSettingsInput['payment']['paypal'];
export type BankTransferSettings = EcommerceProviderSettingsInput['payment']['bankTransfer'];
export type InpostSettings = EcommerceProviderSettingsInput['shipping']['inpost'];
export type DpdSettings = EcommerceProviderSettingsInput['shipping']['dpd'];
export type PocztaPolskaSettings = EcommerceProviderSettingsInput['shipping']['pocztaPolska'];
