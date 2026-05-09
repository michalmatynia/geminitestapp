/**
 * AI Brain Provider Credentials
 * 
 * Server-side credential management for AI providers.
 * Provides:
 * - Provider credential retrieval
 * - Vendor-specific credential handling
 * - Configuration validation
 * - Secure credential storage access
 * - Server-only credential operations
 */

import 'server-only';

import { createHash } from 'crypto';

import type { AiBrainAssignment } from '@/shared/contracts/ai-brain';
import { configurationError } from '@/shared/errors/app-error';

import {
  BRAIN_PROVIDER_LABELS,
  BRAIN_PROVIDER_SETTING_KEYS,
  type BrainProviderCredentialVendor,
} from './provider-metadata';
import { readStoredSettingValue } from './server';

type ProviderCredentialResolutionSource = 'assignment' | 'brain' | 'env' | 'missing';

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

export const createBrainProviderCredentialFingerprint = (
  value: string | null | undefined
): string | null => {
  const normalized = normalizeConfiguredSecret(value);
  if (normalized === null) return null;
  return `sha256:${createHash('sha256').update(normalized).digest('hex').slice(0, 12)}`;
};

const ENV_CREDENTIAL_KEYS = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
} as const satisfies Record<BrainProviderCredentialVendor, string>;

export const readBrainProviderCredential = async (
  vendor: BrainProviderCredentialVendor
): Promise<BrainProviderCredentialResolution> => {
  const primarySettingKey = BRAIN_PROVIDER_SETTING_KEYS[vendor];
  const primaryValue = normalizeConfiguredSecret(await readStoredSettingValue(primarySettingKey));

  if (primaryValue !== null) {
    return {
      apiKey: primaryValue,
      source: 'brain',
      sourceKey: primarySettingKey,
    };
  }

  const envKey = ENV_CREDENTIAL_KEYS[vendor];
  const envValue = normalizeConfiguredSecret(process.env[envKey]);
  if (envValue !== null) {
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

export const readBrainProviderCredentialForAssignment = async (
  vendor: BrainProviderCredentialVendor,
  assignment: Pick<AiBrainAssignment, 'apiKey'>
): Promise<BrainProviderCredentialResolution> => {
  const assignmentValue = normalizeConfiguredSecret(assignment.apiKey);
  if (assignmentValue !== null) {
    return {
      apiKey: assignmentValue,
      source: 'assignment',
      sourceKey: 'assignment.apiKey',
    };
  }

  return readBrainProviderCredential(vendor);
};

export const resolveBrainProviderCredential = async (
  vendor: BrainProviderCredentialVendor
): Promise<string> => {
  const resolved = await readBrainProviderCredential(vendor);
  if (resolved.apiKey !== null) {
    return resolved.apiKey;
  }

  throw configurationError(
    `${BRAIN_PROVIDER_LABELS[vendor]} API key is missing in AI Brain provider settings and environment.`
  );
};

export const resolveBrainProviderCredentialForAssignment = async (
  vendor: BrainProviderCredentialVendor,
  assignment: Pick<AiBrainAssignment, 'apiKey'>
): Promise<string> => {
  const resolved = await readBrainProviderCredentialForAssignment(vendor, assignment);
  if (resolved.apiKey !== null) {
    return resolved.apiKey;
  }

  throw configurationError(
    `${BRAIN_PROVIDER_LABELS[vendor]} API key is missing in this AI Brain route, provider settings, and environment.`
  );
};
