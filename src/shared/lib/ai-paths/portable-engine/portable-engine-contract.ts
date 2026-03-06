import { z } from 'zod';

import { canvasSemanticDocumentSchema } from '@/shared/contracts/ai-paths-semantic-grammar';

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

export const PORTABLE_PATH_JSON_SCHEMA_KINDS = [
  'portable_envelope',
  'portable_package',
  'semantic_canvas',
  'path_config',
] as const;

export type PortablePathJsonSchemaKind = (typeof PORTABLE_PATH_JSON_SCHEMA_KINDS)[number];
export type PortablePathJsonSchemaCatalog = Record<
  PortablePathJsonSchemaKind,
  Record<string, unknown>
>;
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
