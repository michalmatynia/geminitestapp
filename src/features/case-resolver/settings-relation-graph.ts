/* eslint-disable complexity, max-lines, max-lines-per-function, no-nested-ternary, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-shadow, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unused-vars, @typescript-eslint/strict-boolean-expressions -- Relation graph sanitizer preserves legacy custom graph shape handling. */
/**
 * settings-relation-graph.ts
 *
 * Builds and sanitizes the CaseResolver relation graph — a visual node/edge
 * diagram that maps the structural relationships between cases, folders, and
 * asset files in a workspace.
 *
 * The graph is persisted as JSON in the workspace settings. On every load it
 * is rebuilt from the live workspace data (folders, case files, assets) so
 * that structural nodes/edges always reflect reality, while user-created
 * custom nodes and edges are preserved.
 *
 * Key concepts:
 *  - Structural nodes/edges  – auto-generated from workspace data; cannot be
 *    deleted by the user (isStructural: true).
 *  - Custom nodes/edges      – user-created; survive rebuilds as long as their
 *    referenced node IDs still exist.
 *  - nodeMeta / edgeMeta     – per-node/edge metadata (entity type, label,
 *    timestamps) stored alongside the graph and used to detect drift.
 */
import { type AiNode, type CaseResolverEdge, type CaseResolverAssetFile, type CaseResolverFile, type CaseResolverRelationEdgeKind, type CaseResolverRelationEdgeMeta, type CaseResolverRelationEntityType, type CaseResolverRelationFileKind, type CaseResolverRelationGraph, type CaseResolverRelationNodeMeta, CASE_RESOLVER_RELATION_ROOT_FOLDER_ID, DEFAULT_CASE_RESOLVER_RELATION_EDGE_META, DEFAULT_CASE_RESOLVER_RELATION_NODE_META } from '@/shared/contracts/case-resolver';
import { typeStyles } from '@/shared/lib/ai-paths/core/constants';

import { parseCanonicalCaseResolverEdge } from './settings.edge-validation';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { AiNodeSchema } from './types/relation-graph';
import { RelationNodeMetaSchema, RelationEdgeMetaSchema } from './types/relation-meta';


// Returns value unchanged if it is a non-empty ISO string, otherwise falls
// back to the provided fallback (typically `now`).
const normalizeTimestamp = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

// Coerces an unknown value to a trimmed non-empty string, or null.
const sanitizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

// Normalises a raw folder path: converts backslashes, trims segments,
// removes `.` / `..` traversals, and replaces non-alphanumeric characters
// with underscores. Returns an empty string for the root folder.
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

// Visual column groups used to auto-place nodes that have no saved position.
type CaseResolverRelationNodeGroup = 'case' | 'folder' | 'file' | 'custom';

// Starting (x, y) pixel offsets for each group column in the canvas.
const RELATION_NODE_BASE_OFFSETS: Record<CaseResolverRelationNodeGroup, { x: number; y: number }> =
  {
    case: { x: 120, y: 120 },
    folder: { x: 520, y: 120 },
    file: { x: 920, y: 120 },
    custom: { x: 1320, y: 120 },
  };

// Vertical spacing between rows of nodes in the same column.
const RELATION_NODE_GRID_STEP_Y = 130;
// Number of columns in each group before wrapping to the next row.
const RELATION_NODE_GRID_COLUMNS = 2;
// Horizontal spacing between columns within a group.
const RELATION_NODE_GRID_STEP_X = 260;

// Calculates the default (x, y) position for a node based on its group and
// index within that group. Nodes are laid out in a 2-column grid per group.
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

// Maps a CaseResolver entity type to the corresponding AI-node visual style.
const RELATION_NODE_TYPE_MAP: Record<CaseResolverRelationEntityType, AiNode['type']> = {
  folder: 'database',
  file: 'prompt',
  custom: 'template',
};

const resolveRelationNodeType = (entityType: CaseResolverRelationEntityType): AiNode['type'] => {
  return RELATION_NODE_TYPE_MAP[entityType] ?? 'template';
};

// Type guard: returns true only if the string is a recognised AiNode type
// (i.e. has a corresponding entry in the typeStyles map).
const hasKnownRelationNodeType = (value: string): value is AiNode['type'] =>
  Object.prototype.hasOwnProperty.call(typeStyles, value);

/**
 * Parses and sanitizes the raw `nodes` array from persisted JSON.
 * Skips entries with missing/duplicate IDs or unrecognised node types.
 * Falls back to safe defaults for missing optional fields (position, ports,
 * timestamps, etc.).
 */
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
    const description = typeof record['description'] === 'string' ? record['description'] : '';
    const rawType = typeof record['type'] === 'string' ? record['type'].trim() : '';
    if (!rawType || !hasKnownRelationNodeType(rawType)) return;
    const positionRecord =
      record['position'] && typeof record['position'] === 'object'
        ? (record['position'] as Record<string, unknown>)
        : null;
    const x =
      positionRecord &&
      typeof positionRecord['x'] === 'number' &&
      Number.isFinite(positionRecord['x'])
        ? positionRecord['x']
        : 0;
    const y =
      positionRecord &&
      typeof positionRecord['y'] === 'number' &&
      Number.isFinite(positionRecord['y'])
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
      type: rawType,
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

/**
 * Parses and sanitizes the raw `edges` array from persisted JSON.
 * Validates each edge via `parseCanonicalCaseResolverEdge`, then discards
 * edges with missing IDs, dangling node references, or duplicate IDs.
 * `validNodeIds` is the set of node IDs that survived `sanitizeRelationNodes`.
 */
const sanitizeRelationEdges = (value: unknown, validNodeIds: Set<string>): CaseResolverEdge[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const edges: CaseResolverEdge[] = [];
  value.forEach((entry: unknown, index: number): void => {
    let edge: CaseResolverEdge;
    try {
      edge = parseCanonicalCaseResolverEdge(entry, `case_resolver.relation_graph.edges[${index}]`);
    } catch (error) {
      logClientError(error);
      return;
    }
    const id = edge.id.trim();
    const source = edge.source?.trim() ?? '';
    const target = edge.target?.trim() ?? '';
    if (!id || !source || !target) return;
    if (seen.has(id)) return;
    if (!validNodeIds.has(source) || !validNodeIds.has(target)) return;
    seen.add(id);
    edges.push({
      id,
      source,
      target,
      ...(typeof edge.label === 'string' ? { label: edge.label } : {}),
      ...(typeof edge.sourceHandle === 'string' ? { sourceHandle: edge.sourceHandle } : {}),
      ...(typeof edge.targetHandle === 'string' ? { targetHandle: edge.targetHandle } : {}),
    });
  });
  return edges;
};

// Coerces an unknown value to a valid CaseResolverRelationEntityType,
// defaulting to 'custom' for unrecognised values.
const sanitizeRelationEntityType = (value: unknown): CaseResolverRelationEntityType =>
  value === 'case' || value === 'folder' || value === 'file' || value === 'custom'
    ? value
    : 'custom';

// Returns null for unrecognised file kinds (treated as non-file nodes).
const sanitizeRelationFileKind = (value: unknown): CaseResolverRelationFileKind | null =>
  value === 'case_file' || value === 'asset_file' ? value : null;

// Coerces an unknown value to a valid edge kind, defaulting to 'related'.
const sanitizeRelationEdgeKind = (value: unknown): CaseResolverRelationEdgeKind =>
  value === 'contains' ||
  value === 'located_in' ||
  value === 'parent_case' ||
  value === 'references' ||
  value === 'related' ||
  value === 'custom'
    ? value
    : 'related';

/**
 * Parses and sanitizes the raw `nodeMeta` map from persisted JSON.
 * Only entries whose key exists in `validNodeIds` are kept.
 * Each entry is validated through RelationNodeMetaSchema; invalid entries
 * are silently dropped.
 */
const sanitizeRelationNodeMeta = (
  value: unknown,
  validNodeIds: Set<string>,
  now: string
): Record<string, CaseResolverRelationNodeMeta> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  
  const result: Record<string, CaseResolverRelationNodeMeta> = {};
  
  Object.entries(record).forEach(([nodeId, entry]) => {
    if (!validNodeIds.has(nodeId)) return;
    
    const parsed = RelationNodeMetaSchema.safeParse({
        ...(typeof entry === 'object' ? entry : {}),
        entityId: (typeof entry === 'object' && 'entityId' in entry!) ? (entry as any).entityId : nodeId,
        label: (typeof entry === 'object' && 'label' in entry!) ? (entry as any).label : nodeId,
        createdAt: normalizeTimestamp((typeof entry === 'object' && 'createdAt' in entry!) ? (entry as any).createdAt : null, now),
        updatedAt: normalizeTimestamp((typeof entry === 'object' && 'updatedAt' in entry!) ? (entry as any).updatedAt : null, now),
    });
    
    if (parsed.success) {
        result[nodeId] = parsed.data;
    }
  });
  
  return result;
};

/**
 * Parses and sanitizes the raw `edgeMeta` map from persisted JSON.
 * Only entries whose key exists in `validEdgeIds` are kept.
 */
const sanitizeRelationEdgeMeta = (
  value: unknown,
  validEdgeIds: Set<string>,
  now: string
): Record<string, CaseResolverRelationEdgeMeta> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  
  const result: Record<string, CaseResolverRelationEdgeMeta> = {};
  
  Object.entries(record).forEach(([edgeId, entry]) => {
    if (!validEdgeIds.has(edgeId)) return;
    
    const parsed = RelationEdgeMetaSchema.safeParse({
        ...(typeof entry === 'object' ? entry : {}),
        createdAt: normalizeTimestamp((typeof entry === 'object' && 'createdAt' in entry!) ? (entry as any).createdAt : null, now),
        updatedAt: normalizeTimestamp((typeof entry === 'object' && 'updatedAt' in entry!) ? (entry as any).updatedAt : null, now),
    });
    
    if (parsed.success) {
        result[edgeId] = parsed.data;
    }
  });
  
  return result;
};

// Produces a deterministic edge ID for structural (auto-generated) edges so
// that the same structural relationship always maps to the same ID across
// rebuilds, enabling stable upsert semantics.
const structuralRelationEdgeId = (
  relationType: CaseResolverRelationEdgeKind,
  source: string,
  target: string
): string => `struct:${relationType}:${encodeURIComponent(source)}:${encodeURIComponent(target)}`;

// ─── Stable node-ID helpers ──────────────────────────────────────────────────
// Each entity type gets a namespaced prefix so IDs never collide across types.
export const toCaseResolverRelationCaseNodeId = (caseId: string): string => `case:${caseId}`;
export const toCaseResolverRelationFolderNodeId = (folderPath: string): string =>
  `folder:${folderPath.trim() || CASE_RESOLVER_RELATION_ROOT_FOLDER_ID}`;
export const toCaseResolverRelationCaseFileNodeId = (caseId: string): string =>
  `file:case:${caseId}`;
export const toCaseResolverRelationAssetFileNodeId = (assetId: string): string =>
  `file:asset:${assetId}`;

// Internal shape used to drive both node creation and nodeMeta population
// from a single source of truth during the graph rebuild.
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

// Returns the existing updatedAt timestamp when the node's semantic fields
// haven't changed, preserving the original modification time. Returns `now`
// when any field has drifted (entity type, label, file kind, etc.).
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

// Same semantics as resolveRelationNodeMetaUpdatedAt but for edge metadata.
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

// ─── Folder path ↔ entity-ID helpers ─────────────────────────────────────────
// The root folder is represented by a sentinel constant rather than an empty
// string so it can be stored as a map key without ambiguity.

const relationFolderEntityIdFromPath = (folderPath: string): string => {
  const normalizedFolderPath = normalizeFolderPath(folderPath);
  return normalizedFolderPath || CASE_RESOLVER_RELATION_ROOT_FOLDER_ID;
};

// Returns null for the root folder (its path is the empty string).
const relationFolderPathFromEntityId = (entityId: string): string | null =>
  entityId === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID ? '' : entityId;

// Normalises a folder path for storage in nodeMeta; returns null for root.
const normalizeRelationMetaFolderPath = (value: string | null | undefined): string | null => {
  const normalized = normalizeFolderPath(value ?? '');
  return normalized.length > 0 ? normalized : null;
};

// Walks up one level in the folder hierarchy. Returns null at the root.
const parentRelationFolderEntityId = (entityId: string): string | null => {
  if (entityId === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID) return null;
  const folderPath = relationFolderPathFromEntityId(entityId) ?? '';
  if (!folderPath.includes('/')) return CASE_RESOLVER_RELATION_ROOT_FOLDER_ID;
  const parentFolderPath = folderPath.slice(0, folderPath.lastIndexOf('/'));
  return relationFolderEntityIdFromPath(parentFolderPath);
};

/**
 * Rebuilds the full CaseResolver relation graph from live workspace data.
 *
 * Algorithm (in order):
 *  1. Parse and sanitize any previously persisted nodes, edges, and metadata
 *     from `source` (the raw JSON stored in the workspace setting).
 *  2. Collect all unique folder paths implied by the provided folders, case
 *     files, and asset files — including every ancestor up to root.
 *  3. Upsert structural nodes for folders, cases, and assets, preserving any
 *     user-adjusted canvas positions from the previous save.
 *  4. Re-add user-created custom nodes that are not marked structural.
 *  5. Upsert structural edges (folder containment, parent-case, references,
 *     asset containment) using deterministic IDs.
 *  6. Re-add user-created custom edges whose source/target nodes still exist.
 *
 * The result is a graph where structural elements always reflect the current
 * workspace state, while user customisations are preserved where possible.
 */
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
  const rawEdgeIds = new Set(rawEdges.map((edge: CaseResolverEdge): string => edge.id));
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
        existingNode?.data &&
        typeof existingNode.data === 'object' &&
        !Array.isArray(existingNode.data)
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
    const label = (existingMeta?.label?.trim() ? existingMeta.label.trim() : node.title) || '';
    const entityId = existingMeta?.entityId?.trim() ? existingMeta.entityId.trim() : node.id;
    const seed: CaseResolverRelationNodeSeed = {
      id: node.id,
      entityType,
      entityId,
      label,
      title: node.title || '',
      description: node.description ?? '',
      group:
        entityType === 'case' || entityType === 'folder' || entityType === 'file'
          ? entityType
          : 'custom',
      fileKind: existingMeta?.fileKind ?? null,
      folderPath: existingMeta?.folderPath ?? null,
      sourceFileId: existingMeta?.sourceFileId ?? null,
      isStructural: false,
    };
    upsertNode(seed);
  });

  const nextNodeIdSet = new Set<string>(nextNodes.map((node: AiNode): string => node.id));
  const nextEdges: CaseResolverEdge[] = [];
  const nextEdgeMeta: Record<string, CaseResolverRelationEdgeMeta> = {};
  const usedEdgeIds = new Set<string>();
  const existingEdgeById = new Map<string, CaseResolverEdge>(
    rawEdges.map((edge: CaseResolverEdge): [string, CaseResolverEdge] => [edge.id, edge])
  );

  const upsertEdge = (input: {
    id: string;
    source: string;
    target: string;
    relationType: CaseResolverRelationEdgeKind;
    label: string;
    isStructural: boolean;
  }): void => {
    if (!input.id || usedEdgeIds.has(input.id)) return;
    if (!nextNodeIdSet.has(input.source) || !nextNodeIdSet.has(input.target)) return;
    usedEdgeIds.add(input.id);
    const existingEdge = existingEdgeById.get(input.id);
    const edgeLabel = input.label;
    const sourceHandle =
      typeof existingEdge?.sourceHandle === 'string' && existingEdge.sourceHandle.length > 0
        ? existingEdge.sourceHandle
        : 'out';
    const targetHandle =
      typeof existingEdge?.targetHandle === 'string' && existingEdge.targetHandle.length > 0
        ? existingEdge.targetHandle
        : 'in';
    nextEdges.push({
      id: input.id,
      source: input.source,
      target: input.target,
      ...(edgeLabel ? { label: edgeLabel } : {}),
      sourceHandle,
      targetHandle,
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
    const source = toCaseResolverRelationFolderNodeId(parentFolderPath);
    const target = toCaseResolverRelationFolderNodeId(childFolderPath);
    upsertEdge({
      id: structuralRelationEdgeId('contains', source, target),
      source,
      target,
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
      source: folderNodeId,
      target: caseNodeId,
      relationType: 'contains',
      label: 'contains case',
      isStructural: true,
    });
    if (file.parentCaseId && validCaseIds.has(file.parentCaseId)) {
      const parentCaseNodeId = toCaseResolverRelationCaseNodeId(file.parentCaseId);
      upsertEdge({
        id: structuralRelationEdgeId('parent_case', parentCaseNodeId, caseNodeId),
        source: parentCaseNodeId,
        target: caseNodeId,
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
          source: caseNodeId,
          target: referenceCaseNodeId,
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
      source: folderNodeId,
      target: assetFileNodeId,
      relationType: 'contains',
      label: 'contains file',
      isStructural: true,
    });
  });

  rawEdges.forEach((edge: CaseResolverEdge): void => {
    const existingMeta = rawEdgeMeta[edge.id];
    if (existingMeta?.isStructural) return;
    const sourceNodeId = edge.source?.trim() ?? '';
    const targetNodeId = edge.target?.trim() ?? '';
    if (!sourceNodeId || !targetNodeId) return;
    if (!nextNodeIdSet.has(sourceNodeId) || !nextNodeIdSet.has(targetNodeId)) return;
    const relationType = existingMeta ? existingMeta.relationType : 'related';
    const label = existingMeta?.label ?? edge.label ?? '';
    upsertEdge({
      id: edge.id,
      source: sourceNodeId,
      target: targetNodeId,
      relationType,
      label,
      isStructural: false,
    });
  });

  return {
    nodes: nextNodes,
    edges: nextEdges,
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
