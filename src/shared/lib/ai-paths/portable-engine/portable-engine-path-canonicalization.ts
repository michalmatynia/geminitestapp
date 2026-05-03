import { type Edge, type PathConfig } from '@/shared/contracts/ai-paths';
import { serializePathConfigToSemanticCanvas } from '@/shared/lib/ai-paths/core/semantic-grammar';
import type { PathIdentityRepairWarning } from '@/shared/lib/ai-paths/core/utils/node-identity';

import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  type AiPathPortablePackage,
  type AiPathPortablePackageEnvelope,
  type PortablePathInputSource,
} from './portable-engine-contract';
import { resolvePayloadLimits } from './portable-engine-resolution-support';

import type { PortablePathMigrationWarning } from './portable-engine-migration-types';
import type {
  PortablePayloadLimits,
  ResolvePortablePathInputOptions,
} from './portable-engine-resolution-types';
import type { ResolvePortablePathInputResult } from './portable-engine-runtime-types';

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

export const normalizePathConfigEdges = (pathConfig: PathConfig): PathConfig => {
  let changed = false;
  const nextEdges = (pathConfig.edges ?? []).map((edge: Edge): Edge => {
    const legacyEdge = edge as Edge & { fromNodeId?: unknown; toNodeId?: unknown };
    const resolvedFrom = asTrimmedString(edge.from);
    const resolvedTo = asTrimmedString(edge.to);
    const resolvedFromPort = resolveEdgePort(edge, 'fromPort');
    const resolvedToPort = resolveEdgePort(edge, 'toPort');

    const edgeChanged =
      resolvedFrom !== edge.from ||
      resolvedTo !== edge.to ||
      resolvedFromPort !== edge.fromPort ||
      resolvedToPort !== edge.toPort ||
      edge.source !== undefined ||
      edge.target !== undefined ||
      edge.sourceHandle !== undefined ||
      edge.targetHandle !== undefined ||
      legacyEdge.fromNodeId !== undefined ||
      legacyEdge.toNodeId !== undefined;

    if (!edgeChanged) return edge;
    changed = true;
    return {
      id: edge.id,
      ...(resolvedFrom !== undefined ? { from: resolvedFrom } : {}),
      ...(resolvedTo !== undefined ? { to: resolvedTo } : {}),
      ...(resolvedFromPort !== undefined ? { fromPort: resolvedFromPort } : {}),
      ...(resolvedToPort !== undefined ? { toPort: resolvedToPort } : {}),
      ...(typeof edge.label === 'string' || edge.label === null ? { label: edge.label } : {}),
      ...(typeof edge.type === 'string' ? { type: edge.type } : {}),
      ...(edge.data && typeof edge.data === 'object' ? { data: edge.data } : {}),
      ...(typeof edge.createdAt === 'string' ? { createdAt: edge.createdAt } : {}),
      ...(typeof edge.updatedAt === 'string' || edge.updatedAt === null
        ? { updatedAt: edge.updatedAt }
        : {}),
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
  const identityWarnings: PathIdentityRepairWarning[] = [];

  if (options?.enforcePayloadLimits !== false) {
    const limitError = enforceResolvedGraphLimits(normalizedPath, limits);
    if (limitError) {
      return { ok: false, error: limitError };
    }
  }

  const semanticDocument = serializePathConfigToSemanticCanvas(normalizedPath, {
    includeConnections: options?.includeConnections !== false,
  });

  return {
    ok: true,
    value: {
      source,
      pathConfig: normalizedPath,
      semanticDocument,
      portablePackage:
        source === 'portable_package' || source === 'portable_envelope' ? portablePackage : null,
      portableEnvelope: source === 'portable_envelope' ? portableEnvelope : null,
      canonicalPackage: {
        ...portablePackage,
        document: semanticDocument,
        pathId: normalizedPath.id,
        name: normalizedPath.name,
      },
      identityRepaired: false,
      identityWarnings,
      migrationWarnings,
      payloadByteSize,
    },
  };
};
