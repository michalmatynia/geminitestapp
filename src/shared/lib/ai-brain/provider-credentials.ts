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

/**
 * The source from which a provider credential was resolved.
 */
type ProviderCredentialResolutionSource = 'assignment' | 'brain' | 'env' | 'missing';

/**
 * Represents a resolved provider credential with its metadata.
 */
export type BrainProviderCredentialResolution = {
  /**
   * The resolved API key, or null if not found.
   */
  apiKey: string | null;
  /**
   * The source from which the key was retrieved.
   */
  source: ProviderCredentialResolutionSource;
  /**
   * The key or identifier within the source (e.g., environment variable name).
   */
  sourceKey: string | null;
};

/**
 * Normalizes a configured secret by trimming it and checking for empty strings.
 * 
 * @param value - The raw secret value.
 * @returns The normalized secret or null if invalid.
 */
const normalizeConfiguredSecret = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

/**
 * Creates a stable fingerprint for a credential using SHA-256.
 * Used for logging or identifying credentials without exposing the actual key.
 * 
 * @param value - The raw credential value.
 * @returns A SHA-256 fingerprint string or null if input is invalid.
 */
export const createBrainProviderCredentialFingerprint = (
  value: string | null | undefined
): string | null => {
  const normalized = normalizeConfiguredSecret(value);
  if (normalized === null) return null;
  return `sha256:${createHash('sha256').update(normalized).digest('hex').slice(0, 12)}`;
};

/**
 * Mapping of vendors to their expected environment variable names for API keys.
 */
const ENV_CREDENTIAL_KEYS = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
} as const satisfies Record<BrainProviderCredentialVendor, string>;

/**
 * Reads a provider credential from stored settings or environment variables.
 * Prioritizes AI Brain internal settings over environment variables.
 * 
 * @param vendor - The provider vendor.
 * @returns A resolution object containing the API key and its source.
 */
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

/**
 * Reads a provider credential for a specific assignment.
 * Checks the assignment's explicit API key before falling back to global settings.
 * 
 * @param vendor - The provider vendor.
 * @param assignment - The specific AI Brain assignment to check.
 * @returns A resolution object containing the API key and its source.
 */
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

/**
 * Resolves a mandatory provider credential.
 * Throws a configuration error if the API key cannot be found.
 * 
 * @param vendor - The provider vendor.
 * @returns The resolved API key.
 * @throws {AppError} If the API key is missing.
 */
export const resolveBrainProviderCredential = async (
  vendor: BrainProviderCredentialVendor
): Promise<string> => {
  const resolved = await readBrainProviderCredential(vendor);
  if (resolved.apiKey !== null) {
    return resolved.apiKey;
  }

  throw configurationError(
    `${BRAIN_PROVIDER_LABELS[vendor]} API key is missing in AI Brain provider settings and environment.`,
    {
      vendor,
      sourceKey: resolved.sourceKey,
    }
  );
};

/**
 * Resolves a mandatory provider credential for a specific assignment.
 * Throws a configuration error if the API key cannot be found in the assignment or global settings.
 * 
 * @param vendor - The provider vendor.
 * @param assignment - The assignment to check.
 * @returns The resolved API key.
 * @throws {AppError} If the API key is missing.
 */
export const resolveBrainProviderCredentialForAssignment = async (
  vendor: BrainProviderCredentialVendor,
  assignment: Pick<AiBrainAssignment, 'apiKey'>
): Promise<string> => {
  const resolved = await readBrainProviderCredentialForAssignment(vendor, assignment);
  if (resolved.apiKey !== null) {
    return resolved.apiKey;
  }

  throw configurationError(
    `${BRAIN_PROVIDER_LABELS[vendor]} API key is missing in this AI Brain route, provider settings, and environment.`,
    {
      vendor,
      source: resolved.source,
    }
  );
};
