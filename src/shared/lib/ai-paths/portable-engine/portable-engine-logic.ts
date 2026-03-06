import { z } from 'zod';

import {
  type AiPathsValidationConfig,
  type Edge,
  type GraphCompileReport,
  type PathConfig,
  type ParserSampleState,
  type RunPreflightReport,
  type UpdaterSampleState,
  pathConfigSchema,
} from '@/shared/contracts/ai-paths';
import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';
import {
  type CanvasSemanticDocument,
  canvasSemanticDocumentSchema,
} from '@/shared/contracts/ai-paths-semantic-grammar';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import { evaluateGraphClient } from '@/shared/lib/ai-paths/core/runtime/engine-client';
import type {
  EvaluateGraphOptions,
  RuntimeValidationMiddleware,
} from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-types';
import {
  parseAndDeserializeSemanticCanvas,
  serializePathConfigToSemanticCanvas,
} from '@/shared/lib/ai-paths/core/semantic-grammar';
import { resolveAiPathsRuntimeValidationMiddleware } from '@/shared/lib/ai-paths/core/validation-engine';
import { compileGraph } from '@/shared/lib/ai-paths/core/utils/graph';
import {
  repairPathNodeIdentities,
  type PathIdentityRepairWarning,
  type PathIdentityValidationIssue,
  validateCanonicalPathNodeIdentities,
} from '@/shared/lib/ai-paths/core/utils/node-identity';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';
import { hashString, stableStringify } from '@/shared/lib/ai-paths/core/utils/runtime';
import {
  type PortableNodeCodeObjectHashVerificationMode,
  verifyPortableNodeCodeObjectManifest,
  withPortableNodeCodeObjectManifest,
} from './node-code-objects-v2';
import {
  beginPortablePathMigratorAttempt,
  getPortablePathEnvelopeVerificationAuditSinkSnapshot,
  getPortablePathEnvelopeVerificationObservabilitySnapshot,
  getPortablePathMigratorObservabilitySnapshot,
  getPortablePathRunExecutionSnapshot,
  getPortablePathSigningPolicyUsageSnapshot,
  listPortablePathEnvelopeVerificationAuditSinkIds,
  markPortablePathMigratorFailure,
  markPortablePathMigratorRegistration,
  markPortablePathMigratorSuccess,
  markPortablePathMigratorUnregistration,
  recordPortablePathEnvelopeVerificationEvent,
  recordPortablePathMigratorSource,
  recordPortablePathRunExecutionAttempt,
  recordPortablePathRunExecutionFailure,
  recordPortablePathRunExecutionSuccess,
  recordPortablePathSigningPolicyUsage,
  registerPortablePathEnvelopeVerificationAuditSink,
  registerPortablePathEnvelopeVerificationObservabilityHook,
  registerPortablePathMigratorObservabilityHook,
  registerPortablePathRunExecutionHook,
  registerPortablePathSigningPolicyUsageHook,
  resetPortablePathEnvelopeVerificationAuditSinkSnapshot,
  resetPortablePathEnvelopeVerificationObservabilitySnapshot,
  resetPortablePathMigratorObservabilitySnapshot,
  resetPortablePathRunExecutionSnapshot,
  resetPortablePathSigningPolicyUsageSnapshot,
  unregisterPortablePathEnvelopeVerificationAuditSink,
} from './portable-engine-observability';
import type {
  PortablePathEnvelopeVerificationOutcome,
  PortablePathEnvelopeVerificationStatus,
} from './portable-engine-observability';

export {
  getPortablePathEnvelopeVerificationAuditSinkSnapshot,
  getPortablePathEnvelopeVerificationObservabilitySnapshot,
  getPortablePathMigratorObservabilitySnapshot,
  getPortablePathRunExecutionSnapshot,
  getPortablePathSigningPolicyUsageSnapshot,
  listPortablePathEnvelopeVerificationAuditSinkIds,
  registerPortablePathEnvelopeVerificationAuditSink,
  registerPortablePathEnvelopeVerificationObservabilityHook,
  registerPortablePathMigratorObservabilityHook,
  registerPortablePathRunExecutionHook,
  registerPortablePathSigningPolicyUsageHook,
  resetPortablePathEnvelopeVerificationAuditSinkSnapshot,
  resetPortablePathEnvelopeVerificationObservabilitySnapshot,
  resetPortablePathMigratorObservabilitySnapshot,
  resetPortablePathRunExecutionSnapshot,
  resetPortablePathSigningPolicyUsageSnapshot,
  unregisterPortablePathEnvelopeVerificationAuditSink,
};

export type {
  PortablePathEnvelopeVerificationAuditEvent,
  PortablePathEnvelopeVerificationAuditSink,
  PortablePathEnvelopeVerificationAuditSinkById,
  PortablePathEnvelopeVerificationAuditSinkFailureTelemetry,
  PortablePathEnvelopeVerificationAuditSinkSnapshot,
  PortablePathEnvelopeVerificationObservabilityByKeyId,
  PortablePathEnvelopeVerificationObservabilityHook,
  PortablePathEnvelopeVerificationObservabilitySnapshot,
  PortablePathEnvelopeVerificationOutcome,
  PortablePathEnvelopeVerificationStatus,
  PortablePathMigratorFailureReason,
  PortablePathMigratorFailureTelemetry,
  PortablePathMigratorObservabilityByVersion,
  PortablePathMigratorObservabilityEvent,
  PortablePathMigratorObservabilityHook,
  PortablePathMigratorObservabilitySnapshot,
  PortablePathRunExecutionCounts,
  PortablePathRunExecutionEvent,
  PortablePathRunExecutionFailureStage,
  PortablePathRunExecutionHook,
  PortablePathRunExecutionRunner,
  PortablePathRunExecutionSnapshot,
  PortablePathSigningPolicyUsageByProfile,
  PortablePathSigningPolicyUsageEvent,
  PortablePathSigningPolicyUsageHook,
  PortablePathSigningPolicyUsageSnapshot,
} from './portable-engine-observability';
export type {
  PortableNodeCodeObjectHashVerificationMode,
  PortableNodeCodeObjectManifest,
  PortableNodeCodeObjectManifestEntry,
  PortableNodeCodeObjectManifestWarning,
  PortableNodeCodeObjectManifestWarningCode,
} from './node-code-objects-v2';
export {
  getPortableNodeCodeObjectContractsCatalog,
  getPortableNodeCodeObjectContractsHash,
  PORTABLE_NODE_CODE_OBJECT_HASH_VERIFICATION_MODES,
  PORTABLE_NODE_CODE_OBJECT_MANIFEST_METADATA_KEY,

export * from './portable-engine-base';

export const buildPortablePathPackage = (
  pathConfig: PathConfig,
  options?: BuildPortablePathPackageOptions
): AiPathPortablePackage => {
  const createdAt = options?.createdAt ?? new Date().toISOString();
  const nodeTypes = (pathConfig.nodes ?? [])
    .map((node) => (typeof node?.type === 'string' ? node.type.trim() : ''))
    .filter((nodeType): nodeType is string => nodeType.length > 0);
  const metadata = withPortableNodeCodeObjectManifest(options?.metadata, nodeTypes);
  const semanticDocument = serializePathConfigToSemanticCanvas(pathConfig, {
    includeConnections: options?.includeConnections !== false,
    exportedAt: createdAt,
    exporterVersion: options?.exporterVersion,
    workspace: options?.workspace,
  });
  return {
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    kind: 'path_package',
    createdAt,
    pathId: pathConfig.id,
    name: pathConfig.name,
    document: semanticDocument,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
};

export const serializePortablePathPackage = (
  pathConfig: PathConfig,
  options?: BuildPortablePathPackageOptions
): string => JSON.stringify(buildPortablePathPackage(pathConfig, options), null, 2);

export const toJsonSchemaRecord = (schema: z.ZodTypeAny): Record<string, unknown> =>
  z.toJSONSchema(schema) as Record<string, unknown>;

export const buildPortablePathJsonSchemaCatalog = (): PortablePathJsonSchemaCatalog => ({
  portable_envelope: toJsonSchemaRecord(aiPathPortablePackageEnvelopeSchema),
  portable_package: toJsonSchemaRecord(aiPathPortablePackageSchema),
  semantic_canvas: toJsonSchemaRecord(canvasSemanticDocumentSchema),
  path_config: toJsonSchemaRecord(pathConfigSchema),
});

export const buildPortablePathJsonSchemaCatalogVNextPreview = (): PortablePathJsonSchemaCatalog =>
  buildPortablePathJsonSchemaCatalog();

export const createStableHashHex = (value: string): string =>
  [
    hashString(value),
    hashString(`a:${value}`),
    hashString(`b:${value}`),
    hashString(`c:${value}`),
  ].join('');

export const buildPortablePathJsonSchemaHash = (schema: Record<string, unknown>): string =>
  createStableHashHex(stableStringify(schema));

export const buildPortablePathJsonSchemaDiffReport = (): PortablePathJsonSchemaDiffReport => {
  const currentCatalog = buildPortablePathJsonSchemaCatalog();
  const vNextCatalog = buildPortablePathJsonSchemaCatalogVNextPreview();
  const entries: PortablePathJsonSchemaDiffEntry[] = PORTABLE_PATH_JSON_SCHEMA_KINDS.map((kind) => {
    const currentSchema = currentCatalog[kind];
    const vNextSchema = vNextCatalog[kind];
    const currentHash = buildPortablePathJsonSchemaHash(currentSchema);
    const vNextHash = buildPortablePathJsonSchemaHash(vNextSchema);
    return {
      kind,
      changed: currentHash !== vNextHash,
      currentHash,
      vNextHash,
    };
  });
  const changedKinds = entries.filter((entry) => entry.changed).map((entry) => entry.kind);
  return {
    baseline: 'current',
    target: 'vnext_preview',
    hasChanges: changedKinds.length > 0,
    changedKinds,
    entries,
  };
};

export const normalizeOptionalSecret = (value: string | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeOptionalSecretList = (value: string[] | undefined): string[] => {
  if (!Array.isArray(value) || value.length === 0) return [];
  return value
    .map((item) => normalizeOptionalSecret(item))
    .filter((item): item is string => item !== null);
};

export type PortablePathEnvelopeSignatureVerificationOptions = Pick<
  ResolvePortablePathInputOptions,
  | 'envelopeSignatureSecret'
  | 'envelopeSignatureSecretsByKeyId'
  | 'envelopeSignatureFallbackSecrets'
  | 'envelopeSignatureKeyResolver'
>;

export const resolveEnvelopeSignatureSecrets = (
  options: PortablePathEnvelopeSignatureVerificationOptions | undefined,
  context: PortablePathEnvelopeSignatureKeyResolverContext
): string[] => {
  const candidates: string[] = [];
  if (options?.envelopeSignatureKeyResolver) {
    const resolverResult = options.envelopeSignatureKeyResolver(context);
    if (typeof resolverResult === 'string') {
      const normalized = normalizeOptionalSecret(resolverResult);
      if (normalized) candidates.push(normalized);
    } else if (Array.isArray(resolverResult)) {
      candidates.push(...normalizeOptionalSecretList(resolverResult));
    }
  }
  const keyId = context.keyId ?? undefined;
  if (keyId && options?.envelopeSignatureSecretsByKeyId && typeof options.envelopeSignatureSecretsByKeyId[keyId] === 'string') {
    const normalized = normalizeOptionalSecret(options.envelopeSignatureSecretsByKeyId[keyId]);
    if (normalized) candidates.push(normalized);
  }
  const primarySecret = normalizeOptionalSecret(options?.envelopeSignatureSecret);
  if (primarySecret) candidates.push(primarySecret);
  candidates.push(...normalizeOptionalSecretList(options?.envelopeSignatureFallbackSecrets));
  return Array.from(new Set(candidates));
};

export const removeTopLevelFingerprint = (input: unknown): unknown => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const record = input as Record<string, unknown>;
  if (record['specVersion'] !== AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION) return input;
  if (record['kind'] !== 'path_package') return input;
  const { fingerprint: _fingerprint, ...rest } = record;
  return rest;
};

export const normalizePortableFingerprintInput = (input: unknown): unknown => {
  const withoutFingerprint = removeTopLevelFingerprint(input);
  try {
    return JSON.parse(JSON.stringify(withoutFingerprint)) as unknown;
  } catch {
    return withoutFingerprint;
  }
};

export const removeTopLevelEnvelopeSignature = (input: unknown): unknown => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const record = input as Record<string, unknown>;
  if (record['kind'] !== 'path_package_envelope') return input;
  const { signature: _signature, ...rest } = record;
  return rest;
};

export const normalizePortableEnvelopeSignatureInput = (input: unknown): unknown => {
  const withoutSignature = removeTopLevelEnvelopeSignature(input);
  try {
    return JSON.parse(JSON.stringify(withoutSignature)) as unknown;
  } catch {
    return withoutSignature;
  }
};

export const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte: number): string => byte.toString(16).padStart(2, '0'))
    .join('');

export const computeHmacSha256Hex = async (message: string, secret: string): Promise<string | null> => {
  if (
    !globalThis.crypto?.subtle ||
    typeof TextEncoder !== 'function'
  ) {
    return null;
  }
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return toHex(new Uint8Array(signature));
};

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

export const recordPortablePathEnvelopeVerificationResult = (
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

export const validatePortablePathConfig = (
  pathConfig: PathConfig,
  options?: ValidatePortablePathConfigOptions
): PortablePathValidationReport => {
  const mode: PortablePathValidationMode = options?.mode ?? 'standard';
  const identityIssues = validateCanonicalPathNodeIdentities(pathConfig, { palette });
  const compileReport = compileGraph(pathConfig.nodes, pathConfig.edges);
  const parserSamples = coerceSampleStateMap<ParserSampleState>(pathConfig.parserSamples);
  const updaterSamples = coerceSampleStateMap<UpdaterSampleState>(pathConfig.updaterSamples);
  const preflightReport =
    mode === 'strict'
      ? evaluateRunPreflight({
        nodes: pathConfig.nodes,
        edges: pathConfig.edges,
        aiPathsValidation: pathConfig.aiPathsValidation,
        strictFlowMode: pathConfig.strictFlowMode !== false,
        triggerNodeId: options?.triggerNodeId ?? null,
        runtimeState:
            pathConfig.runtimeState && typeof pathConfig.runtimeState === 'object'
              ? (pathConfig.runtimeState as RuntimeState)
              : null,
        parserSamples,
        updaterSamples,
        mode: 'full',
      })
      : null;

  return {
    ok:
      identityIssues.length === 0 &&
      compileReport.ok &&
      (preflightReport ? !preflightReport.shouldBlock : true),
    mode,
    pathConfig,
    identityIssues,
    compileReport,
    preflightReport,
  };
};

export const validatePortablePathInput = (
  input: unknown,
  options?: ValidatePortablePathInputOptions
): ValidatePortablePathInputResult => {
  const resolved = resolvePortablePathInput(input, options);
  if (!resolved.ok) return resolved;
  const validation = validatePortablePathConfig(resolved.value.pathConfig, {
    mode: options?.mode,
    triggerNodeId: options?.triggerNodeId,
  });
  return {
    ok: true,
    value: {
      ...validation,
      resolved: resolved.value,
    },
  };
};

export const formatValidationErrorMessage = (validation: PortablePathValidationReport): string => {
  if (validation.identityIssues.length > 0) {
    return `Portable path identity validation failed: ${validation.identityIssues[0]?.message ?? 'invalid identities'}`;
  }

  const firstCompileError = validation.compileReport.findings.find(
    (finding): boolean => finding.severity === 'error'
  );
  if (firstCompileError) {
    return `Portable path compile validation failed: ${firstCompileError.message}`;
  }

  if (validation.preflightReport?.shouldBlock) {
    return (
      validation.preflightReport.blockMessage ??
      `Portable path strict preflight failed (${validation.preflightReport.blockReason ?? 'unknown'}).`
    );
  }

  return 'Portable path validation failed.';
};

export class PortablePathValidationError extends Error {
  readonly report: PortablePathValidationReport;

  constructor(report: PortablePathValidationReport) {
    super(formatValidationErrorMessage(report));
    this.name = 'PortablePathValidationError';
    this.report = report;
  }
}

export const runPortablePathClient = async (
  input: unknown,
  options: PortablePathRunOptions = {}
): Promise<PortablePathRunResult> => {
  const {
    validateBeforeRun = true,
    validationMode = 'standard',
    validationTriggerNodeId = null,
    runtimeValidationEnabled = true,
    runtimeValidationConfig,
    signingPolicyProfile,
    signingPolicyTelemetrySurface = 'canvas',
    repairIdentities = true,
    enforcePayloadLimits = true,
    limits,
    fingerprintVerificationMode,
    envelopeSignatureVerificationMode,
    nodeCodeObjectHashVerificationMode,
    envelopeSignatureSecret,
    envelopeSignatureSecretsByKeyId,
    envelopeSignatureFallbackSecrets,
    envelopeSignatureKeyResolver,
    reportAiPathsError,
    validationMiddleware,
    ...engineOptions
  } = options;
  const runStartedAt = Date.now();
  const validationModeForTelemetry: PortablePathValidationMode | null = validateBeforeRun
    ? validationMode
    : null;
  const telemetrySurface = normalizePortablePathSigningPolicySurface(signingPolicyTelemetrySurface);
  let resolvedSourceForTelemetry: PortablePathInputSource | null = null;
  const getDurationMs = (): number => Date.now() - runStartedAt;
  recordPortablePathRunExecutionAttempt({
    runner: 'client',
    surface: telemetrySurface,
  });

  const resolved = await resolvePortablePathInputAsync(input, {
    signingPolicyProfile,
    signingPolicyTelemetrySurface,
    repairIdentities,
    includeConnections: false,
    enforcePayloadLimits,
    limits,
    fingerprintVerificationMode,
    envelopeSignatureVerificationMode,
    nodeCodeObjectHashVerificationMode,
    envelopeSignatureSecret,
    envelopeSignatureSecretsByKeyId,
    envelopeSignatureFallbackSecrets,
    envelopeSignatureKeyResolver,
  });
  if (!resolved.ok) {
    const resolveError = `Invalid AI-Path payload: ${resolved.error}`;
    recordPortablePathRunExecutionFailure({
      runner: 'client',
      surface: telemetrySurface,
      source: null,
      validateBeforeRun,
      validationMode: validationModeForTelemetry,
      durationMs: getDurationMs(),
      failureStage: 'resolve',
      error: resolveError,
    });
    throw new Error(resolveError);
  }
  resolvedSourceForTelemetry = resolved.value.source;

  const validation = validateBeforeRun
    ? validatePortablePathConfig(resolved.value.pathConfig, {
      mode: validationMode,
      triggerNodeId: validationTriggerNodeId,
    })
    : null;
  if (validation && !validation.ok) {
    const validationError = new PortablePathValidationError(validation);
    recordPortablePathRunExecutionFailure({
      runner: 'client',
      surface: telemetrySurface,
      source: resolvedSourceForTelemetry,
      validateBeforeRun,
      validationMode: validationModeForTelemetry,
      durationMs: getDurationMs(),
      failureStage: 'validation',
      error: validationError,
    });
    throw validationError;
  }

  const runtimeValidationMiddleware: EvaluateGraphOptions['validationMiddleware'] =
    resolveAiPathsRuntimeValidationMiddleware({
      validationMiddleware: validationMiddleware as RuntimeValidationMiddleware | null,
      runtimeValidationEnabled,
      runtimeValidationConfig: (runtimeValidationConfig ??
        resolved.value.pathConfig.aiPathsValidation ??
        null),
      nodes: resolved.value.pathConfig.nodes,
      edges: resolved.value.pathConfig.edges,
    });

  let runtimeState: RuntimeState;
  try {
    runtimeState = await evaluateGraphClient({
      nodes: resolved.value.pathConfig.nodes,
      edges: resolved.value.pathConfig.edges,
      ...engineOptions,
      ...(runtimeValidationMiddleware ? { validationMiddleware: runtimeValidationMiddleware } : {}),
      reportAiPathsError: reportAiPathsError ?? (() => {}),
    });
  } catch (error) {
    recordPortablePathRunExecutionFailure({
      runner: 'client',
      surface: telemetrySurface,
      source: resolvedSourceForTelemetry,
      validateBeforeRun,
      validationMode: validationModeForTelemetry,
      durationMs: getDurationMs(),
      failureStage: 'runtime',
      error,
    });
    throw error;
  }
  recordPortablePathRunExecutionSuccess({
    runner: 'client',
    surface: telemetrySurface,
    source: resolvedSourceForTelemetry,
    validateBeforeRun,
    validationMode: validationModeForTelemetry,
    durationMs: getDurationMs(),
  });

  return {
    resolved: resolved.value,
    validation,
    runtimeState,
  };
};

export {
  verifyPortablePathWebhookSignature,
  type PortablePathWebhookSignatureReplayGuard,
  type PortablePathWebhookSignatureVerificationFailureReason,
  type VerifyPortablePathWebhookSignatureInput,
  type VerifyPortablePathWebhookSignatureResult,
} from './receiver-signature';
