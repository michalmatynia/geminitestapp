import 'server-only';

import { getDb } from './mongodb';
import type { ShippingProviderAvailability } from './shipping';

const ECOM_SETTINGS_COLLECTION = 'ecom_settings';
const PROVIDER_SETTINGS_KEY = 'payment_shipping_provider_settings_v1';

type SettingRecord = {
  _id?: string;
  key?: unknown;
  value?: unknown;
};

export type PayUProviderSettings = {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  enabled: boolean;
  notifyUrl: string;
  posId: string;
  secondKey: string;
};

export type InpostProviderSettings = {
  apiToken: string;
  apiUrl: string;
  defaultParcelTemplate: string;
  enabled: boolean;
  geowidgetToken: string;
  oauthClientId: string;
  oauthClientSecret: string;
  oauthTokenUrl: string;
  organizationId: string;
  sendingMethod: string;
  webhookSecret: string;
};

export type DpdProviderSettings = {
  accountNumber: string;
  apiUrl: string;
  enabled: boolean;
  password: string;
  trackingUrlTemplate: string;
  username: string;
};

export type PocztaPolskaProviderSettings = {
  apiUrl: string;
  cardNumber: string;
  enabled: boolean;
  password: string;
  trackingUrlTemplate: string;
  username: string;
};

export type StripeProviderSettings = {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  enabled: boolean;
};

export type PayPalProviderSettings = {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  mode: 'sandbox' | 'live';
  enabled: boolean;
};

export type ProviderSettings = {
  payment: {
    payu: PayUProviderSettings;
    stripe: StripeProviderSettings;
    paypal: PayPalProviderSettings;
  };
  shipping: {
    dpd: DpdProviderSettings;
    inpost: InpostProviderSettings;
    pocztaPolska: PocztaPolskaProviderSettings;
  };
};

const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  payment: {
    payu: {
      apiUrl: '',
      clientId: '',
      clientSecret: '',
      enabled: false,
      notifyUrl: '',
      posId: '',
      secondKey: '',
    },
    stripe: {
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
      enabled: false,
    },
    paypal: {
      clientId: '',
      clientSecret: '',
      webhookId: '',
      mode: 'sandbox',
      enabled: false,
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
      apiUrl: '',
      defaultParcelTemplate: '',
      enabled: false,
      geowidgetToken: '',
      oauthClientId: '',
      oauthClientSecret: '',
      oauthTokenUrl: '',
      organizationId: '',
      sendingMethod: '',
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function firstNonEmpty(...values: string[]): string {
  for (const value of values) {
    if (value.length > 0) return value;
  }
  return '';
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readNestedRecord(root: Record<string, unknown>, ...keys: string[]): Record<string, unknown> {
  let current: unknown = root;
  for (const key of keys) {
    if (!isRecord(current)) return {};
    current = current[key];
  }
  return isRecord(current) ? current : {};
}

function normalizePayU(input: Record<string, unknown>): PayUProviderSettings {
  const base = DEFAULT_PROVIDER_SETTINGS.payment.payu;
  return {
    apiUrl: firstNonEmpty(readString(input['apiUrl']), base.apiUrl),
    clientId: readString(input['clientId']),
    clientSecret: readString(input['clientSecret']),
    enabled: readBoolean(input['enabled'], base.enabled),
    notifyUrl: readString(input['notifyUrl']),
    posId: readString(input['posId']),
    secondKey: readString(input['secondKey']),
  };
}

function normalizeInpost(input: Record<string, unknown>): InpostProviderSettings {
  const base = DEFAULT_PROVIDER_SETTINGS.shipping.inpost;
  return {
    apiToken: readString(input['apiToken']),
    apiUrl: firstNonEmpty(readString(input['apiUrl']), base.apiUrl),
    defaultParcelTemplate: readString(input['defaultParcelTemplate']),
    enabled: readBoolean(input['enabled'], base.enabled),
    geowidgetToken: readString(input['geowidgetToken']),
    oauthClientId: readString(input['oauthClientId']),
    oauthClientSecret: readString(input['oauthClientSecret']),
    oauthTokenUrl: readString(input['oauthTokenUrl']),
    organizationId: readString(input['organizationId']),
    sendingMethod: readString(input['sendingMethod']),
    webhookSecret: readString(input['webhookSecret']),
  };
}

function normalizeDpd(input: Record<string, unknown>): DpdProviderSettings {
  const base = DEFAULT_PROVIDER_SETTINGS.shipping.dpd;
  return {
    accountNumber: readString(input['accountNumber']),
    apiUrl: readString(input['apiUrl']),
    enabled: readBoolean(input['enabled'], base.enabled),
    password: readString(input['password']),
    trackingUrlTemplate: firstNonEmpty(
      readString(input['trackingUrlTemplate']),
      base.trackingUrlTemplate
    ),
    username: readString(input['username']),
  };
}

function normalizePocztaPolska(input: Record<string, unknown>): PocztaPolskaProviderSettings {
  const base = DEFAULT_PROVIDER_SETTINGS.shipping.pocztaPolska;
  return {
    apiUrl: readString(input['apiUrl']),
    cardNumber: readString(input['cardNumber']),
    enabled: readBoolean(input['enabled'], base.enabled),
    password: readString(input['password']),
    trackingUrlTemplate: firstNonEmpty(
      readString(input['trackingUrlTemplate']),
      base.trackingUrlTemplate
    ),
    username: readString(input['username']),
  };
}

function normalizeStripe(input: Record<string, unknown>): StripeProviderSettings {
  return {
    publishableKey: readString(input['publishableKey']),
    secretKey: readString(input['secretKey']),
    webhookSecret: readString(input['webhookSecret']),
    enabled: readBoolean(input['enabled'], false),
  };
}

function normalizePayPal(input: Record<string, unknown>): PayPalProviderSettings {
  const rawMode = readString(input['mode']);
  return {
    clientId: readString(input['clientId']),
    clientSecret: readString(input['clientSecret']),
    webhookId: readString(input['webhookId']),
    mode: rawMode === 'live' ? 'live' : 'sandbox',
    enabled: readBoolean(input['enabled'], false),
  };
}

function normalizeProviderSettings(value: unknown): ProviderSettings | null {
  const root = parseRecord(value);
  if (root === null) return null;
  return {
    payment: {
      payu: normalizePayU(readNestedRecord(root, 'payment', 'payu')),
      stripe: normalizeStripe(readNestedRecord(root, 'payment', 'stripe')),
      paypal: normalizePayPal(readNestedRecord(root, 'payment', 'paypal')),
    },
    shipping: {
      dpd: normalizeDpd(readNestedRecord(root, 'shipping', 'dpd')),
      inpost: normalizeInpost(readNestedRecord(root, 'shipping', 'inpost')),
      pocztaPolska: normalizePocztaPolska(readNestedRecord(root, 'shipping', 'pocztaPolska')),
    },
  };
}

export async function readEcommerceProviderSettings(): Promise<ProviderSettings | null> {
  try {
    const db = await getDb();
    const record = await db.collection<SettingRecord>(ECOM_SETTINGS_COLLECTION).findOne({
      $or: [{ key: PROVIDER_SETTINGS_KEY }, { _id: PROVIDER_SETTINGS_KEY }],
    });
    return normalizeProviderSettings(record?.value);
  } catch {
    return null;
  }
}

export async function readPayUProviderSettings(): Promise<PayUProviderSettings | null> {
  return (await readEcommerceProviderSettings())?.payment.payu ?? null;
}

export async function readInpostProviderSettings(): Promise<InpostProviderSettings | null> {
  return (await readEcommerceProviderSettings())?.shipping.inpost ?? null;
}

export async function readDpdProviderSettings(): Promise<DpdProviderSettings | null> {
  return (await readEcommerceProviderSettings())?.shipping.dpd ?? null;
}

export async function readPocztaPolskaProviderSettings(): Promise<PocztaPolskaProviderSettings | null> {
  return (await readEcommerceProviderSettings())?.shipping.pocztaPolska ?? null;
}

export async function readShippingProviderAvailability(): Promise<ShippingProviderAvailability> {
  const settings = await readEcommerceProviderSettings();
  if (settings === null) return {};
  return {
    dpd: settings.shipping.dpd.enabled,
    inpost: settings.shipping.inpost.enabled,
    poczta_polska: settings.shipping.pocztaPolska.enabled,
  };
}

export async function readStripeProviderSettings(): Promise<StripeProviderSettings | null> {
  return (await readEcommerceProviderSettings())?.payment.stripe ?? null;
}

export async function readPayPalProviderSettings(): Promise<PayPalProviderSettings | null> {
  return (await readEcommerceProviderSettings())?.payment.paypal ?? null;
}

export async function readPaymentProviderAvailability(): Promise<{ payu?: boolean; stripe?: boolean; paypal?: boolean }> {
  const settings = await readEcommerceProviderSettings();
  if (settings === null) return {};
  return {
    payu: settings.payment.payu.enabled,
    stripe: settings.payment.stripe.enabled,
    paypal: settings.payment.paypal.enabled,
  };
}
