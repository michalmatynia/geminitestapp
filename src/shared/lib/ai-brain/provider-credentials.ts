import 'server-only';

import { configurationError } from '@/shared/errors/app-error';

import {
  BRAIN_PROVIDER_LABELS,
  BRAIN_PROVIDER_SETTING_KEYS,
  type BrainProviderCredentialVendor,
} from './provider-metadata';
import { readStoredSettingValue } from './server';

type ProviderCredentialResolutionSource = 'brain' | 'missing';

export type BrainProviderCredentialResolution = {
  apiKey: string | null;
  source: ProviderCredentialResolutionSource;
  sourceKey: string | null;
};

const normalizeConfiguredSecret = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const readBrainProviderCredential = async (
  vendor: BrainProviderCredentialVendor
): Promise<BrainProviderCredentialResolution> => {
  const primarySettingKey = BRAIN_PROVIDER_SETTING_KEYS[vendor];
  const primaryValue = normalizeConfiguredSecret(await readStoredSettingValue(primarySettingKey));

  if (primaryValue) {
    return {
      apiKey: primaryValue,
      source: 'brain',
      sourceKey: primarySettingKey,
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
    `${BRAIN_PROVIDER_LABELS[vendor]} API key is missing in AI Brain provider settings.`
  );
};
