import 'server-only';

import { configurationError } from '@/shared/errors/app-error';

import { readStoredSettingValue } from './server';

export type BrainProviderCredentialVendor = 'openai' | 'anthropic' | 'gemini';

type ProviderCredentialResolutionSource = 'brain' | 'env' | 'missing';

export type BrainProviderCredentialResolution = {
  apiKey: string | null;
  source: ProviderCredentialResolutionSource;
  sourceKey: string | null;
};

const PROVIDER_SETTING_KEYS = {
  openai: 'openai_api_key',
  anthropic: 'anthropic_api_key',
  gemini: 'gemini_api_key',
} as const satisfies Record<BrainProviderCredentialVendor, string>;

const PROVIDER_ENV_KEYS = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
} as const satisfies Record<BrainProviderCredentialVendor, string>;

const PROVIDER_LABELS = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
} as const satisfies Record<BrainProviderCredentialVendor, string>;

const normalizeConfiguredSecret = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const readBrainProviderCredential = async (
  vendor: BrainProviderCredentialVendor
): Promise<BrainProviderCredentialResolution> => {
  const primarySettingKey = PROVIDER_SETTING_KEYS[vendor];
  const primaryValue = normalizeConfiguredSecret(await readStoredSettingValue(primarySettingKey));

  if (primaryValue) {
    return {
      apiKey: primaryValue,
      source: 'brain',
      sourceKey: primarySettingKey,
    };
  }

  const envKey = PROVIDER_ENV_KEYS[vendor];
  const envValue = normalizeConfiguredSecret(process.env[envKey]);
  if (envValue) {
    return {
      apiKey: envValue,
      source: 'env',
      sourceKey: envKey,
    };
  }

  return {
    apiKey: null,
    source: 'missing',
    sourceKey: null,
  };
};

export const resolveBrainProviderCredential = async (
  vendor: BrainProviderCredentialVendor
): Promise<string> => {
  const resolved = await readBrainProviderCredential(vendor);
  if (resolved.apiKey) {
    return resolved.apiKey;
  }

  throw configurationError(
    `${PROVIDER_LABELS[vendor]} API key is missing in AI Brain provider settings.`
  );
};
