import { hashString, stableStringify } from '@/shared/lib/ai-paths/core/utils/runtime';

import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from './portable-engine-contract';

import type { PortablePathEnvelopeSignatureKeyResolverContext } from './portable-engine-resolution-types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const createStableHashHex = (value: string): string =>
  [
    hashString(value),
    hashString(`a:${value}`),
    hashString(`b:${value}`),
    hashString(`c:${value}`),
  ].join('');

export const buildPortablePathJsonSchemaHash = (schema: Record<string, unknown>): string =>
  createStableHashHex(stableStringify(schema));

export const normalizeOptionalSecret = (value: string | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeOptionalSecretList = (value: string[] | undefined): string[] => {
  if (!Array.isArray(value) || value.length === 0) return [];
  return value
    .map((item) => normalizeOptionalSecret(item))
    .filter((item): item is string => item !== null);
};

export type PortablePathEnvelopeSignatureVerificationOptions = Pick<
  {
    envelopeSignatureSecret?: string;
    envelopeSignatureSecretsByKeyId?: Record<string, string>;
    envelopeSignatureFallbackSecrets?: string[];
    envelopeSignatureKeyResolver?: (
      context: PortablePathEnvelopeSignatureKeyResolverContext
    ) => string | string[] | null | undefined;
  },
  | 'envelopeSignatureSecret'
  | 'envelopeSignatureSecretsByKeyId'
  | 'envelopeSignatureFallbackSecrets'
  | 'envelopeSignatureKeyResolver'
>;

const collectOptionalSecret = (candidates: string[], value: string | undefined): void => {
  const normalized = normalizeOptionalSecret(value);
  if (normalized) candidates.push(normalized);
};

const collectOptionalSecretList = (candidates: string[], value: string[] | undefined): void => {
  candidates.push(...normalizeOptionalSecretList(value));
};

const collectResolverSecrets = (
  candidates: string[],
  options: PortablePathEnvelopeSignatureVerificationOptions | undefined,
  context: PortablePathEnvelopeSignatureKeyResolverContext
): void => {
  if (!options?.envelopeSignatureKeyResolver) return;
  const resolverResult = options.envelopeSignatureKeyResolver(context);
  if (typeof resolverResult === 'string') {
    collectOptionalSecret(candidates, resolverResult);
    return;
  }
  if (Array.isArray(resolverResult)) {
    collectOptionalSecretList(candidates, resolverResult);
  }
};

const collectKeyIdSecret = (
  candidates: string[],
  options: PortablePathEnvelopeSignatureVerificationOptions | undefined,
  keyId: string | null
): void => {
  if (!keyId || !options?.envelopeSignatureSecretsByKeyId) return;
  collectOptionalSecret(candidates, options.envelopeSignatureSecretsByKeyId[keyId]);
};

export const resolveEnvelopeSignatureSecrets = (
  options: PortablePathEnvelopeSignatureVerificationOptions | undefined,
  context: PortablePathEnvelopeSignatureKeyResolverContext
): string[] => {
  const candidates: string[] = [];
  collectResolverSecrets(candidates, options, context);
  collectKeyIdSecret(candidates, options, context.keyId ?? null);
  collectOptionalSecret(candidates, options?.envelopeSignatureSecret);
  collectOptionalSecretList(candidates, options?.envelopeSignatureFallbackSecrets);
  return Array.from(new Set(candidates));
};

const removeTopLevelFingerprint = (input: unknown): unknown => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const record = input as Record<string, unknown>;
  if (record['specVersion'] !== AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION) return input;
  if (record['kind'] !== 'path_package') return input;
  const { fingerprint: _fingerprint, ...rest } = record;
  return rest;
};

export const normalizePortableFingerprintInput = (input: unknown): unknown => {
  const withoutFingerprint = removeTopLevelFingerprint(input);
  try {
    return JSON.parse(JSON.stringify(withoutFingerprint)) as unknown;
  } catch (error) {
    logClientError(error);
    return withoutFingerprint;
  }
};

const removeTopLevelEnvelopeSignature = (input: unknown): unknown => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const record = input as Record<string, unknown>;
  if (record['kind'] !== 'path_package_envelope') return input;
  const { signature: _signature, ...rest } = record;
  return rest;
};

export const normalizePortableEnvelopeSignatureInput = (input: unknown): unknown => {
  const withoutSignature = removeTopLevelEnvelopeSignature(input);
  try {
    return JSON.parse(JSON.stringify(withoutSignature)) as unknown;
  } catch (error) {
    logClientError(error);
    return withoutSignature;
  }
};

export const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte: number): string => byte.toString(16).padStart(2, '0'))
    .join('');

export const computeHmacSha256Hex = async (
  message: string,
  secret: string
): Promise<string | null> => {
  if (!globalThis.crypto?.subtle || typeof TextEncoder !== 'function') {
    return null;
  }
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return toHex(new Uint8Array(signature));
};
