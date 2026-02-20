import { typeStyles } from '@/features/ai/ai-paths/lib';
import {
  CASE_RESOLVER_RELATION_ROOT_FOLDER_ID,
  DEFAULT_CASE_RESOLVER_RELATION_EDGE_META,
  DEFAULT_CASE_RESOLVER_RELATION_NODE_META,
  type AiNode,
  type Edge,
  type CaseResolverAssetFile,
  type CaseResolverFile,
  type CaseResolverRelationEdgeKind,
  type CaseResolverRelationEdgeMeta,
  type CaseResolverRelationEntityType,
  type CaseResolverRelationFileKind,
  type CaseResolverRelationGraph,
  type CaseResolverRelationNodeMeta,
} from '@/shared/contracts/case-resolver';

const normalizeTimestamp = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

const sanitizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeFolderPath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/').trim();
  const parts = normalized
    .split('/')
    .map((part: string) => part.trim())
    .filter((part: string) => part && part !== '.' && part !== '..')
    .map((part: string) => part.replace(/[^a-zA-Z0-9-_]/g, '_'))
    .filter(Boolean);
  return parts.join('/');
};

type CaseResolverRelationNodeGroup = 'case' | 'folder' | 'file' | 'custom';

const RELATION_NODE_BASE_OFFSETS: Record<CaseResolverRelationNodeGroup, { x: number; y: number }> = {
  case: { x: 120, y: 120 },
  folder: { x: 520, y: 120 },
  file: { x: 920, y: 120 },
  custom: { x: 1320, y: 120 },
};

const RELATION_NODE_GRID_STEP_Y = 130;
const RELATION_NODE_GRID_COLUMNS = 2;
const RELATION_NODE_GRID_STEP_X = 260;

const getRelationNodePosition = (
  group: CaseResolverRelationNodeGroup,
  index: number
): { x: number; y: number } => {
  const base = RELATION_NODE_BASE_OFFSETS[group];
  const row = Math.floor(index / RELATION_NODE_GRID_COLUMNS);
  const col = index % RELATION_NODE_GRID_COLUMNS;
  return {
    x: base.x + col * RELATION_NODE_GRID_STEP_X,
    y: base.y + row * RELATION_NODE_GRID_STEP_Y,
  };
};

const resolveRelationNodeType = (entityType: CaseResolverRelationEntityType): AiNode['type'] => {
  if (entityType === 'folder') return 'database';
  if (entityType === 'file') return 'prompt';
  if (entityType === 'custom') return 'template';
  return 'template';
};

const hasKnownRelationNodeType = (value: string): value is AiNode['type'] =>
  Object.prototype.hasOwnProperty.call(typeStyles, value);

const sanitizeRelationNodeType = (value: unknown): AiNode['type'] => {
  if (typeof value !== 'string') return 'template';
  const normalized = value.trim();
  if (normalized.length === 0) return 'template';
  return hasKnownRelationNodeType(normalized) ? normalized : 'template';
};

const sanitizeRelationNodes = (value: unknown): AiNode[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const nodes: AiNode[] = [];
  const now = new Date().toISOString();
  value.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const rawId = typeof record['id'] === 'string' ? record['id'].trim() : '';
    if (!rawId || seen.has(rawId)) return;
    seen.add(rawId);
    const title =
      typeof record['title'] === 'string' && record['title'].trim().length > 0
        ? record['title'].trim()
        : `Relation ${index + 1}`;
    const description =
      typeof record['description'] === 'string' ? record['description'] : '';
    const positionRecord =
      record['position'] && typeof record['position'] === 'object'
        ? (record['position'] as Record<string, unknown>)
        : null;
    const x =
      positionRecord && typeof positionRecord['x'] === 'number' && Number.isFinite(positionRecord['x'])
        ? positionRecord['x']
        : 0;
    const y =
      positionRecord && typeof positionRecord['y'] === 'number' && Number.isFinite(positionRecord['y'])
        ? positionRecord['y']
        : 0;
    const rawInputs = Array.isArray(record['inputs']) ? (record['inputs'] as unknown[]) : [];
    const inputs = rawInputs
      .filter((port: unknown): port is string => typeof port === 'string' && port.trim().length > 0)
      .map((port: string) => port.trim());
    const rawOutputs = Array.isArray(record['outputs']) ? (record['outputs'] as unknown[]) : [];
    const outputs = rawOutputs
      .filter((port: unknown): port is string => typeof port === 'string' && port.trim().length > 0)
      .map((port: string) => port.trim());
    const config =
      record['config'] && typeof record['config'] === 'object' && !Array.isArray(record['config'])
        ? record['config']
        : undefined;
    const createdAt = normalizeTimestamp(record['createdAt'], now);
    const updatedAt =
      record['updatedAt'] === null ? null : normalizeTimestamp(record['updatedAt'], createdAt);
    const data =
      record['data'] && typeof record['data'] === 'object' && !Array.isArray(record['data'])
        ? (record['data'] as Record<string, unknown>)
        : {};
    nodes.push({
      id: rawId,
      createdAt,
      updatedAt,
      type: sanitizeRelationNodeType(record['type']),
      title,
      description,
      inputs: inputs.length > 0 ? inputs : ['in'],
      outputs: outputs.length > 0 ? outputs : ['out'],
      position: { x, y },
      data,
      ...(config ? { config: config as AiNode['config'] } : {}),
    });
  });
  return nodes;
};

const sanitizeRelationEdges = (value: unknown, validNodeIds: Set<string>): Edge[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const edges: Edge[] = [];
  value.forEach((entry: unknown): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'].trim() : '';
    const from = typeof record['from'] === 'string' ? record['from'].trim() : '';
    const to = typeof record['to'] === 'string' ? record['to'].trim() : '';
    if (!id || !from || !to || seen.has(id)) return;
    if (!validNodeIds.has(from) || !validNodeIds.has(to)) return;
    seen.add(id);
    const label = typeof record['label'] === 'string' ? record['label'] : undefined;
    const fromPort = typeof record['fromPort'] === 'string' ? record['fromPort'] : undefined;
    const toPort = typeof record['toPort'] === 'string' ? record['toPort'] : undefined;
    edges.push({
      id,
      from,
      to,
      ...(label !== undefined ? { label } : {}),
      ...(fromPort !== undefined ? { fromPort } : {}),
      ...(toPort !== undefined ? { toPort } : {}),
    });
  });
  return edges;
};

const sanitizeRelationEntityType = (value: unknown): CaseResolverRelationEntityType =>
  value === 'case' || value === 'folder' || value === 'file' || value === 'custom'
    ? value
    : 'custom';

const sanitizeRelationFileKind = (value: unknown): CaseResolverRelationFileKind | null =>
  value === 'case_file' || value === 'asset_file' ? value : null;

const sanitizeRelationEdgeKind = (value: unknown): CaseResolverRelationEdgeKind =>
  value === 'contains' ||
  value === 'located_in' ||
  value === 'parent_case' ||
  value === 'references' ||
  value === 'related' ||
  value === 'custom'
    ? value
    : 'related';

const sanitizeRelationNodeMeta = (
  value: unknown,
  validNodeIds: Set<string>,
  now: string
): Record<string, CaseResolverRelationNodeMeta> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, CaseResolverRelationNodeMeta> = {};
  Object.entries(value as Record<string, unknown>).forEach(([nodeId, entry]: [string, unknown]): void => {
    if (!validNodeIds.has(nodeId)) return;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;
    const label =
      typeof record['label'] === 'string' && record['label'].trim().length > 0
        ? record['label'].trim()
        : nodeId;
    const entityId =
      typeof record['entityId'] === 'string' && record['entityId'].trim().length > 0
        ? record['entityId'].trim()
        : nodeId;
    const createdAt = normalizeTimestamp(record['createdAt'], now);
    const updatedAt = normalizeTimestamp(record['updatedAt'], createdAt);
    result[nodeId] = {
      ...DEFAULT_CASE_RESOLVER_RELATION_NODE_META,
      entityType: sanitizeRelationEntityType(record['entityType']),
      entityId,
      label,
      fileKind: sanitizeRelationFileKind(record['fileKind']),
      folderPath: sanitizeOptionalId(record['folderPath']),
      sourceFileId: sanitizeOptionalId(record['sourceFileId']),
      isStructural: record['isStructural'] === true,
      createdAt,
      updatedAt,
    };
  });
  return result;
};

const sanitizeRelationEdgeMeta = (
  value: unknown,
  validEdgeIds: Set<string>,
  now: string
): Record<string, CaseResolverRelationEdgeMeta> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, CaseResolverRelationEdgeMeta> = {};
  Object.entries(value as Record<string, unknown>).forEach(([edgeId, entry]: [string, unknown]): void => {
    if (!validEdgeIds.has(edgeId)) return;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;
    const createdAt = normalizeTimestamp(record['createdAt'], now);
    const updatedAt = normalizeTimestamp(record['updatedAt'], createdAt);
    result[edgeId] = {
      ...DEFAULT_CASE_RESOLVER_RELATION_EDGE_META,
      relationType: sanitizeRelationEdgeKind(record['relationType']),
      label:
        typeof record['label'] === 'string'
          ? record['label']
          : DEFAULT_CASE_RESOLVER_RELATION_EDGE_META.label,
      isStructural: record['isStructural'] === true,
      createdAt,
      updatedAt,
    };
  });
  return result;
};

const structuralRelationEdgeId = (
  relationType: CaseResolverRelationEdgeKind,
  from: string,
  to: string
): string => `struct:${relationType}:${encodeURIComponent(from)}:${encodeURIComponent(to)}`;

export const toCaseResolverRelationCaseNodeId = (caseId: string): string => `case:${caseId}`;
export const toCaseResolverRelationFolderNodeId = (folderPath: string): string =>
  `folder:${folderPath.trim() || CASE_RESOLVER_RELATION_ROOT_FOLDER_ID}`;
export const toCaseResolverRelationCaseFileNodeId = (caseId: string): string => `file:case:${caseId}`;
export const toCaseResolverRelationAssetFileNodeId = (assetId: string): string => `file:asset:${assetId}`;

type CaseResolverRelationNodeSeed = {
  id: string;
  entityType: CaseResolverRelationEntityType;
  entityId: string;
  label: string;
  title: string;
  description: string;
  group: CaseResolverRelationNodeGroup;
  fileKind: CaseResolverRelationFileKind | null;
  folderPath: string | null;
  sourceFileId: string | null;
  isStructural: boolean;
};

const resolveRelationNodeMetaUpdatedAt = (
  existing: CaseResolverRelationNodeMeta | undefined,
  seed: CaseResolverRelationNodeSeed,
  now: string
): string => {
  if (!existing) return now;
  const unchanged =
    existing.entityType === seed.entityType &&
    existing.entityId === seed.entityId &&
    existing.label === seed.label &&
    existing.fileKind === seed.fileKind &&
    existing.folderPath === seed.folderPath &&
    existing.sourceFileId === seed.sourceFileId &&
    existing.isStructural === seed.isStructural;
  if (unchanged) {
    return normalizeTimestamp(existing.updatedAt, normalizeTimestamp(existing.createdAt, now));
  }
  return now;
};

const resolveRelationEdgeMetaUpdatedAt = (
  existing: CaseResolverRelationEdgeMeta | undefined,
  input: { relationType: CaseResolverRelationEdgeKind; label: string; isStructural: boolean },
  now: string
): string => {
  if (!existing) return now;
  const unchanged =
    existing.relationType === input.relationType &&
    existing.label === input.label &&
    existing.isStructural === input.isStructural;
  if (unchanged) {
    return normalizeTimestamp(existing.updatedAt, normalizeTimestamp(existing.createdAt, now));
  }
  return now;
};

const relationFolderEntityIdFromPath = (folderPath: string): string => {
  const normalizedFolderPath = normalizeFolderPath(folderPath);
  return normalizedFolderPath || CASE_RESOLVER_RELATION_ROOT_FOLDER_ID;
};

const relationFolderPathFromEntityId = (entityId: string): string | null =>
  entityId === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID ? '' : entityId;

const normalizeRelationMetaFolderPath = (
  value: string | null | undefined
): string | null => {
  const normalized = normalizeFolderPath(value ?? '');
  return normalized.length > 0 ? normalized : null;
};

const parentRelationFolderEntityId = (entityId: string): string | null => {
  if (entityId === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID) return null;
  const folderPath = relationFolderPathFromEntityId(entityId) ?? '';
  if (!folderPath.includes('/')) return CASE_RESOLVER_RELATION_ROOT_FOLDER_ID;
  const parentFolderPath = folderPath.slice(0, folderPath.lastIndexOf('/'));
  return relationFolderEntityIdFromPath(parentFolderPath);
};

export const buildCaseResolverRelationGraph = ({
  source,
  folders,
  files,
  assets,
}: {
  source: unknown;
  folders: string[];
  files: CaseResolverFile[];
  assets: CaseResolverAssetFile[];
}): CaseResolverRelationGraph => {
  const now = new Date().toISOString();
  const sourceRecord =
    source && typeof source === 'object' && !Array.isArray(source)
      ? (source as Record<string, unknown>)
      : {};
  const rawNodes = sanitizeRelationNodes(sourceRecord['nodes']);
  const rawNodeIds = new Set(rawNodes.map((node: AiNode): string => node.id));
  const rawEdges = sanitizeRelationEdges(sourceRecord['edges'], rawNodeIds);
  const rawEdgeIds = new Set(rawEdges.map((edge: Edge): string => edge.id));
  const rawNodeMeta = sanitizeRelationNodeMeta(sourceRecord['nodeMeta'], rawNodeIds, now);
  const rawEdgeMeta = sanitizeRelationEdgeMeta(sourceRecord['edgeMeta'], rawEdgeIds, now);
  const existingNodeById = new Map<string, AiNode>(
    rawNodes.map((node: AiNode): [string, AiNode] => [node.id, node])
  );
  const caseFiles = files.filter((file: CaseResolverFile): boolean => file.fileType === 'case');

  const nextNodes: AiNode[] = [];
  const nextNodeMeta: Record<string, CaseResolverRelationNodeMeta> = {};
  const nodeCounters: Record<CaseResolverRelationNodeGroup, number> = {
    case: 0,
    folder: 0,
    file: 0,
    custom: 0,
  };
  const usedNodeIds = new Set<string>();

  const upsertNode = (seed: CaseResolverRelationNodeSeed): void => {
    if (!seed.id || usedNodeIds.has(seed.id)) return;
    usedNodeIds.add(seed.id);
    const existingNode = existingNodeById.get(seed.id);
    const index = nodeCounters[seed.group];
    nodeCounters[seed.group] = index + 1;
    const defaultPosition = getRelationNodePosition(seed.group, index);
    const position =
      existingNode &&
      typeof existingNode.position?.x === 'number' &&
      Number.isFinite(existingNode.position.x) &&
      typeof existingNode.position?.y === 'number' &&
      Number.isFinite(existingNode.position.y)
        ? existingNode.position
        : defaultPosition;

    nextNodes.push({
      ...(existingNode ?? {
        id: seed.id,
        createdAt: now,
        updatedAt: null,
        type: resolveRelationNodeType(seed.entityType),
        title: seed.title,
        description: seed.description,
        inputs: ['in'],
        outputs: ['out'],
        position,
        data: {},
      }),
      id: seed.id,
      createdAt: existingNode?.createdAt ?? now,
      updatedAt: existingNode?.updatedAt ?? null,
      type: existingNode?.type ?? resolveRelationNodeType(seed.entityType),
      title: seed.title,
      description: seed.description,
      inputs:
        Array.isArray(existingNode?.inputs) && existingNode.inputs.length > 0
          ? existingNode.inputs
          : ['in'],
      outputs:
        Array.isArray(existingNode?.outputs) && existingNode.outputs.length > 0
          ? existingNode.outputs
          : ['out'],
      position,
      data:
        existingNode?.data && typeof existingNode.data === 'object' && !Array.isArray(existingNode.data)
          ? existingNode.data
          : {},
    });

    const existingMeta = rawNodeMeta[seed.id];
    const createdAt = normalizeTimestamp(existingMeta?.createdAt, now);
    const updatedAt = resolveRelationNodeMetaUpdatedAt(existingMeta, seed, now);
    nextNodeMeta[seed.id] = {
      ...DEFAULT_CASE_RESOLVER_RELATION_NODE_META,
      entityType: seed.entityType,
      entityId: seed.entityId,
      label: seed.label,
      fileKind: seed.fileKind,
      folderPath: seed.folderPath,
      sourceFileId: seed.sourceFileId,
      isStructural: seed.isStructural,
      createdAt,
      updatedAt,
    };
  };

  const folderEntityIds = new Set<string>([CASE_RESOLVER_RELATION_ROOT_FOLDER_ID]);
  folders.forEach((folderPath: string): void => {
    const normalizedFolderPath = normalizeFolderPath(folderPath);
    if (!normalizedFolderPath) return;
    folderEntityIds.add(relationFolderEntityIdFromPath(normalizedFolderPath));
  });
  caseFiles.forEach((file: CaseResolverFile): void => {
    folderEntityIds.add(relationFolderEntityIdFromPath(file.folder));
  });
  assets.forEach((asset: CaseResolverAssetFile): void => {
    folderEntityIds.add(relationFolderEntityIdFromPath(asset.folder));
  });

  const sortedFolderEntityIds = Array.from(folderEntityIds).sort((left: string, right: string) => {
    if (left === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID) return -1;
    if (right === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID) return 1;
    return left.localeCompare(right);
  });

  sortedFolderEntityIds.forEach((folderEntityId: string): void => {
    const folderPath = relationFolderPathFromEntityId(folderEntityId) ?? '';
    const folderName =
      folderEntityId === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID
        ? '(root)'
        : folderPath.includes('/')
          ? folderPath.slice(folderPath.lastIndexOf('/') + 1)
          : folderPath;
    upsertNode({
      id: toCaseResolverRelationFolderNodeId(folderPath),
      entityType: 'folder',
      entityId: folderEntityId,
      label: folderName,
      title: `Folder: ${folderName}`,
      description:
        folderEntityId === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID
          ? 'Workspace root folder'
          : `Folder path: ${folderPath}`,
      group: 'folder',
      fileKind: null,
      folderPath: normalizeRelationMetaFolderPath(folderPath),
      sourceFileId: null,
      isStructural: true,
    });
  });

  caseFiles.forEach((file: CaseResolverFile): void => {
    upsertNode({
      id: toCaseResolverRelationCaseNodeId(file.id),
      entityType: 'case',
      entityId: file.id,
      label: file.name,
      title: `Case: ${file.name}`,
      description: `Case ID: ${file.id}`,
      group: 'case',
      fileKind: null,
      folderPath: normalizeRelationMetaFolderPath(file.folder),
      sourceFileId: file.id,
      isStructural: true,
    });
  });

  assets.forEach((asset: CaseResolverAssetFile): void => {
    upsertNode({
      id: toCaseResolverRelationAssetFileNodeId(asset.id),
      entityType: 'file',
      entityId: `asset:${asset.id}`,
      label: asset.name,
      title: `Asset: ${asset.name}`,
      description: `Asset file (${asset.kind})`,
      group: 'file',
      fileKind: 'asset_file',
      folderPath: normalizeRelationMetaFolderPath(asset.folder),
      sourceFileId: asset.id,
      isStructural: true,
    });
  });

  rawNodes.forEach((node: AiNode): void => {
    if (usedNodeIds.has(node.id)) return;
    const existingMeta = rawNodeMeta[node.id];
    if (existingMeta?.isStructural) return;
    const entityType = existingMeta ? existingMeta.entityType : 'custom';
    const label = existingMeta?.label?.trim() ? existingMeta.label.trim() : node.title;
    const entityId = existingMeta?.entityId?.trim() ? existingMeta.entityId.trim() : node.id;
    const seed: CaseResolverRelationNodeSeed = {
      id: node.id,
      entityType,
      entityId,
      label,
      title: node.title,
      description: node.description ?? '',
      group: entityType === 'case' || entityType === 'folder' || entityType === 'file' ? entityType : 'custom',
      fileKind: existingMeta?.fileKind ?? null,
      folderPath: existingMeta?.folderPath ?? null,
      sourceFileId: existingMeta?.sourceFileId ?? null,
      isStructural: false,
    };
    upsertNode(seed);
  });

  const nextNodeIdSet = new Set<string>(nextNodes.map((node: AiNode): string => node.id));
  const nextEdges: Edge[] = [];
  const nextEdgeMeta: Record<string, CaseResolverRelationEdgeMeta> = {};
  const usedEdgeIds = new Set<string>();
  const existingEdgeById = new Map<string, Edge>(
    rawEdges.map((edge: Edge): [string, Edge] => [edge.id, edge])
  );

  const upsertEdge = (input: {
    id: string;
    from: string;
    to: string;
    relationType: CaseResolverRelationEdgeKind;
    label: string;
    isStructural: boolean;
  }): void => {
    if (!input.id || usedEdgeIds.has(input.id)) return;
    if (!nextNodeIdSet.has(input.from) || !nextNodeIdSet.has(input.to)) return;
    usedEdgeIds.add(input.id);
    const existingEdge = existingEdgeById.get(input.id);
    const edgeLabel = input.label;
    const fromPort =
      typeof existingEdge?.fromPort === 'string' && existingEdge.fromPort.length > 0
        ? existingEdge.fromPort
        : 'out';
    const toPort =
      typeof existingEdge?.toPort === 'string' && existingEdge.toPort.length > 0
        ? existingEdge.toPort
        : 'in';
    nextEdges.push({
      id: input.id,
      from: input.from,
      to: input.to,
      ...(edgeLabel ? { label: edgeLabel } : {}),
      fromPort,
      toPort,
    });
    const existingMeta = rawEdgeMeta[input.id];
    const createdAt = normalizeTimestamp(existingMeta?.createdAt, now);
    const updatedAt = resolveRelationEdgeMetaUpdatedAt(
      existingMeta,
      {
        relationType: input.relationType,
        label: edgeLabel,
        isStructural: input.isStructural,
      },
      now
    );
    nextEdgeMeta[input.id] = {
      ...DEFAULT_CASE_RESOLVER_RELATION_EDGE_META,
      relationType: input.relationType,
      label: edgeLabel,
      isStructural: input.isStructural,
      createdAt,
      updatedAt,
    };
  };

  sortedFolderEntityIds.forEach((folderEntityId: string): void => {
    if (folderEntityId === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID) return;
    const parentEntityId = parentRelationFolderEntityId(folderEntityId);
    if (!parentEntityId) return;
    const childFolderPath = relationFolderPathFromEntityId(folderEntityId) ?? '';
    const parentFolderPath = relationFolderPathFromEntityId(parentEntityId) ?? '';
    const from = toCaseResolverRelationFolderNodeId(parentFolderPath);
    const to = toCaseResolverRelationFolderNodeId(childFolderPath);
    upsertEdge({
      id: structuralRelationEdgeId('contains', from, to),
      from,
      to,
      relationType: 'contains',
      label: 'contains folder',
      isStructural: true,
    });
  });

  const validCaseIds = new Set<string>(caseFiles.map((file: CaseResolverFile): string => file.id));
  caseFiles.forEach((file: CaseResolverFile): void => {
    const folderNodeId = toCaseResolverRelationFolderNodeId(file.folder);
    const caseNodeId = toCaseResolverRelationCaseNodeId(file.id);
    upsertEdge({
      id: structuralRelationEdgeId('contains', folderNodeId, caseNodeId),
      from: folderNodeId,
      to: caseNodeId,
      relationType: 'contains',
      label: 'contains case',
      isStructural: true,
    });
    if (file.parentCaseId && validCaseIds.has(file.parentCaseId)) {
      const parentCaseNodeId = toCaseResolverRelationCaseNodeId(file.parentCaseId);
      upsertEdge({
        id: structuralRelationEdgeId('parent_case', parentCaseNodeId, caseNodeId),
        from: parentCaseNodeId,
        to: caseNodeId,
        relationType: 'parent_case',
        label: 'parent case',
        isStructural: true,
      });
    }
    file.referenceCaseIds
      .filter((referenceId: string): boolean => validCaseIds.has(referenceId))
      .forEach((referenceId: string): void => {
        const referenceCaseNodeId = toCaseResolverRelationCaseNodeId(referenceId);
        upsertEdge({
          id: structuralRelationEdgeId('references', caseNodeId, referenceCaseNodeId),
          from: caseNodeId,
          to: referenceCaseNodeId,
          relationType: 'references',
          label: 'references',
          isStructural: true,
        });
      });
  });

  assets.forEach((asset: CaseResolverAssetFile): void => {
    const folderNodeId = toCaseResolverRelationFolderNodeId(asset.folder);
    const assetFileNodeId = toCaseResolverRelationAssetFileNodeId(asset.id);
    upsertEdge({
      id: structuralRelationEdgeId('contains', folderNodeId, assetFileNodeId),
      from: folderNodeId,
      to: assetFileNodeId,
      relationType: 'contains',
      label: 'contains file',
      isStructural: true,
    });
  });

  rawEdges.forEach((edge: Edge): void => {
    const existingMeta = rawEdgeMeta[edge.id];
    if (existingMeta?.isStructural) return;
    const fromNodeId = edge.from;
    const toNodeId = edge.to;
    if (!fromNodeId || !toNodeId) return;
    if (!nextNodeIdSet.has(fromNodeId) || !nextNodeIdSet.has(toNodeId)) return;
    const relationType = existingMeta ? existingMeta.relationType : 'related';
    const label = existingMeta?.label ?? edge.label ?? '';
    upsertEdge({
      id: edge.id,
      from: fromNodeId,
      to: toNodeId,
      relationType,
      label,
      isStructural: false,
    });
  });

  return {
    nodes: nextNodes as unknown as CaseResolverRelationGraph['nodes'],
    edges: nextEdges as unknown as CaseResolverRelationGraph['edges'],
    nodeMeta: nextNodeMeta,
    edgeMeta: nextEdgeMeta,
  };
};

export const createEmptyCaseResolverRelationGraph = (): CaseResolverRelationGraph =>
  buildCaseResolverRelationGraph({
    source: {
      nodes: [],
      edges: [],
      nodeMeta: {},
      edgeMeta: {},
    },
    folders: [],
    files: [],
    assets: [],
  });
