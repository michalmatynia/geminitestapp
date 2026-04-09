import type {
  AiNode,
  DatabaseConfig,
  PathConfig,
  RuntimeHistoryEntry,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/contracts/ai-paths';
import { validationError } from '@/shared/errors/app-error';

import { palette } from '../definitions';
import {
  backfillPathConfigNodeContracts,
  normalizeNodes,
} from '../normalization';
import { findPathConfigCollectionAliasIssues } from './collection-names';
import { sanitizeEdges } from './graph.edges';
import {
  findRemovedLegacyAiPathNodesInPathConfig,
  formatRemovedLegacyAiPathNodesMessage,
} from './legacy-node-removal';
import { normalizeRemovedTriggerContextModesInPathConfig } from './legacy-trigger-context-mode';
import { validateCanonicalPathNodeIdentities } from './node-identity';
import { cloneJsonSafe, stableStringify } from './runtime';
import { parseRuntimeState } from './runtime-state';

type DatabaseOperation = 'query' | 'update' | 'insert' | 'delete';

const isDatabaseOperation = (value: unknown): value is DatabaseOperation =>
  value === 'query' || value === 'update' || value === 'insert' || value === 'delete';

const UNSUPPORTED_TRIGGER_DATA_PORTS = new Set(['context', 'meta', 'entityId', 'entityType']);

const resolveNodeCreatedAt = (value: unknown, fallbackTimestamp: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallbackTimestamp;

const resolveNodeUpdatedAt = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

const resolveEdgeSourceNodeId = (edge: Record<string, unknown>): string => {
  const from = typeof edge['from'] === 'string' ? edge['from'].trim() : '';
  return from;
};

const resolveEdgeSourcePort = (edge: Record<string, unknown>): string => {
  const fromPort = typeof edge['fromPort'] === 'string' ? edge['fromPort'].trim() : '';
  return fromPort;
};

const assertNoUnsupportedTriggerDataGraph = (nodes: AiNode[], edges: unknown[]): void => {
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
      source: 'ai_paths.path_config',
      reason: 'unsupported_trigger_outputs',
      nodeId: node.id,
      outputs: unsupportedPorts,
    });
  });

  edges.forEach((edgeValue: unknown, index: number): void => {
    if (!edgeValue || typeof edgeValue !== 'object' || Array.isArray(edgeValue)) return;
    const edge = edgeValue as Record<string, unknown>;
    const sourceNodeId = resolveEdgeSourceNodeId(edge);
    const sourcePort = resolveEdgeSourcePort(edge);
    if (!sourceNodeId || !sourcePort) return;
    const sourceNode = nodeById.get(sourceNodeId);
    if (sourceNode?.type !== 'trigger') return;
    if (!UNSUPPORTED_TRIGGER_DATA_PORTS.has(sourcePort)) return;
    throw validationError('AI Path config contains unsupported trigger data edges.', {
      source: 'ai_paths.path_config',
      reason: 'unsupported_trigger_data_edge',
      edgeIndex: index,
      edgeId: typeof edge['id'] === 'string' ? edge['id'] : null,
      sourceNodeId,
      sourcePort,
    });
  });
};

const trimRuntimeValue = (value: unknown, depth: number = 1): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    const trimmed = value.length > 1000 ? `${value.slice(0, 1000)}...` : value;
    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    if (depth <= 0) return `[Array(${value.length})]`;
    const slice = value.slice(0, 20).map((entry: unknown) => trimRuntimeValue(entry, depth - 1));
    if (value.length > 20) {
      slice.push(`...${value.length - 20} more`);
    }
    return slice;
  }
  if (typeof value === 'object') {
    if (depth <= 0) return '[Object]';
    const record = value as Record<string, unknown>;
    const entries = Object.entries(record);
    const trimmedEntries = entries
      .slice(0, 20)
      .map(([key, entryValue]: [string, unknown]) => [
        key,
        trimRuntimeValue(entryValue, depth - 1),
      ]);
    const result = Object.fromEntries(trimmedEntries) as Record<string, unknown>;
    if (entries.length > 20) {
      result['__truncated__'] = `...${entries.length - 20} more keys`;
    }
    return result;
  }
  return value;
};

const trimRuntimePorts = (ports: RuntimePortValues): RuntimePortValues => {
  const trimmed: RuntimePortValues = {};
  Object.entries(ports).forEach(([key, value]: [string, unknown]) => {
    trimmed[key] = trimRuntimeValue(value, 1);
  });
  return trimmed;
};

export const buildPersistedRuntimeState = (state: RuntimeState, graphNodes: AiNode[]): string => {
  const excludedTypes = new Set<string>(['notification', 'viewer']);
  const includeHistoryInPathConfig = false;
  const historyLimit = 5;
  const nodeIds = new Set(
    graphNodes
      .filter((node: AiNode): boolean => !excludedTypes.has(node.type))
      .map((node: AiNode) => node.id)
  );
  const inputs: Record<string, RuntimePortValues> = {};
  const outputs: Record<string, RuntimePortValues> = {};
  const history: Record<string, RuntimeHistoryEntry[]> = {};

  Object.entries(state.inputs ?? {}).forEach(([key, value]: [string, RuntimePortValues]) => {
    if (nodeIds.has(key)) {
      inputs[key] = trimRuntimePorts(value);
    }
  });
  Object.entries(state.outputs ?? {}).forEach(([key, value]: [string, RuntimePortValues]) => {
    if (nodeIds.has(key)) {
      outputs[key] = trimRuntimePorts(value);
    }
  });
  Object.entries(state.history ?? {}).forEach(([key, value]) => {
    if (!includeHistoryInPathConfig) return;
    if (!nodeIds.has(key)) return;
    const entries = Array.isArray(value) ? value : [];
    const trimmed = entries.slice(-historyLimit);
    if (trimmed.length > 0) {
      history[key] = trimmed.map((entry: RuntimeHistoryEntry): RuntimeHistoryEntry => {
        return {
          ...entry,
          inputs: entry.inputs ? trimRuntimePorts(entry.inputs) : entry.inputs,
          outputs: entry.outputs ? trimRuntimePorts(entry.outputs) : entry.outputs,
        } as RuntimeHistoryEntry;
      });
    }
  });

  const currentRun =
    state.currentRun && typeof state.currentRun.id === 'string'
      ? {
          id: state.currentRun.id,
          status: state.currentRun.status,
          startedAt: state.currentRun.startedAt ?? null,
          finishedAt: state.currentRun.finishedAt ?? null,
          pathId: state.currentRun.pathId ?? null,
          pathName: state.currentRun.pathName ?? null,
          createdAt: state.currentRun.createdAt,
          updatedAt: state.currentRun.updatedAt ?? null,
        }
      : null;
  const payload: Record<string, unknown> = {
    inputs,
    outputs,
    ...(currentRun ? { currentRun } : {}),
  };
  if (Object.keys(history).length > 0) {
    payload['history'] = history;
  }
  const safe = cloneJsonSafe(payload);
  return safe ? JSON.stringify(safe) : '';
};

export const sanitizePathConfig = (config: PathConfig): PathConfig => {
  const remediatedConfig = normalizeRemovedTriggerContextModesInPathConfig(config).value;
  const collectionAliasIssues = findPathConfigCollectionAliasIssues(remediatedConfig);
  if (collectionAliasIssues.length > 0) {
    throw validationError('AI Path config contains unsupported collection aliases.', {
      source: 'ai_paths.path_config',
      reason: 'unsupported_collection_aliases',
      pathId: remediatedConfig.id,
      issues: collectionAliasIssues,
    });
  }

  const contractBackfilled = backfillPathConfigNodeContracts(remediatedConfig).config;
  const removedLegacyNodes = findRemovedLegacyAiPathNodesInPathConfig(contractBackfilled);
  if (removedLegacyNodes.length > 0) {
    throw validationError(formatRemovedLegacyAiPathNodesMessage(removedLegacyNodes), {
      source: 'ai_paths.path_config',
      reason: 'removed_legacy_node_type',
      pathId: remediatedConfig.id,
      removedNodes: removedLegacyNodes,
    });
  }

  const sanitizedNodes = contractBackfilled.nodes.map((node: AiNode): AiNode => {
    if (node.type !== 'database' || !node.config || typeof node.config !== 'object') {
      return node;
    }
    const configRecord = node.config as Record<string, unknown>;
    const databaseConfig = configRecord['database'];
    if (!databaseConfig || typeof databaseConfig !== 'object') {
      return node;
    }
    const databaseRecord = databaseConfig as Record<string, unknown>;
    const queryConfig =
      databaseRecord['query'] && typeof databaseRecord['query'] === 'object'
        ? (databaseRecord['query'] as Record<string, unknown>)
        : null;
    if (Object.prototype.hasOwnProperty.call(databaseRecord, 'schemaSnapshot')) {
      throw validationError('AI Path config contains unsupported database schemaSnapshot.', {
        source: 'ai_paths.path_config',
        reason: 'unsupported_database_schema_snapshot',
        nodeId: node.id,
      });
    }
    const operation = databaseRecord['operation'];
    const nextDatabaseConfig = {
      ...(databaseConfig as Partial<DatabaseConfig>),
      operation: isDatabaseOperation(operation) ? operation : 'query',
      writeOutcomePolicy: {
        onZeroAffected:
          databaseRecord['writeOutcomePolicy'] &&
          typeof databaseRecord['writeOutcomePolicy'] === 'object' &&
          !Array.isArray(databaseRecord['writeOutcomePolicy']) &&
          ((databaseRecord['writeOutcomePolicy'] as Record<string, unknown>)['onZeroAffected'] ===
            'warn' ||
            (databaseRecord['writeOutcomePolicy'] as Record<string, unknown>)['onZeroAffected'] ===
              'ignore')
            ? ((databaseRecord['writeOutcomePolicy'] as Record<string, unknown>)[
                'onZeroAffected'
              ] as 'warn' | 'ignore')
            : 'fail',
      },
    } as DatabaseConfig;
    if (queryConfig) {
      const provider = queryConfig['provider'];
      if (provider === 'all') {
        throw validationError(
          'AI Path config contains unsupported database query provider "all".',
          {
            source: 'ai_paths.path_config',
            reason: 'unsupported_database_query_provider',
            nodeId: node.id,
            provider,
          }
        );
      }
      if (provider !== undefined && provider !== 'auto' && provider !== 'mongodb') {
        throw validationError('AI Path config contains invalid database query provider.', {
          source: 'ai_paths.path_config',
          reason: 'invalid_database_query_provider',
          nodeId: node.id,
          provider,
        });
      }
      nextDatabaseConfig.query = {
        provider: provider === 'mongodb' ? provider : 'auto',
        collection:
          typeof queryConfig['collection'] === 'string' ? queryConfig['collection'] : 'products',
        mode:
          queryConfig['mode'] === 'preset' || queryConfig['mode'] === 'custom'
            ? queryConfig['mode']
            : 'custom',
        preset:
          queryConfig['preset'] === 'by_id' ||
          queryConfig['preset'] === 'by_productId' ||
          queryConfig['preset'] === 'by_entityId' ||
          queryConfig['preset'] === 'by_field'
            ? queryConfig['preset']
            : 'by_id',
        field: typeof queryConfig['field'] === 'string' ? queryConfig['field'] : '_id',
        idType:
          queryConfig['idType'] === 'string' || queryConfig['idType'] === 'objectId'
            ? queryConfig['idType']
            : 'string',
        queryTemplate:
          typeof queryConfig['queryTemplate'] === 'string' ? queryConfig['queryTemplate'] : '',
        limit:
          typeof queryConfig['limit'] === 'number' && Number.isFinite(queryConfig['limit'])
            ? queryConfig['limit']
            : 20,
        sort: typeof queryConfig['sort'] === 'string' ? queryConfig['sort'] : '',
        ...(typeof queryConfig['sortPresetId'] === 'string'
          ? { sortPresetId: queryConfig['sortPresetId'] }
          : {}),
        projection: typeof queryConfig['projection'] === 'string' ? queryConfig['projection'] : '',
        ...(typeof queryConfig['projectionPresetId'] === 'string'
          ? { projectionPresetId: queryConfig['projectionPresetId'] }
          : {}),
        single: queryConfig['single'] === true,
      };
    }
    const parameterInferenceGuard =
      databaseRecord['parameterInferenceGuard'] &&
      typeof databaseRecord['parameterInferenceGuard'] === 'object' &&
      !Array.isArray(databaseRecord['parameterInferenceGuard'])
        ? (databaseRecord['parameterInferenceGuard'] as Record<string, unknown>)
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
            source: 'ai_paths.path_config',
            reason: 'unsupported_parameter_inference_target_path',
            nodeId: node.id,
            targetPath,
          }
        );
      }
    }
    return {
      ...node,
      config: {
        ...configRecord,
        database: nextDatabaseConfig,
      },
    };
  });

  const identityIssues = validateCanonicalPathNodeIdentities(
    {
      ...contractBackfilled,
      nodes: sanitizedNodes,
    },
    { palette }
  );
  if (identityIssues.length > 0) {
    throw validationError('AI Path config contains unsupported node identities.', {
      source: 'ai_paths.path_config',
      reason: 'unsupported_node_identities',
      pathId: config.id,
      issues: identityIssues,
    });
  }

  const normalizedNodes = normalizeNodes(sanitizedNodes);
  const rawEdges = Array.isArray(contractBackfilled.edges) ? contractBackfilled.edges : [];
  assertNoUnsupportedTriggerDataGraph(normalizedNodes, rawEdges);
  const fallbackNodeTimestamp =
    typeof contractBackfilled.updatedAt === 'string' &&
    contractBackfilled.updatedAt.trim().length > 0
      ? contractBackfilled.updatedAt
      : new Date().toISOString();
  const graphNodes = normalizeNodes(normalizedNodes).map(
    (node: AiNode): AiNode => ({
      ...node,
      createdAt: resolveNodeCreatedAt(node.createdAt, fallbackNodeTimestamp),
      updatedAt: resolveNodeUpdatedAt(node.updatedAt),
    })
  );
  const normalizedEdges = sanitizeEdges(graphNodes, rawEdges);
  if (stableStringify(normalizedEdges) !== stableStringify(rawEdges)) {
    throw validationError('AI Path config contains invalid or non-canonical edges.', {
      source: 'ai_paths.path_config',
      reason: 'invalid_edges',
      pathId: config.id,
    });
  }

  const uiState = contractBackfilled.uiState ? { ...contractBackfilled.uiState } : undefined;
  if (uiState && 'configOpen' in uiState) {
    delete (uiState as { configOpen?: boolean }).configOpen;
  }

  return {
    ...contractBackfilled,
    nodes: graphNodes,
    edges: normalizedEdges,
    uiState,
    runtimeState: buildPersistedRuntimeState(
      parseRuntimeState(contractBackfilled.runtimeState),
      graphNodes
    ),
  };
};

export const sanitizePathConfigs = (
  configs: Record<string, PathConfig>
): Record<string, PathConfig> =>
  Object.fromEntries(
    Object.entries(configs).map(([key, value]: [string, PathConfig]) => [
      key,
      sanitizePathConfig(value),
    ])
  );

export const serializePathConfigs = (configs: Record<string, PathConfig>): string =>
  stableStringify(sanitizePathConfigs(configs));
