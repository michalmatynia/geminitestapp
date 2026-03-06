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
  PORTABLE_NODE_CODE_OBJECT_MANIFEST_SCHEMA_VERSION,
} from './node-code-objects-v2';

export const AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION = 'ai-paths.portable-engine.v1' as const;

export type PortablePathFingerprint = {
  algorithm: 'sha256' | 'stable_hash_v1';
  value: string;
};

export type PortablePathEnvelopeSignature = {
  algorithm: 'hmac_sha256' | 'stable_hash_v1';
  value: string;
  keyId?: string;
};

export const portablePathFingerprintSchema = z.object({
  algorithm: z.enum(['sha256', 'stable_hash_v1']),
  value: z.string().min(8),
});

export const portablePathEnvelopeSignatureSchema = z.object({
  algorithm: z.enum(['hmac_sha256', 'stable_hash_v1']),
  value: z.string().min(8),
  keyId: z.string().min(1).optional(),
});

export const portablePathVersionedFingerprintSchema = z.object({
  algorithm: z.string().min(1),
  value: z.string().min(8),
});

export const portablePathVersionedEnvelopeSignatureSchema = z.object({
  algorithm: z.string().min(1),
  value: z.string().min(8),
  keyId: z.string().min(1).optional(),
});

export const aiPathPortablePackageSchema = z.object({
  specVersion: z.literal(AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION),
  kind: z.literal('path_package'),
  createdAt: z.string(),
  pathId: z.string().optional(),
  name: z.string().optional(),
  document: canvasSemanticDocumentSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
  fingerprint: portablePathFingerprintSchema.optional(),
});

export const portablePathPackageVersionedSpecVersionSchema = z
  .string()
  .regex(/^ai-paths\.portable-engine\.v\d+$/);

export const aiPathPortablePackageVersionedSchema = z.object({
  specVersion: portablePathPackageVersionedSpecVersionSchema,
  kind: z.literal('path_package'),
  createdAt: z.string(),
  pathId: z.string().optional(),
  name: z.string().optional(),
  document: canvasSemanticDocumentSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
  fingerprint: portablePathVersionedFingerprintSchema.optional(),
});

export const aiPathPortablePackageEnvelopeSchema = z.object({
  specVersion: z.literal(AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION),
  kind: z.literal('path_package_envelope'),
  signedAt: z.string(),
  package: aiPathPortablePackageSchema,
  signature: portablePathEnvelopeSignatureSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const aiPathPortablePackageEnvelopeVersionedSchema = z.object({
  specVersion: portablePathPackageVersionedSpecVersionSchema,
  kind: z.literal('path_package_envelope'),
  signedAt: z.string(),
  package: aiPathPortablePackageVersionedSchema,
  signature: portablePathVersionedEnvelopeSignatureSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AiPathPortablePackage = z.infer<typeof aiPathPortablePackageSchema>;
export type AiPathPortablePackageEnvelope = z.infer<typeof aiPathPortablePackageEnvelopeSchema>;
export type AiPathPortablePackageVersioned = z.infer<typeof aiPathPortablePackageVersionedSchema>;
export type AiPathPortablePackageEnvelopeVersioned = z.infer<typeof aiPathPortablePackageEnvelopeVersionedSchema>;

export type PortablePathInputSource =
  | 'portable_package'
  | 'portable_envelope'
  | 'semantic_canvas'
  | 'path_config';
export type PortablePathValidationMode = 'standard' | 'strict';
export type PortablePathFingerprintVerificationMode = 'off' | 'warn' | 'strict';
export type PortablePathEnvelopeSignatureVerificationMode = PortablePathFingerprintVerificationMode;
export type PortablePathNodeCodeObjectHashVerificationMode =
  PortableNodeCodeObjectHashVerificationMode;
import type {
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicySurface,
  PortablePathEnvelopeVerificationAuditSinkProfile,
  PortablePathEnvelopeVerificationAuditSinkHealthPolicy,
  PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus,
  PortablePathEnvelopeVerificationAuditSinkHealthDiagnosticStatus,
  PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic,
  PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
} from './types';

export type {
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicySurface,
  PortablePathEnvelopeVerificationAuditSinkProfile,
  PortablePathEnvelopeVerificationAuditSinkHealthPolicy,
  PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus,
  PortablePathEnvelopeVerificationAuditSinkHealthDiagnosticStatus,
  PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic,
  PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
};

export const PORTABLE_PATH_SIGNING_POLICY_PROFILES = ['dev', 'staging', 'prod'] as const;
export const PORTABLE_PATH_SIGNING_POLICY_SURFACES = ['canvas', 'product', 'api'] as const;
export type PortablePathSigningPolicy = {
  profile: PortablePathSigningPolicyProfile;
  fingerprintVerificationMode: PortablePathFingerprintVerificationMode;
  envelopeSignatureVerificationMode: PortablePathEnvelopeSignatureVerificationMode;
};
export type PortablePathEnvelopeSignatureKeyResolverContext = {
  phase: 'sync' | 'async';
  mode: PortablePathEnvelopeSignatureVerificationMode;
  algorithm: string;
  keyId: string | null;
};
export type PortablePathEnvelopeSignatureKeyResolver = (
  context: PortablePathEnvelopeSignatureKeyResolverContext
) => string | string[] | null | undefined;
export const PORTABLE_PATH_JSON_SCHEMA_KINDS = [
  'portable_envelope',
  'portable_package',
  'semantic_canvas',
  'path_config',
] as const;
export type PortablePathJsonSchemaKind = (typeof PORTABLE_PATH_JSON_SCHEMA_KINDS)[number];
export type PortablePathJsonSchemaCatalog = Record<PortablePathJsonSchemaKind, Record<string, unknown>>;
export type PortablePathJsonSchemaDiffEntry = {
  kind: PortablePathJsonSchemaKind;
  changed: boolean;
  currentHash: string;
  vNextHash: string;
};
export type PortablePathJsonSchemaDiffReport = {
  baseline: 'current';
  target: 'vnext_preview';
  hasChanges: boolean;
  changedKinds: PortablePathJsonSchemaKind[];
  entries: PortablePathJsonSchemaDiffEntry[];
};

export type PortablePayloadLimits = {
  maxPayloadBytes: number;
  maxNodeCount: number;
  maxEdgeCount: number;
  maxStringLength: number;
  maxArrayLength: number;
  maxObjectKeys: number;
  maxDepth: number;
};

export const DEFAULT_PORTABLE_PAYLOAD_LIMITS: PortablePayloadLimits = {
  maxPayloadBytes: 2_000_000,
  maxNodeCount: 500,
  maxEdgeCount: 2_000,
  maxStringLength: 50_000,
  maxArrayLength: 20_000,
  maxObjectKeys: 20_000,
  maxDepth: 80,
};

export type ResolvePortablePathInputOptions = {
  signingPolicyProfile?: PortablePathSigningPolicyProfile;
  signingPolicyTelemetrySurface?: PortablePathSigningPolicySurface;
  repairIdentities?: boolean;
  includeConnections?: boolean;
  enforcePayloadLimits?: boolean;
  limits?: Partial<PortablePayloadLimits>;
  fingerprintVerificationMode?: PortablePathFingerprintVerificationMode;
  envelopeSignatureVerificationMode?: PortablePathEnvelopeSignatureVerificationMode;
  nodeCodeObjectHashVerificationMode?: PortablePathNodeCodeObjectHashVerificationMode;
  envelopeSignatureSecret?: string;
  envelopeSignatureSecretsByKeyId?: Record<string, string>;
  envelopeSignatureFallbackSecrets?: string[];
  envelopeSignatureKeyResolver?: PortablePathEnvelopeSignatureKeyResolver;
};

export type ResolvePortablePathInputInternalOptions = ResolvePortablePathInputOptions & {
  __skipSigningPolicyUsageTelemetry?: boolean;
};

export type PortablePathMigrationWarningCode =
  | 'path_config_upgraded'
  | 'semantic_canvas_upgraded'
  | 'portable_package_version_upgraded'
  | 'package_envelope_signature_missing'
  | 'package_envelope_signature_mismatch'
  | 'package_envelope_signature_unsupported_algorithm'
  | 'package_envelope_signature_async_required'
  | 'package_envelope_signature_verification_unavailable'
  | 'package_envelope_signature_key_missing'
  | 'package_path_id_mismatch'
  | 'package_name_mismatch'
  | 'package_fingerprint_missing'
  | 'package_fingerprint_mismatch'
  | 'package_fingerprint_unsupported_algorithm'
  | 'package_fingerprint_async_required'
  | 'package_fingerprint_verification_unavailable'
  | 'node_code_object_manifest_invalid'
  | 'node_code_object_hash_missing'
  | 'node_code_object_hash_mismatch'
  | 'node_code_object_hash_unknown_node_type';

export type PortablePathDiagnosticMessage<TCode extends string> = {
  code: TCode;
  message: string;
};

export type PortablePathMigrationWarning =
  PortablePathDiagnosticMessage<PortablePathMigrationWarningCode>;

export type ResolvedPortablePathInput = {
  source: PortablePathInputSource;
  pathConfig: PathConfig;
  semanticDocument: CanvasSemanticDocument;
  portablePackage: AiPathPortablePackage | null;
  portableEnvelope: AiPathPortablePackageEnvelope | null;
  canonicalPackage: AiPathPortablePackage;
  identityRepaired: boolean;
  identityWarnings: PathIdentityRepairWarning[];
  migrationWarnings: PortablePathMigrationWarning[];
  payloadByteSize: number | null;
};

export type ResolvePortablePathInputResult =
  | { ok: true; value: ResolvedPortablePathInput }
  | { ok: false; error: string };

export type BuildPortablePathPackageOptions = {
  createdAt?: string;
  exporterVersion?: string;
  workspace?: string;
  includeConnections?: boolean;
  metadata?: Record<string, unknown>;
};

export type BuildPortablePathPackageEnvelopeOptions = {
  signedAt?: string;
  secret?: string;
  keyId?: string;
  metadata?: Record<string, unknown>;
};

export type ValidatePortablePathConfigOptions = {
  mode?: PortablePathValidationMode;
  triggerNodeId?: string | null;
};

export type ValidatePortablePathInputOptions = ResolvePortablePathInputOptions &
  ValidatePortablePathConfigOptions;

export type PortablePathValidationReport = {
  ok: boolean;
  mode: PortablePathValidationMode;
  pathConfig: PathConfig;
  identityIssues: PathIdentityValidationIssue[];
  compileReport: GraphCompileReport;
  preflightReport: RunPreflightReport | null;
};

export type ValidatePortablePathInputResult =
  | {
      ok: true;
      value: PortablePathValidationReport & {
        resolved: ResolvedPortablePathInput;
      };
    }
  | { ok: false; error: string };

export type PortablePathRunOptions = Omit<EvaluateGraphOptions, 'reportAiPathsError'> & {
  validateBeforeRun?: boolean;
  validationMode?: PortablePathValidationMode;
  validationTriggerNodeId?: string | null;
  runtimeValidationEnabled?: boolean;
  runtimeValidationConfig?: AiPathsValidationConfig | null;
  signingPolicyProfile?: PortablePathSigningPolicyProfile;
  signingPolicyTelemetrySurface?: PortablePathSigningPolicySurface;
  repairIdentities?: boolean;
  enforcePayloadLimits?: boolean;
  limits?: Partial<PortablePayloadLimits>;
  fingerprintVerificationMode?: PortablePathFingerprintVerificationMode;
  envelopeSignatureVerificationMode?: PortablePathEnvelopeSignatureVerificationMode;
  nodeCodeObjectHashVerificationMode?: PortablePathNodeCodeObjectHashVerificationMode;
  envelopeSignatureSecret?: string;
  envelopeSignatureSecretsByKeyId?: Record<string, string>;
  envelopeSignatureFallbackSecrets?: string[];
  envelopeSignatureKeyResolver?: PortablePathEnvelopeSignatureKeyResolver;
  reportAiPathsError?: EvaluateGraphOptions['reportAiPathsError'];
};

export type PortablePathRunResult = {
  resolved: ResolvedPortablePathInput;
  validation: PortablePathValidationReport | null;
  runtimeState: RuntimeState;
};

export type MigratePortablePathInputResult =
  | {
      ok: true;
      value: {
        source: PortablePathInputSource;
        portablePackage: AiPathPortablePackage;
        migrationWarnings: PortablePathMigrationWarning[];
      };
    }
  | { ok: false; error: string };

export type PortablePathPackageMigrationResult =
  | { ok: true; value: { portablePackage: AiPathPortablePackage; migrationWarnings: PortablePathMigrationWarning[] } }
  | { ok: false; error: string };

export type PortablePathPackageMigrator = (
  input: AiPathPortablePackageVersioned
) => PortablePathPackageMigrationResult;

export const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export const PORTABLE_PACKAGE_SPEC_V2 = 'ai-paths.portable-engine.v2' as const;

export const normalizeVersionedPortablePackageToV1 = (
  input: AiPathPortablePackageVersioned
): PortablePathPackageMigrationResult => {
  const migrationWarnings: PortablePathMigrationWarning[] = [];
  if (input.specVersion !== AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION) {
    migrationWarnings.push({
      code: 'portable_package_version_upgraded',
      message: `Portable package spec "${input.specVersion}" was upgraded to "${AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION}" during import.`,
    });
  }

  const normalizedFingerprint =
    input.fingerprint &&
    (input.fingerprint.algorithm === 'stable_hash_v1' || input.fingerprint.algorithm === 'sha256')
      ? {
        algorithm: input.fingerprint.algorithm,
        value: input.fingerprint.value,
      }
      : null;

  if (input.fingerprint && !normalizedFingerprint) {
    migrationWarnings.push({
      code: 'package_fingerprint_unsupported_algorithm',
      message: `Portable package fingerprint algorithm "${input.fingerprint.algorithm}" is not supported in portable package v1 and was removed during migration.`,
    });
  }

  const candidate: unknown = {
    ...input,
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    ...(normalizedFingerprint ? { fingerprint: normalizedFingerprint } : {}),
    ...(!normalizedFingerprint ? { fingerprint: undefined } : {}),
  };

  const parsed = aiPathPortablePackageSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Portable package migration failed: ${formatZodError(parsed.error)}`,
    };
  }
  return {
    ok: true,
    value: {
      portablePackage: parsed.data,
      migrationWarnings,
    },
  };
};

export const portablePathPackageMigrationRegistry = new Map<string, PortablePathPackageMigrator>([
  [AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION, normalizeVersionedPortablePackageToV1],
  [PORTABLE_PACKAGE_SPEC_V2, normalizeVersionedPortablePackageToV1],
]);

export const BUILTIN_PORTABLE_PATH_MIGRATOR_VERSIONS = new Set<string>([
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  PORTABLE_PACKAGE_SPEC_V2,
]);

export const normalizePortablePathMigratorSpecVersion = (specVersion: string): string => {
  const normalized = specVersion.trim();
  const parsed = portablePathPackageVersionedSpecVersionSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new Error(`Invalid portable package spec version "${specVersion}".`);
  }
  return parsed.data;
};

export const registerPortablePathPackageMigrator = (
  specVersion: string,
  migrator: PortablePathPackageMigrator
): void => {
  const normalizedVersion = normalizePortablePathMigratorSpecVersion(specVersion);
  portablePathPackageMigrationRegistry.set(normalizedVersion, migrator);
  markPortablePathMigratorRegistration(normalizedVersion);
};

export const listPortablePathPackageMigratorVersions = (): string[] =>
  Array.from(portablePathPackageMigrationRegistry.keys()).sort();

export const unregisterPortablePathPackageMigrator = (specVersion: string): boolean => {
  const normalizedVersion = normalizePortablePathMigratorSpecVersion(specVersion);
  if (BUILTIN_PORTABLE_PATH_MIGRATOR_VERSIONS.has(normalizedVersion)) {
    throw new Error(`Cannot unregister built-in portable package migrator "${normalizedVersion}".`);
  }
  const deleted = portablePathPackageMigrationRegistry.delete(normalizedVersion);
  if (deleted) {
    markPortablePathMigratorUnregistration(normalizedVersion);
  }
  return deleted;
};

export const formatZodError = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.join('.') || 'document'}: ${issue.message}`)
    .join('; ');

export const PORTABLE_PATH_SIGNING_POLICY_BY_PROFILE: Record<
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicy
> = {
  dev: {
    profile: 'dev',
    fingerprintVerificationMode: 'off',
    envelopeSignatureVerificationMode: 'off',
  },
  staging: {
    profile: 'staging',
    fingerprintVerificationMode: 'warn',
    envelopeSignatureVerificationMode: 'warn',
  },
  prod: {
    profile: 'prod',
    fingerprintVerificationMode: 'strict',
    envelopeSignatureVerificationMode: 'strict',
  },
};

export const getPortablePathSigningPolicy = (
  profile: PortablePathSigningPolicyProfile = 'dev'
): PortablePathSigningPolicy => PORTABLE_PATH_SIGNING_POLICY_BY_PROFILE[profile];

export const normalizePortablePathSigningPolicySurface = (
  surface: PortablePathSigningPolicySurface | undefined
): PortablePathSigningPolicySurface => surface ?? 'api';

export type ResolvePortablePathVerificationModesOptions = {
  skipUsageTelemetry?: boolean;
};

export const resolvePortablePathVerificationModes = (
  options?: Pick<
    ResolvePortablePathInputOptions,
    | 'signingPolicyProfile'
    | 'signingPolicyTelemetrySurface'
    | 'fingerprintVerificationMode'
    | 'envelopeSignatureVerificationMode'
  >,
  modeOptions?: ResolvePortablePathVerificationModesOptions
): {
  signingPolicy: PortablePathSigningPolicy;
  fingerprintVerificationMode: PortablePathFingerprintVerificationMode;
  envelopeSignatureVerificationMode: PortablePathEnvelopeSignatureVerificationMode;
} => {
  const signingPolicy = getPortablePathSigningPolicy(options?.signingPolicyProfile ?? 'dev');
  const fingerprintVerificationMode =
    options?.fingerprintVerificationMode ?? signingPolicy.fingerprintVerificationMode;
  const envelopeSignatureVerificationMode =
    options?.envelopeSignatureVerificationMode ??
    signingPolicy.envelopeSignatureVerificationMode;
  if (!modeOptions?.skipUsageTelemetry) {
    recordPortablePathSigningPolicyUsage({
      profile: signingPolicy.profile,
      surface: normalizePortablePathSigningPolicySurface(options?.signingPolicyTelemetrySurface),
      fingerprintVerificationMode,
      envelopeSignatureVerificationMode,
    });
  }
  return {
    signingPolicy,
    fingerprintVerificationMode,
    envelopeSignatureVerificationMode,
  };
};

export const resolvePayloadLimits = (limits?: Partial<PortablePayloadLimits>): PortablePayloadLimits => ({
  ...DEFAULT_PORTABLE_PAYLOAD_LIMITS,
  ...(limits ?? {}),
});

export const getUtf8ByteSize = (value: string): number => {
  if (typeof TextEncoder === 'function') {
    return new TextEncoder().encode(value).length;
  }
  // Fallback approximation in environments without TextEncoder.
  return value.length * 2;
};

export const decodePortablePayload = (
  input: unknown
): { ok: true; value: unknown; payloadByteSize: number | null } | { ok: false; error: string } => {
  if (typeof input !== 'string') {
    return { ok: true, value: input, payloadByteSize: null };
  }
  try {
    return {
      ok: true,
      value: JSON.parse(input) as unknown,
      payloadByteSize: getUtf8ByteSize(input),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Invalid JSON payload: ${message}` };
  }
};

export const estimatePayloadByteSize = (
  value: unknown
): { ok: true; value: number } | { ok: false; error: string } => {
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== 'string') {
      return {
        ok: false,
        error: 'Payload cannot be serialized to JSON for size validation.',
      };
    }
    return { ok: true, value: getUtf8ByteSize(serialized) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Payload cannot be serialized to JSON for size validation: ${message}`,
    };
  }
};

export const validatePayloadObjectSafety = (
  value: unknown,
  limits: PortablePayloadLimits,
  depth = 0,
  path = 'payload',
  ancestors: WeakSet<object> = new WeakSet()
): string | null => {
  if (depth > limits.maxDepth) {
    return `Payload exceeds maximum depth (${limits.maxDepth}) at ${path}.`;
  }
  if (typeof value === 'string' && value.length > limits.maxStringLength) {
    return `Payload string is too long at ${path} (max ${limits.maxStringLength} chars).`;
  }
  if (!value || typeof value !== 'object') {
    return null;
  }
  const objectValue = value;
  if (ancestors.has(objectValue)) {
    return `Payload contains circular reference at ${path}.`;
  }
  ancestors.add(objectValue);
  if (Array.isArray(value)) {
    try {
      if (value.length > limits.maxArrayLength) {
        return `Payload array is too large at ${path} (max ${limits.maxArrayLength} items).`;
      }
      for (let index = 0; index < value.length; index += 1) {
        const issue = validatePayloadObjectSafety(
          value[index],
          limits,
          depth + 1,
          `${path}[${index}]`,
          ancestors
        );
        if (issue) return issue;
      }
      return null;
    } finally {
      ancestors.delete(objectValue);
    }
  }
  try {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length > limits.maxObjectKeys) {
      return `Payload object has too many keys at ${path} (max ${limits.maxObjectKeys}).`;
    }
    for (const key of keys) {
      if (UNSAFE_OBJECT_KEYS.has(key)) {
        return `Payload contains unsafe key "${key}" at ${path}.`;
      }
      const issue = validatePayloadObjectSafety(record[key], limits, depth + 1, `${path}.${key}`, ancestors);
      if (issue) return issue;
    }
    return null;
  } finally {
    ancestors.delete(objectValue);
  }
};

export const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const coerceSampleStateMap = <T>(value: unknown): Record<string, T> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, T>;
};

export const resolveEdgePort = (
  edge: Edge,
  canonicalKey: 'fromPort' | 'toPort'
): string | null | undefined => {
  const canonicalValue = edge[canonicalKey];
  if (canonicalValue === undefined) return undefined;
  if (canonicalValue === null) return null;
  if (typeof canonicalValue !== 'string') return null;
  const trimmed = canonicalValue.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizePathConfigEdges = (pathConfig: PathConfig): PathConfig => {
  let changed = false;
  const nextEdges = (pathConfig.edges ?? []).map((edge: Edge): Edge => {
    const resolvedFrom = asTrimmedString(edge.from);
    const resolvedTo = asTrimmedString(edge.to);
    const resolvedFromPort = resolveEdgePort(edge, 'fromPort');
    const resolvedToPort = resolveEdgePort(edge, 'toPort');

    const edgeChanged =
      (resolvedFrom !== undefined && resolvedFrom !== edge.from) ||
      (resolvedTo !== undefined && resolvedTo !== edge.to) ||
      (resolvedFromPort !== undefined && resolvedFromPort !== edge.fromPort) ||
      (resolvedToPort !== undefined && resolvedToPort !== edge.toPort);

    if (!edgeChanged) return edge;
    changed = true;
    return {
      ...edge,
      ...(resolvedFrom !== undefined ? { from: resolvedFrom } : {}),
      ...(resolvedTo !== undefined ? { to: resolvedTo } : {}),
      ...(resolvedFromPort !== undefined ? { fromPort: resolvedFromPort } : {}),
      ...(resolvedToPort !== undefined ? { toPort: resolvedToPort } : {}),
    };
  });

  return changed ? { ...pathConfig, edges: nextEdges } : pathConfig;
};

export const enforceResolvedGraphLimits = (
  pathConfig: PathConfig,
  limits: PortablePayloadLimits
): string | null => {
  const nodeCount = Array.isArray(pathConfig.nodes) ? pathConfig.nodes.length : 0;
  if (nodeCount > limits.maxNodeCount) {
    return `Payload graph exceeds max node count (${limits.maxNodeCount}).`;
  }
  const edgeCount = Array.isArray(pathConfig.edges) ? pathConfig.edges.length : 0;
  if (edgeCount > limits.maxEdgeCount) {
    return `Payload graph exceeds max edge count (${limits.maxEdgeCount}).`;
  }
  return null;
};

export const buildCanonicalPackageFromPathConfig = (
  pathConfig: PathConfig,
  options?: Pick<ResolvePortablePathInputOptions, 'includeConnections'>
): AiPathPortablePackage => {
  const createdAt = new Date().toISOString();
  return {
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    kind: 'path_package',
    createdAt,
    pathId: pathConfig.id,
    name: pathConfig.name,
    document: serializePathConfigToSemanticCanvas(pathConfig, {
      includeConnections: options?.includeConnections !== false,
      exportedAt: createdAt,
    }),
  };
};

export const migratePortablePathInput = (
  input: unknown,
  options?: Pick<ResolvePortablePathInputOptions, 'includeConnections'>
): MigratePortablePathInputResult => {
  const packageParsed = aiPathPortablePackageVersionedSchema.safeParse(input);
  if (packageParsed.success) {
    const specVersion = packageParsed.data.specVersion;
    beginPortablePathMigratorAttempt(specVersion);
    const migrator = portablePathPackageMigrationRegistry.get(specVersion);
    if (!migrator) {
      const error = `Unsupported portable package spec version "${specVersion}". Supported versions: ${listPortablePathPackageMigratorVersions().join(', ')}`;
      markPortablePathMigratorFailure(specVersion, 'missing_migrator', error);
      return {
        ok: false,
        error,
      };
    }
    const migratedPackage = migrator(packageParsed.data);
    if (!migratedPackage.ok) {
      markPortablePathMigratorFailure(specVersion, 'migrator_error', migratedPackage.error);
      return {
        ok: false,
        error: migratedPackage.error,
      };
    }

    const migrationWarnings: PortablePathMigrationWarning[] = [
      ...migratedPackage.value.migrationWarnings,
    ];
    const pathId = migratedPackage.value.portablePackage.pathId?.trim();
    const packageName = migratedPackage.value.portablePackage.name?.trim();
    const documentPathId = migratedPackage.value.portablePackage.document.path.id.trim();
    const documentName = migratedPackage.value.portablePackage.document.path.name.trim();

    if (pathId && pathId !== documentPathId) {
      migrationWarnings.push({
        code: 'package_path_id_mismatch',
        message: `Portable package pathId "${pathId}" differs from document path id "${documentPathId}". Document id is used.`,
      });
    }
    if (packageName && packageName !== documentName) {
      migrationWarnings.push({
        code: 'package_name_mismatch',
        message: `Portable package name "${packageName}" differs from document path name "${documentName}". Document name is used.`,
      });
    }
    recordPortablePathMigratorSource('portable_package');
    markPortablePathMigratorSuccess({
      specVersion,
      warningCount: migrationWarnings.length,
    });
    return {
      ok: true,
      value: {
        source: 'portable_package',
        portablePackage: migratedPackage.value.portablePackage,
        migrationWarnings,
      },
    };
  }

  const semanticParsed = parseAndDeserializeSemanticCanvas(input);
  if (semanticParsed.ok) {
    recordPortablePathMigratorSource('semantic_canvas');
    return {
      ok: true,
      value: {
        source: 'semantic_canvas',
        portablePackage: buildCanonicalPackageFromPathConfig(semanticParsed.value, options),
        migrationWarnings: [
          {
            code: 'semantic_canvas_upgraded',
            message: 'Semantic canvas payload upgraded to portable package v1.',
          },
        ],
      },
    };
  }

  const pathConfigParsed = pathConfigSchema.safeParse(input);
  if (pathConfigParsed.success) {
    const normalizedPathConfig = normalizePathConfigEdges(pathConfigParsed.data);
    recordPortablePathMigratorSource('path_config');
    return {
      ok: true,
      value: {
        source: 'path_config',
        portablePackage: buildCanonicalPackageFromPathConfig(normalizedPathConfig, options),
        migrationWarnings: [
          {
            code: 'path_config_upgraded',
            message: 'Path config payload upgraded to portable package v1.',
          },
        ],
      },
    };
  }

  return {
    ok: false,
    error: [
      'Input does not match a supported AI-Path payload.',
      `portable package parse error: ${formatZodError(packageParsed.error)}`,
      `semantic canvas parse error: ${semanticParsed.error}`,
      `path config parse error: ${formatZodError(pathConfigParsed.error)}`,
    ].join(' '),
  };
};

export const finalizeResolvedPath = ({
  source,
  pathConfig,
  portablePackage,
  portableEnvelope,
  options,
  migrationWarnings,
  payloadByteSize,
}: {
  source: PortablePathInputSource;
  pathConfig: PathConfig;
  portablePackage: AiPathPortablePackage;
  portableEnvelope: AiPathPortablePackageEnvelope | null;
  options?: ResolvePortablePathInputOptions;
  migrationWarnings: PortablePathMigrationWarning[];
  payloadByteSize: number | null;
}): ResolvePortablePathInputResult => {
  const limits = resolvePayloadLimits(options?.limits);
  const normalizedPath = normalizePathConfigEdges(pathConfig);
  const repaired =
    options?.repairIdentities === false
      ? { config: normalizedPath, changed: false, warnings: [] as PathIdentityRepairWarning[] }
      : repairPathNodeIdentities(normalizedPath, { palette });

  if (options?.enforcePayloadLimits !== false) {
    const limitError = enforceResolvedGraphLimits(repaired.config, limits);
    if (limitError) {
      return { ok: false, error: limitError };
    }
  }

  const semanticDocument = serializePathConfigToSemanticCanvas(repaired.config, {
    includeConnections: options?.includeConnections !== false,
  });

  return {
    ok: true,
    value: {
      source,
      pathConfig: repaired.config,
      semanticDocument,
      portablePackage:
        source === 'portable_package' || source === 'portable_envelope' ? portablePackage : null,
      portableEnvelope: source === 'portable_envelope' ? portableEnvelope : null,
      canonicalPackage: {
        ...portablePackage,
        document: semanticDocument,
        pathId: repaired.config.id,
        name: repaired.config.name,
      },
      identityRepaired: repaired.changed,
      identityWarnings: repaired.warnings,
      migrationWarnings,
      payloadByteSize,
    },
  };
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
