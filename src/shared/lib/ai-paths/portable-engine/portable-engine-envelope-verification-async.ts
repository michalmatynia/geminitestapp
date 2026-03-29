import { stableStringify } from '@/shared/lib/ai-paths/core/utils/runtime';

import { computePortablePathEnvelopeSignatureSync } from './portable-engine-envelope-signing';
import {
  acceptPortablePathEnvelopeVerification,
  createPortablePathEnvelopeSignatureAsyncUnsupportedAlgorithmWarning,
  createPortablePathEnvelopeSignatureKeyMissingWarning,
  createPortablePathEnvelopeSignatureMismatchWarning,
  createPortablePathEnvelopeSignatureMissingWarning,
  createPortablePathEnvelopeSignatureVerificationUnavailableWarning,
  warnOrRejectPortablePathEnvelopeVerification,
  type PortablePathEnvelopeVerificationResult,
} from './portable-engine-envelope-verification-support';
import {
  type PortablePathEnvelopeSignatureVerificationOptions,
  computeHmacSha256Hex,
  normalizePortableEnvelopeSignatureInput,
  resolveEnvelopeSignatureSecrets,
} from './portable-engine-integrity-support';

import type { AiPathPortablePackageEnvelopeVersioned } from './portable-engine-contract';
import type { PortablePathEnvelopeSignatureVerificationMode } from './portable-engine-resolution-types';

const rejectAsyncEnvelopeVerification = (
  mode: PortablePathEnvelopeSignatureVerificationMode,
  signature: AiPathPortablePackageEnvelopeVersioned['signature'],
  outcome: Parameters<typeof warnOrRejectPortablePathEnvelopeVerification>[3],
  candidateSecretCount: number,
  warning: Parameters<typeof warnOrRejectPortablePathEnvelopeVerification>[6]
): PortablePathEnvelopeVerificationResult =>
  warnOrRejectPortablePathEnvelopeVerification(
    'async',
    mode,
    signature,
    outcome,
    candidateSecretCount,
    null,
    warning
  );

const acceptAsyncEnvelopeVerification = (
  mode: PortablePathEnvelopeSignatureVerificationMode,
  signature: NonNullable<AiPathPortablePackageEnvelopeVersioned['signature']>,
  candidateSecretCount: number,
  matchedSecretIndex: number | null
): PortablePathEnvelopeVerificationResult =>
  acceptPortablePathEnvelopeVerification(
    'async',
    mode,
    signature,
    candidateSecretCount,
    matchedSecretIndex
  );

const resolveAsyncSignatureSecrets = (
  mode: PortablePathEnvelopeSignatureVerificationMode,
  options: PortablePathEnvelopeSignatureVerificationOptions | undefined,
  signature: NonNullable<AiPathPortablePackageEnvelopeVersioned['signature']>
): string[] =>
  resolveEnvelopeSignatureSecrets(options, {
    phase: 'async',
    mode,
    algorithm: signature.algorithm,
    keyId: signature.keyId ?? null,
  });

const verifyStableHashEnvelopeSignatureAsync = (
  portableEnvelope: AiPathPortablePackageEnvelopeVersioned,
  mode: PortablePathEnvelopeSignatureVerificationMode,
  options: PortablePathEnvelopeSignatureVerificationOptions | undefined,
  signature: NonNullable<AiPathPortablePackageEnvelopeVersioned['signature']>
): PortablePathEnvelopeVerificationResult => {
  const candidateSecrets = resolveAsyncSignatureSecrets(mode, options, signature);
  const expectedSignature = computePortablePathEnvelopeSignatureSync(portableEnvelope, {
    secret: candidateSecrets[0],
    keyId: signature.keyId,
  });
  if (signature.value !== expectedSignature.value) {
    return rejectAsyncEnvelopeVerification(
      mode,
      signature,
      'mismatch',
      candidateSecrets.length,
      createPortablePathEnvelopeSignatureMismatchWarning()
    );
  }
  return acceptAsyncEnvelopeVerification(mode, signature, candidateSecrets.length, candidateSecrets.length > 0 ? 0 : null);
};

const findMatchingHmacSecretIndex = async (
  normalizedEnvelope: string,
  candidateSecrets: string[],
  signatureValue: string
): Promise<{ hasRuntimeVerification: boolean; matchedSecretIndex: number | null }> => {
  let hasRuntimeVerification = false;
  let matchedSecretIndex: number | null = null;
  for (let index = 0; index < candidateSecrets.length; index += 1) {
    const secret = candidateSecrets[index]!;
    const hmac = await computeHmacSha256Hex(normalizedEnvelope, secret);
    if (!hmac) continue;
    hasRuntimeVerification = true;
    if (hmac === signatureValue) {
      matchedSecretIndex = index;
      break;
    }
  }
  return { hasRuntimeVerification, matchedSecretIndex };
};

const verifyHmacEnvelopeSignatureAsync = async (
  portableEnvelope: AiPathPortablePackageEnvelopeVersioned,
  mode: PortablePathEnvelopeSignatureVerificationMode,
  options: PortablePathEnvelopeSignatureVerificationOptions | undefined,
  signature: NonNullable<AiPathPortablePackageEnvelopeVersioned['signature']>
): Promise<PortablePathEnvelopeVerificationResult> => {
  const candidateSecrets = resolveAsyncSignatureSecrets(mode, options, signature);
  if (candidateSecrets.length === 0) {
    return rejectAsyncEnvelopeVerification(
      mode,
      signature,
      'key_missing',
      0,
      createPortablePathEnvelopeSignatureKeyMissingWarning()
    );
  }

  const normalized = stableStringify(normalizePortableEnvelopeSignatureInput(portableEnvelope));
  const { hasRuntimeVerification, matchedSecretIndex } = await findMatchingHmacSecretIndex(
    normalized,
    candidateSecrets,
    signature.value
  );
  if (!hasRuntimeVerification) {
    return rejectAsyncEnvelopeVerification(
      mode,
      signature,
      'verification_unavailable',
      candidateSecrets.length,
      createPortablePathEnvelopeSignatureVerificationUnavailableWarning()
    );
  }
  if (matchedSecretIndex === null) {
    return rejectAsyncEnvelopeVerification(
      mode,
      signature,
      'mismatch',
      candidateSecrets.length,
      createPortablePathEnvelopeSignatureMismatchWarning()
    );
  }
  return acceptAsyncEnvelopeVerification(mode, signature, candidateSecrets.length, matchedSecretIndex);
};

export const verifyPortablePathPackageEnvelopeSignatureAsync = async (
  portableEnvelope: AiPathPortablePackageEnvelopeVersioned,
  mode: PortablePathEnvelopeSignatureVerificationMode,
  options?: PortablePathEnvelopeSignatureVerificationOptions
): Promise<PortablePathEnvelopeVerificationResult> => {
  if (mode === 'off') {
    return { ok: true, warnings: [] };
  }

  const signature = portableEnvelope.signature;
  if (!signature) {
    return rejectAsyncEnvelopeVerification(
      mode,
      signature,
      'signature_missing',
      0,
      createPortablePathEnvelopeSignatureMissingWarning()
    );
  }

  if (signature.algorithm === 'stable_hash_v1') {
    return verifyStableHashEnvelopeSignatureAsync(portableEnvelope, mode, options, signature);
  }

  if (signature.algorithm === 'hmac_sha256') {
    return verifyHmacEnvelopeSignatureAsync(portableEnvelope, mode, options, signature);
  }

  return rejectAsyncEnvelopeVerification(
    mode,
    signature,
    'unsupported_algorithm',
    0,
    createPortablePathEnvelopeSignatureAsyncUnsupportedAlgorithmWarning(signature.algorithm)
  );
};
