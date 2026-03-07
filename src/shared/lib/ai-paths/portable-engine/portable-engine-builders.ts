import { z } from 'zod';

import { type PathConfig, pathConfigSchema } from '@/shared/contracts/ai-paths';
import { canvasSemanticDocumentSchema } from '@/shared/contracts/ai-paths-semantic-grammar';
import { serializePathConfigToSemanticCanvas } from '@/shared/lib/ai-paths/core/semantic-grammar';
import { withPortableNodeCodeObjectManifest } from './node-code-objects-v2-manifest';
import { buildPortablePathJsonSchemaHash } from './portable-engine-integrity-support';

import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  type AiPathPortablePackage,
  type BuildPortablePathPackageOptions,
  PORTABLE_PATH_JSON_SCHEMA_KINDS,
  type PortablePathJsonSchemaCatalog,
  type PortablePathJsonSchemaDiffEntry,
  type PortablePathJsonSchemaDiffReport,
  aiPathPortablePackageEnvelopeSchema,
  aiPathPortablePackageSchema,
} from './portable-engine-contract';

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
