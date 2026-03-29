import { parseAndDeserializeSemanticCanvas } from '@/shared/lib/ai-paths/core/semantic-grammar';

import { verifyPortableNodeCodeObjectManifest } from './node-code-objects-v2-manifest';
import {
  type AiPathPortablePackage,
  type AiPathPortablePackageEnvelope,
  type PortablePathInputSource,
  aiPathPortablePackageEnvelopeSchema,
  aiPathPortablePackageEnvelopeVersionedSchema,
} from './portable-engine-contract';
import { verifyPortablePathPackageEnvelopeSignatureAsync } from './portable-engine-envelope-verification-async';
import { verifyPortablePathPackageEnvelopeSignature } from './portable-engine-envelope-verification-sync';
import {
  verifyPortablePackageFingerprint,
  verifyPortablePackageFingerprintAsync,
} from './portable-engine-fingerprints';
import { migratePortablePathInput } from './portable-engine-migration';
import { finalizeResolvedPath } from './portable-engine-path-canonicalization';
import {
  decodePortablePayload,
  estimatePayloadByteSize,
  resolvePayloadLimits,
  validatePayloadObjectSafety,
} from './portable-engine-resolution-support';
import { resolvePortablePathVerificationModes } from './portable-engine-signing-policy';

import type { PortablePathMigrationWarning } from './portable-engine-migration-types';
import type {
  ResolvePortablePathInputInternalOptions,
  ResolvePortablePathInputOptions,
} from './portable-engine-resolution-types';
import type { ResolvePortablePathInputResult } from './portable-engine-runtime-types';

type PortablePayloadDecodeSuccess = Extract<
  ReturnType<typeof decodePortablePayload>,
  { ok: true }
>;

type PortableMigrationSuccess = Extract<
  ReturnType<typeof migratePortablePathInput>,
  { ok: true }
>['value'];

type DeserializedPortablePathConfig = Extract<
  ReturnType<typeof parseAndDeserializeSemanticCanvas>,
  { ok: true }
>['value'];

type PortableEnvelopeResolution = {
  envelopePayload: unknown;
  envelopeWarnings: PortablePathMigrationWarning[];
  resolvedSourceFromEnvelope: boolean;
  envelopeData: AiPathPortablePackageEnvelope | null;
};

const resolvePortablePayloadByteSize = (
  decoded: PortablePayloadDecodeSuccess,
  options: ResolvePortablePathInputOptions | undefined
): { ok: true; payloadByteSize: number | null } | { ok: false; error: string } => {
  let payloadByteSize = decoded.payloadByteSize;
  if (options?.enforcePayloadLimits === false) {
    return { ok: true, payloadByteSize };
  }

  const limits = resolvePayloadLimits(options?.limits);
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

  if (payloadByteSize !== null) {
    return { ok: true, payloadByteSize };
  }

  const estimated = estimatePayloadByteSize(decoded.value);
  if (!estimated.ok) {
    return { ok: false, error: estimated.error };
  }
  if (estimated.value > limits.maxPayloadBytes) {
    return {
      ok: false,
      error: `Payload exceeds max size (${limits.maxPayloadBytes} bytes).`,
    };
  }
  payloadByteSize = estimated.value;
  return { ok: true, payloadByteSize };
};

const resolveVerifiedEnvelopePayload = (
  decodedValue: unknown,
  options: ResolvePortablePathInputOptions | undefined,
  envelopeSignatureVerificationMode: NonNullable<
    ReturnType<typeof resolvePortablePathVerificationModes>['envelopeSignatureVerificationMode']
  >
): { ok: true; value: PortableEnvelopeResolution } | { ok: false; error: string } => {
  const envelopeParsed = aiPathPortablePackageEnvelopeVersionedSchema.safeParse(decodedValue);
  if (!envelopeParsed.success) {
    return {
      ok: true,
      value: {
        envelopePayload: decodedValue,
        envelopeWarnings: [],
        resolvedSourceFromEnvelope: false,
        envelopeData: null,
      },
    };
  }

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
  if (!envelopeVerification.ok) {
    return { ok: false, error: envelopeVerification.error };
  }

  const signature = envelopeParsed.data.signature;
  const canonicalEnvelope =
    signature && (signature.algorithm === 'hmac_sha256' || signature.algorithm === 'stable_hash_v1')
      ? aiPathPortablePackageEnvelopeSchema.parse({
          ...envelopeParsed.data,
          specVersion: 'ai-paths.portable-engine.v1',
          kind: 'path_package_envelope',
          package: {
            ...envelopeParsed.data.package,
            specVersion: 'ai-paths.portable-engine.v1',
            kind: 'path_package',
          },
          signature,
        })
      : null;

  return {
    ok: true,
    value: {
      envelopePayload: canonicalEnvelope?.package ?? envelopeParsed.data.package,
      envelopeWarnings: envelopeVerification.warnings,
      resolvedSourceFromEnvelope: true,
      envelopeData: canonicalEnvelope,
    },
  };
};

const resolvePortableInputSource = (
  resolvedSourceFromEnvelope: boolean,
  migratedSource: PortablePathInputSource
): PortablePathInputSource =>
  resolvedSourceFromEnvelope && migratedSource === 'portable_package'
    ? 'portable_envelope'
    : migratedSource;

const buildPortableEnvelopeForResult = (input: {
  resolvedSource: PortablePathInputSource;
  envelopeData: AiPathPortablePackageEnvelope | null;
  portablePackage: PortableMigrationSuccess['portablePackage'];
}): AiPathPortablePackageEnvelope | null => {
  if (input.resolvedSource !== 'portable_envelope' || !input.envelopeData) {
    return null;
  }
  const signature = input.envelopeData.signature;
  if (
    !signature ||
    (signature.algorithm !== 'hmac_sha256' && signature.algorithm !== 'stable_hash_v1')
  ) {
    return null;
  }
  const portablePackage: AiPathPortablePackage = {
    ...input.portablePackage,
    specVersion: 'ai-paths.portable-engine.v1',
    kind: 'path_package',
  };
  return aiPathPortablePackageEnvelopeSchema.parse({
    specVersion: 'ai-paths.portable-engine.v1',
    kind: 'path_package_envelope',
    signedAt: input.envelopeData.signedAt,
    package: portablePackage,
    signature: {
      algorithm: signature.algorithm,
      value: signature.value,
      ...(signature.keyId ? { keyId: signature.keyId } : {}),
    },
    ...(input.envelopeData.metadata ? { metadata: input.envelopeData.metadata } : {}),
  });
};

const verifyPortablePackageFingerprintSyncIfNeeded = (input: {
  migrated: PortableMigrationSuccess;
  fingerprintVerificationMode: NonNullable<
    ReturnType<typeof resolvePortablePathVerificationModes>['fingerprintVerificationMode']
  >;
}): { ok: true; warnings: PortablePathMigrationWarning[] } | { ok: false; error: string } => {
  if (input.migrated.source !== 'portable_package') {
    return { ok: true, warnings: [] };
  }
  const verification = verifyPortablePackageFingerprint(
    input.migrated.portablePackage,
    input.fingerprintVerificationMode
  );
  if (!verification.ok) {
    return { ok: false, error: verification.error };
  }
  return { ok: true, warnings: verification.warnings };
};

const deserializePortablePathConfig = (
  portablePackage: PortableMigrationSuccess['portablePackage']
):
  | { ok: true; value: DeserializedPortablePathConfig }
  | { ok: false; error: string } => {
  const deserialized = parseAndDeserializeSemanticCanvas(portablePackage.document);
  if (!deserialized.ok) {
    return {
      ok: false,
      error: `Portable package contains invalid semantic canvas document: ${deserialized.error}`,
    };
  }
  return { ok: true, value: deserialized.value };
};

const verifyPortableNodeCodeObjects = (input: {
  portablePackage: PortableMigrationSuccess['portablePackage'];
  nodeTypes: string[];
  nodeCodeObjectHashVerificationMode: NonNullable<
    ResolvePortablePathInputOptions['nodeCodeObjectHashVerificationMode']
  >;
}): { ok: true; warnings: PortablePathMigrationWarning[] } | { ok: false; error: string } => {
  const verification = verifyPortableNodeCodeObjectManifest({
    metadata:
      input.portablePackage.metadata &&
      typeof input.portablePackage.metadata === 'object' &&
      !Array.isArray(input.portablePackage.metadata)
        ? input.portablePackage.metadata
        : undefined,
    nodeTypes: input.nodeTypes,
    mode: input.nodeCodeObjectHashVerificationMode,
  });
  if (!verification.ok) {
    return { ok: false, error: verification.error };
  }
  return { ok: true, warnings: verification.warnings };
};

const buildResolvedWarningsResult = (
  resolved: Extract<ResolvePortablePathInputResult, { ok: true }>,
  migrationWarnings: PortablePathMigrationWarning[]
): ResolvePortablePathInputResult =>
  migrationWarnings.length === resolved.value.migrationWarnings.length
    ? resolved
    : {
        ok: true,
        value: {
          ...resolved.value,
          migrationWarnings,
        },
      };

const verifyPortableEnvelopeAsyncIfNeeded = async (
  input: unknown,
  options: ResolvePortablePathInputOptions | undefined,
  envelopeSignatureVerificationMode: NonNullable<
    ReturnType<typeof resolvePortablePathVerificationModes>['envelopeSignatureVerificationMode']
  >
): Promise<{ ok: true; warnings: PortablePathMigrationWarning[] } | { ok: false; error: string }> => {
  if (envelopeSignatureVerificationMode === 'off') {
    return { ok: true, warnings: [] };
  }
  const decoded = decodePortablePayload(input);
  if (!decoded.ok) return decoded;
  const envelopeParsed = aiPathPortablePackageEnvelopeVersionedSchema.safeParse(decoded.value);
  if (!envelopeParsed.success) {
    return { ok: true, warnings: [] };
  }
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
  return { ok: true, warnings: verification.warnings };
};

const verifyPortableFingerprintAsyncIfNeeded = async (
  resolved: Extract<ResolvePortablePathInputResult, { ok: true }>,
  fingerprintVerificationMode: NonNullable<
    ReturnType<typeof resolvePortablePathVerificationModes>['fingerprintVerificationMode']
  >
): Promise<{ ok: true; warnings: PortablePathMigrationWarning[] } | { ok: false; error: string }> => {
  if (
    fingerprintVerificationMode === 'off' ||
    (resolved.value.source !== 'portable_package' &&
      resolved.value.source !== 'portable_envelope') ||
    !resolved.value.portablePackage
  ) {
    return { ok: true, warnings: [] };
  }

  const verification = await verifyPortablePackageFingerprintAsync(
    resolved.value.portablePackage,
    fingerprintVerificationMode
  );
  if (!verification.ok) {
    return { ok: false, error: verification.error };
  }
  return { ok: true, warnings: verification.warnings };
};

export const resolvePortablePathInput = (
  input: unknown,
  options?: ResolvePortablePathInputOptions
): ResolvePortablePathInputResult => {
  const internalOptions = options as ResolvePortablePathInputInternalOptions | undefined;
  const verificationModes = resolvePortablePathVerificationModes(options, {
    skipUsageTelemetry: internalOptions?.__skipSigningPolicyUsageTelemetry === true,
  });
  const nodeCodeObjectHashVerificationMode = options?.nodeCodeObjectHashVerificationMode ?? 'warn';
  const decoded = decodePortablePayload(input);
  if (!decoded.ok) return decoded;
  const payloadByteSizeResult = resolvePortablePayloadByteSize(decoded, options);
  if (!payloadByteSizeResult.ok) return payloadByteSizeResult;

  const envelopeResolution = resolveVerifiedEnvelopePayload(
    decoded.value,
    options,
    verificationModes.envelopeSignatureVerificationMode
  );
  if (!envelopeResolution.ok) return envelopeResolution;

  const migrated = migratePortablePathInput(envelopeResolution.value.envelopePayload, options);
  if (!migrated.ok) {
    return migrated;
  }
  const migrationWarnings = [
    ...envelopeResolution.value.envelopeWarnings,
    ...migrated.value.migrationWarnings,
  ];
  const resolvedSource = resolvePortableInputSource(
    envelopeResolution.value.resolvedSourceFromEnvelope,
    migrated.value.source
  );
  const portableEnvelopeForResult = buildPortableEnvelopeForResult({
    resolvedSource,
    envelopeData: envelopeResolution.value.envelopeData,
    portablePackage: migrated.value.portablePackage,
  });
  const fingerprintVerification = verifyPortablePackageFingerprintSyncIfNeeded({
    migrated: migrated.value,
    fingerprintVerificationMode: verificationModes.fingerprintVerificationMode,
  });
  if (!fingerprintVerification.ok) return fingerprintVerification;
  migrationWarnings.push(...fingerprintVerification.warnings);

  const deserialized = deserializePortablePathConfig(migrated.value.portablePackage);
  if (!deserialized.ok) return deserialized;

  const nodeCodeObjectVerification = verifyPortableNodeCodeObjects({
    portablePackage: migrated.value.portablePackage,
    nodeTypes: (deserialized.value.nodes ?? []).map((node) => node.type),
    nodeCodeObjectHashVerificationMode,
  });
  if (!nodeCodeObjectVerification.ok) return nodeCodeObjectVerification;
  migrationWarnings.push(...nodeCodeObjectVerification.warnings);

  return finalizeResolvedPath({
    source: resolvedSource,
    pathConfig: deserialized.value,
    portablePackage: migrated.value.portablePackage,
    portableEnvelope: portableEnvelopeForResult,
    options,
    migrationWarnings,
    payloadByteSize: payloadByteSizeResult.payloadByteSize,
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
  const envelopeVerification = await verifyPortableEnvelopeAsyncIfNeeded(
    input,
    options,
    verificationModes.envelopeSignatureVerificationMode
  );
  if (!envelopeVerification.ok) return envelopeVerification;
  migrationWarnings.push(...envelopeVerification.warnings);

  const fingerprintVerification = await verifyPortableFingerprintAsyncIfNeeded(
    resolved,
    verificationModes.fingerprintVerificationMode
  );
  if (!fingerprintVerification.ok) return fingerprintVerification;
  migrationWarnings.push(...fingerprintVerification.warnings);

  return buildResolvedWarningsResult(resolved, migrationWarnings);
};
