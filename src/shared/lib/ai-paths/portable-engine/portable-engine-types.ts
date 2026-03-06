import { z } from 'zod';

import {
  type GraphCompileReport,
  type PathConfig,
  type RunPreflightReport
} from '@/shared/contracts/ai-paths';
import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';
import {
  type CanvasSemanticDocument,
  canvasSemanticDocumentSchema,
} from '@/shared/contracts/ai-paths-semantic-grammar';
import type { EvaluateGraphOptions } from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-types';
import {
  type PathIdentityRepairWarning,
  type PathIdentityValidationIssue
} from '@/shared/lib/ai-paths/core/utils/node-identity';
import {
  type PortableNodeCodeObjectHashVerificationMode
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
export type AiPathPortablePackageEnvelopeVersioned = z.infer<
  typeof aiPathPortablePackageEnvelopeVersionedSchema
>;

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
export const PORTABLE_PATH_SIGNING_POLICY_PROFILES = ['dev', 'staging', 'prod'] as const;
export type PortablePathSigningPolicyProfile =
  (typeof PORTABLE_PATH_SIGNING_POLICY_PROFILES)[number];
export const PORTABLE_PATH_SIGNING_POLICY_SURFACES = ['canvas', 'product', 'api'] as const;
export type PortablePathSigningPolicySurface =
  (typeof PORTABLE_PATH_SIGNING_POLICY_SURFACES)[number];
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
