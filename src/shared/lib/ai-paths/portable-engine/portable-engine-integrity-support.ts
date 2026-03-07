import { hashString, stableStringify } from '@/shared/lib/ai-paths/core/utils/runtime';

import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from './portable-engine-contract';
import type { PortablePathEnvelopeSignatureKeyResolverContext } from './portable-engine-resolution-types';

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

export const resolveEnvelopeSignatureSecrets = (
  options: PortablePathEnvelopeSignatureVerificationOptions | undefined,
  context: PortablePathEnvelopeSignatureKeyResolverContext
): string[] => {
  const candidates: string[] = [];
  if (options?.envelopeSignatureKeyResolver) {
    const resolverResult = options.envelopeSignatureKeyResolver(context);
    if (typeof resolverResult === 'string') {
      const normalized = normalizeOptionalSecret(resolverResult);
      if (normalized) candidates.push(normalized);
    } else if (Array.isArray(resolverResult)) {
      candidates.push(...normalizeOptionalSecretList(resolverResult));
    }
  }
  const keyId = context.keyId ?? undefined;
  if (
    keyId &&
    options?.envelopeSignatureSecretsByKeyId &&
    typeof options.envelopeSignatureSecretsByKeyId[keyId] === 'string'
  ) {
    const normalized = normalizeOptionalSecret(options.envelopeSignatureSecretsByKeyId[keyId]);
    if (normalized) candidates.push(normalized);
  }
  const primarySecret = normalizeOptionalSecret(options?.envelopeSignatureSecret);
  if (primarySecret) candidates.push(primarySecret);
  candidates.push(...normalizeOptionalSecretList(options?.envelopeSignatureFallbackSecrets));
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
  } catch {
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
  } catch {
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
