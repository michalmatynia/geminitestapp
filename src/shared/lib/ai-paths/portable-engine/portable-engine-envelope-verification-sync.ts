import { computePortablePathEnvelopeSignatureSync } from './portable-engine-envelope-signing';
import {
  acceptPortablePathEnvelopeVerification,
  createPortablePathEnvelopeSignatureAsyncRequiredWarning,
  createPortablePathEnvelopeSignatureKeyMissingWarning,
  createPortablePathEnvelopeSignatureMismatchWarning,
  createPortablePathEnvelopeSignatureMissingWarning,
  createPortablePathEnvelopeSignatureSyncUnsupportedAlgorithmWarning,
  warnOrRejectPortablePathEnvelopeVerification,
  type PortablePathEnvelopeVerificationResult,
} from './portable-engine-envelope-verification-support';
import {
  type PortablePathEnvelopeSignatureVerificationOptions,
  resolveEnvelopeSignatureSecrets,
} from './portable-engine-integrity-support';

import type { AiPathPortablePackageEnvelopeVersioned } from './portable-engine-contract';
import type { PortablePathEnvelopeSignatureVerificationMode } from './portable-engine-resolution-types';

const rejectSyncEnvelopeVerification = (
  mode: PortablePathEnvelopeSignatureVerificationMode,
  signature: AiPathPortablePackageEnvelopeVersioned['signature'],
  outcome: Parameters<typeof warnOrRejectPortablePathEnvelopeVerification>[3],
  candidateSecretCount: number,
  warning: Parameters<typeof warnOrRejectPortablePathEnvelopeVerification>[6]
): PortablePathEnvelopeVerificationResult =>
  warnOrRejectPortablePathEnvelopeVerification(
    'sync',
    mode,
    signature,
    outcome,
    candidateSecretCount,
    null,
    warning
  );

const acceptSyncEnvelopeVerification = (
  mode: PortablePathEnvelopeSignatureVerificationMode,
  signature: NonNullable<AiPathPortablePackageEnvelopeVersioned['signature']>,
  candidateSecretCount: number
): PortablePathEnvelopeVerificationResult =>
  acceptPortablePathEnvelopeVerification(
    'sync',
    mode,
    signature,
    candidateSecretCount,
    candidateSecretCount > 0 ? 0 : null
  );

const resolveSyncSignatureSecrets = (
  mode: PortablePathEnvelopeSignatureVerificationMode,
  options: PortablePathEnvelopeSignatureVerificationOptions | undefined,
  signature: NonNullable<AiPathPortablePackageEnvelopeVersioned['signature']>
): string[] =>
  resolveEnvelopeSignatureSecrets(options, {
    phase: 'sync',
    mode,
    algorithm: signature.algorithm,
    keyId: signature.keyId ?? null,
  });

const verifyStableHashEnvelopeSignatureSync = (
  portableEnvelope: AiPathPortablePackageEnvelopeVersioned,
  mode: PortablePathEnvelopeSignatureVerificationMode,
  options: PortablePathEnvelopeSignatureVerificationOptions | undefined,
  signature: NonNullable<AiPathPortablePackageEnvelopeVersioned['signature']>
): PortablePathEnvelopeVerificationResult => {
  const candidateSecrets = resolveSyncSignatureSecrets(mode, options, signature);
  const expectedSignature = computePortablePathEnvelopeSignatureSync(portableEnvelope, {
    secret: candidateSecrets[0],
    keyId: signature.keyId,
  });
  if (signature.value !== expectedSignature.value) {
    return rejectSyncEnvelopeVerification(
      mode,
      signature,
      'mismatch',
      candidateSecrets.length,
      createPortablePathEnvelopeSignatureMismatchWarning()
    );
  }
  return acceptSyncEnvelopeVerification(mode, signature, candidateSecrets.length);
};

const verifyHmacEnvelopeSignatureSync = (
  mode: PortablePathEnvelopeSignatureVerificationMode,
  options: PortablePathEnvelopeSignatureVerificationOptions | undefined,
  signature: NonNullable<AiPathPortablePackageEnvelopeVersioned['signature']>
): PortablePathEnvelopeVerificationResult => {
  const candidateSecrets = resolveSyncSignatureSecrets(mode, options, signature);
  if (candidateSecrets.length === 0) {
    return rejectSyncEnvelopeVerification(
      mode,
      signature,
      'key_missing',
      0,
      createPortablePathEnvelopeSignatureKeyMissingWarning()
    );
  }
  return rejectSyncEnvelopeVerification(
    mode,
    signature,
    'async_required',
    candidateSecrets.length,
    createPortablePathEnvelopeSignatureAsyncRequiredWarning()
  );
};

export const verifyPortablePathPackageEnvelopeSignature = (
  portableEnvelope: AiPathPortablePackageEnvelopeVersioned,
  mode: PortablePathEnvelopeSignatureVerificationMode,
  options?: PortablePathEnvelopeSignatureVerificationOptions
): PortablePathEnvelopeVerificationResult => {
  if (mode === 'off') {
    return { ok: true, warnings: [] };
  }

  const signature = portableEnvelope.signature;
  if (!signature) {
    return rejectSyncEnvelopeVerification(
      mode,
      signature,
      'signature_missing',
      0,
      createPortablePathEnvelopeSignatureMissingWarning()
    );
  }

  if (signature.algorithm === 'hmac_sha256') {
    return verifyHmacEnvelopeSignatureSync(mode, options, signature);
  }

  if (signature.algorithm !== 'stable_hash_v1') {
    return rejectSyncEnvelopeVerification(
      mode,
      signature,
      'unsupported_algorithm',
      0,
      createPortablePathEnvelopeSignatureSyncUnsupportedAlgorithmWarning(signature.algorithm)
    );
  }

  return verifyStableHashEnvelopeSignatureSync(portableEnvelope, mode, options, signature);
};
