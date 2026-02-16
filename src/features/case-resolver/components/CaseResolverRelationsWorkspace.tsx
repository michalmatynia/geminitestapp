'use client';

import {
  Download,
  Filter,
  GitBranch,
  Link2,
  Network,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { CanvasBoard } from '@/features/ai/ai-paths/components/canvas-board';
import {
  AiPathsProvider,
  useCanvasActions,
  useCanvasRefs,
  useCanvasState,
  useGraphActions,
  useGraphState,
  useSelectionActions,
  useSelectionState,
} from '@/features/ai/ai-paths/context';
import {
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  stableStringify,
  type AiNode,
  type Edge,
} from '@/features/ai/ai-paths/lib';
import {
  AppModal,
  Button,
  Input,
  Label,
  SelectSimple,
  useToast,
} from '@/shared/ui';

import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import {
  toCaseResolverRelationAssetFileNodeId,
  toCaseResolverRelationCaseNodeId,
  toCaseResolverRelationFolderNodeId,
} from '../settings';
import {
  CASE_RESOLVER_RELATION_EDGE_KIND_OPTIONS,
  DEFAULT_CASE_RESOLVER_RELATION_EDGE_META,
  DEFAULT_CASE_RESOLVER_RELATION_NODE_META,
  type CaseResolverRelationEdgeKind,
  type CaseResolverRelationEdgeMeta,
  type CaseResolverRelationEntityType,
  type CaseResolverRelationGraph,
  type CaseResolverRelationNodeMeta,
} from '../types';

type RelationInspectorTab = 'node' | 'edge';
type RelationImportMode = 'merge' | 'replace';
type SearchEntityFilter = 'all' | CaseResolverRelationEntityType;
type SearchRelationFilter = 'all' | CaseResolverRelationEdgeKind;
type RelationNodeTypeGroup = 'folder' | 'case' | 'file' | 'custom';

const AUTO_LAYOUT_START_X = 120;
const AUTO_LAYOUT_START_Y = 90;
const AUTO_LAYOUT_COLUMN_GAP = 340;
const AUTO_LAYOUT_ROW_GAP = 120;

const RELATION_SUPPORTED_NODE_TYPES = new Set<AiNode['type']>([
  'trigger',
  'simulation',
  'audio_oscillator',
  'audio_speaker',
  'context',
  'parser',
  'regex',
  'iterator',
  'mapper',
  'mutator',
  'string_mutator',
  'validator',
  'constant',
  'math',
  'template',
  'bundle',
  'gate',
  'compare',
  'router',
  'delay',
  'poll',
  'http',
  'prompt',
  'model',
  'agent',
  'learner_agent',
  'database',
  'db_schema',
  'viewer',
  'notification',
  'ai_description',
  'description_updater',
]);

const createCustomRelationIdSuffix = (): string => {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 10);
};

const createCustomRelationNodeId = (): string => `relation-custom-${createCustomRelationIdSuffix()}`;
const createCustomRelationEdgeId = (): string => `custom-edge-${createCustomRelationIdSuffix()}`;

const clampCanvasPosition = (position: { x: number; y: number }): { x: number; y: number } => ({
  x: Math.max(position.x, 24),
  y: Math.max(position.y, 24),
});

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toStringValue = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const toNonEmptyStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toBooleanValue = (value: unknown): boolean => value === true;

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .filter((entry: unknown): entry is string => typeof entry === 'string')
    .map((entry: string) => entry.trim())
    .filter((entry: string) => entry.length > 0);
  return normalized.length > 0 ? normalized : fallback;
};

const parseRelationEntityType = (value: unknown): CaseResolverRelationEntityType => {
  if (value === 'case' || value === 'folder' || value === 'file' || value === 'custom') {
    return value;
  }
  return 'custom';
};

const parseRelationEdgeType = (value: unknown): CaseResolverRelationEdgeKind => {
  if (
    value === 'contains' ||
    value === 'located_in' ||
    value === 'parent_case' ||
    value === 'references' ||
    value === 'related' ||
    value === 'custom'
  ) {
    return value;
  }
  return 'custom';
};

const parseRelationNodeType = (value: unknown): AiNode['type'] => {
  if (typeof value !== 'string') return 'template';
  const normalized = value.trim() as AiNode['type'];
  return RELATION_SUPPORTED_NODE_TYPES.has(normalized) ? normalized : 'template';
};

const parseImportedNodes = (value: unknown): AiNode[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const output: AiNode[] = [];
  value.forEach((entry: unknown, index: number): void => {
    const record = asRecord(entry);
    if (!record) return;

    const id = toNonEmptyStringValue(record['id']);
    if (!id || seen.has(id)) return;
    seen.add(id);

    const typeRaw = parseRelationNodeType(record['type']);
    const title = toNonEmptyStringValue(record['title']) ?? `Relation ${index + 1}`;
    const description = toStringValue(record['description']);
    const positionRecord = asRecord(record['position']);
    const x = positionRecord ? toFiniteNumber(positionRecord['x']) ?? 0 : 0;
    const y = positionRecord ? toFiniteNumber(positionRecord['y']) ?? 0 : 0;

    const inputs = toStringArray(record['inputs'], ['in']);
    const outputs = toStringArray(record['outputs'], ['out']);

    const configRecord = asRecord(record['config']);

    output.push({
      id,
      type: typeRaw,
      title,
      description,
      inputs,
      outputs,
      position: { x, y },
      ...(configRecord ? { config: configRecord as AiNode['config'] } : {}),
    });
  });
  return output;
};

const parseImportedEdges = (value: unknown, validNodeIds: Set<string>): Edge[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const output: Edge[] = [];
  value.forEach((entry: unknown): void => {
    const record = asRecord(entry);
    if (!record) return;

    const id = toNonEmptyStringValue(record['id']);
    const from = toNonEmptyStringValue(record['from']);
    const to = toNonEmptyStringValue(record['to']);
    if (!id || !from || !to || seen.has(id)) return;
    if (!validNodeIds.has(from) || !validNodeIds.has(to)) return;
    seen.add(id);

    const label = toNonEmptyStringValue(record['label']);
    const fromPort = toNonEmptyStringValue(record['fromPort']);
    const toPort = toNonEmptyStringValue(record['toPort']);

    output.push({
      id,
      from,
      to,
      ...(label ? { label } : {}),
      ...(fromPort ? { fromPort } : {}),
      ...(toPort ? { toPort } : {}),
    });
  });
  return output;
};

const parseImportedNodeMeta = (
  value: unknown,
  validNodeIds: Set<string>,
  fallbackTimestamp: string
): Record<string, CaseResolverRelationNodeMeta> => {
  const output: Record<string, CaseResolverRelationNodeMeta> = {};
  const record = asRecord(value);
  if (!record) return output;

  Object.entries(record).forEach(([nodeId, entry]: [string, unknown]): void => {
    if (!validNodeIds.has(nodeId)) return;
    const entryRecord = asRecord(entry);
    if (!entryRecord) return;

    const entityType = parseRelationEntityType(entryRecord['entityType']);
    const entityId = toNonEmptyStringValue(entryRecord['entityId']) ?? nodeId;
    const label = toNonEmptyStringValue(entryRecord['label']) ?? nodeId;
    const fileKindRaw = toNonEmptyStringValue(entryRecord['fileKind']);
    const fileKind = fileKindRaw === 'case_file' || fileKindRaw === 'asset_file' ? fileKindRaw : null;
    const folderPath = toNonEmptyStringValue(entryRecord['folderPath']);
    const sourceFileId = toNonEmptyStringValue(entryRecord['sourceFileId']);
    const isStructural = toBooleanValue(entryRecord['isStructural']);
    const createdAt = toNonEmptyStringValue(entryRecord['createdAt']) ?? fallbackTimestamp;
    const updatedAt = toNonEmptyStringValue(entryRecord['updatedAt']) ?? createdAt;

    output[nodeId] = {
      ...DEFAULT_CASE_RESOLVER_RELATION_NODE_META,
      entityType,
      entityId,
      label,
      fileKind,
      folderPath,
      sourceFileId,
      isStructural,
      createdAt,
      updatedAt,
    };
  });

  return output;
};

const parseImportedEdgeMeta = (
  value: unknown,
  validEdgeIds: Set<string>,
  fallbackTimestamp: string
): Record<string, CaseResolverRelationEdgeMeta> => {
  const output: Record<string, CaseResolverRelationEdgeMeta> = {};
  const record = asRecord(value);
  if (!record) return output;

  Object.entries(record).forEach(([edgeId, entry]: [string, unknown]): void => {
    if (!validEdgeIds.has(edgeId)) return;
    const entryRecord = asRecord(entry);
    if (!entryRecord) return;

    const relationType = parseRelationEdgeType(entryRecord['relationType']);
    const label = toNonEmptyStringValue(entryRecord['label']) ?? 'custom relation';
    const isStructural = toBooleanValue(entryRecord['isStructural']);
    const createdAt = toNonEmptyStringValue(entryRecord['createdAt']) ?? fallbackTimestamp;
    const updatedAt = toNonEmptyStringValue(entryRecord['updatedAt']) ?? createdAt;

    output[edgeId] = {
      ...DEFAULT_CASE_RESOLVER_RELATION_EDGE_META,
      relationType,
      label,
      isStructural,
      createdAt,
      updatedAt,
    };
  });

  return output;
};

const parseImportedRelationGraph = (rawText: string): CaseResolverRelationGraph | null => {
  try {
    const parsed: unknown = JSON.parse(rawText);
    const rootRecord = asRecord(parsed);
    if (!rootRecord) return null;
    const graphRecord = asRecord(rootRecord['relationGraph']) ?? rootRecord;

    const nodes = parseImportedNodes(graphRecord['nodes']);
    const validNodeIds = new Set(nodes.map((node: AiNode): string => node.id));
    const edges = parseImportedEdges(graphRecord['edges'], validNodeIds);
    const validEdgeIds = new Set(edges.map((edge: Edge): string => edge.id));
    const fallbackTimestamp = new Date().toISOString();

    return {
      nodes,
      edges,
      nodeMeta: parseImportedNodeMeta(graphRecord['nodeMeta'], validNodeIds, fallbackTimestamp),
      edgeMeta: parseImportedEdgeMeta(graphRecord['edgeMeta'], validEdgeIds, fallbackTimestamp),
    };
  } catch {
    return null;
  }
};

const ensureRelationNodeMeta = (
  nodes: AiNode[],
  existing: Record<string, CaseResolverRelationNodeMeta>,
  fallbackTimestamp: string
): Record<string, CaseResolverRelationNodeMeta> => {
  const next: Record<string, CaseResolverRelationNodeMeta> = {};
  const validNodeIds = new Set(nodes.map((node: AiNode): string => node.id));

  Object.entries(existing).forEach(([nodeId, meta]: [string, CaseResolverRelationNodeMeta]) => {
    if (!validNodeIds.has(nodeId)) return;
    const createdAt =
      typeof meta.createdAt === 'string' && meta.createdAt.trim().length > 0
        ? meta.createdAt
        : fallbackTimestamp;
    const updatedAt =
      typeof meta.updatedAt === 'string' && meta.updatedAt.trim().length > 0
        ? meta.updatedAt
        : createdAt;
    next[nodeId] = {
      ...DEFAULT_CASE_RESOLVER_RELATION_NODE_META,
      ...meta,
      createdAt,
      updatedAt,
    };
  });

  nodes.forEach((node: AiNode): void => {
    if (next[node.id]) return;
    next[node.id] = {
      ...DEFAULT_CASE_RESOLVER_RELATION_NODE_META,
      entityType: 'custom',
      entityId: node.id,
      label: node.title || node.id,
      fileKind: null,
      folderPath: null,
      sourceFileId: null,
      isStructural: false,
      createdAt: fallbackTimestamp,
      updatedAt: fallbackTimestamp,
    };
  });

  return next;
};

const ensureRelationEdgeMeta = (
  edges: Edge[],
  existing: Record<string, CaseResolverRelationEdgeMeta>,
  fallbackTimestamp: string
): Record<string, CaseResolverRelationEdgeMeta> => {
  const next: Record<string, CaseResolverRelationEdgeMeta> = {};
  const validEdgeIds = new Set(edges.map((edge: Edge): string => edge.id));

  Object.entries(existing).forEach(([edgeId, meta]: [string, CaseResolverRelationEdgeMeta]) => {
    if (!validEdgeIds.has(edgeId)) return;
    const createdAt =
      typeof meta.createdAt === 'string' && meta.createdAt.trim().length > 0
        ? meta.createdAt
        : fallbackTimestamp;
    const updatedAt =
      typeof meta.updatedAt === 'string' && meta.updatedAt.trim().length > 0
        ? meta.updatedAt
        : createdAt;
    next[edgeId] = {
      ...DEFAULT_CASE_RESOLVER_RELATION_EDGE_META,
      ...meta,
      createdAt,
      updatedAt,
    };
  });

  edges.forEach((edge: Edge): void => {
    if (next[edge.id]) return;
    next[edge.id] = {
      ...DEFAULT_CASE_RESOLVER_RELATION_EDGE_META,
      relationType: 'custom',
      label: typeof edge.label === 'string' && edge.label.trim().length > 0 ? edge.label : 'custom relation',
      isStructural: false,
      createdAt: fallbackTimestamp,
      updatedAt: fallbackTimestamp,
    };
  });

  return next;
};

const relationNodeGroupRank: Record<RelationNodeTypeGroup, number> = {
  folder: 0,
  case: 1,
  file: 2,
  custom: 3,
};

const resolveRelationNodeGroup = (
  nodeId: string,
  nodeMeta: Record<string, CaseResolverRelationNodeMeta>
): RelationNodeTypeGroup => {
  const meta = nodeMeta[nodeId];
  if (!meta) return 'custom';
  if (meta.entityType === 'folder') return 'folder';
  if (meta.entityType === 'case') return 'case';
  if (meta.entityType === 'file') return 'file';
  return 'custom';
};

const buildAutoLayoutPositions = (
  nodes: AiNode[],
  edges: Edge[],
  nodeMeta: Record<string, CaseResolverRelationNodeMeta>
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  const nodeById = new Map(nodes.map((node: AiNode): [string, AiNode] => [node.id, node]));
  const nodeIds = new Set(nodeById.keys());
  const validEdges = edges.filter(
    (edge: Edge): boolean => nodeIds.has(edge.from) && nodeIds.has(edge.to)
  );

  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  nodes.forEach((node: AiNode): void => {
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
  });
  validEdges.forEach((edge: Edge): void => {
    const incomingList = incoming.get(edge.to) ?? [];
    incomingList.push(edge.from);
    incoming.set(edge.to, incomingList);

    const outgoingList = outgoing.get(edge.from) ?? [];
    outgoingList.push(edge.to);
    outgoing.set(edge.from, outgoingList);
  });

  const baseRankByNodeId = new Map<string, number>();
  const labelByNodeId = new Map<string, string>();
  nodes.forEach((node: AiNode): void => {
    const group = resolveRelationNodeGroup(node.id, nodeMeta);
    baseRankByNodeId.set(node.id, relationNodeGroupRank[group]);
    labelByNodeId.set(node.id, (nodeMeta[node.id]?.label || node.title || node.id).toLowerCase());
  });

  const indegree = new Map<string, number>();
  nodes.forEach((node: AiNode): void => {
    indegree.set(node.id, incoming.get(node.id)?.length ?? 0);
  });

  const queue: string[] = nodes
    .map((node: AiNode): string => node.id)
    .filter((nodeId: string): boolean => (indegree.get(nodeId) ?? 0) === 0);

  const sortQueue = (): void => {
    queue.sort((left: string, right: string) => {
      const rankDelta = (baseRankByNodeId.get(left) ?? 0) - (baseRankByNodeId.get(right) ?? 0);
      if (rankDelta !== 0) return rankDelta;
      const labelDelta = (labelByNodeId.get(left) ?? '').localeCompare(labelByNodeId.get(right) ?? '');
      if (labelDelta !== 0) return labelDelta;
      return left.localeCompare(right);
    });
  };

  sortQueue();

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    topoOrder.push(current);

    (outgoing.get(current) ?? []).forEach((targetId: string): void => {
      const next = (indegree.get(targetId) ?? 0) - 1;
      indegree.set(targetId, next);
      if (next === 0) {
        queue.push(targetId);
      }
    });
    sortQueue();
  }

  if (topoOrder.length < nodes.length) {
    nodes
      .map((node: AiNode): string => node.id)
      .filter((nodeId: string): boolean => !topoOrder.includes(nodeId))
      .sort((left: string, right: string) => {
        const rankDelta = (baseRankByNodeId.get(left) ?? 0) - (baseRankByNodeId.get(right) ?? 0);
        if (rankDelta !== 0) return rankDelta;
        const labelDelta = (labelByNodeId.get(left) ?? '').localeCompare(labelByNodeId.get(right) ?? '');
        if (labelDelta !== 0) return labelDelta;
        return left.localeCompare(right);
      })
      .forEach((nodeId: string): void => {
        topoOrder.push(nodeId);
      });
  }

  const rankByNodeId = new Map<string, number>();
  topoOrder.forEach((nodeId: string): void => {
    let rank = baseRankByNodeId.get(nodeId) ?? 0;
    (incoming.get(nodeId) ?? []).forEach((parentId: string): void => {
      rank = Math.max(rank, (rankByNodeId.get(parentId) ?? (baseRankByNodeId.get(parentId) ?? 0)) + 1);
    });
    rankByNodeId.set(nodeId, rank);
  });

  const groupsByRank = new Map<number, string[]>();
  topoOrder.forEach((nodeId: string): void => {
    const rank = rankByNodeId.get(nodeId) ?? 0;
    const current = groupsByRank.get(rank) ?? [];
    current.push(nodeId);
    groupsByRank.set(rank, current);
  });

  const existingPositionByNodeId = new Map<string, { x: number; y: number }>();
  nodes.forEach((node: AiNode): void => {
    existingPositionByNodeId.set(node.id, node.position);
  });

  groupsByRank.forEach((nodeIdsAtRank: string[], rank: number): void => {
    nodeIdsAtRank.sort((left: string, right: string) => {
      const leftPos = existingPositionByNodeId.get(left);
      const rightPos = existingPositionByNodeId.get(right);
      const leftY = leftPos?.y ?? AUTO_LAYOUT_START_Y;
      const rightY = rightPos?.y ?? AUTO_LAYOUT_START_Y;
      if (leftY !== rightY) return leftY - rightY;
      const labelDelta = (labelByNodeId.get(left) ?? '').localeCompare(labelByNodeId.get(right) ?? '');
      if (labelDelta !== 0) return labelDelta;
      return left.localeCompare(right);
    });
    groupsByRank.set(rank, nodeIdsAtRank);
  });

  const ranksAsc = Array.from(groupsByRank.keys()).sort((left: number, right: number) => left - right);

  const buildOrderIndex = (): Map<string, number> => {
    const indexByNodeId = new Map<string, number>();
    ranksAsc.forEach((rank: number): void => {
      (groupsByRank.get(rank) ?? []).forEach((nodeId: string, index: number): void => {
        indexByNodeId.set(nodeId, index);
      });
    });
    return indexByNodeId;
  };

  const resolveBarycenter = (
    neighborIds: string[],
    orderByNodeId: Map<string, number>
  ): number | null => {
    if (neighborIds.length === 0) return null;
    const values = neighborIds
      .map((neighborId: string): number | null => orderByNodeId.has(neighborId) ? (orderByNodeId.get(neighborId) ?? null) : null)
      .filter((value: number | null): value is number => value !== null);
    if (values.length === 0) return null;
    const sum = values.reduce((acc: number, value: number): number => acc + value, 0);
    return sum / values.length;
  };

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const orderByNodeIdForward = buildOrderIndex();
    ranksAsc.forEach((rank: number): void => {
      if (rank === ranksAsc[0]) return;
      const group = [...(groupsByRank.get(rank) ?? [])];
      group.sort((left: string, right: string) => {
        const leftBarycenter = resolveBarycenter(incoming.get(left) ?? [], orderByNodeIdForward);
        const rightBarycenter = resolveBarycenter(incoming.get(right) ?? [], orderByNodeIdForward);
        if (leftBarycenter !== null && rightBarycenter !== null && leftBarycenter !== rightBarycenter) {
          return leftBarycenter - rightBarycenter;
        }
        if (leftBarycenter !== null && rightBarycenter === null) return -1;
        if (leftBarycenter === null && rightBarycenter !== null) return 1;
        const labelDelta = (labelByNodeId.get(left) ?? '').localeCompare(labelByNodeId.get(right) ?? '');
        if (labelDelta !== 0) return labelDelta;
        return left.localeCompare(right);
      });
      groupsByRank.set(rank, group);
    });

    const orderByNodeIdBackward = buildOrderIndex();
    [...ranksAsc].reverse().forEach((rank: number): void => {
      if (rank === ranksAsc[ranksAsc.length - 1]) return;
      const group = [...(groupsByRank.get(rank) ?? [])];
      group.sort((left: string, right: string) => {
        const leftBarycenter = resolveBarycenter(outgoing.get(left) ?? [], orderByNodeIdBackward);
        const rightBarycenter = resolveBarycenter(outgoing.get(right) ?? [], orderByNodeIdBackward);
        if (leftBarycenter !== null && rightBarycenter !== null && leftBarycenter !== rightBarycenter) {
          return leftBarycenter - rightBarycenter;
        }
        if (leftBarycenter !== null && rightBarycenter === null) return -1;
        if (leftBarycenter === null && rightBarycenter !== null) return 1;
        const labelDelta = (labelByNodeId.get(left) ?? '').localeCompare(labelByNodeId.get(right) ?? '');
        if (labelDelta !== 0) return labelDelta;
        return left.localeCompare(right);
      });
      groupsByRank.set(rank, group);
    });
  }

  ranksAsc.forEach((rank: number): void => {
    const group = groupsByRank.get(rank) ?? [];
    group.forEach((nodeId: string, index: number): void => {
      positions.set(nodeId, {
        x: AUTO_LAYOUT_START_X + rank * AUTO_LAYOUT_COLUMN_GAP,
        y: AUTO_LAYOUT_START_Y + index * AUTO_LAYOUT_ROW_GAP,
      });
    });
  });

  return positions;
};

function CaseResolverRelationsWorkspaceInner(): React.JSX.Element {
  const {
    workspace,
    selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    onSelectFile,
    onSelectAsset,
    onSelectFolder,
    onRelationGraphChange,
  } = useCaseResolverPageContext();
  const relationGraph = workspace.relationGraph;

  const { nodes, edges } = useGraphState();
  const { updateNode, setEdges, addNode, removeNode, loadGraph } = useGraphActions();
  const { selectedNodeId, selectedEdgeId } = useSelectionState();
  const { selectNode, selectEdge } = useSelectionActions();
  const { viewportRef } = useCanvasRefs();
  const { setView } = useCanvasActions();
  const { view } = useCanvasState();
  const { toast } = useToast();

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isCreateRelationModalOpen, setIsCreateRelationModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<RelationInspectorTab>('node');
  const [nodeMetaState, setNodeMetaState] = useState<Record<string, CaseResolverRelationNodeMeta>>(
    relationGraph.nodeMeta ?? {}
  );
  const [edgeMetaState, setEdgeMetaState] = useState<Record<string, CaseResolverRelationEdgeMeta>>(
    relationGraph.edgeMeta ?? {}
  );
  const [newRelationFromNodeId, setNewRelationFromNodeId] = useState<string>('');
  const [newRelationToNodeId, setNewRelationToNodeId] = useState<string>('');
  const [newRelationType, setNewRelationType] = useState<CaseResolverRelationEdgeKind>('custom');
  const [newRelationLabel, setNewRelationLabel] = useState<string>('custom relation');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchEntityFilter, setSearchEntityFilter] = useState<SearchEntityFilter>('all');
  const [searchRelationFilter, setSearchRelationFilter] = useState<SearchRelationFilter>('all');
  const [pendingImportGraph, setPendingImportGraph] = useState<CaseResolverRelationGraph | null>(null);
  const [importMode, setImportMode] = useState<RelationImportMode>('merge');

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const fallbackTimestampRef = useRef<string>(new Date().toISOString());
  const lastLoadedHashRef = useRef<string>('');
  const lastEmittedHashRef = useRef<string>('');

  const relationGraphHash = useMemo(
    () => stableStringify(relationGraph),
    [relationGraph]
  );

  useEffect(() => {
    if (relationGraphHash === lastLoadedHashRef.current) return;
    loadGraph({
      nodes: relationGraph.nodes,
      edges: relationGraph.edges,
    });
    setNodeMetaState(relationGraph.nodeMeta ?? {});
    setEdgeMetaState(relationGraph.edgeMeta ?? {});
    lastLoadedHashRef.current = relationGraphHash;
    lastEmittedHashRef.current = relationGraphHash;
  }, [loadGraph, relationGraph, relationGraphHash]);

  const nodeMeta = useMemo(
    () => ensureRelationNodeMeta(nodes, nodeMetaState, fallbackTimestampRef.current),
    [nodeMetaState, nodes]
  );
  const edgeMeta = useMemo(
    () => ensureRelationEdgeMeta(edges, edgeMetaState, fallbackTimestampRef.current),
    [edgeMetaState, edges]
  );

  useEffect(() => {
    const nextGraph: CaseResolverRelationGraph = {
      nodes,
      edges,
      nodeMeta,
      edgeMeta,
    };
    const hash = stableStringify(nextGraph);
    if (hash === lastEmittedHashRef.current) return;
    lastEmittedHashRef.current = hash;
    onRelationGraphChange(nextGraph);
  }, [edgeMeta, edges, nodeMeta, nodes, onRelationGraphChange]);

  const selectedNode = useMemo(
    (): AiNode | null =>
      selectedNodeId
        ? nodes.find((node: AiNode): boolean => node.id === selectedNodeId) ?? null
        : null,
    [nodes, selectedNodeId]
  );

  const selectedEdge = useMemo(
    (): Edge | null =>
      selectedEdgeId
        ? edges.find((edge: Edge): boolean => edge.id === selectedEdgeId) ?? null
        : null,
    [edges, selectedEdgeId]
  );

  const selectedNodeMeta = selectedNode ? nodeMeta[selectedNode.id] ?? null : null;
  const selectedEdgeMeta = selectedEdge
    ? edgeMeta[selectedEdge.id] ?? DEFAULT_CASE_RESOLVER_RELATION_EDGE_META
    : DEFAULT_CASE_RESOLVER_RELATION_EDGE_META;

  const relationNodeOptions = useMemo(
    (): Array<{ value: string; label: string }> =>
      nodes
        .map((node: AiNode): { value: string; label: string } => {
          const meta = nodeMeta[node.id];
          const label = meta?.label?.trim() || node.title || node.id;
          const entityType = meta?.entityType ?? 'custom';
          return {
            value: node.id,
            label: `${label} [${entityType}]`,
          };
        })
        .sort((left, right) => left.label.localeCompare(right.label)),
    [nodeMeta, nodes]
  );

  const centerOnNode = React.useCallback(
    (nodeId: string): void => {
      const node = nodes.find((candidate: AiNode): boolean => candidate.id === nodeId);
      if (!node) return;
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return;
      setView({
        x: viewport.width / 2 - (node.position.x + NODE_WIDTH / 2) * view.scale,
        y: viewport.height / 2 - (node.position.y + NODE_MIN_HEIGHT / 2) * view.scale,
        scale: view.scale,
      });
    },
    [nodes, setView, view.scale, viewportRef]
  );

  const focusNode = React.useCallback(
    (nodeId: string): void => {
      selectNode(nodeId);
      centerOnNode(nodeId);
    },
    [centerOnNode, selectNode]
  );

  const focusEdge = React.useCallback(
    (edgeId: string): void => {
      const edge = edges.find((candidate: Edge): boolean => candidate.id === edgeId);
      if (!edge) return;
      selectEdge(edgeId);
      centerOnNode(edge.from);
    },
    [centerOnNode, edges, selectEdge]
  );

  useEffect(() => {
    if (selectedFileId) {
      const targetNodeId = toCaseResolverRelationCaseNodeId(selectedFileId);
      if (nodes.some((node: AiNode): boolean => node.id === targetNodeId)) {
        focusNode(targetNodeId);
      }
      return;
    }
    if (selectedAssetId) {
      const targetNodeId = toCaseResolverRelationAssetFileNodeId(selectedAssetId);
      if (nodes.some((node: AiNode): boolean => node.id === targetNodeId)) {
        focusNode(targetNodeId);
      }
      return;
    }
    if (selectedFolderPath !== null) {
      const targetNodeId = toCaseResolverRelationFolderNodeId(selectedFolderPath);
      if (nodes.some((node: AiNode): boolean => node.id === targetNodeId)) {
        focusNode(targetNodeId);
      }
    }
  }, [focusNode, nodes, selectedAssetId, selectedFileId, selectedFolderPath]);

  const addCustomNode = (): void => {
    const id = createCustomRelationNodeId();
    const index = nodes.length;
    const position = clampCanvasPosition({
      x: 1280 + (index % 2) * 220,
      y: 120 + Math.floor(index / 2) * 120,
    });
    const now = new Date().toISOString();

    addNode({
      id,
      type: 'template',
      title: `Custom Relation ${index + 1}`,
      description: 'Manual relation anchor',
      inputs: ['in'],
      outputs: ['out'],
      position,
      config: {
        template: {
          template: '',
        },
      },
    });
    setNodeMetaState((current: Record<string, CaseResolverRelationNodeMeta>) => ({
      ...current,
      [id]: {
        ...DEFAULT_CASE_RESOLVER_RELATION_NODE_META,
        entityType: 'custom',
        entityId: id,
        label: `Custom Relation ${index + 1}`,
        fileKind: null,
        folderPath: null,
        sourceFileId: null,
        isStructural: false,
        createdAt: now,
        updatedAt: now,
      },
    }));
    selectNode(id);
    toast('Custom relation node added.', { variant: 'success' });
  };

  const createManualRelation = (): void => {
    const from = newRelationFromNodeId.trim();
    const to = newRelationToNodeId.trim();
    if (!from || !to) {
      toast('Select both source and target nodes.', { variant: 'warning' });
      return;
    }
    if (from === to) {
      toast('Source and target must be different nodes.', { variant: 'warning' });
      return;
    }
    if (!nodes.some((node: AiNode): boolean => node.id === from)) {
      toast('Source node no longer exists.', { variant: 'warning' });
      return;
    }
    if (!nodes.some((node: AiNode): boolean => node.id === to)) {
      toast('Target node no longer exists.', { variant: 'warning' });
      return;
    }

    const relationLabel = newRelationLabel.trim() || 'custom relation';
    const hasDuplicate = edges.some((edge: Edge): boolean => {
      if (edge.from !== from || edge.to !== to) return false;
      const meta = edgeMeta[edge.id] ?? DEFAULT_CASE_RESOLVER_RELATION_EDGE_META;
      const relationType = meta.relationType ?? 'related';
      const label = (meta.label || edge.label || '').trim().toLowerCase();
      return relationType === newRelationType && label === relationLabel.toLowerCase();
    });
    if (hasDuplicate) {
      toast('An identical relation already exists.', { variant: 'info' });
      return;
    }

    const edgeId = createCustomRelationEdgeId();
    const now = new Date().toISOString();

    setEdges((prev: Edge[]): Edge[] => [
      ...prev,
      {
        id: edgeId,
        from,
        to,
        fromPort: 'out',
        toPort: 'in',
        label: relationLabel,
      },
    ]);

    setEdgeMetaState((prev: Record<string, CaseResolverRelationEdgeMeta>) => ({
      ...prev,
      [edgeId]: {
        ...DEFAULT_CASE_RESOLVER_RELATION_EDGE_META,
        relationType: newRelationType,
        label: relationLabel,
        isStructural: false,
        createdAt: now,
        updatedAt: now,
      },
    }));

    setIsCreateRelationModalOpen(false);
    setNewRelationLabel('custom relation');
    toast('Custom relation created.', { variant: 'success' });
  };

  const applyAutoLayout = (): void => {
    const nextPositions = buildAutoLayoutPositions(nodes, edges, nodeMeta);
    if (nextPositions.size === 0) {
      toast('No nodes available for layout.', { variant: 'info' });
      return;
    }
    const nextNodes = nodes.map((node: AiNode): AiNode => {
      const nextPosition = nextPositions.get(node.id);
      if (!nextPosition) return node;
      return {
        ...node,
        position: nextPosition,
      };
    });

    loadGraph({
      nodes: nextNodes,
      edges,
    });
    toast('Auto layout applied to relation graph.', { variant: 'success' });
  };

  const exportSnapshot = (): void => {
    const snapshot = {
      version: 1,
      exportedAt: new Date().toISOString(),
      relationGraph: {
        nodes,
        edges,
        nodeMeta,
        edgeMeta,
      },
    };

    const payload = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[.:]/g, '-');
    const filename = `case-resolver-relations-${timestamp}.json`;

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);

    toast('Relation snapshot exported.', { variant: 'success' });
  };

  const triggerImportSelection = (): void => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    const text = await file.text();
    const parsedGraph = parseImportedRelationGraph(text);
    if (!parsedGraph) {
      toast('Invalid relation snapshot format.', { variant: 'error' });
      return;
    }

    setPendingImportGraph(parsedGraph);
    setImportMode('merge');
    setIsImportModalOpen(true);
  };

  const applyImportSnapshot = (): void => {
    if (!pendingImportGraph) return;

    const fallbackTimestamp = new Date().toISOString();
    const importedNodeMeta = ensureRelationNodeMeta(
      pendingImportGraph.nodes,
      pendingImportGraph.nodeMeta,
      fallbackTimestamp
    );
    const importedEdgeMeta = ensureRelationEdgeMeta(
      pendingImportGraph.edges,
      pendingImportGraph.edgeMeta,
      fallbackTimestamp
    );

    if (importMode === 'replace') {
      loadGraph({
        nodes: pendingImportGraph.nodes,
        edges: pendingImportGraph.edges,
      });
      setNodeMetaState(importedNodeMeta);
      setEdgeMetaState(importedEdgeMeta);
      setIsImportModalOpen(false);
      setPendingImportGraph(null);
      toast('Relation snapshot imported (replace mode).', { variant: 'success' });
      return;
    }

    const currentNodeMeta = ensureRelationNodeMeta(nodes, nodeMetaState, fallbackTimestamp);
    const currentEdgeMeta = ensureRelationEdgeMeta(edges, edgeMetaState, fallbackTimestamp);

    const nextNodesById = new Map<string, AiNode>(nodes.map((node: AiNode): [string, AiNode] => [node.id, node]));
    const nextNodeMeta: Record<string, CaseResolverRelationNodeMeta> = { ...currentNodeMeta };
    let importedNodeCount = 0;
    let skippedStructuralNodeCount = 0;

    pendingImportGraph.nodes.forEach((node: AiNode): void => {
      const importedMeta = importedNodeMeta[node.id];
      if (importedMeta?.isStructural) {
        skippedStructuralNodeCount += 1;
        return;
      }
      const existingMeta = currentNodeMeta[node.id];
      if (existingMeta?.isStructural) return;

      nextNodesById.set(node.id, node);
      const resolvedImportedMeta = importedMeta ?? {
        ...DEFAULT_CASE_RESOLVER_RELATION_NODE_META,
        entityType: 'custom' as const,
        entityId: node.id,
        label: node.title || node.id,
        fileKind: null,
        folderPath: null,
        sourceFileId: null,
        isStructural: false,
        createdAt: fallbackTimestamp,
        updatedAt: fallbackTimestamp,
      };
      nextNodeMeta[node.id] = {
        ...resolvedImportedMeta,
        isStructural: false,
        updatedAt: fallbackTimestamp,
      };
      importedNodeCount += 1;
    });

    const nextNodes = Array.from(nextNodesById.values());
    const nextNodeIdSet = new Set(nextNodes.map((node: AiNode): string => node.id));
    Object.keys(nextNodeMeta).forEach((nodeId: string): void => {
      if (!nextNodeIdSet.has(nodeId)) {
        delete nextNodeMeta[nodeId];
      }
    });

    const nextEdgesById = new Map<string, Edge>(edges.map((edge: Edge): [string, Edge] => [edge.id, edge]));
    const nextEdgeMeta: Record<string, CaseResolverRelationEdgeMeta> = { ...currentEdgeMeta };
    let importedEdgeCount = 0;
    let skippedStructuralEdgeCount = 0;

    pendingImportGraph.edges.forEach((edge: Edge): void => {
      const importedMeta = importedEdgeMeta[edge.id];
      if (importedMeta?.isStructural) {
        skippedStructuralEdgeCount += 1;
        return;
      }
      const existingMeta = currentEdgeMeta[edge.id];
      if (existingMeta?.isStructural) return;
      if (!nextNodeIdSet.has(edge.from) || !nextNodeIdSet.has(edge.to)) return;

      const existingEdge = nextEdgesById.get(edge.id);
      let targetEdgeId = edge.id;
      if (
        existingEdge &&
        (existingEdge.from !== edge.from || existingEdge.to !== edge.to)
      ) {
        do {
          targetEdgeId = createCustomRelationEdgeId();
        } while (nextEdgesById.has(targetEdgeId));
      }

      nextEdgesById.set(targetEdgeId, {
        ...edge,
        id: targetEdgeId,
        fromPort: edge.fromPort ?? 'out',
        toPort: edge.toPort ?? 'in',
      });

      const resolvedImportedMeta = importedMeta ?? {
        ...DEFAULT_CASE_RESOLVER_RELATION_EDGE_META,
        relationType: 'custom' as const,
        label: edge.label ?? 'custom relation',
        isStructural: false,
        createdAt: fallbackTimestamp,
        updatedAt: fallbackTimestamp,
      };
      nextEdgeMeta[targetEdgeId] = {
        ...resolvedImportedMeta,
        isStructural: false,
        updatedAt: fallbackTimestamp,
      };
      importedEdgeCount += 1;
    });

    const nextEdges: Edge[] = [];
    const nextEdgeIdSet = new Set<string>();
    nextEdgesById.forEach((edge: Edge): void => {
      if (!nextNodeIdSet.has(edge.from) || !nextNodeIdSet.has(edge.to)) return;
      nextEdges.push(edge);
      nextEdgeIdSet.add(edge.id);
    });

    Object.keys(nextEdgeMeta).forEach((edgeId: string): void => {
      if (!nextEdgeIdSet.has(edgeId)) {
        delete nextEdgeMeta[edgeId];
      }
    });

    loadGraph({
      nodes: nextNodes,
      edges: nextEdges,
    });
    setNodeMetaState(nextNodeMeta);
    setEdgeMetaState(nextEdgeMeta);
    setIsImportModalOpen(false);
    setPendingImportGraph(null);
    if (skippedStructuralNodeCount > 0 || skippedStructuralEdgeCount > 0) {
      toast(
        `Relation snapshot merged (${importedNodeCount} nodes, ${importedEdgeCount} links). Skipped structural: ${skippedStructuralNodeCount} nodes, ${skippedStructuralEdgeCount} links.`,
        { variant: 'success' }
      );
      return;
    }
    toast(`Relation snapshot merged (${importedNodeCount} nodes, ${importedEdgeCount} links).`, {
      variant: 'success',
    });
  };

  const updateSelectedEdgeMeta = (
    patch: Partial<Pick<CaseResolverRelationEdgeMeta, 'relationType' | 'label'>>
  ): void => {
    if (!selectedEdge) return;
    const current = edgeMeta[selectedEdge.id] ?? {
      ...DEFAULT_CASE_RESOLVER_RELATION_EDGE_META,
      relationType: 'related' as const,
    };
    if (current.isStructural) {
      toast('Structural relations are managed automatically.', { variant: 'info' });
      return;
    }
    const now = new Date().toISOString();
    const nextLabel = patch.label ?? current.label;
    setEdgeMetaState((prev: Record<string, CaseResolverRelationEdgeMeta>) => ({
      ...prev,
      [selectedEdge.id]: {
        ...current,
        ...patch,
        label: nextLabel,
        createdAt: current.createdAt || now,
        updatedAt: now,
      },
    }));
    setEdges((prev: Edge[]) =>
      prev.map((edge: Edge): Edge =>
        edge.id === selectedEdge.id
          ? {
            ...edge,
            label: nextLabel,
          }
          : edge
      )
    );
  };

  const deleteSelectedCustomNode = (): void => {
    if (!selectedNode || !selectedNodeMeta) return;
    if (selectedNodeMeta.isStructural) {
      toast('Structural nodes cannot be removed directly.', { variant: 'info' });
      return;
    }
    const connectedEdgeIds = new Set(
      edges
        .filter((edge: Edge): boolean => edge.from === selectedNode.id || edge.to === selectedNode.id)
        .map((edge: Edge): string => edge.id)
    );
    removeNode(selectedNode.id);
    setNodeMetaState((prev: Record<string, CaseResolverRelationNodeMeta>) => {
      const next = { ...prev };
      delete next[selectedNode.id];
      return next;
    });
    if (connectedEdgeIds.size > 0) {
      setEdgeMetaState((prev: Record<string, CaseResolverRelationEdgeMeta>) => {
        const next = { ...prev };
        connectedEdgeIds.forEach((edgeId: string): void => {
          delete next[edgeId];
        });
        return next;
      });
    }
    toast('Custom node removed.', { variant: 'success' });
  };

  const deleteSelectedCustomEdge = (): void => {
    if (!selectedEdge) return;
    const meta = edgeMeta[selectedEdge.id];
    if (meta?.isStructural) {
      toast('Structural links cannot be removed directly.', { variant: 'info' });
      return;
    }
    setEdges((prev: Edge[]): Edge[] => prev.filter((edge: Edge): boolean => edge.id !== selectedEdge.id));
    setEdgeMetaState((prev: Record<string, CaseResolverRelationEdgeMeta>) => {
      const next = { ...prev };
      delete next[selectedEdge.id];
      return next;
    });
    toast('Custom link removed.', { variant: 'success' });
  };

  const updateSelectedNodeLabel = (nextLabel: string): void => {
    if (!selectedNode || !selectedNodeMeta) return;
    if (selectedNodeMeta.isStructural) {
      toast('Structural node labels are generated automatically.', { variant: 'info' });
      return;
    }
    const normalized = nextLabel.trim();
    const now = new Date().toISOString();
    setNodeMetaState((prev: Record<string, CaseResolverRelationNodeMeta>) => ({
      ...prev,
      [selectedNode.id]: {
        ...selectedNodeMeta,
        label: normalized || selectedNodeMeta.label,
        updatedAt: now,
      },
    }));
    updateNode(selectedNode.id, {
      title: normalized || selectedNode.title,
    });
  };

  const openSelectedNodeEntity = (): void => {
    if (!selectedNodeMeta) return;
    if (selectedNodeMeta.entityType === 'case' && selectedNodeMeta.sourceFileId) {
      onSelectFile(selectedNodeMeta.sourceFileId);
      return;
    }
    if (selectedNodeMeta.entityType === 'folder' && selectedNodeMeta.folderPath !== null) {
      onSelectFolder(selectedNodeMeta.folderPath);
      return;
    }
    if (
      selectedNodeMeta.entityType === 'file' &&
      selectedNodeMeta.sourceFileId &&
      selectedNodeMeta.fileKind === 'case_file'
    ) {
      onSelectFile(selectedNodeMeta.sourceFileId);
      return;
    }
    if (
      selectedNodeMeta.entityType === 'file' &&
      selectedNodeMeta.sourceFileId &&
      selectedNodeMeta.fileKind === 'asset_file'
    ) {
      onSelectAsset(selectedNodeMeta.sourceFileId);
      return;
    }
    toast('This node is not mapped to a selectable entity.', { variant: 'info' });
  };

  const normalizedSearch = useMemo(
    (): string => searchQuery.trim().toLowerCase(),
    [searchQuery]
  );

  const filteredNodes = useMemo((): AiNode[] => {
    return nodes.filter((node: AiNode): boolean => {
      const meta = nodeMeta[node.id] ?? DEFAULT_CASE_RESOLVER_RELATION_NODE_META;
      if (searchEntityFilter !== 'all' && meta.entityType !== searchEntityFilter) return false;

      if (searchRelationFilter !== 'all') {
        const hasRelationType = edges.some((edge: Edge): boolean => {
          if (edge.from !== node.id && edge.to !== node.id) return false;
          const edgeRelationType = edgeMeta[edge.id]?.relationType ?? 'related';
          return edgeRelationType === searchRelationFilter;
        });
        if (!hasRelationType) return false;
      }

      if (!normalizedSearch) return true;
      const searchSource = [
        node.title,
        node.description,
        meta.label,
        meta.entityId,
        meta.folderPath ?? '',
        meta.sourceFileId ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return searchSource.includes(normalizedSearch);
    });
  }, [edgeMeta, edges, nodeMeta, nodes, normalizedSearch, searchEntityFilter, searchRelationFilter]);

  const filteredNodeIdSet = useMemo(
    () => new Set(filteredNodes.map((node: AiNode): string => node.id)),
    [filteredNodes]
  );

  const filteredEdges = useMemo((): Edge[] => {
    return edges.filter((edge: Edge): boolean => {
      const meta = edgeMeta[edge.id] ?? DEFAULT_CASE_RESOLVER_RELATION_EDGE_META;
      if (searchRelationFilter !== 'all' && meta.relationType !== searchRelationFilter) return false;

      if (searchEntityFilter !== 'all') {
        const fromType = nodeMeta[edge.from]?.entityType ?? 'custom';
        const toType = nodeMeta[edge.to]?.entityType ?? 'custom';
        if (fromType !== searchEntityFilter && toType !== searchEntityFilter) return false;
      }

      if (!normalizedSearch) {
        if (searchEntityFilter === 'all' && searchRelationFilter === 'all') return true;
        return filteredNodeIdSet.has(edge.from) || filteredNodeIdSet.has(edge.to);
      }

      const fromLabel = nodeMeta[edge.from]?.label ?? edge.from;
      const toLabel = nodeMeta[edge.to]?.label ?? edge.to;
      const searchSource = [
        edge.label ?? '',
        meta.label,
        meta.relationType,
        fromLabel,
        toLabel,
        edge.from,
        edge.to,
      ]
        .join(' ')
        .toLowerCase();
      return searchSource.includes(normalizedSearch);
    });
  }, [
    edgeMeta,
    edges,
    filteredNodeIdSet,
    nodeMeta,
    normalizedSearch,
    searchEntityFilter,
    searchRelationFilter,
  ]);

  const nodeCountByType = useMemo(() => {
    const counts: Record<string, number> = {
      case: 0,
      folder: 0,
      file: 0,
      custom: 0,
    };
    Object.values(nodeMeta).forEach((meta: CaseResolverRelationNodeMeta): void => {
      counts[meta.entityType] = (counts[meta.entityType] ?? 0) + 1;
    });
    return counts;
  }, [nodeMeta]);

  return (
    <div className='h-[calc(100vh-120px)] w-full'>
      <input
        ref={importInputRef}
        type='file'
        accept='.json,application/json'
        className='hidden'
        onChange={(event): void => {
          void handleImportFileChange(event);
        }}
      />

      <div className='flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40'>
        <div className='flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3'>
          <Button
            type='button'
            onClick={addCustomNode}
            className='h-8 rounded-md border border-emerald-500/40 text-xs text-emerald-100 hover:bg-emerald-500/15'
          >
            <Plus className='mr-1 size-3.5' />
            Custom Node
          </Button>

          <Button
            type='button'
            onClick={(): void => {
              const defaultFrom = selectedNodeId ?? relationNodeOptions[0]?.value ?? '';
              const defaultTo =
                relationNodeOptions.find((option) => option.value !== defaultFrom)?.value ?? defaultFrom;
              setNewRelationFromNodeId(defaultFrom);
              setNewRelationToNodeId(defaultTo);
              setNewRelationType('custom');
              setNewRelationLabel('custom relation');
              setIsCreateRelationModalOpen(true);
            }}
            className='h-8 rounded-md border border-cyan-500/40 text-xs text-cyan-100 hover:bg-cyan-500/15'
          >
            <Link2 className='mr-1 size-3.5' />
            Create Relation
          </Button>

          <Button
            type='button'
            onClick={applyAutoLayout}
            className='h-8 rounded-md border border-sky-500/40 text-xs text-sky-100 hover:bg-sky-500/15'
          >
            <Network className='mr-1 size-3.5' />
            Auto Layout
          </Button>

          <Button
            type='button'
            onClick={(): void => {
              setIsSearchModalOpen(true);
            }}
            className='h-8 rounded-md border border-violet-500/40 text-xs text-violet-100 hover:bg-violet-500/15'
          >
            <Filter className='mr-1 size-3.5' />
            Search & Filter
          </Button>

          <Button
            type='button'
            onClick={exportSnapshot}
            className='h-8 rounded-md border border-amber-500/40 text-xs text-amber-100 hover:bg-amber-500/15'
          >
            <Download className='mr-1 size-3.5' />
            Export
          </Button>

          <Button
            type='button'
            onClick={triggerImportSelection}
            className='h-8 rounded-md border border-amber-500/40 text-xs text-amber-100 hover:bg-amber-500/15'
          >
            <Upload className='mr-1 size-3.5' />
            Import
          </Button>

          <Button
            type='button'
            onClick={(): void => {
              setInspectorTab(selectedEdge ? 'edge' : 'node');
              setIsInspectorOpen(true);
            }}
            className='h-8 rounded-md border border-border text-xs text-gray-100 hover:bg-muted/60'
          >
            <GitBranch className='mr-1 size-3.5' />
            Relation Inspector
          </Button>

          <div className='ml-auto flex items-center gap-4 text-[11px] text-gray-400'>
            <span className='inline-flex items-center gap-1'>
              <Network className='size-3.5 text-cyan-300' />
              Cases: {nodeCountByType['case'] ?? 0}
            </span>
            <span className='inline-flex items-center gap-1'>
              <Network className='size-3.5 text-indigo-300' />
              Folders: {nodeCountByType['folder'] ?? 0}
            </span>
            <span className='inline-flex items-center gap-1'>
              <Link2 className='size-3.5 text-amber-300' />
              Files: {nodeCountByType['file'] ?? 0}
            </span>
            <span className='inline-flex items-center gap-1'>
              <Save className='size-3.5 text-emerald-300' />
              Links: {edges.length}
            </span>
          </div>
        </div>

        <div className='min-h-0 flex-1'>
          <CanvasBoard />
        </div>
      </div>

      <AppModal
        open={isInspectorOpen}
        onOpenChange={(open: boolean): void => {
          setIsInspectorOpen(open);
        }}
        title='Case Relation Inspector'
        subtitle='Inspect structural links and define custom cross-case / file links.'
        size='xl'
      >
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-2'>
            <Button
              type='button'
              className={`h-8 rounded-md border text-xs ${
                inspectorTab === 'node'
                  ? 'border-cyan-400/60 text-cyan-100 bg-cyan-500/15'
                  : 'border-border text-gray-200 hover:bg-muted/60'
              }`}
              onClick={(): void => {
                setInspectorTab('node');
              }}
            >
              Node
            </Button>
            <Button
              type='button'
              className={`h-8 rounded-md border text-xs ${
                inspectorTab === 'edge'
                  ? 'border-cyan-400/60 text-cyan-100 bg-cyan-500/15'
                  : 'border-border text-gray-200 hover:bg-muted/60'
              }`}
              onClick={(): void => {
                setInspectorTab('edge');
              }}
            >
              Link
            </Button>
          </div>

          {inspectorTab === 'node' ? (
            selectedNode && selectedNodeMeta ? (
              <div className='space-y-3'>
                <div className='rounded border border-border/60 bg-card/30 p-3 text-xs text-gray-300'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-gray-500'>Node</span>
                    <span className='font-medium text-gray-100'>{selectedNode.title}</span>
                  </div>
                  <div className='mt-1 flex items-center justify-between gap-2'>
                    <span className='text-gray-500'>Entity Type</span>
                    <span className='uppercase text-[10px] text-gray-200'>{selectedNodeMeta.entityType}</span>
                  </div>
                  <div className='mt-1 flex items-center justify-between gap-2'>
                    <span className='text-gray-500'>Entity ID</span>
                    <span className='truncate text-[11px] text-gray-200'>{selectedNodeMeta.entityId}</span>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-400'>Label</Label>
                  <Input
                    value={selectedNodeMeta.label}
                    disabled={selectedNodeMeta.isStructural}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      updateSelectedNodeLabel(event.target.value);
                    }}
                    className='h-8 border-border bg-card/60 text-xs text-white'
                  />
                  {selectedNodeMeta.isStructural ? (
                    <div className='text-[11px] text-gray-500'>
                      Structural node labels are auto-generated from workspace data.
                    </div>
                  ) : null}
                </div>

                <div className='grid grid-cols-2 gap-2 text-[11px] text-gray-400'>
                  <div className='rounded border border-border/50 bg-card/20 px-2 py-1.5'>
                    Created: {selectedNodeMeta.createdAt || '-'}
                  </div>
                  <div className='rounded border border-border/50 bg-card/20 px-2 py-1.5'>
                    Updated: {selectedNodeMeta.updatedAt || '-'}
                  </div>
                </div>

                <Button
                  type='button'
                  className='h-8 rounded-md border border-border text-xs text-gray-100 hover:bg-muted/60'
                  onClick={openSelectedNodeEntity}
                >
                  Open Linked Entity
                </Button>
                {!selectedNodeMeta.isStructural ? (
                  <Button
                    type='button'
                    className='h-8 rounded-md border border-red-500/50 text-xs text-red-100 hover:bg-red-500/15'
                    onClick={deleteSelectedCustomNode}
                  >
                    <Trash2 className='mr-1 size-3.5' />
                    Remove Custom Node
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className='rounded border border-dashed border-border/60 px-3 py-2 text-xs text-gray-500'>
                Select a node in the relation map.
              </div>
            )
          ) : selectedEdge ? (
            <div className='space-y-3'>
              <div className='rounded border border-border/60 bg-card/30 p-3 text-xs text-gray-300'>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-gray-500'>From</span>
                  <span className='truncate text-gray-100'>{selectedEdge.from}</span>
                </div>
                <div className='mt-1 flex items-center justify-between gap-2'>
                  <span className='text-gray-500'>To</span>
                  <span className='truncate text-gray-100'>{selectedEdge.to}</span>
                </div>
              </div>

              <div className='space-y-2'>
                <Label className='text-xs text-gray-400'>Relation Type</Label>
                <SelectSimple
                  size='sm'
                  value={selectedEdgeMeta.relationType}
                  onValueChange={(value: string): void => {
                    const allowed = CASE_RESOLVER_RELATION_EDGE_KIND_OPTIONS.find(
                      (option): boolean => option.value === value
                    );
                    if (!allowed) return;
                    updateSelectedEdgeMeta({ relationType: allowed.value });
                  }}
                  options={CASE_RESOLVER_RELATION_EDGE_KIND_OPTIONS}
                  triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
                  disabled={selectedEdgeMeta.isStructural}
                />
              </div>

              <div className='space-y-2'>
                <Label className='text-xs text-gray-400'>Relation Label</Label>
                <Input
                  value={selectedEdgeMeta.label ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    updateSelectedEdgeMeta({ label: event.target.value });
                  }}
                  disabled={selectedEdgeMeta.isStructural}
                  className='h-8 border-border bg-card/60 text-xs text-white'
                />
              </div>

              {selectedEdgeMeta.isStructural ? (
                <div className='rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-100'>
                  Structural relation generated from current Case Resolver hierarchy.
                </div>
              ) : null}

              <div className='grid grid-cols-2 gap-2 text-[11px] text-gray-400'>
                <div className='rounded border border-border/50 bg-card/20 px-2 py-1.5'>
                  Created: {selectedEdgeMeta.createdAt || '-'}
                </div>
                <div className='rounded border border-border/50 bg-card/20 px-2 py-1.5'>
                  Updated: {selectedEdgeMeta.updatedAt || '-'}
                </div>
              </div>
              {!selectedEdgeMeta.isStructural ? (
                <Button
                  type='button'
                  className='h-8 rounded-md border border-red-500/50 text-xs text-red-100 hover:bg-red-500/15'
                  onClick={deleteSelectedCustomEdge}
                >
                  <Trash2 className='mr-1 size-3.5' />
                  Remove Custom Link
                </Button>
              ) : null}
            </div>
          ) : (
            <div className='rounded border border-dashed border-border/60 px-3 py-2 text-xs text-gray-500'>
              Select a link in the relation map.
            </div>
          )}
        </div>
      </AppModal>

      <AppModal
        open={isCreateRelationModalOpen}
        onOpenChange={(open: boolean): void => {
          setIsCreateRelationModalOpen(open);
        }}
        title='Create Custom Relation'
        subtitle='Create an explicit link between any two nodes in the relation map.'
        size='lg'
      >
        <div className='space-y-3'>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>From Node</Label>
            <SelectSimple
              size='sm'
              value={newRelationFromNodeId}
              onValueChange={(value: string): void => {
                setNewRelationFromNodeId(value);
              }}
              options={relationNodeOptions}
              triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>To Node</Label>
            <SelectSimple
              size='sm'
              value={newRelationToNodeId}
              onValueChange={(value: string): void => {
                setNewRelationToNodeId(value);
              }}
              options={relationNodeOptions}
              triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Relation Type</Label>
            <SelectSimple
              size='sm'
              value={newRelationType}
              onValueChange={(value: string): void => {
                const option = CASE_RESOLVER_RELATION_EDGE_KIND_OPTIONS.find(
                  (candidate): boolean => candidate.value === value
                );
                if (!option) return;
                setNewRelationType(option.value);
              }}
              options={CASE_RESOLVER_RELATION_EDGE_KIND_OPTIONS}
              triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Label</Label>
            <Input
              value={newRelationLabel}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setNewRelationLabel(event.target.value);
              }}
              className='h-8 border-border bg-card/60 text-xs text-white'
            />
          </div>

          <div className='flex justify-end gap-2 pt-1'>
            <Button
              type='button'
              variant='outline'
              onClick={(): void => {
                setIsCreateRelationModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type='button' onClick={createManualRelation}>
              Create Relation
            </Button>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={isSearchModalOpen}
        onOpenChange={(open: boolean): void => {
          setIsSearchModalOpen(open);
        }}
        title='Relation Search & Filter'
        subtitle='Find nodes and links by entity type, relation type, and free-text query.'
        size='xl'
      >
        <div className='space-y-3'>
          <div className='grid grid-cols-1 gap-2 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label className='text-xs text-gray-400'>Search</Label>
              <Input
                value={searchQuery}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setSearchQuery(event.target.value);
                }}
                className='h-8 border-border bg-card/60 text-xs text-white'
                placeholder='Case name, folder path, relation label...'
              />
            </div>
            <div className='space-y-2'>
              <Label className='text-xs text-gray-400'>Entity Type</Label>
              <SelectSimple
                size='sm'
                value={searchEntityFilter}
                onValueChange={(value: string): void => {
                  if (
                    value === 'all' ||
                    value === 'case' ||
                    value === 'folder' ||
                    value === 'file' ||
                    value === 'custom'
                  ) {
                    setSearchEntityFilter(value);
                  }
                }}
                options={[
                  { value: 'all', label: 'All entities' },
                  { value: 'case', label: 'Cases' },
                  { value: 'folder', label: 'Folders' },
                  { value: 'file', label: 'Files' },
                  { value: 'custom', label: 'Custom' },
                ]}
                triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
              />
            </div>
            <div className='space-y-2'>
              <Label className='text-xs text-gray-400'>Relation Type</Label>
              <SelectSimple
                size='sm'
                value={searchRelationFilter}
                onValueChange={(value: string): void => {
                  if (value === 'all') {
                    setSearchRelationFilter('all');
                    return;
                  }
                  const option = CASE_RESOLVER_RELATION_EDGE_KIND_OPTIONS.find(
                    (candidate): boolean => candidate.value === value
                  );
                  if (!option) return;
                  setSearchRelationFilter(option.value);
                }}
                options={[
                  { value: 'all', label: 'All relations' },
                  ...CASE_RESOLVER_RELATION_EDGE_KIND_OPTIONS,
                ]}
                triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-2 text-[11px] text-gray-400'>
            <div className='rounded border border-border/50 bg-card/20 px-2 py-1.5'>
              Matching nodes: {filteredNodes.length}
            </div>
            <div className='rounded border border-border/50 bg-card/20 px-2 py-1.5'>
              Matching links: {filteredEdges.length}
            </div>
          </div>

          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label className='text-xs text-gray-400'>Nodes</Label>
              <div className='max-h-64 overflow-auto rounded border border-border/60 bg-card/30 p-2'>
                {filteredNodes.length > 0 ? (
                  filteredNodes.slice(0, 200).map((node: AiNode) => {
                    const meta = nodeMeta[node.id] ?? DEFAULT_CASE_RESOLVER_RELATION_NODE_META;
                    return (
                      <div key={node.id} className='mb-2 rounded border border-border/40 bg-card/30 p-2 last:mb-0'>
                        <div className='flex items-center justify-between gap-2'>
                          <div className='min-w-0'>
                            <div className='truncate text-xs text-gray-100'>
                              {meta.label || node.title || node.id}
                            </div>
                            <div className='text-[11px] text-gray-500'>
                              {meta.entityType} · {node.id}
                            </div>
                          </div>
                          <Button
                            type='button'
                            size='sm'
                            className='h-7 rounded border border-border text-[11px] text-gray-100 hover:bg-muted/60'
                            onClick={(): void => {
                              focusNode(node.id);
                              setIsSearchModalOpen(false);
                            }}
                          >
                            Focus
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className='text-xs text-gray-500'>No matching nodes.</div>
                )}
                {filteredNodes.length > 200 ? (
                  <div className='mt-2 text-[11px] text-gray-500'>Showing first 200 nodes.</div>
                ) : null}
              </div>
            </div>

            <div className='space-y-2'>
              <Label className='text-xs text-gray-400'>Links</Label>
              <div className='max-h-64 overflow-auto rounded border border-border/60 bg-card/30 p-2'>
                {filteredEdges.length > 0 ? (
                  filteredEdges.slice(0, 200).map((edge: Edge) => {
                    const meta = edgeMeta[edge.id] ?? DEFAULT_CASE_RESOLVER_RELATION_EDGE_META;
                    const fromLabel = nodeMeta[edge.from]?.label ?? edge.from;
                    const toLabel = nodeMeta[edge.to]?.label ?? edge.to;
                    return (
                      <div key={edge.id} className='mb-2 rounded border border-border/40 bg-card/30 p-2 last:mb-0'>
                        <div className='flex items-center justify-between gap-2'>
                          <div className='min-w-0'>
                            <div className='truncate text-xs text-gray-100'>
                              {meta.label || edge.label || '(unnamed relation)'}
                            </div>
                            <div className='text-[11px] text-gray-500'>
                              {meta.relationType} · {fromLabel} → {toLabel}
                            </div>
                          </div>
                          <Button
                            type='button'
                            size='sm'
                            className='h-7 rounded border border-border text-[11px] text-gray-100 hover:bg-muted/60'
                            onClick={(): void => {
                              focusEdge(edge.id);
                              setIsSearchModalOpen(false);
                            }}
                          >
                            Focus
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className='text-xs text-gray-500'>No matching links.</div>
                )}
                {filteredEdges.length > 200 ? (
                  <div className='mt-2 text-[11px] text-gray-500'>Showing first 200 links.</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={isImportModalOpen}
        onOpenChange={(open: boolean): void => {
          setIsImportModalOpen(open);
          if (!open) {
            setPendingImportGraph(null);
          }
        }}
        title='Import Relation Snapshot'
        subtitle='Choose whether to merge incoming custom links or replace current relation graph state.'
        size='lg'
      >
        {pendingImportGraph ? (
          <div className='space-y-3'>
            <div className='grid grid-cols-2 gap-2 text-[11px] text-gray-400'>
              <div className='rounded border border-border/50 bg-card/20 px-2 py-1.5'>
                Nodes in snapshot: {pendingImportGraph.nodes.length}
              </div>
              <div className='rounded border border-border/50 bg-card/20 px-2 py-1.5'>
                Links in snapshot: {pendingImportGraph.edges.length}
              </div>
            </div>

            <div className='space-y-2'>
              <Label className='text-xs text-gray-400'>Import Mode</Label>
              <SelectSimple
                size='sm'
                value={importMode}
                onValueChange={(value: string): void => {
                  if (value === 'merge' || value === 'replace') {
                    setImportMode(value);
                  }
                }}
                options={[
                  { value: 'merge', label: 'Merge (recommended)' },
                  { value: 'replace', label: 'Replace graph' },
                ]}
                triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
              />
              <div className='text-[11px] text-gray-500'>
                Merge keeps existing structural links and imports custom relations. Replace loads the snapshot as-is; structural relations are rebuilt automatically on save.
              </div>
            </div>

            <div className='flex justify-end gap-2 pt-1'>
              <Button
                type='button'
                variant='outline'
                onClick={(): void => {
                  setIsImportModalOpen(false);
                  setPendingImportGraph(null);
                }}
              >
                Cancel
              </Button>
              <Button type='button' onClick={applyImportSnapshot}>
                Apply Import
              </Button>
            </div>
          </div>
        ) : (
          <div className='text-xs text-gray-500'>No snapshot selected.</div>
        )}
      </AppModal>
    </div>
  );
}

export function CaseResolverRelationsWorkspace(): React.JSX.Element {
  const { workspace } = useCaseResolverPageContext();

  return (
    <AiPathsProvider
      key='case-resolver-relations-workspace'
      initialNodes={workspace.relationGraph.nodes}
      initialEdges={workspace.relationGraph.edges}
      initialLoading={false}
      initialRuntimeState={{
        inputs: {},
        outputs: {},
        history: {},
      }}
    >
      <CaseResolverRelationsWorkspaceInner />
    </AiPathsProvider>
  );
}
