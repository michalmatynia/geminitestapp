import 'server-only';

import { IMAGE_STUDIO_OPENAI_API_KEY_KEY } from '@/shared/contracts/image-studio';
import { configurationError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import { readStoredSettingValue } from './server';

export type BrainProviderCredentialVendor = 'openai' | 'anthropic' | 'gemini';

type ProviderCredentialResolutionSource = 'brain' | 'legacy' | 'env' | 'missing';

export type BrainProviderCredentialResolution = {
  apiKey: string | null;
  source: ProviderCredentialResolutionSource;
  sourceKey: string | null;
  usedLegacyFallback: boolean;
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

const LEGACY_PROVIDER_SETTING_KEYS = {
  openai: [IMAGE_STUDIO_OPENAI_API_KEY_KEY],
  anthropic: [],
  gemini: [],
} as const satisfies Record<BrainProviderCredentialVendor, readonly string[]>;

const emittedProviderCredentialWarnings = new Set<string>();

const normalizeConfiguredSecret = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const emitProviderCredentialWarningOnce = (
  cacheKey: string,
  input: {
    source: string;
    message: string;
    context: Record<string, unknown>;
  }
): void => {
  if (emittedProviderCredentialWarnings.has(cacheKey)) {
    return;
  }
  emittedProviderCredentialWarnings.add(cacheKey);
  void logSystemEvent({
    level: 'warn',
    source: input.source,
    message: input.message,
    context: input.context,
  });
};

export const readBrainProviderCredential = async (
  vendor: BrainProviderCredentialVendor
): Promise<BrainProviderCredentialResolution> => {
  const primarySettingKey = PROVIDER_SETTING_KEYS[vendor];
  const primaryValue = normalizeConfiguredSecret(await readStoredSettingValue(primarySettingKey));
  const legacyCandidates = await Promise.all(
    LEGACY_PROVIDER_SETTING_KEYS[vendor].map(async (legacySettingKey) => ({
      legacySettingKey,
      value: normalizeConfiguredSecret(await readStoredSettingValue(legacySettingKey)),
    }))
  );
  const activeLegacyCandidate = legacyCandidates.find((candidate) => candidate.value) ?? null;

  if (primaryValue) {
    const conflictingLegacyCandidate =
      legacyCandidates.find(
        (candidate) => candidate.value !== null && candidate.value !== primaryValue
      ) ?? null;

    if (conflictingLegacyCandidate) {
      emitProviderCredentialWarningOnce(
        `${vendor}:conflict:${conflictingLegacyCandidate.legacySettingKey}`,
        {
          source: 'ai_brain.provider_credential_conflict',
          message: `${PROVIDER_LABELS[vendor]} credential conflict detected between AI Brain global settings and a deprecated feature-scoped setting.`,
          context: {
            vendor,
            primarySettingKey,
            legacySettingKey: conflictingLegacyCandidate.legacySettingKey,
          },
        }
      );
    }

    return {
      apiKey: primaryValue,
      source: 'brain',
      sourceKey: primarySettingKey,
      usedLegacyFallback: false,
    };
  }

  if (activeLegacyCandidate) {
    emitProviderCredentialWarningOnce(`${vendor}:legacy:${activeLegacyCandidate.legacySettingKey}`, {
      source: 'ai_brain.provider_credential_legacy_fallback',
      message: `${PROVIDER_LABELS[vendor]} credential resolved from a deprecated feature-scoped setting. Migrate it into AI Brain global provider settings.`,
      context: {
        vendor,
        primarySettingKey,
        legacySettingKey: activeLegacyCandidate.legacySettingKey,
      },
    });

    return {
      apiKey: activeLegacyCandidate.value,
      source: 'legacy',
      sourceKey: activeLegacyCandidate.legacySettingKey,
      usedLegacyFallback: true,
    };
  }

  const envKey = PROVIDER_ENV_KEYS[vendor];
  const envValue = normalizeConfiguredSecret(process.env[envKey]);
  if (envValue) {
    return {
      apiKey: envValue,
      source: 'env',
      sourceKey: envKey,
      usedLegacyFallback: false,
    };
  }

  return {
    apiKey: null,
    source: 'missing',
    sourceKey: null,
    usedLegacyFallback: false,
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

export const __testables = {
  clearProviderCredentialWarningCache: (): void => {
    emittedProviderCredentialWarnings.clear();
  },
};
