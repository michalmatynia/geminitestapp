
import { stableStringify } from '@/shared/lib/ai-paths/core/utils/runtime';
import type {
  PortablePathEnvelopeVerificationOutcome,
  PortablePathEnvelopeVerificationStatus,
} from './portable-engine-observability';
import {
  recordPortablePathEnvelopeVerificationEvent,
} from './portable-engine-observability';

import {
  type PortablePathEnvelopeSignatureVerificationOptions,
  computeHmacSha256Hex,
  createStableHashHex,
  normalizeOptionalSecret,
  normalizePortableEnvelopeSignatureInput,
  normalizePortableFingerprintInput,
  resolveEnvelopeSignatureSecrets,
  toHex,
} from './portable-engine-builders';
import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  type AiPathPortablePackage,
  type AiPathPortablePackageEnvelope,
  type AiPathPortablePackageEnvelopeVersioned,
  type BuildPortablePathPackageEnvelopeOptions,
  type PortablePathEnvelopeSignature,
  type PortablePathEnvelopeSignatureVerificationMode,
  type PortablePathFingerprint,
  type PortablePathFingerprintVerificationMode,
  type PortablePathMigrationWarning,
} from './portable-engine-types';

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

export const computePortablePathFingerprintSync = (input: unknown): PortablePathFingerprint => {
  const normalized = stableStringify(normalizePortableFingerprintInput(input));
  return {
    algorithm: 'stable_hash_v1',
    value: createStableHashHex(normalized),
  };
};

export const computePortablePathFingerprint = async (
  input: unknown
): Promise<PortablePathFingerprint> => {
  const stableFingerprint = computePortablePathFingerprintSync(input);
  const normalized = stableStringify(normalizePortableFingerprintInput(input));
  if (globalThis.crypto?.subtle && typeof TextEncoder === 'function') {
    const digest = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(normalized)
    );
    return {
      algorithm: 'sha256',
      value: toHex(new Uint8Array(digest)),
    };
  }
  return stableFingerprint;
};

const recordPortablePathEnvelopeVerificationResult = (
  phase: 'sync' | 'async',
  mode: PortablePathEnvelopeSignatureVerificationMode,
  signature: AiPathPortablePackageEnvelopeVersioned['signature'],
  outcome: PortablePathEnvelopeVerificationOutcome,
  status: PortablePathEnvelopeVerificationStatus,
  candidateSecretCount: number,
  matchedSecretIndex: number | null
): void => {
  recordPortablePathEnvelopeVerificationEvent({
    phase,
    mode,
    algorithm: signature?.algorithm ?? null,
    keyId: signature?.keyId ?? null,
    candidateSecretCount,
    matchedSecretIndex,
    outcome,
    status,
  });
};

export const verifyPortablePathPackageEnvelopeSignature = (
  portableEnvelope: AiPathPortablePackageEnvelopeVersioned,
  mode: PortablePathEnvelopeSignatureVerificationMode,
  options?: PortablePathEnvelopeSignatureVerificationOptions
):
  | { ok: true; warnings: PortablePathMigrationWarning[] }
  | { ok: false; error: string; warnings: PortablePathMigrationWarning[] } => {
  if (mode === 'off') {
    return { ok: true, warnings: [] };
  }

  const signature = portableEnvelope.signature;
  if (!signature) {
    const warning: PortablePathMigrationWarning = {
      code: 'package_envelope_signature_missing',
      message: 'Portable package envelope signature is missing.',
    };
    if (mode === 'strict') {
      recordPortablePathEnvelopeVerificationResult(
        'sync',
        mode,
        signature,
        'signature_missing',
        'rejected',
        0,
        null
      );
      return {
        ok: false,
        error: `Portable package envelope verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    recordPortablePathEnvelopeVerificationResult(
      'sync',
      mode,
      signature,
      'signature_missing',
      'warned',
      0,
      null
    );
    return { ok: true, warnings: [warning] };
  }

  if (signature.algorithm === 'hmac_sha256') {
    const candidateSecrets = resolveEnvelopeSignatureSecrets(options, {
      phase: 'sync',
      mode,
      algorithm: signature.algorithm,
      keyId: signature.keyId ?? null,
    });
    if (candidateSecrets.length === 0) {
      const warning: PortablePathMigrationWarning = {
        code: 'package_envelope_signature_key_missing',
        message:
          'Portable package envelope hmac signature requires a verification secret/key. Provide envelopeSignatureSecret, envelopeSignatureSecretsByKeyId, envelopeSignatureFallbackSecrets, or envelopeSignatureKeyResolver.',
      };
      if (mode === 'strict') {
        recordPortablePathEnvelopeVerificationResult(
          'sync',
          mode,
          signature,
          'key_missing',
          'rejected',
          0,
          null
        );
        return {
          ok: false,
          error: `Portable package envelope verification failed: ${warning.message}`,
          warnings: [warning],
        };
      }
      recordPortablePathEnvelopeVerificationResult(
        'sync',
        mode,
        signature,
        'key_missing',
        'warned',
        0,
        null
      );
      return { ok: true, warnings: [warning] };
    }
    const warning: PortablePathMigrationWarning = {
      code: 'package_envelope_signature_async_required',
      message:
        'Portable package envelope hmac signature requires asynchronous verification. Use resolvePortablePathInputAsync for strict verification.',
    };
    if (mode === 'strict') {
      recordPortablePathEnvelopeVerificationResult(
        'sync',
        mode,
        signature,
        'async_required',
        'rejected',
        candidateSecrets.length,
        null
      );
      return {
        ok: false,
        error: `Portable package envelope verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    recordPortablePathEnvelopeVerificationResult(
      'sync',
      mode,
      signature,
      'async_required',
      'warned',
      candidateSecrets.length,
      null
    );
    return { ok: true, warnings: [warning] };
  }

  if (signature.algorithm !== 'stable_hash_v1') {
    const warning: PortablePathMigrationWarning = {
      code: 'package_envelope_signature_unsupported_algorithm',
      message: `Portable package envelope signature algorithm "${signature.algorithm}" cannot be synchronously verified during import.`,
    };
    if (mode === 'strict') {
      recordPortablePathEnvelopeVerificationResult(
        'sync',
        mode,
        signature,
        'unsupported_algorithm',
        'rejected',
        0,
        null
      );
      return {
        ok: false,
        error: `Portable package envelope verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    recordPortablePathEnvelopeVerificationResult(
      'sync',
      mode,
      signature,
      'unsupported_algorithm',
      'warned',
      0,
      null
    );
    return { ok: true, warnings: [warning] };
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
    const warning: PortablePathMigrationWarning = {
      code: 'package_envelope_signature_mismatch',
      message: 'Portable package envelope signature does not match envelope contents.',
    };
    if (mode === 'strict') {
      recordPortablePathEnvelopeVerificationResult(
        'sync',
        mode,
        signature,
        'mismatch',
        'rejected',
        candidateSecrets.length,
        null
      );
      return {
        ok: false,
        error: `Portable package envelope verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    recordPortablePathEnvelopeVerificationResult(
      'sync',
      mode,
      signature,
      'mismatch',
      'warned',
      candidateSecrets.length,
      null
    );
    return { ok: true, warnings: [warning] };
  }

  recordPortablePathEnvelopeVerificationResult(
    'sync',
    mode,
    signature,
    'verified',
    'verified',
    candidateSecrets.length,
    candidateSecrets.length > 0 ? 0 : null
  );
  return { ok: true, warnings: [] };
};

export const verifyPortablePathPackageEnvelopeSignatureAsync = async (
  portableEnvelope: AiPathPortablePackageEnvelopeVersioned,
  mode: PortablePathEnvelopeSignatureVerificationMode,
  options?: PortablePathEnvelopeSignatureVerificationOptions
):
  Promise<
    | { ok: true; warnings: PortablePathMigrationWarning[] }
    | { ok: false; error: string; warnings: PortablePathMigrationWarning[] }
  > => {
  if (mode === 'off') {
    return { ok: true, warnings: [] };
  }

  const signature = portableEnvelope.signature;
  if (!signature) {
    const warning: PortablePathMigrationWarning = {
      code: 'package_envelope_signature_missing',
      message: 'Portable package envelope signature is missing.',
    };
    if (mode === 'strict') {
      recordPortablePathEnvelopeVerificationResult(
        'async',
        mode,
        signature,
        'signature_missing',
        'rejected',
        0,
        null
      );
      return {
        ok: false,
        error: `Portable package envelope verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    recordPortablePathEnvelopeVerificationResult(
      'async',
      mode,
      signature,
      'signature_missing',
      'warned',
      0,
      null
    );
    return { ok: true, warnings: [warning] };
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
      const warning: PortablePathMigrationWarning = {
        code: 'package_envelope_signature_mismatch',
        message: 'Portable package envelope signature does not match envelope contents.',
      };
      if (mode === 'strict') {
        recordPortablePathEnvelopeVerificationResult(
          'async',
          mode,
          signature,
          'mismatch',
          'rejected',
          candidateSecrets.length,
          null
        );
        return {
          ok: false,
          error: `Portable package envelope verification failed: ${warning.message}`,
          warnings: [warning],
        };
      }
      recordPortablePathEnvelopeVerificationResult(
        'async',
        mode,
        signature,
        'mismatch',
        'warned',
        candidateSecrets.length,
        null
      );
      return { ok: true, warnings: [warning] };
    }
    recordPortablePathEnvelopeVerificationResult(
      'async',
      mode,
      signature,
      'verified',
      'verified',
      candidateSecrets.length,
      candidateSecrets.length > 0 ? 0 : null
    );
    return { ok: true, warnings: [] };
  }

  if (signature.algorithm === 'hmac_sha256') {
    const candidateSecrets = resolveEnvelopeSignatureSecrets(options, {
      phase: 'async',
      mode,
      algorithm: signature.algorithm,
      keyId: signature.keyId ?? null,
    });
    if (candidateSecrets.length === 0) {
      const warning: PortablePathMigrationWarning = {
        code: 'package_envelope_signature_key_missing',
        message:
          'Portable package envelope hmac signature requires a verification secret/key. Provide envelopeSignatureSecret, envelopeSignatureSecretsByKeyId, envelopeSignatureFallbackSecrets, or envelopeSignatureKeyResolver.',
      };
      if (mode === 'strict') {
        recordPortablePathEnvelopeVerificationResult(
          'async',
          mode,
          signature,
          'key_missing',
          'rejected',
          0,
          null
        );
        return {
          ok: false,
          error: `Portable package envelope verification failed: ${warning.message}`,
          warnings: [warning],
        };
      }
      recordPortablePathEnvelopeVerificationResult(
        'async',
        mode,
        signature,
        'key_missing',
        'warned',
        0,
        null
      );
      return { ok: true, warnings: [warning] };
    }
    const normalized = stableStringify(normalizePortableEnvelopeSignatureInput(portableEnvelope));
    let hasRuntimeVerification = false;
    let isMatch = false;
    let matchedSecretIndex: number | null = null;
    for (let index = 0; index < candidateSecrets.length; index += 1) {
      const secret = candidateSecrets[index]!;
      const hmac = await computeHmacSha256Hex(normalized, secret);
      if (!hmac) continue;
      hasRuntimeVerification = true;
      if (hmac === signature.value) {
        isMatch = true;
        matchedSecretIndex = index;
        break;
      }
    }
    if (!hasRuntimeVerification) {
      const warning: PortablePathMigrationWarning = {
        code: 'package_envelope_signature_verification_unavailable',
        message:
          'Portable package envelope hmac signature verification is unavailable in this runtime (crypto.subtle not available).',
      };
      if (mode === 'strict') {
        recordPortablePathEnvelopeVerificationResult(
          'async',
          mode,
          signature,
          'verification_unavailable',
          'rejected',
          candidateSecrets.length,
          null
        );
        return {
          ok: false,
          error: `Portable package envelope verification failed: ${warning.message}`,
          warnings: [warning],
        };
      }
      recordPortablePathEnvelopeVerificationResult(
        'async',
        mode,
        signature,
        'verification_unavailable',
        'warned',
        candidateSecrets.length,
        null
      );
      return { ok: true, warnings: [warning] };
    }
    if (!isMatch) {
      const warning: PortablePathMigrationWarning = {
        code: 'package_envelope_signature_mismatch',
        message: 'Portable package envelope signature does not match envelope contents.',
      };
      if (mode === 'strict') {
        recordPortablePathEnvelopeVerificationResult(
          'async',
          mode,
          signature,
          'mismatch',
          'rejected',
          candidateSecrets.length,
          null
        );
        return {
          ok: false,
          error: `Portable package envelope verification failed: ${warning.message}`,
          warnings: [warning],
        };
      }
      recordPortablePathEnvelopeVerificationResult(
        'async',
        mode,
        signature,
        'mismatch',
        'warned',
        candidateSecrets.length,
        null
      );
      return { ok: true, warnings: [warning] };
    }
    recordPortablePathEnvelopeVerificationResult(
      'async',
      mode,
      signature,
      'verified',
      'verified',
      candidateSecrets.length,
      matchedSecretIndex
    );
    return { ok: true, warnings: [] };
  }

  const warning: PortablePathMigrationWarning = {
    code: 'package_envelope_signature_unsupported_algorithm',
    message: `Portable package envelope signature algorithm "${signature.algorithm}" is not supported for verification.`,
  };
  if (mode === 'strict') {
    recordPortablePathEnvelopeVerificationResult(
      'async',
      mode,
      signature,
      'unsupported_algorithm',
      'rejected',
      0,
      null
    );
    return {
      ok: false,
      error: `Portable package envelope verification failed: ${warning.message}`,
      warnings: [warning],
    };
  }
  recordPortablePathEnvelopeVerificationResult(
    'async',
    mode,
    signature,
    'unsupported_algorithm',
    'warned',
    0,
    null
  );
  return { ok: true, warnings: [warning] };
};

export const verifyPortablePackageFingerprint = (
  portablePackage: AiPathPortablePackage,
  mode: PortablePathFingerprintVerificationMode
):
  | { ok: true; warnings: PortablePathMigrationWarning[] }
  | { ok: false; error: string; warnings: PortablePathMigrationWarning[] } => {
  if (mode === 'off') {
    return { ok: true, warnings: [] };
  }

  const fingerprint = portablePackage.fingerprint;
  if (!fingerprint) {
    const warning: PortablePathMigrationWarning = {
      code: 'package_fingerprint_missing',
      message: 'Portable package fingerprint is missing.',
    };
    if (mode === 'strict') {
      return {
        ok: false,
        error: `Portable package fingerprint verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    return { ok: true, warnings: [warning] };
  }

  if (fingerprint.algorithm === 'sha256') {
    const warning: PortablePathMigrationWarning = {
      code: 'package_fingerprint_async_required',
      message:
        'Portable package sha256 fingerprint requires asynchronous verification. Use resolvePortablePathInputAsync for strict verification.',
    };
    if (mode === 'strict') {
      return {
        ok: false,
        error: `Portable package fingerprint verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    return { ok: true, warnings: [warning] };
  }

  if (fingerprint.algorithm !== 'stable_hash_v1') {
    const warning: PortablePathMigrationWarning = {
      code: 'package_fingerprint_unsupported_algorithm',
      message: `Portable package fingerprint algorithm "${fingerprint.algorithm}" cannot be synchronously verified during import.`,
    };
    if (mode === 'strict') {
      return {
        ok: false,
        error: `Portable package fingerprint verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    return { ok: true, warnings: [warning] };
  }

  const expectedFingerprint = computePortablePathFingerprintSync(portablePackage);
  if (fingerprint.value !== expectedFingerprint.value) {
    const warning: PortablePathMigrationWarning = {
      code: 'package_fingerprint_mismatch',
      message: 'Portable package fingerprint does not match package contents.',
    };
    if (mode === 'strict') {
      return {
        ok: false,
        error: `Portable package fingerprint verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    return { ok: true, warnings: [warning] };
  }

  return { ok: true, warnings: [] };
};

export const verifyPortablePackageFingerprintAsync = async (
  portablePackage: AiPathPortablePackage,
  mode: PortablePathFingerprintVerificationMode
):
  Promise<
    | { ok: true; warnings: PortablePathMigrationWarning[] }
    | { ok: false; error: string; warnings: PortablePathMigrationWarning[] }
  > => {
  if (mode === 'off') {
    return { ok: true, warnings: [] };
  }

  const fingerprint = portablePackage.fingerprint;
  if (!fingerprint) {
    const warning: PortablePathMigrationWarning = {
      code: 'package_fingerprint_missing',
      message: 'Portable package fingerprint is missing.',
    };
    if (mode === 'strict') {
      return {
        ok: false,
        error: `Portable package fingerprint verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    return { ok: true, warnings: [warning] };
  }

  if (fingerprint.algorithm === 'stable_hash_v1') {
    const expectedFingerprint = computePortablePathFingerprintSync(portablePackage);
    if (fingerprint.value !== expectedFingerprint.value) {
      const warning: PortablePathMigrationWarning = {
        code: 'package_fingerprint_mismatch',
        message: 'Portable package fingerprint does not match package contents.',
      };
      if (mode === 'strict') {
        return {
          ok: false,
          error: `Portable package fingerprint verification failed: ${warning.message}`,
          warnings: [warning],
        };
      }
      return { ok: true, warnings: [warning] };
    }
    return { ok: true, warnings: [] };
  }

  if (fingerprint.algorithm === 'sha256') {
    const expectedFingerprint = await computePortablePathFingerprint(portablePackage);
    if (expectedFingerprint.algorithm !== 'sha256') {
      const warning: PortablePathMigrationWarning = {
        code: 'package_fingerprint_verification_unavailable',
        message:
          'Portable package sha256 fingerprint verification is unavailable in this runtime (crypto.subtle not available).',
      };
      if (mode === 'strict') {
        return {
          ok: false,
          error: `Portable package fingerprint verification failed: ${warning.message}`,
          warnings: [warning],
        };
      }
      return { ok: true, warnings: [warning] };
    }
    if (fingerprint.value !== expectedFingerprint.value) {
      const warning: PortablePathMigrationWarning = {
        code: 'package_fingerprint_mismatch',
        message: 'Portable package fingerprint does not match package contents.',
      };
      if (mode === 'strict') {
        return {
          ok: false,
          error: `Portable package fingerprint verification failed: ${warning.message}`,
          warnings: [warning],
        };
      }
      return { ok: true, warnings: [warning] };
    }
    return { ok: true, warnings: [] };
  }

  const warning: PortablePathMigrationWarning = {
    code: 'package_fingerprint_unsupported_algorithm',
    message: `Portable package fingerprint algorithm "${fingerprint.algorithm}" is not supported for verification.`,
  };
  if (mode === 'strict') {
    return {
      ok: false,
      error: `Portable package fingerprint verification failed: ${warning.message}`,
      warnings: [warning],
    };
  }
  return { ok: true, warnings: [warning] };
};

export const addPortablePathPackageFingerprint = async (
  portablePackage: AiPathPortablePackage
): Promise<AiPathPortablePackage> => {
  const fingerprint = await computePortablePathFingerprint(portablePackage);
  return {
    ...portablePackage,
    fingerprint,
  };
};
