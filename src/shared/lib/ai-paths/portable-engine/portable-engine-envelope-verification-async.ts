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
    return warnOrRejectPortablePathEnvelopeVerification(
      'async',
      mode,
      signature,
      'signature_missing',
      0,
      null,
      createPortablePathEnvelopeSignatureMissingWarning()
    );
  }

  if (signature.algorithm === 'stable_hash_v1') {
    const candidateSecrets = resolveEnvelopeSignatureSecrets(options, {
      phase: 'async',
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
        'async',
        mode,
        signature,
        'mismatch',
        candidateSecrets.length,
        null,
        createPortablePathEnvelopeSignatureMismatchWarning()
      );
    }
    return acceptPortablePathEnvelopeVerification(
      'async',
      mode,
      signature,
      candidateSecrets.length,
      candidateSecrets.length > 0 ? 0 : null
    );
  }

  if (signature.algorithm === 'hmac_sha256') {
    const candidateSecrets = resolveEnvelopeSignatureSecrets(options, {
      phase: 'async',
      mode,
      algorithm: signature.algorithm,
      keyId: signature.keyId ?? null,
    });
    if (candidateSecrets.length === 0) {
      return warnOrRejectPortablePathEnvelopeVerification(
        'async',
        mode,
        signature,
        'key_missing',
        0,
        null,
        createPortablePathEnvelopeSignatureKeyMissingWarning()
      );
    }

    const normalized = stableStringify(normalizePortableEnvelopeSignatureInput(portableEnvelope));
    let hasRuntimeVerification = false;
    let matchedSecretIndex: number | null = null;
    for (let index = 0; index < candidateSecrets.length; index += 1) {
      const secret = candidateSecrets[index]!;
      const hmac = await computeHmacSha256Hex(normalized, secret);
      if (!hmac) continue;
      hasRuntimeVerification = true;
      if (hmac === signature.value) {
        matchedSecretIndex = index;
        break;
      }
    }

    if (!hasRuntimeVerification) {
      return warnOrRejectPortablePathEnvelopeVerification(
        'async',
        mode,
        signature,
        'verification_unavailable',
        candidateSecrets.length,
        null,
        createPortablePathEnvelopeSignatureVerificationUnavailableWarning()
      );
    }
    if (matchedSecretIndex === null) {
      return warnOrRejectPortablePathEnvelopeVerification(
        'async',
        mode,
        signature,
        'mismatch',
        candidateSecrets.length,
        null,
        createPortablePathEnvelopeSignatureMismatchWarning()
      );
    }
    return acceptPortablePathEnvelopeVerification(
      'async',
      mode,
      signature,
      candidateSecrets.length,
      matchedSecretIndex
    );
  }

  return warnOrRejectPortablePathEnvelopeVerification(
    'async',
    mode,
    signature,
    'unsupported_algorithm',
    0,
    null,
    createPortablePathEnvelopeSignatureAsyncUnsupportedAlgorithmWarning(signature.algorithm)
  );
};
