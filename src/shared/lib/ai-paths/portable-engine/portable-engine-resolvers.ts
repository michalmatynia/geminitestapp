
import {
  parseAndDeserializeSemanticCanvas
} from '@/shared/lib/ai-paths/core/semantic-grammar';
import {
  verifyPortableNodeCodeObjectManifest
} from './node-code-objects-v2';

import {
  decodePortablePayload,
  estimatePayloadByteSize,
  resolvePayloadLimits,
  validatePayloadObjectSafety,
} from './portable-engine-resolution-support';
import {
  finalizeResolvedPath,
  migratePortablePathInput,
} from './portable-engine-migration';
import { resolvePortablePathVerificationModes } from './portable-engine-signing-policy';
import {
  verifyPortablePackageFingerprint,
  verifyPortablePackageFingerprintAsync,
  verifyPortablePathPackageEnvelopeSignature,
  verifyPortablePathPackageEnvelopeSignatureAsync,
} from './portable-engine-signatures';
import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  type AiPathPortablePackageEnvelope,
  type PortablePathInputSource,
  type PortablePathMigrationWarning,
  type ResolvePortablePathInputInternalOptions,
  type ResolvePortablePathInputOptions,
  type ResolvePortablePathInputResult,
  aiPathPortablePackageEnvelopeVersionedSchema,
} from './portable-engine-types';

export const resolvePortablePathInput = (
  input: unknown,
  options?: ResolvePortablePathInputOptions
): ResolvePortablePathInputResult => {
  const internalOptions = options as ResolvePortablePathInputInternalOptions | undefined;
  const verificationModes = resolvePortablePathVerificationModes(options, {
    skipUsageTelemetry: internalOptions?.__skipSigningPolicyUsageTelemetry === true,
  });
  const nodeCodeObjectHashVerificationMode = options?.nodeCodeObjectHashVerificationMode ?? 'warn';
  const limits = resolvePayloadLimits(options?.limits);
  const decoded = decodePortablePayload(input);
  if (!decoded.ok) return decoded;
  let payloadByteSize = decoded.payloadByteSize;

  if (options?.enforcePayloadLimits !== false) {
    if (payloadByteSize !== null && payloadByteSize > limits.maxPayloadBytes) {
      return {
        ok: false,
        error: `Payload exceeds max size (${limits.maxPayloadBytes} bytes).`,
      };
    }
    const safetyIssue = validatePayloadObjectSafety(decoded.value, limits);
    if (safetyIssue) {
      return { ok: false, error: safetyIssue };
    }
    if (payloadByteSize === null) {
      const estimated = estimatePayloadByteSize(decoded.value);
      if (!estimated.ok) {
        return { ok: false, error: estimated.error };
      }
      payloadByteSize = estimated.value;
      if (payloadByteSize > limits.maxPayloadBytes) {
        return {
          ok: false,
          error: `Payload exceeds max size (${limits.maxPayloadBytes} bytes).`,
        };
      }
    }
  }

  const envelopeParsed = aiPathPortablePackageEnvelopeVersionedSchema.safeParse(decoded.value);
  const envelopeSignatureVerificationMode = verificationModes.envelopeSignatureVerificationMode;
  const envelopeWarnings: PortablePathMigrationWarning[] = [];
  let envelopePayload = decoded.value;
  let resolvedSourceFromEnvelope = false;
  let portableEnvelopeForResult: AiPathPortablePackageEnvelope | null = null;
  if (envelopeParsed.success) {
    const envelopeVerification = verifyPortablePathPackageEnvelopeSignature(
      envelopeParsed.data,
      envelopeSignatureVerificationMode,
      {
        envelopeSignatureSecret: options?.envelopeSignatureSecret,
        envelopeSignatureSecretsByKeyId: options?.envelopeSignatureSecretsByKeyId,
        envelopeSignatureFallbackSecrets: options?.envelopeSignatureFallbackSecrets,
        envelopeSignatureKeyResolver: options?.envelopeSignatureKeyResolver,
      }
    );
    envelopeWarnings.push(...envelopeVerification.warnings);
    if (!envelopeVerification.ok) {
      return { ok: false, error: envelopeVerification.error };
    }
    envelopePayload = envelopeParsed.data.package;
    resolvedSourceFromEnvelope = true;
  }

  const migrated = migratePortablePathInput(envelopePayload, options);
  if (!migrated.ok) {
    return migrated;
  }
  const migrationWarnings = [...envelopeWarnings, ...migrated.value.migrationWarnings];
  const resolvedSource: PortablePathInputSource =
    resolvedSourceFromEnvelope && migrated.value.source === 'portable_package'
      ? 'portable_envelope'
      : migrated.value.source;
  if (resolvedSource === 'portable_envelope' && envelopeParsed.success) {
    const signature = envelopeParsed.data.signature;
    if (signature && (signature.algorithm === 'hmac_sha256' || signature.algorithm === 'stable_hash_v1')) {
      portableEnvelopeForResult = {
        specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
        kind: 'path_package_envelope',
        signedAt: envelopeParsed.data.signedAt,
        package: migrated.value.portablePackage,
        signature: {
          algorithm: signature.algorithm,
          value: signature.value,
          ...(signature.keyId ? { keyId: signature.keyId } : {}),
        },
        ...(envelopeParsed.data.metadata ? { metadata: envelopeParsed.data.metadata } : {}),
      };
    }
  }
  const fingerprintVerificationMode = verificationModes.fingerprintVerificationMode;
  if (migrated.value.source === 'portable_package') {
    const verification = verifyPortablePackageFingerprint(
      migrated.value.portablePackage,
      fingerprintVerificationMode
    );
    migrationWarnings.push(...verification.warnings);
    if (!verification.ok) {
      return { ok: false, error: verification.error };
    }
  }

  const deserialized = parseAndDeserializeSemanticCanvas(migrated.value.portablePackage.document);
  if (!deserialized.ok) {
    return {
      ok: false,
      error: `Portable package contains invalid semantic canvas document: ${deserialized.error}`,
    };
  }

  const nodeCodeObjectVerification = verifyPortableNodeCodeObjectManifest({
    metadata:
      migrated.value.portablePackage.metadata &&
      typeof migrated.value.portablePackage.metadata === 'object' &&
      !Array.isArray(migrated.value.portablePackage.metadata)
        ? (migrated.value.portablePackage.metadata)
        : undefined,
    nodeTypes: (deserialized.value.nodes ?? []).map((node) => node.type),
    mode: nodeCodeObjectHashVerificationMode,
  });
  migrationWarnings.push(...nodeCodeObjectVerification.warnings);
  if (!nodeCodeObjectVerification.ok) {
    return { ok: false, error: nodeCodeObjectVerification.error };
  }

  return finalizeResolvedPath({
    source: resolvedSource,
    pathConfig: deserialized.value,
    portablePackage: migrated.value.portablePackage,
    portableEnvelope: portableEnvelopeForResult,
    options,
    migrationWarnings,
    payloadByteSize,
  });
};

export const resolvePortablePathInputAsync = async (
  input: unknown,
  options?: ResolvePortablePathInputOptions
): Promise<ResolvePortablePathInputResult> => {
  const verificationModes = resolvePortablePathVerificationModes(options);
  const resolved = resolvePortablePathInput(input, {
    ...options,
    envelopeSignatureVerificationMode: 'off',
    fingerprintVerificationMode: 'off',
    __skipSigningPolicyUsageTelemetry: true,
  } as ResolvePortablePathInputInternalOptions);
  if (!resolved.ok) return resolved;

  const migrationWarnings = [...resolved.value.migrationWarnings];

  const envelopeSignatureVerificationMode = verificationModes.envelopeSignatureVerificationMode;
  if (envelopeSignatureVerificationMode !== 'off') {
    const decoded = decodePortablePayload(input);
    if (!decoded.ok) return decoded;
    const envelopeParsed = aiPathPortablePackageEnvelopeVersionedSchema.safeParse(decoded.value);
    if (envelopeParsed.success) {
      const verification = await verifyPortablePathPackageEnvelopeSignatureAsync(
        envelopeParsed.data,
        envelopeSignatureVerificationMode,
        {
          envelopeSignatureSecret: options?.envelopeSignatureSecret,
          envelopeSignatureSecretsByKeyId: options?.envelopeSignatureSecretsByKeyId,
          envelopeSignatureFallbackSecrets: options?.envelopeSignatureFallbackSecrets,
          envelopeSignatureKeyResolver: options?.envelopeSignatureKeyResolver,
        }
      );
      if (!verification.ok) {
        return { ok: false, error: verification.error };
      }
      migrationWarnings.push(...verification.warnings);
    }
  }

  const fingerprintVerificationMode = verificationModes.fingerprintVerificationMode;
  if (
    fingerprintVerificationMode === 'off' ||
    (resolved.value.source !== 'portable_package' && resolved.value.source !== 'portable_envelope') ||
    !resolved.value.portablePackage
  ) {
    if (migrationWarnings.length === resolved.value.migrationWarnings.length) {
      return resolved;
    }
    return {
      ok: true,
      value: {
        ...resolved.value,
        migrationWarnings,
      },
    };
  }

  const verification = await verifyPortablePackageFingerprintAsync(
    resolved.value.portablePackage,
    fingerprintVerificationMode
  );
  if (!verification.ok) {
    return { ok: false, error: verification.error };
  }
  if (verification.warnings.length === 0 && migrationWarnings.length === resolved.value.migrationWarnings.length) {
    return resolved;
  }

  return {
    ok: true,
    value: {
      ...resolved.value,
      migrationWarnings: [...migrationWarnings, ...verification.warnings],
    },
  };
};
