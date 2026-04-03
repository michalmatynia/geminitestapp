import type { AiNode, CaseResolverEdge } from '@/shared/contracts/case-resolver';
import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverRelationEdgeMeta,
  CaseResolverRelationGraph,
  CaseResolverRelationNodeMeta,
} from '@/shared/contracts/case-resolver';
import { typeStyles } from '@/shared/lib/ai-paths/core/constants';
import { isObjectRecord } from '@/shared/utils/object-utils';

import { parseCanonicalCaseResolverEdge } from '../settings.edge-validation';

const isCaseResolverFile = (value: unknown): value is CaseResolverFile =>
  isObjectRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['name'] === 'string' &&
  typeof value['fileType'] === 'string' &&
  typeof value['folder'] === 'string';

const isCaseResolverAssetFile = (value: unknown): value is CaseResolverAssetFile =>
  isObjectRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['name'] === 'string' &&
  typeof value['folder'] === 'string' &&
  typeof value['kind'] === 'string';

const readWorkspaceFolders = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry: unknown): entry is string => typeof entry === 'string')
    : [];

const readWorkspaceFiles = (value: unknown): CaseResolverFile[] =>
  Array.isArray(value) ? value.filter(isCaseResolverFile) : [];

const readWorkspaceAssets = (value: unknown): CaseResolverAssetFile[] =>
  Array.isArray(value) ? value.filter(isCaseResolverAssetFile) : [];

export const readWorkspaceSnapshot = (
  workspace: unknown
): {
  relationGraphSource: unknown;
  folders: string[];
  files: CaseResolverFile[];
  assets: CaseResolverAssetFile[];
} => {
  if (!isObjectRecord(workspace)) {
    return {
      relationGraphSource: {},
      folders: [],
      files: [],
      assets: [],
    };
  }
  return {
    relationGraphSource: workspace['relationGraph'],
    folders: readWorkspaceFolders(workspace['folders']),
    files: readWorkspaceFiles(workspace['files']),
    assets: readWorkspaceAssets(workspace['assets']),
  };
};

const hasKnownNodeType = (value: string): value is AiNode['type'] =>
  Object.prototype.hasOwnProperty.call(typeStyles, value);

const normalizeFocusedCaseId = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized || null;
};

export const resolveFocusedCaseId = (
  activeFileId: string | null | undefined,
  activeCaseId: string | null | undefined
): string | null => normalizeFocusedCaseId(activeFileId) ?? normalizeFocusedCaseId(activeCaseId);

const readRuntimePorts = (value: unknown, fallbackPort: string): string[] => {
  const ports = Array.isArray(value)
    ? value.filter((port: unknown): port is string => typeof port === 'string' && port.trim().length > 0)
    : [];
  return ports.length > 0 ? ports : [fallbackPort];
};

const readRuntimeNodeCoordinate = (
  positionRecord: Record<string, unknown>,
  key: 'x' | 'y'
): number => {
  const value = positionRecord[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

const toRuntimeNode = (node: CaseResolverRelationGraph['nodes'][number]): AiNode | null => {
  if (!isObjectRecord(node)) return null;
  const id = typeof node['id'] === 'string' ? node['id'].trim() : '';
  if (!id) return null;
  const title = typeof node['title'] === 'string' ? node['title'] : id;
  const description = typeof node['description'] === 'string' ? node['description'] : '';
  const rawType = typeof node['type'] === 'string' ? node['type'].trim() : '';
  const type = rawType && hasKnownNodeType(rawType) ? rawType : 'template';
  const positionRecord = isObjectRecord(node['position'])
    ? node['position']
    : ({} as Record<string, unknown>);
  const config =
    node['config'] && typeof node['config'] === 'object' && !Array.isArray(node['config'])
      ? (node['config'] as AiNode['config'])
      : undefined;
  const createdAt =
    (typeof node['createdAt'] === 'string' ? node['createdAt'] : undefined) ??
    new Date().toISOString();
  const updatedAt =
    (typeof node['updatedAt'] === 'string' ? node['updatedAt'] : undefined) ?? createdAt;
  const data =
    node['data'] && typeof node['data'] === 'object' && !Array.isArray(node['data'])
      ? node['data']
      : {};
  return {
    id,
    createdAt,
    updatedAt,
    type,
    title,
    description,
    inputs: readRuntimePorts(node['inputs'], 'in'),
    outputs: readRuntimePorts(node['outputs'], 'out'),
    position: {
      x: readRuntimeNodeCoordinate(positionRecord, 'x'),
      y: readRuntimeNodeCoordinate(positionRecord, 'y'),
    },
    data,
    ...(config ? { config } : {}),
  };
};

export const toRuntimeNodes = (nodes: CaseResolverRelationGraph['nodes']): AiNode[] =>
  nodes.map(toRuntimeNode).filter((node): node is AiNode => node !== null);

export const toStrictEdges = (inputEdges: CaseResolverEdge[]): CaseResolverRelationGraph['edges'] =>
  inputEdges
    .map((edge: CaseResolverEdge): CaseResolverRelationGraph['edges'][number] => {
      const canonicalEdge = parseCanonicalCaseResolverEdge(edge, 'case_resolver.relations_workspace');
      return {
        id: canonicalEdge.id,
        source: canonicalEdge.source ?? '',
        target: canonicalEdge.target ?? '',
        ...(typeof canonicalEdge.label === 'string' ? { label: canonicalEdge.label } : {}),
        ...(typeof canonicalEdge.sourceHandle === 'string'
          ? { sourceHandle: canonicalEdge.sourceHandle }
          : {}),
        ...(typeof canonicalEdge.targetHandle === 'string'
          ? { targetHandle: canonicalEdge.targetHandle }
          : {}),
      };
    })
    .filter(
      (edge): edge is CaseResolverRelationGraph['edges'][number] =>
        typeof edge.source === 'string' &&
        edge.source.trim().length > 0 &&
        typeof edge.target === 'string' &&
        edge.target.trim().length > 0
    );

export const readRelationNodeMetaMap = (
  graph: CaseResolverRelationGraph
): Record<string, CaseResolverRelationNodeMeta> => {
  const value = (graph as Record<string, unknown>)['nodeMeta'];
  return isObjectRecord(value) ? (value as Record<string, CaseResolverRelationNodeMeta>) : {};
};

export const readRelationEdgeMetaMap = (
  graph: CaseResolverRelationGraph
): Record<string, CaseResolverRelationEdgeMeta> => {
  const value = (graph as Record<string, unknown>)['edgeMeta'];
  return isObjectRecord(value) ? (value as Record<string, CaseResolverRelationEdgeMeta>) : {};
};

const isCaseRelationNode = (
  nodeId: string,
  nodeMetaMap: Record<string, CaseResolverRelationNodeMeta>
): boolean => {
  const nodeMeta = nodeMetaMap[nodeId];
  if (nodeMeta && typeof nodeMeta.entityType === 'string') {
    return nodeMeta.entityType === 'case';
  }
  return nodeId.startsWith('case:');
};

const readEdgeEndpoints = (
  edge: unknown
): { id: string; source: string; target: string } | null => {
  if (!isObjectRecord(edge)) return null;
  const id = typeof edge['id'] === 'string' ? edge['id'].trim() : '';
  const source = typeof edge['source'] === 'string' ? edge['source'].trim() : '';
  const target = typeof edge['target'] === 'string' ? edge['target'].trim() : '';
  if (!id || !source || !target) return null;
  return { id, source, target };
};

export const projectCaseOnlyRelationGraph = (
  graph: CaseResolverRelationGraph
): CaseResolverRelationGraph => {
  const relationNodeMeta = readRelationNodeMetaMap(graph);
  const caseNodeIds = new Set<string>();

  const caseNodes = graph.nodes.filter((node): boolean => {
    if (!isObjectRecord(node)) return false;
    const nodeId = typeof node['id'] === 'string' ? node['id'].trim() : '';
    if (!nodeId) return false;
    if (!isCaseRelationNode(nodeId, relationNodeMeta)) return false;
    caseNodeIds.add(nodeId);
    return true;
  });

  const caseEdges = toStrictEdges(graph.edges).filter((edge): boolean => {
    const endpoints = readEdgeEndpoints(edge);
    if (!endpoints) return false;
    return caseNodeIds.has(endpoints.source) && caseNodeIds.has(endpoints.target);
  });

  const caseNodeMeta: Record<string, CaseResolverRelationNodeMeta> = {};
  caseNodeIds.forEach((nodeId: string): void => {
    const meta = relationNodeMeta[nodeId];
    if (meta) {
      caseNodeMeta[nodeId] = meta;
    }
  });

  const relationEdgeMeta = readRelationEdgeMetaMap(graph);
  const caseEdgeIds = new Set<string>();
  caseEdges.forEach((edge: CaseResolverRelationGraph['edges'][number]): void => {
    const endpoints = readEdgeEndpoints(edge);
    if (!endpoints) return;
    caseEdgeIds.add(endpoints.id);
  });
  const caseEdgeMeta: Record<string, CaseResolverRelationEdgeMeta> = {};
  Object.entries(relationEdgeMeta).forEach(
    ([edgeId, meta]: [string, CaseResolverRelationEdgeMeta]): void => {
      if (!caseEdgeIds.has(edgeId)) return;
      caseEdgeMeta[edgeId] = meta;
    }
  );

  return {
    nodes: caseNodes,
    edges: caseEdges,
    nodeMeta: caseNodeMeta,
    edgeMeta: caseEdgeMeta,
  };
};
