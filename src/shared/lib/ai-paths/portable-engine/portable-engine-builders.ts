import { z } from 'zod';

import {
  type PathConfig,
  pathConfigSchema
} from '@/shared/contracts/ai-paths';
import {
  canvasSemanticDocumentSchema
} from '@/shared/contracts/ai-paths-semantic-grammar';
import {
  serializePathConfigToSemanticCanvas
} from '@/shared/lib/ai-paths/core/semantic-grammar';
import { hashString, stableStringify } from '@/shared/lib/ai-paths/core/utils/runtime';
import {
  withPortableNodeCodeObjectManifest
} from './node-code-objects-v2';

import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  type AiPathPortablePackage,
  type BuildPortablePathPackageOptions,
  PORTABLE_PATH_JSON_SCHEMA_KINDS,
  type PortablePathEnvelopeSignatureKeyResolverContext,
  type PortablePathJsonSchemaCatalog,
  type PortablePathJsonSchemaDiffEntry,
  type PortablePathJsonSchemaDiffReport,
  type ResolvePortablePathInputOptions,
  aiPathPortablePackageEnvelopeSchema,
  aiPathPortablePackageSchema,
} from './portable-engine-types';

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

export const createStableHashHex = (value: string): string =>
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

const removeTopLevelFingerprint = (input: unknown): unknown => {
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

const removeTopLevelEnvelopeSignature = (input: unknown): unknown => {
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

export const computeHmacSha256Hex = async (
  message: string,
  secret: string
): Promise<string | null> => {
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
