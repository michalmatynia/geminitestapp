import { stableStringify } from '@/shared/lib/ai-paths/core/utils/runtime';

import {
  createStableHashHex,
  normalizePortableFingerprintInput,
  toHex,
} from './portable-engine-integrity-support';

import type { AiPathPortablePackage, PortablePathFingerprint } from './portable-engine-contract';
import type { PortablePathMigrationWarning } from './portable-engine-migration-types';
import type { PortablePathFingerprintVerificationMode } from './portable-engine-resolution-types';

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
): Promise<
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
