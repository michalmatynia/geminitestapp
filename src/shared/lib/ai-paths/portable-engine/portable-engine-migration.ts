import { z } from 'zod';

import {
  type Edge,
  type PathConfig,
  pathConfigSchema
} from '@/shared/contracts/ai-paths';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import {
  parseAndDeserializeSemanticCanvas,
  serializePathConfigToSemanticCanvas,
} from '@/shared/lib/ai-paths/core/semantic-grammar';
import {
  type PathIdentityRepairWarning,
  repairPathNodeIdentities
} from '@/shared/lib/ai-paths/core/utils/node-identity';
import {
  beginPortablePathMigratorAttempt,
  markPortablePathMigratorFailure,
  markPortablePathMigratorRegistration,
  markPortablePathMigratorSuccess,
  markPortablePathMigratorUnregistration,
  recordPortablePathMigratorSource,
} from './portable-engine-migrator-observability';
import { resolvePayloadLimits } from './portable-engine-resolution-support';

import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  type AiPathPortablePackage,
  type AiPathPortablePackageEnvelope,
  type AiPathPortablePackageVersioned,
  type MigratePortablePathInputResult,
  type PortablePathInputSource,
  type PortablePathMigrationWarning,
  type PortablePayloadLimits,
  type ResolvePortablePathInputOptions,
  type ResolvePortablePathInputResult,
  aiPathPortablePackageSchema,
  aiPathPortablePackageVersionedSchema,
  portablePathPackageVersionedSpecVersionSchema,
} from './portable-engine-types';

type PortablePathPackageMigrationResult =
  | { ok: true; value: { portablePackage: AiPathPortablePackage; migrationWarnings: PortablePathMigrationWarning[] } }
  | { ok: false; error: string };

export type PortablePathPackageMigrator = (
  input: AiPathPortablePackageVersioned
) => PortablePathPackageMigrationResult;

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

const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
