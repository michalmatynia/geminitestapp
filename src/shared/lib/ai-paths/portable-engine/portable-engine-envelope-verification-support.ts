import type {
  PortablePathEnvelopeVerificationOutcome,
  PortablePathEnvelopeVerificationStatus,
} from './portable-engine-envelope-observability';
import { recordPortablePathEnvelopeVerificationEvent } from './portable-engine-envelope-observability';
import type { AiPathPortablePackageEnvelopeVersioned } from './portable-engine-contract';
import type { PortablePathMigrationWarning } from './portable-engine-migration-types';
import type { PortablePathEnvelopeSignatureVerificationMode } from './portable-engine-resolution-types';

export type PortablePathEnvelopeVerificationPhase = 'sync' | 'async';

export type PortablePathEnvelopeVerificationResult =
  | { ok: true; warnings: PortablePathMigrationWarning[] }
  | { ok: false; error: string; warnings: PortablePathMigrationWarning[] };

const formatEnvelopeVerificationError = (warning: PortablePathMigrationWarning): string =>
  `Portable package envelope verification failed: ${warning.message}`;

export const recordPortablePathEnvelopeVerificationResult = (
  phase: PortablePathEnvelopeVerificationPhase,
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

export const warnOrRejectPortablePathEnvelopeVerification = (
  phase: PortablePathEnvelopeVerificationPhase,
  mode: PortablePathEnvelopeSignatureVerificationMode,
  signature: AiPathPortablePackageEnvelopeVersioned['signature'],
  outcome: PortablePathEnvelopeVerificationOutcome,
  candidateSecretCount: number,
  matchedSecretIndex: number | null,
  warning: PortablePathMigrationWarning
): PortablePathEnvelopeVerificationResult => {
  if (mode === 'strict') {
    recordPortablePathEnvelopeVerificationResult(
      phase,
      mode,
      signature,
      outcome,
      'rejected',
      candidateSecretCount,
      matchedSecretIndex
    );
    return {
      ok: false,
      error: formatEnvelopeVerificationError(warning),
      warnings: [warning],
    };
  }
  recordPortablePathEnvelopeVerificationResult(
    phase,
    mode,
    signature,
    outcome,
    'warned',
    candidateSecretCount,
    matchedSecretIndex
  );
  return { ok: true, warnings: [warning] };
};

export const acceptPortablePathEnvelopeVerification = (
  phase: PortablePathEnvelopeVerificationPhase,
  mode: PortablePathEnvelopeSignatureVerificationMode,
  signature: AiPathPortablePackageEnvelopeVersioned['signature'],
  candidateSecretCount: number,
  matchedSecretIndex: number | null
): PortablePathEnvelopeVerificationResult => {
  recordPortablePathEnvelopeVerificationResult(
    phase,
    mode,
    signature,
    'verified',
    'verified',
    candidateSecretCount,
    matchedSecretIndex
  );
  return { ok: true, warnings: [] };
};

export const createPortablePathEnvelopeSignatureMissingWarning =
  (): PortablePathMigrationWarning => ({
    code: 'package_envelope_signature_missing',
    message: 'Portable package envelope signature is missing.',
  });

export const createPortablePathEnvelopeSignatureKeyMissingWarning =
  (): PortablePathMigrationWarning => ({
    code: 'package_envelope_signature_key_missing',
    message:
      'Portable package envelope hmac signature requires a verification secret/key. Provide envelopeSignatureSecret, envelopeSignatureSecretsByKeyId, envelopeSignatureFallbackSecrets, or envelopeSignatureKeyResolver.',
  });

export const createPortablePathEnvelopeSignatureAsyncRequiredWarning =
  (): PortablePathMigrationWarning => ({
    code: 'package_envelope_signature_async_required',
    message:
      'Portable package envelope hmac signature requires asynchronous verification. Use resolvePortablePathInputAsync for strict verification.',
  });

export const createPortablePathEnvelopeSignatureSyncUnsupportedAlgorithmWarning = (
  algorithm: string
): PortablePathMigrationWarning => ({
  code: 'package_envelope_signature_unsupported_algorithm',
  message: `Portable package envelope signature algorithm "${algorithm}" cannot be synchronously verified during import.`,
});

export const createPortablePathEnvelopeSignatureAsyncUnsupportedAlgorithmWarning = (
  algorithm: string
): PortablePathMigrationWarning => ({
  code: 'package_envelope_signature_unsupported_algorithm',
  message: `Portable package envelope signature algorithm "${algorithm}" is not supported for verification.`,
});

export const createPortablePathEnvelopeSignatureMismatchWarning =
  (): PortablePathMigrationWarning => ({
    code: 'package_envelope_signature_mismatch',
    message: 'Portable package envelope signature does not match envelope contents.',
  });

export const createPortablePathEnvelopeSignatureVerificationUnavailableWarning =
  (): PortablePathMigrationWarning => ({
    code: 'package_envelope_signature_verification_unavailable',
    message:
      'Portable package envelope hmac signature verification is unavailable in this runtime (crypto.subtle not available).',
  });
