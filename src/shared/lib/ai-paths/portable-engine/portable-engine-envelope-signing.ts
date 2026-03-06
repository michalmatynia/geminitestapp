import { stableStringify } from '@/shared/lib/ai-paths/core/utils/runtime';

import {
  computeHmacSha256Hex,
  createStableHashHex,
  normalizeOptionalSecret,
  normalizePortableEnvelopeSignatureInput,
} from './portable-engine-integrity-support';
import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  type AiPathPortablePackage,
  type AiPathPortablePackageEnvelope,
  type BuildPortablePathPackageEnvelopeOptions,
  type PortablePathEnvelopeSignature,
} from './portable-engine-contract';

export const computePortablePathEnvelopeSignatureSync = (
  input: unknown,
  options?: Pick<BuildPortablePathPackageEnvelopeOptions, 'secret' | 'keyId'>
): PortablePathEnvelopeSignature => {
  const normalized = stableStringify(normalizePortableEnvelopeSignatureInput(input));
  const secret = normalizeOptionalSecret(options?.secret);
  const stableInput = secret ? `${secret}:${normalized}` : normalized;
  return {
    algorithm: 'stable_hash_v1',
    value: createStableHashHex(stableInput),
    ...(options?.keyId ? { keyId: options.keyId } : {}),
  };
};

export const computePortablePathEnvelopeSignature = async (
  input: unknown,
  options?: Pick<BuildPortablePathPackageEnvelopeOptions, 'secret' | 'keyId'>
): Promise<PortablePathEnvelopeSignature> => {
  const normalized = stableStringify(normalizePortableEnvelopeSignatureInput(input));
  const secret = normalizeOptionalSecret(options?.secret);
  if (secret) {
    const hmac = await computeHmacSha256Hex(normalized, secret);
    if (hmac) {
      return {
        algorithm: 'hmac_sha256',
        value: hmac,
        ...(options?.keyId ? { keyId: options.keyId } : {}),
      };
    }
  }
  return computePortablePathEnvelopeSignatureSync(input, options);
};

export const buildPortablePathPackageEnvelope = async (
  portablePackage: AiPathPortablePackage,
  options?: BuildPortablePathPackageEnvelopeOptions
): Promise<AiPathPortablePackageEnvelope> => {
  const envelope: Omit<AiPathPortablePackageEnvelope, 'signature'> = {
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    kind: 'path_package_envelope',
    signedAt: options?.signedAt ?? new Date().toISOString(),
    package: portablePackage,
    ...(options?.metadata ? { metadata: options.metadata } : {}),
  };
  const signature = await computePortablePathEnvelopeSignature(envelope, {
    secret: options?.secret,
    keyId: options?.keyId,
  });
  return {
    ...envelope,
    signature,
  };
};

export const serializePortablePathPackageEnvelope = async (
  portablePackage: AiPathPortablePackage,
  options?: BuildPortablePathPackageEnvelopeOptions
): Promise<string> =>
  JSON.stringify(await buildPortablePathPackageEnvelope(portablePackage, options), null, 2);
