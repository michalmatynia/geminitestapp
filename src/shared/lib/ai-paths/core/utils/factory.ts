import type { AiNode, Edge, PathConfig, PathMeta } from '@/shared/contracts/ai-paths';

import {
  STORAGE_VERSION,
  initialEdges,
  initialNodes,
  triggers,
} from '../constants';
import { sanitizeEdges } from './graph.edges';
import { cloneValue, hashString, stableStringify } from './runtime';
import { normalizeNodes } from '../normalization/normalization.nodes';
import {
  DEFAULT_AI_PATHS_VALIDATION_CONFIG,
  normalizeAiPathsValidationConfig,
} from '../validation-engine';

export const createPathId = (): string => `path_${Math.random().toString(36).slice(2, 8)}`;

export const createPresetId = (): string => `preset_${Math.random().toString(36).slice(2, 8)}`;

const createCanonicalNodeId = (seed: string): string =>
  `node-${[
    hashString(seed),
    hashString(`a:${seed}`),
    hashString(`b:${seed}`),
    hashString(`c:${seed}`),
  ]
    .join('')
    .slice(0, 24)}`;

const buildUniqueCanonicalNodeId = ({
  pathId,
  sourceId,
  node,
  index,
  usedIds,
}: {
  pathId: string;
  sourceId: string;
  node: Pick<AiNode, 'type' | 'title'>;
  index: number;
  usedIds: Set<string>;
}): string => {
  let collisionSalt = 0;
  let candidate = '';
  while (!candidate || usedIds.has(candidate)) {
    candidate = createCanonicalNodeId(
      stableStringify({
        kind: 'ai_paths_factory_node',
        pathId,
        // Keep stable seed key name for deterministic id continuity.
        legacyId: sourceId,
        type: node.type,
        title: node.title,
        index,
        collisionSalt,
      })
    );
    collisionSalt += 1;
  }
  usedIds.add(candidate);
  return candidate;
};

const remapNodeKeyedRecord = <T>(
  value: Record<string, T> | undefined,
  nodeIdMap: Map<string, string>
): Record<string, T> => {
  if (!value || typeof value !== 'object') return {};
  const next: Record<string, T> = {};
  Object.entries(value).forEach(([key, entry]: [string, T]): void => {
    const remappedKey = nodeIdMap.get(key.trim());
    if (!remappedKey) return;
    next[remappedKey] = entry;
  });
  return next;
};

const canonicalizePathNodes = ({
  pathId,
  nodes,
  edges,
  selectedNodeId,
  parserSamples,
  updaterSamples,
  timestamp,
}: {
  pathId: string;
  nodes: AiNode[];
  edges: Edge[];
  selectedNodeId?: string | null;
  parserSamples?: PathConfig['parserSamples'];
  updaterSamples?: PathConfig['updaterSamples'];
  timestamp: string;
}): {
  nodes: AiNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  parserSamples: PathConfig['parserSamples'];
  updaterSamples: PathConfig['updaterSamples'];
} => {
  const usedIds = new Set<string>();
  const nodeIdMap = new Map<string, string>();
  const remappedNodes = nodes.map((node: AiNode, index: number): AiNode => {
    const sourceId = typeof node.id === 'string' ? node.id.trim() : '';
    const nextId = buildUniqueCanonicalNodeId({
      pathId,
      sourceId,
      node,
      index,
      usedIds,
    });
    if (sourceId) {
      nodeIdMap.set(sourceId, nextId);
    }
    return {
      ...node,
      id: nextId,
      instanceId: nextId,
      nodeTypeId: undefined,
      createdAt:
        typeof node.createdAt === 'string' && node.createdAt.trim().length > 0
          ? node.createdAt
          : timestamp,
      updatedAt:
        typeof node.updatedAt === 'string' && node.updatedAt.trim().length > 0
          ? node.updatedAt
          : null,
    };
  });
  const remappedEdges = edges.flatMap((edge: Edge): Edge[] => {
    const sourceId = typeof edge.from === 'string' ? edge.from.trim() : '';
    const targetId = typeof edge.to === 'string' ? edge.to.trim() : '';
    const nextFrom = nodeIdMap.get(sourceId);
    const nextTo = nodeIdMap.get(targetId);
    if (!nextFrom || !nextTo) return [];
    return [
      {
        ...edge,
        from: nextFrom,
        to: nextTo,
      },
    ];
  });
  const normalizedNodes = normalizeNodes(remappedNodes);
  const normalizedEdges = sanitizeEdges(normalizedNodes, remappedEdges);
  const remappedSelectedNodeId =
    typeof selectedNodeId === 'string' ? (nodeIdMap.get(selectedNodeId.trim()) ?? null) : null;
  return {
    nodes: normalizedNodes,
    edges: normalizedEdges,
    selectedNodeId:
      remappedSelectedNodeId &&
      normalizedNodes.some((node: AiNode): boolean => node.id === remappedSelectedNodeId)
        ? remappedSelectedNodeId
        : (normalizedNodes[0]?.id ?? null),
    parserSamples: remapNodeKeyedRecord(parserSamples, nodeIdMap),
    updaterSamples: remapNodeKeyedRecord(updaterSamples, nodeIdMap),
  };
};

export const createDefaultPathConfig = (id: string): PathConfig => {
  const now = new Date().toISOString();
  const graph = canonicalizePathNodes({
    pathId: id,
    nodes: cloneValue(initialNodes),
    edges: cloneValue(initialEdges),
    selectedNodeId: initialNodes[0]?.id ?? null,
    parserSamples: {},
    updaterSamples: {},
    timestamp: now,
  });
  const config: PathConfig = {
    id,
    version: STORAGE_VERSION,
    name: 'Description Inference Path',
    description: 'Vision + text model workflow with structured updates.',
    trigger: triggers[0] ?? 'Product Modal - Context Filter',
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'block',
    strictFlowMode: true,
    blockedRunPolicy: 'fail_run',
    aiPathsValidation: normalizeAiPathsValidationConfig(DEFAULT_AI_PATHS_VALIDATION_CONFIG),
    nodes: graph.nodes,
    edges: graph.edges,
    updatedAt: now,
    isLocked: false,
    isActive: true,
    parserSamples: graph.parserSamples,
    updaterSamples: graph.updaterSamples,
    runtimeState: { inputs: {}, outputs: {} },
    lastRunAt: null,
    runCount: 0,
    uiState: {
      selectedNodeId: graph.selectedNodeId,
      configOpen: false,
    },
  };
  return config;
};

export const createPathMeta = (config: PathConfig): PathMeta => {
  const fallbackName = `Path ${config.id.slice(0, 6)}`;
  const resolvedName =
    typeof config.name === 'string' && config.name.trim().length > 0
      ? config.name.trim()
      : fallbackName;
  return {
    id: config.id,
    name: resolvedName,
    createdAt: config.updatedAt,
    updatedAt: config.updatedAt,
  };
};

export const duplicatePathConfig = ({
  sourceConfig,
  duplicateId,
  duplicateName,
  updatedAt,
}: {
  sourceConfig: PathConfig;
  duplicateId: string;
  duplicateName: string;
  updatedAt: string;
}): PathConfig => {
  const graph = canonicalizePathNodes({
    pathId: duplicateId,
    nodes: cloneValue(sourceConfig.nodes ?? []),
    edges: cloneValue(sourceConfig.edges ?? []),
    selectedNodeId: sourceConfig.uiState?.selectedNodeId ?? null,
    parserSamples: cloneValue(sourceConfig.parserSamples ?? {}) as PathConfig['parserSamples'],
    updaterSamples: cloneValue(sourceConfig.updaterSamples ?? {}) as PathConfig['updaterSamples'],
    timestamp: updatedAt,
  });

  return {
    ...sourceConfig,
    id: duplicateId,
    name: duplicateName,
    nodes: graph.nodes,
    edges: graph.edges,
    updatedAt,
    isLocked: false,
    parserSamples: graph.parserSamples,
    updaterSamples: graph.updaterSamples,
    runtimeState: {},
    lastRunAt: null,
    runCount: 0,
    uiState: {
      selectedNodeId: graph.selectedNodeId,
      configOpen: false,
    },
  };
};
