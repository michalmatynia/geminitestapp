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
import type { EvaluateGraphOptions } from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-types';
import {
  parseAndDeserializeSemanticCanvas,
  serializePathConfigToSemanticCanvas,
} from '@/shared/lib/ai-paths/core/semantic-grammar';
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

const portablePathFingerprintSchema = z.object({
  algorithm: z.enum(['sha256', 'stable_hash_v1']),
  value: z.string().min(8),
});

const portablePathEnvelopeSignatureSchema = z.object({
  algorithm: z.enum(['hmac_sha256', 'stable_hash_v1']),
  value: z.string().min(8),
  keyId: z.string().min(1).optional(),
});

const portablePathVersionedFingerprintSchema = z.object({
  algorithm: z.string().min(1),
  value: z.string().min(8),
});

const portablePathVersionedEnvelopeSignatureSchema = z.object({
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

const portablePathPackageVersionedSpecVersionSchema = z
  .string()
  .regex(/^ai-paths\.portable-engine\.v\d+$/);

const aiPathPortablePackageVersionedSchema = z.object({
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

const aiPathPortablePackageEnvelopeVersionedSchema = z.object({
  specVersion: portablePathPackageVersionedSpecVersionSchema,
  kind: z.literal('path_package_envelope'),
  signedAt: z.string(),
  package: aiPathPortablePackageVersionedSchema,
  signature: portablePathVersionedEnvelopeSignatureSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AiPathPortablePackage = z.infer<typeof aiPathPortablePackageSchema>;
export type AiPathPortablePackageEnvelope = z.infer<typeof aiPathPortablePackageEnvelopeSchema>;
type AiPathPortablePackageVersioned = z.infer<typeof aiPathPortablePackageVersionedSchema>;
type AiPathPortablePackageEnvelopeVersioned = z.infer<typeof aiPathPortablePackageEnvelopeVersionedSchema>;

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

type ResolvePortablePathInputInternalOptions = ResolvePortablePathInputOptions & {
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

type PortablePathDiagnosticMessage<TCode extends string> = {
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

type PortablePathPackageMigrationResult =
  | { ok: true; value: { portablePackage: AiPathPortablePackage; migrationWarnings: PortablePathMigrationWarning[] } }
  | { ok: false; error: string };

export type PortablePathPackageMigrator = (
  input: AiPathPortablePackageVersioned
) => PortablePathPackageMigrationResult;

const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const PORTABLE_PACKAGE_SPEC_V2 = 'ai-paths.portable-engine.v2' as const;

const normalizeVersionedPortablePackageToV1 = (
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

const portablePathPackageMigrationRegistry = new Map<string, PortablePathPackageMigrator>([
  [AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION, normalizeVersionedPortablePackageToV1],
  [PORTABLE_PACKAGE_SPEC_V2, normalizeVersionedPortablePackageToV1],
]);

const BUILTIN_PORTABLE_PATH_MIGRATOR_VERSIONS = new Set<string>([
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  PORTABLE_PACKAGE_SPEC_V2,
]);

const normalizePortablePathMigratorSpecVersion = (specVersion: string): string => {
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

const formatZodError = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.join('.') || 'document'}: ${issue.message}`)
    .join('; ');

const PORTABLE_PATH_SIGNING_POLICY_BY_PROFILE: Record<
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

const normalizePortablePathSigningPolicySurface = (
  surface: PortablePathSigningPolicySurface | undefined
): PortablePathSigningPolicySurface => surface ?? 'api';

type ResolvePortablePathVerificationModesOptions = {
  skipUsageTelemetry?: boolean;
};

const resolvePortablePathVerificationModes = (
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

const resolvePayloadLimits = (limits?: Partial<PortablePayloadLimits>): PortablePayloadLimits => ({
  ...DEFAULT_PORTABLE_PAYLOAD_LIMITS,
  ...(limits ?? {}),
});

const getUtf8ByteSize = (value: string): number => {
  if (typeof TextEncoder === 'function') {
    return new TextEncoder().encode(value).length;
  }
  // Fallback approximation in environments without TextEncoder.
  return value.length * 2;
};

const decodePortablePayload = (
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

const estimatePayloadByteSize = (
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

const validatePayloadObjectSafety = (
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

const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const coerceSampleStateMap = <T>(value: unknown): Record<string, T> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, T>;
};

const resolveEdgePort = (
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

const normalizePathConfigEdges = (pathConfig: PathConfig): PathConfig => {
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

const enforceResolvedGraphLimits = (
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

const buildCanonicalPackageFromPathConfig = (
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

const finalizeResolvedPath = ({
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

const toJsonSchemaRecord = (schema: z.ZodTypeAny): Record<string, unknown> =>
  z.toJSONSchema(schema) as Record<string, unknown>;

export const buildPortablePathJsonSchemaCatalog = (): PortablePathJsonSchemaCatalog => ({
  portable_envelope: toJsonSchemaRecord(aiPathPortablePackageEnvelopeSchema),
  portable_package: toJsonSchemaRecord(aiPathPortablePackageSchema),
  semantic_canvas: toJsonSchemaRecord(canvasSemanticDocumentSchema),
  path_config: toJsonSchemaRecord(pathConfigSchema),
});

export const buildPortablePathJsonSchemaCatalogVNextPreview = (): PortablePathJsonSchemaCatalog =>
  buildPortablePathJsonSchemaCatalog();

const createStableHashHex = (value: string): string =>
  [
    hashString(value),
    hashString(`a:${value}`),
    hashString(`b:${value}`),
    hashString(`c:${value}`),
  ].join('');

const buildPortablePathJsonSchemaHash = (schema: Record<string, unknown>): string =>
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

const normalizeOptionalSecret = (value: string | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalSecretList = (value: string[] | undefined): string[] => {
  if (!Array.isArray(value) || value.length === 0) return [];
  return value
    .map((item) => normalizeOptionalSecret(item))
    .filter((item): item is string => item !== null);
};

type PortablePathEnvelopeSignatureVerificationOptions = Pick<
  ResolvePortablePathInputOptions,
  | 'envelopeSignatureSecret'
  | 'envelopeSignatureSecretsByKeyId'
  | 'envelopeSignatureFallbackSecrets'
  | 'envelopeSignatureKeyResolver'
>;

const resolveEnvelopeSignatureSecrets = (
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

const removeTopLevelFingerprint = (input: unknown): unknown => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const record = input as Record<string, unknown>;
  if (record['specVersion'] !== AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION) return input;
  if (record['kind'] !== 'path_package') return input;
  const { fingerprint: _fingerprint, ...rest } = record;
  return rest;
};

const normalizePortableFingerprintInput = (input: unknown): unknown => {
  const withoutFingerprint = removeTopLevelFingerprint(input);
  try {
    return JSON.parse(JSON.stringify(withoutFingerprint)) as unknown;
  } catch {
    return withoutFingerprint;
  }
};

const removeTopLevelEnvelopeSignature = (input: unknown): unknown => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const record = input as Record<string, unknown>;
  if (record['kind'] !== 'path_package_envelope') return input;
  const { signature: _signature, ...rest } = record;
  return rest;
};

const normalizePortableEnvelopeSignatureInput = (input: unknown): unknown => {
  const withoutSignature = removeTopLevelEnvelopeSignature(input);
  try {
    return JSON.parse(JSON.stringify(withoutSignature)) as unknown;
  } catch {
    return withoutSignature;
  }
};

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte: number): string => byte.toString(16).padStart(2, '0'))
    .join('');

const computeHmacSha256Hex = async (message: string, secret: string): Promise<string | null> => {
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

const verifyPortablePackageFingerprint = (
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

const verifyPortablePackageFingerprintAsync = async (
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

const formatValidationErrorMessage = (validation: PortablePathValidationReport): string => {
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

  let runtimeState: RuntimeState;
  try {
    runtimeState = await evaluateGraphClient({
      nodes: resolved.value.pathConfig.nodes,
      edges: resolved.value.pathConfig.edges,
      ...engineOptions,
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
