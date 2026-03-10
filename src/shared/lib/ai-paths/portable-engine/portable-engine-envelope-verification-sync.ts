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
    return warnOrRejectPortablePathEnvelopeVerification(
      'sync',
      mode,
      signature,
      'signature_missing',
      0,
      null,
      createPortablePathEnvelopeSignatureMissingWarning()
    );
  }

  if (signature.algorithm === 'hmac_sha256') {
    const candidateSecrets = resolveEnvelopeSignatureSecrets(options, {
      phase: 'sync',
      mode,
      algorithm: signature.algorithm,
      keyId: signature.keyId ?? null,
    });
    if (candidateSecrets.length === 0) {
      return warnOrRejectPortablePathEnvelopeVerification(
        'sync',
        mode,
        signature,
        'key_missing',
        0,
        null,
        createPortablePathEnvelopeSignatureKeyMissingWarning()
      );
    }
    return warnOrRejectPortablePathEnvelopeVerification(
      'sync',
      mode,
      signature,
      'async_required',
      candidateSecrets.length,
      null,
      createPortablePathEnvelopeSignatureAsyncRequiredWarning()
    );
  }

  if (signature.algorithm !== 'stable_hash_v1') {
    return warnOrRejectPortablePathEnvelopeVerification(
      'sync',
      mode,
      signature,
      'unsupported_algorithm',
      0,
      null,
      createPortablePathEnvelopeSignatureSyncUnsupportedAlgorithmWarning(signature.algorithm)
    );
  }

  const candidateSecrets = resolveEnvelopeSignatureSecrets(options, {
    phase: 'sync',
    mode,
    algorithm: signature.algorithm,
    keyId: signature.keyId ?? null,
  });
  const expectedSignature = computePortablePathEnvelopeSignatureSync(portableEnvelope, {
    secret: candidateSecrets[0],
    keyId: signature.keyId,
  });
  if (signature.value !== expectedSignature.value) {
    return warnOrRejectPortablePathEnvelopeVerification(
      'sync',
      mode,
      signature,
      'mismatch',
      candidateSecrets.length,
      null,
      createPortablePathEnvelopeSignatureMismatchWarning()
    );
  }

  return acceptPortablePathEnvelopeVerification(
    'sync',
    mode,
    signature,
    candidateSecrets.length,
    candidateSecrets.length > 0 ? 0 : null
  );
};
