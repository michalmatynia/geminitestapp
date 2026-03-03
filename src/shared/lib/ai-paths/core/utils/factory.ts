import type { AiNode, Edge, PathConfig, PathMeta } from '@/shared/contracts/ai-paths';

import {
  CONTEXT_INPUT_PORTS,
  CONTEXT_OUTPUT_PORTS,
  DEFAULT_CONTEXT_ROLE,
  STORAGE_VERSION,
  initialEdges,
  initialNodes,
  triggers,
} from '../constants';
import {
  DEFAULT_AI_PATHS_VALIDATION_CONFIG,
  normalizeAiPathsValidationConfig,
} from '../validation-engine';
import { normalizeNodes } from '../normalization/normalization.nodes';
import { sanitizeEdges } from './graph.edges';
import { cloneValue, hashString, stableStringify } from './runtime';

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
  legacyId,
  node,
  index,
  usedIds,
}: {
  pathId: string;
  legacyId: string;
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
        legacyId,
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
    const legacyId = typeof node.id === 'string' ? node.id.trim() : '';
    const nextId = buildUniqueCanonicalNodeId({
      pathId,
      legacyId,
      node,
      index,
      usedIds,
    });
    if (legacyId) {
      nodeIdMap.set(legacyId, nextId);
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
    const { source: _legacySource, target: _legacyTarget, ...edgeWithoutLegacyEndpoints } = edge;
    return [
      {
        ...edgeWithoutLegacyEndpoints,
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
    name: 'AI Description Path',
    description: 'Visual analysis + description generation with structured updates.',
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

export const createAiDescriptionPath = (id: string): PathConfig => {
  const now = new Date().toISOString();
  const rawNodes = [
    {
      id: 'node-context',
      type: 'context',
      title: 'Context Filter',
      description: 'Filter product context.',
      inputs: CONTEXT_INPUT_PORTS,
      outputs: CONTEXT_OUTPUT_PORTS,
      position: { x: 470, y: 600 },
      config: {
        context: {
          role: DEFAULT_CONTEXT_ROLE,
          scopeMode: 'full',
          scopeTarget: 'entity',
          includePaths: [],
          excludePaths: [],
        },
      },
    },
    {
      id: 'node-parser',
      type: 'parser',
      title: 'JSON Parser',
      description: 'Extract [images], [title], [productId], [content_en].',
      inputs: ['entityJson'],
      outputs: ['images', 'title', 'productId', 'content_en'],
      position: { x: 770, y: 600 },
      config: {
        parser: {
          mappings: {
            images: '$.images',
            title: '$.title',
            productId: '$.id',
            content_en: '$.content_en',
          },
        },
      },
    },
    {
      id: 'node-ai-desc',
      type: 'ai_description',
      title: 'AI Description Generator',
      description: 'Generate description_en from product context.',
      inputs: ['entityJson', 'images', 'title'],
      outputs: ['description_en'],
      position: { x: 1090, y: 600 },
      config: {
        description: {
          visionOutputEnabled: true,
          generationOutputEnabled: true,
        },
      },
    },
    {
      id: 'node-desc-updater',
      type: 'description_updater',
      title: 'Description Updater',
      description: 'Write description_en to the product.',
      inputs: ['productId', 'description_en'],
      outputs: ['description_en'],
      position: { x: 1410, y: 600 },
    },
    {
      id: 'node-viewer',
      type: 'viewer',
      title: 'Result Viewer',
      description: 'Preview description + runtime outputs.',
      inputs: ['description', 'description_en', 'context', 'meta', 'trigger', 'triggerName'],
      outputs: [],
      position: { x: 1730, y: 600 },
      config: {
        viewer: {
          outputs: {
            description_en: '',
            context: '',
            meta: '',
            trigger: '',
            triggerName: '',
            description: '',
          },
        },
      },
    },
  ];
  const rawGraphNodes: AiNode[] = rawNodes.map(
    (node): AiNode => ({
      createdAt: now,
      updatedAt: null,
      data: {},
      ...(node as Omit<AiNode, 'createdAt' | 'updatedAt' | 'data'>),
    })
  );

  const edges: Edge[] = [
    {
      id: 'edge-1',
      from: 'node-context',
      to: 'node-parser',
      fromPort: 'entityJson',
      toPort: 'entityJson',
    },
    {
      id: 'edge-2',
      from: 'node-parser',
      to: 'node-ai-desc',
      fromPort: 'title',
      toPort: 'title',
    },
    {
      id: 'edge-3',
      from: 'node-parser',
      to: 'node-ai-desc',
      fromPort: 'images',
      toPort: 'images',
    },
    {
      id: 'edge-4',
      from: 'node-context',
      to: 'node-ai-desc',
      fromPort: 'entityJson',
      toPort: 'entityJson',
    },
    {
      id: 'edge-5',
      from: 'node-ai-desc',
      to: 'node-desc-updater',
      fromPort: 'description_en',
      toPort: 'description_en',
    },
    {
      id: 'edge-6',
      from: 'node-parser',
      to: 'node-desc-updater',
      fromPort: 'productId',
      toPort: 'productId',
    },
    {
      id: 'edge-7',
      from: 'node-desc-updater',
      to: 'node-viewer',
      fromPort: 'description_en',
      toPort: 'description_en',
    },
  ];

  const graph = canonicalizePathNodes({
    pathId: id,
    nodes: rawGraphNodes,
    edges,
    selectedNodeId: rawGraphNodes[0]?.id ?? null,
    parserSamples: {},
    updaterSamples: {},
    timestamp: now,
  });

  const config: PathConfig = {
    id,
    version: STORAGE_VERSION,
    name: 'AI Description Path',
    description: 'Generates product descriptions via AI and updates the product.',
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
