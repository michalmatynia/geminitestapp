import {
  aiNodeSchema,
  edgeSchema,
  type AiNode,
  type Edge,
  type PathConfig,
  type PathMeta,
} from '@/shared/contracts/ai-paths';
import { validationError } from '@/shared/errors/app-error';

import { palette } from '../definitions';
import { backfillPathConfigNodeContracts } from './normalization.helpers';
import { normalizeNodes } from './normalization.nodes';
import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_KEY,
  AI_PATHS_HISTORY_RETENTION_MAX,
  AI_PATHS_HISTORY_RETENTION_MIN,
} from '../constants';
import { findPathConfigCollectionAliasIssues } from '../utils/collection-names';
import { sanitizeEdges } from '../utils/graph.edges';
import {
  remediateRemovedLegacyTriggerContextModesInPathConfig,
} from '../utils/legacy-trigger-context-mode';
import { validateCanonicalPathNodeIdentities } from '../utils/node-identity';
import { stableStringify } from '../utils/runtime';

export const normalizeLoadedPathName = (_pathId: string, name: unknown): string => {
  return typeof name === 'string' ? name.trim() : '';
};

export const normalizeLoadedPathMetas = (metas: PathMeta[]): PathMeta[] => {
  const byId = new Map<string, PathMeta>();
  metas.forEach((meta: PathMeta) => {
    const id = typeof meta.id === 'string' ? meta.id.trim() : '';
    if (!id) return;
    const normalizedName = normalizeLoadedPathName(id, meta.name) || `Path ${id.slice(0, 6)}`;
    const fallbackTimestamp = new Date().toISOString();
    const normalizedCreatedAt =
      typeof meta.createdAt === 'string' && meta.createdAt.trim().length > 0
        ? meta.createdAt
        : fallbackTimestamp;
    const normalizedUpdatedAt =
      typeof meta.updatedAt === 'string' && meta.updatedAt.trim().length > 0
        ? meta.updatedAt
        : normalizedCreatedAt;
    const normalizedMeta: PathMeta = {
      ...meta,
      id,
      name: normalizedName,
      createdAt: normalizedCreatedAt,
      updatedAt: normalizedUpdatedAt,
    };
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, normalizedMeta);
      return;
    }
    const existingUpdatedAt = Date.parse(existing.updatedAt || '') || 0;
    const nextUpdatedAt = Date.parse(normalizedMeta.updatedAt || '') || 0;
    if (nextUpdatedAt >= existingUpdatedAt) {
      byId.set(id, normalizedMeta);
    }
  });
  return Array.from(byId.values()).sort((a: PathMeta, b: PathMeta): number =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
};

export const normalizeHistoryRetentionPasses = (value: unknown): number => {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(typeof value === 'string' ? value : '', 10);
  if (!Number.isFinite(parsed) || parsed < AI_PATHS_HISTORY_RETENTION_MIN) {
    return AI_PATHS_HISTORY_RETENTION_DEFAULT;
  }
  return Math.min(
    AI_PATHS_HISTORY_RETENTION_MAX,
    Math.max(AI_PATHS_HISTORY_RETENTION_MIN, Math.trunc(parsed))
  );
};

export const resolveHistoryRetentionPasses = (
  settingsData: Array<{ key: string; value: string }>
): number => {
  const raw = settingsData.find(
    (item: { key: string; value: string }) => item.key === AI_PATHS_HISTORY_RETENTION_KEY
  )?.value;
  return normalizeHistoryRetentionPasses(raw);
};

const assertNoUnsupportedTriggerDatabaseConfig = (node: AiNode): void => {
  if (node.type !== 'database' || !node.config || typeof node.config !== 'object') return;
  const configRecord = node.config as Record<string, unknown>;
  const databaseConfig =
    configRecord['database'] && typeof configRecord['database'] === 'object'
      ? (configRecord['database'] as Record<string, unknown>)
      : null;
  if (!databaseConfig) return;

  if (Object.prototype.hasOwnProperty.call(databaseConfig, 'schemaSnapshot')) {
    throw validationError('AI Path trigger payload contains unsupported database schemaSnapshot.', {
      source: 'ai_paths.trigger_payload',
      reason: 'unsupported_database_schema_snapshot',
      nodeId: node.id,
    });
  }

  const queryConfig =
    databaseConfig['query'] && typeof databaseConfig['query'] === 'object'
      ? (databaseConfig['query'] as Record<string, unknown>)
      : null;
  if (queryConfig?.['provider'] === 'all') {
    throw validationError(
      'AI Path trigger payload contains unsupported database query provider "all".',
      {
        source: 'ai_paths.trigger_payload',
        reason: 'unsupported_database_query_provider',
        nodeId: node.id,
        provider: queryConfig['provider'],
      }
    );
  }

  const parameterInferenceGuard =
    databaseConfig['parameterInferenceGuard'] &&
    typeof databaseConfig['parameterInferenceGuard'] === 'object' &&
    !Array.isArray(databaseConfig['parameterInferenceGuard'])
      ? (databaseConfig['parameterInferenceGuard'] as Record<string, unknown>)
      : null;
  if (parameterInferenceGuard) {
    const targetPath =
      typeof parameterInferenceGuard['targetPath'] === 'string'
        ? parameterInferenceGuard['targetPath'].trim()
        : '';
    if (targetPath.length > 0 && targetPath !== 'parameters') {
      throw validationError(
        'AI Path config contains unsupported parameter inference target path.',
        {
          source: 'ai_paths.trigger_payload',
          reason: 'unsupported_parameter_inference_target_path',
          nodeId: node.id,
          targetPath,
        }
      );
    }
  }
};

const UNSUPPORTED_TRIGGER_DATA_PORTS = new Set(['context', 'meta', 'entityId', 'entityType']);

const resolveEdgeSourceNodeId = (edge: Record<string, unknown>): string => {
  const from = typeof edge['from'] === 'string' ? edge['from'].trim() : '';
  return from;
};

const resolveEdgeSourcePort = (edge: Record<string, unknown>): string => {
  const fromPort = typeof edge['fromPort'] === 'string' ? edge['fromPort'].trim() : '';
  return fromPort;
};

const assertNoUnsupportedTriggerDataGraph = (nodes: AiNode[], edges: Edge[]): void => {
  const nodeById = new Map<string, AiNode>(
    nodes.map((node: AiNode): [string, AiNode] => [node.id, node])
  );

  nodes.forEach((node: AiNode): void => {
    if (node.type !== 'trigger') return;
    const outputs = Array.isArray(node.outputs) ? node.outputs : [];
    const unsupportedPorts = outputs.filter((port: string): boolean =>
      UNSUPPORTED_TRIGGER_DATA_PORTS.has(port)
    );
    if (unsupportedPorts.length === 0) return;
    throw validationError('AI Path config contains unsupported trigger output ports.', {
      source: 'ai_paths.trigger_payload',
      reason: 'unsupported_trigger_outputs',
      nodeId: node.id,
      outputs: unsupportedPorts,
    });
  });

  edges.forEach((edge: Edge, index: number): void => {
    const sourceNodeId = resolveEdgeSourceNodeId(edge as Record<string, unknown>);
    const sourcePort = resolveEdgeSourcePort(edge as Record<string, unknown>);
    if (!sourceNodeId || !sourcePort) return;
    const sourceNode = nodeById.get(sourceNodeId);
    if (sourceNode?.type !== 'trigger') return;
    if (!UNSUPPORTED_TRIGGER_DATA_PORTS.has(sourcePort)) return;
    throw validationError('AI Path config contains unsupported trigger data edges.', {
      source: 'ai_paths.trigger_payload',
      reason: 'unsupported_trigger_data_edge',
      edgeIndex: index,
      edgeId: typeof edge.id === 'string' ? edge.id : null,
      sourceNodeId,
      sourcePort,
    });
  });
};

export const sanitizeTriggerPathConfig = (config: PathConfig): PathConfig => {
  const remediatedConfig = remediateRemovedLegacyTriggerContextModesInPathConfig(config).value;
  const collectionAliasIssues = findPathConfigCollectionAliasIssues(remediatedConfig);
  if (collectionAliasIssues.length > 0) {
    throw validationError('AI Path config contains unsupported collection aliases.', {
      source: 'ai_paths.trigger_payload',
      reason: 'unsupported_collection_aliases',
      pathId: remediatedConfig.id,
      issues: collectionAliasIssues,
    });
  }

  const contractBackfilledConfig = backfillPathConfigNodeContracts(remediatedConfig).config;
  const graphNodes = (
    Array.isArray(contractBackfilledConfig.nodes) ? contractBackfilledConfig.nodes : []
  ).map((node: AiNode, index: number): AiNode => {
    assertNoUnsupportedTriggerDatabaseConfig(node);
    const parsedNode = aiNodeSchema.safeParse(node);
    if (!parsedNode.success) {
      throw validationError('Invalid AI Path trigger node payload.', {
        source: 'ai_paths.trigger_payload',
        reason: 'invalid_node',
        index,
        issues: parsedNode.error.flatten(),
      });
    }
    return parsedNode.data;
  });

  const parsedEdges = (
    Array.isArray(contractBackfilledConfig.edges) ? contractBackfilledConfig.edges : []
  ).map((edge: unknown, index: number) => {
    const parsedEdge = edgeSchema.safeParse(edge);
    if (!parsedEdge.success) {
      throw validationError('Invalid AI Path trigger edge payload.', {
        source: 'ai_paths.trigger_payload',
        reason: 'invalid_edge',
        index,
        issues: parsedEdge.error.flatten(),
      });
    }
    return parsedEdge.data;
  });

  const normalizedGraphNodes = normalizeNodes(graphNodes);
  assertNoUnsupportedTriggerDataGraph(normalizedGraphNodes, parsedEdges);
  const identityIssues = validateCanonicalPathNodeIdentities(
    {
      ...contractBackfilledConfig,
      nodes: normalizedGraphNodes,
    },
    { palette }
  );
  if (identityIssues.length > 0) {
    throw validationError('AI Path config contains unsupported node identities.', {
      source: 'ai_paths.trigger_payload',
      reason: 'unsupported_node_identities',
      pathId: config.id,
      issues: identityIssues,
    });
  }
  const graphEdges = sanitizeEdges(normalizedGraphNodes, parsedEdges);
  if (stableStringify(graphEdges) !== stableStringify(parsedEdges)) {
    throw validationError('AI Path config contains invalid or non-canonical edges.', {
      source: 'ai_paths.trigger_payload',
      reason: 'invalid_edges',
      pathId: config.id,
    });
  }

  return {
    ...contractBackfilledConfig,
    nodes: normalizedGraphNodes,
    edges: graphEdges,
  };
};
