import { z } from 'zod';

export const ECOMMERCE_PROVIDER_SETTINGS_KEY = 'payment_shipping_provider_settings_v1';
export const ECOMMERCE_PROVIDER_SETTINGS_SOURCE = 'geminitestapp-products';

export const ecommerceProviderEnvironmentSchema = z.enum(['sandbox', 'production']);
export const ecommercePayPalModeSchema = z.enum(['sandbox', 'live']);

const settingsStringSchema = z.string().trim().max(2048);
const secretStringSchema = z.string().trim().max(4096);
const providerToggleSchema = z.boolean();

export const ecommerceProviderSettingsSchema = z.object({
  payment: z.object({
    payu: z.object({
      apiUrl: settingsStringSchema,
      clientId: settingsStringSchema,
      clientSecret: secretStringSchema,
      enabled: providerToggleSchema,
      environment: ecommerceProviderEnvironmentSchema,
      notifyUrl: settingsStringSchema,
      posId: settingsStringSchema,
      secondKey: secretStringSchema,
    }),
    stripe: z.object({
      enabled: providerToggleSchema,
      publishableKey: settingsStringSchema,
      secretKey: secretStringSchema,
      webhookSecret: secretStringSchema,
    }),
    paypal: z.object({
      clientId: settingsStringSchema,
      clientSecret: secretStringSchema,
      enabled: providerToggleSchema,
      mode: ecommercePayPalModeSchema,
      webhookId: settingsStringSchema,
    }),
    bankTransfer: z.object({
      accountName: settingsStringSchema,
      bankName: settingsStringSchema,
      bic: settingsStringSchema,
      enabled: providerToggleSchema,
      iban: settingsStringSchema,
    }),
  }),
  shipping: z.object({
    dpd: z.object({
      accountNumber: settingsStringSchema,
      apiUrl: settingsStringSchema,
      enabled: providerToggleSchema,
      password: secretStringSchema,
      trackingUrlTemplate: settingsStringSchema,
      username: settingsStringSchema,
    }),
    inpost: z.object({
      apiToken: secretStringSchema,
      apiUrl: settingsStringSchema,
      defaultParcelTemplate: settingsStringSchema,
      enabled: providerToggleSchema,
      environment: ecommerceProviderEnvironmentSchema,
      geowidgetToken: secretStringSchema,
      oauthClientId: settingsStringSchema,
      oauthClientSecret: secretStringSchema,
      oauthTokenUrl: settingsStringSchema,
      organizationId: settingsStringSchema,
      sendingMethod: settingsStringSchema,
      webhookSecret: secretStringSchema,
    }),
    pocztaPolska: z.object({
      apiUrl: settingsStringSchema,
      cardNumber: settingsStringSchema,
      enabled: providerToggleSchema,
      password: secretStringSchema,
      trackingUrlTemplate: settingsStringSchema,
      username: settingsStringSchema,
    }),
  }),
});

export const ecommerceProviderSettingsSaveRequestSchema = z.object({
  pushToEcommerce: z.boolean().default(false),
  settings: ecommerceProviderSettingsSchema,
});

export type EcommerceProviderEnvironment = z.infer<typeof ecommerceProviderEnvironmentSchema>;
export type EcommercePayPalMode = z.infer<typeof ecommercePayPalModeSchema>;
export type EcommerceProviderSettingsInput = z.infer<typeof ecommerceProviderSettingsSchema>;
export type EcommerceProviderSettingsSaveRequest = z.infer<
  typeof ecommerceProviderSettingsSaveRequestSchema
>;

export const DEFAULT_ECOMMERCE_PROVIDER_SETTINGS: EcommerceProviderSettingsInput = {
  payment: {
    payu: {
      apiUrl: 'https://secure.snd.payu.com',
      clientId: '',
      clientSecret: '',
      enabled: false,
      environment: 'sandbox',
      notifyUrl: '',
      posId: '',
      secondKey: '',
    },
    stripe: {
      enabled: false,
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
    },
    paypal: {
      clientId: '',
      clientSecret: '',
      enabled: false,
      mode: 'sandbox',
      webhookId: '',
    },
    bankTransfer: {
      accountName: '',
      bankName: '',
      bic: '',
      enabled: false,
      iban: '',
    },
  },
  shipping: {
    dpd: {
      accountNumber: '',
      apiUrl: '',
      enabled: false,
      password: '',
      trackingUrlTemplate: 'https://tracktrace.dpd.com.pl/parcelDetails?p1={trackingNumber}&typ=1',
      username: '',
    },
    inpost: {
      apiToken: '',
      apiUrl: 'https://sandbox-api-shipx-pl.easypack24.net',
      defaultParcelTemplate: 'small',
      enabled: false,
      environment: 'sandbox',
      geowidgetToken: '',
      oauthClientId: '',
      oauthClientSecret: '',
      oauthTokenUrl: 'https://stage-api.inpost-group.com/oauth2/token',
      organizationId: '',
      sendingMethod: 'dispatch_order',
      webhookSecret: '',
    },
    pocztaPolska: {
      apiUrl: '',
      cardNumber: '',
      enabled: false,
      password: '',
      trackingUrlTemplate: 'https://emonitoring.poczta-polska.pl/?numer={trackingNumber}',
      username: '',
    },
  },
};
