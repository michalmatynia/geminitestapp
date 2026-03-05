import { z } from 'zod';

import {
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
export type PortablePathEnvelopeSignatureVerificationMode = 'off' | 'warn' | 'strict';
export const PORTABLE_PATH_JSON_SCHEMA_KINDS = [
  'portable_envelope',
  'portable_package',
  'semantic_canvas',
  'path_config',
] as const;
export type PortablePathJsonSchemaKind = (typeof PORTABLE_PATH_JSON_SCHEMA_KINDS)[number];
export type PortablePathJsonSchemaCatalog = Record<PortablePathJsonSchemaKind, Record<string, unknown>>;

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
  repairIdentities?: boolean;
  includeConnections?: boolean;
  enforcePayloadLimits?: boolean;
  limits?: Partial<PortablePayloadLimits>;
  fingerprintVerificationMode?: PortablePathFingerprintVerificationMode;
  envelopeSignatureVerificationMode?: PortablePathEnvelopeSignatureVerificationMode;
  envelopeSignatureSecret?: string;
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
  | 'package_fingerprint_verification_unavailable';

export type PortablePathMigrationWarning = {
  code: PortablePathMigrationWarningCode;
  message: string;
};

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
  repairIdentities?: boolean;
  enforcePayloadLimits?: boolean;
  limits?: Partial<PortablePayloadLimits>;
  fingerprintVerificationMode?: PortablePathFingerprintVerificationMode;
  envelopeSignatureVerificationMode?: PortablePathEnvelopeSignatureVerificationMode;
  envelopeSignatureSecret?: string;
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
};

export const listPortablePathPackageMigratorVersions = (): string[] =>
  Array.from(portablePathPackageMigrationRegistry.keys()).sort();

export const unregisterPortablePathPackageMigrator = (specVersion: string): boolean => {
  const normalizedVersion = normalizePortablePathMigratorSpecVersion(specVersion);
  if (BUILTIN_PORTABLE_PATH_MIGRATOR_VERSIONS.has(normalizedVersion)) {
    throw new Error(`Cannot unregister built-in portable package migrator "${normalizedVersion}".`);
  }
  return portablePathPackageMigrationRegistry.delete(normalizedVersion);
};

const formatZodError = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.join('.') || 'document'}: ${issue.message}`)
    .join('; ');

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
  canonicalKey: 'fromPort' | 'toPort',
  aliasKey: 'sourceHandle' | 'targetHandle'
): string | null | undefined => {
  const canonicalValue = edge[canonicalKey];
  const aliasValue = edge[aliasKey];
  const candidate = canonicalValue !== undefined ? canonicalValue : aliasValue;
  if (candidate === undefined) return undefined;
  if (candidate === null) return null;
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizePathConfigEdgeAliases = (pathConfig: PathConfig): PathConfig => {
  let changed = false;
  const nextEdges = (pathConfig.edges ?? []).map((edge: Edge): Edge => {
    const resolvedFrom = asTrimmedString(edge.from) ?? asTrimmedString(edge.source);
    const resolvedTo = asTrimmedString(edge.to) ?? asTrimmedString(edge.target);
    const resolvedFromPort = resolveEdgePort(edge, 'fromPort', 'sourceHandle');
    const resolvedToPort = resolveEdgePort(edge, 'toPort', 'targetHandle');

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
    const migrator = portablePathPackageMigrationRegistry.get(packageParsed.data.specVersion);
    if (!migrator) {
      return {
        ok: false,
        error: `Unsupported portable package spec version "${packageParsed.data.specVersion}". Supported versions: ${listPortablePathPackageMigratorVersions().join(', ')}`,
      };
    }
    const migratedPackage = migrator(packageParsed.data);
    if (!migratedPackage.ok) {
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
    const normalizedPathConfig = normalizePathConfigEdgeAliases(pathConfigParsed.data);
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
  const normalizedPath = normalizePathConfigEdgeAliases(pathConfig);
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
  const envelopeSignatureVerificationMode = options?.envelopeSignatureVerificationMode ?? 'off';
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
  const fingerprintVerificationMode = options?.fingerprintVerificationMode ?? 'off';
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
  const resolved = resolvePortablePathInput(input, {
    ...options,
    envelopeSignatureVerificationMode: 'off',
    fingerprintVerificationMode: 'off',
  });
  if (!resolved.ok) return resolved;

  const migrationWarnings = [...resolved.value.migrationWarnings];

  const envelopeSignatureVerificationMode = options?.envelopeSignatureVerificationMode ?? 'off';
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
        }
      );
      if (!verification.ok) {
        return { ok: false, error: verification.error };
      }
      migrationWarnings.push(...verification.warnings);
    }
  }

  const fingerprintVerificationMode = options?.fingerprintVerificationMode ?? 'off';
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
    ...(options?.metadata ? { metadata: options.metadata } : {}),
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

const createStableHashHex = (value: string): string =>
  [
    hashString(value),
    hashString(`a:${value}`),
    hashString(`b:${value}`),
    hashString(`c:${value}`),
  ].join('');

const normalizeOptionalSecret = (value: string | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
  if (
    typeof globalThis.crypto !== 'undefined' &&
    globalThis.crypto?.subtle &&
    typeof TextEncoder === 'function'
  ) {
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

export const verifyPortablePathPackageEnvelopeSignature = (
  portableEnvelope: AiPathPortablePackageEnvelopeVersioned,
  mode: PortablePathEnvelopeSignatureVerificationMode,
  options?: Pick<ResolvePortablePathInputOptions, 'envelopeSignatureSecret'>
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
      return {
        ok: false,
        error: `Portable package envelope verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    return { ok: true, warnings: [warning] };
  }

  if (signature.algorithm === 'hmac_sha256') {
    const secret = normalizeOptionalSecret(options?.envelopeSignatureSecret);
    if (!secret) {
      const warning: PortablePathMigrationWarning = {
        code: 'package_envelope_signature_key_missing',
        message:
          'Portable package envelope hmac signature requires a verification secret. Provide envelopeSignatureSecret.',
      };
      if (mode === 'strict') {
        return {
          ok: false,
          error: `Portable package envelope verification failed: ${warning.message}`,
          warnings: [warning],
        };
      }
      return { ok: true, warnings: [warning] };
    }
    const warning: PortablePathMigrationWarning = {
      code: 'package_envelope_signature_async_required',
      message:
        'Portable package envelope hmac signature requires asynchronous verification. Use resolvePortablePathInputAsync for strict verification.',
    };
    if (mode === 'strict') {
      return {
        ok: false,
        error: `Portable package envelope verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    return { ok: true, warnings: [warning] };
  }

  if (signature.algorithm !== 'stable_hash_v1') {
    const warning: PortablePathMigrationWarning = {
      code: 'package_envelope_signature_unsupported_algorithm',
      message: `Portable package envelope signature algorithm "${signature.algorithm}" cannot be synchronously verified during import.`,
    };
    if (mode === 'strict') {
      return {
        ok: false,
        error: `Portable package envelope verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    return { ok: true, warnings: [warning] };
  }

  const expectedSignature = computePortablePathEnvelopeSignatureSync(portableEnvelope, {
    secret: options?.envelopeSignatureSecret,
    keyId: signature.keyId,
  });
  if (signature.value !== expectedSignature.value) {
    const warning: PortablePathMigrationWarning = {
      code: 'package_envelope_signature_mismatch',
      message: 'Portable package envelope signature does not match envelope contents.',
    };
    if (mode === 'strict') {
      return {
        ok: false,
        error: `Portable package envelope verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    return { ok: true, warnings: [warning] };
  }

  return { ok: true, warnings: [] };
};

export const verifyPortablePathPackageEnvelopeSignatureAsync = async (
  portableEnvelope: AiPathPortablePackageEnvelopeVersioned,
  mode: PortablePathEnvelopeSignatureVerificationMode,
  options?: Pick<ResolvePortablePathInputOptions, 'envelopeSignatureSecret'>
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
      return {
        ok: false,
        error: `Portable package envelope verification failed: ${warning.message}`,
        warnings: [warning],
      };
    }
    return { ok: true, warnings: [warning] };
  }

  if (signature.algorithm === 'stable_hash_v1') {
    const expectedSignature = computePortablePathEnvelopeSignatureSync(portableEnvelope, {
      secret: options?.envelopeSignatureSecret,
      keyId: signature.keyId,
    });
    if (signature.value !== expectedSignature.value) {
      const warning: PortablePathMigrationWarning = {
        code: 'package_envelope_signature_mismatch',
        message: 'Portable package envelope signature does not match envelope contents.',
      };
      if (mode === 'strict') {
        return {
          ok: false,
          error: `Portable package envelope verification failed: ${warning.message}`,
          warnings: [warning],
        };
      }
      return { ok: true, warnings: [warning] };
    }
    return { ok: true, warnings: [] };
  }

  if (signature.algorithm === 'hmac_sha256') {
    const secret = normalizeOptionalSecret(options?.envelopeSignatureSecret);
    if (!secret) {
      const warning: PortablePathMigrationWarning = {
        code: 'package_envelope_signature_key_missing',
        message:
          'Portable package envelope hmac signature requires a verification secret. Provide envelopeSignatureSecret.',
      };
      if (mode === 'strict') {
        return {
          ok: false,
          error: `Portable package envelope verification failed: ${warning.message}`,
          warnings: [warning],
        };
      }
      return { ok: true, warnings: [warning] };
    }
    const normalized = stableStringify(normalizePortableEnvelopeSignatureInput(portableEnvelope));
    const hmac = await computeHmacSha256Hex(normalized, secret);
    if (!hmac) {
      const warning: PortablePathMigrationWarning = {
        code: 'package_envelope_signature_verification_unavailable',
        message:
          'Portable package envelope hmac signature verification is unavailable in this runtime (crypto.subtle not available).',
      };
      if (mode === 'strict') {
        return {
          ok: false,
          error: `Portable package envelope verification failed: ${warning.message}`,
          warnings: [warning],
        };
      }
      return { ok: true, warnings: [warning] };
    }
    if (hmac !== signature.value) {
      const warning: PortablePathMigrationWarning = {
        code: 'package_envelope_signature_mismatch',
        message: 'Portable package envelope signature does not match envelope contents.',
      };
      if (mode === 'strict') {
        return {
          ok: false,
          error: `Portable package envelope verification failed: ${warning.message}`,
          warnings: [warning],
        };
      }
      return { ok: true, warnings: [warning] };
    }
    return { ok: true, warnings: [] };
  }

  const warning: PortablePathMigrationWarning = {
    code: 'package_envelope_signature_unsupported_algorithm',
    message: `Portable package envelope signature algorithm "${signature.algorithm}" is not supported for verification.`,
  };
  if (mode === 'strict') {
    return {
      ok: false,
      error: `Portable package envelope verification failed: ${warning.message}`,
      warnings: [warning],
    };
  }
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
    repairIdentities = true,
    enforcePayloadLimits = true,
    limits,
    fingerprintVerificationMode = 'off',
    envelopeSignatureVerificationMode = 'off',
    envelopeSignatureSecret,
    reportAiPathsError,
    ...engineOptions
  } = options;

  const resolved = await resolvePortablePathInputAsync(input, {
    repairIdentities,
    includeConnections: false,
    enforcePayloadLimits,
    limits,
    fingerprintVerificationMode,
    envelopeSignatureVerificationMode,
    envelopeSignatureSecret,
  });
  if (!resolved.ok) {
    throw new Error(`Invalid AI-Path payload: ${resolved.error}`);
  }

  const validation = validateBeforeRun
    ? validatePortablePathConfig(resolved.value.pathConfig, {
      mode: validationMode,
      triggerNodeId: validationTriggerNodeId,
    })
    : null;
  if (validation && !validation.ok) {
    throw new PortablePathValidationError(validation);
  }

  const runtimeState = await evaluateGraphClient({
    nodes: resolved.value.pathConfig.nodes,
    edges: resolved.value.pathConfig.edges,
    ...engineOptions,
    reportAiPathsError: reportAiPathsError ?? (() => {}),
  });

  return {
    resolved: resolved.value,
    validation,
    runtimeState,
  };
};
