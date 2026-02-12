import {
  canNestTreeNodeV2,
  type FolderTreeProfileV2,
} from './folder-tree-profiles-v2';
import {
  compareMasterTreeNodes,
  normalizeMasterTreeKind,
  normalizeMasterTreePath,
  resolveMasterTreePathSegment,
  type MasterTreeDropPosition,
  type MasterTreeId,
  type MasterTreeNode,
  type MasterTreePath,
  type MasterTreeTargetType,
} from './master-folder-tree-contract';

export type MasterTreeViewNode = MasterTreeNode & {
  children: MasterTreeViewNode[];
};

export type MasterTreeValidationIssueCode =
  | 'DUPLICATE_ID'
  | 'MISSING_PARENT'
  | 'CYCLE_DETECTED';

export type MasterTreeValidationIssue = {
  code: MasterTreeValidationIssueCode;
  nodeId: string;
  message: string;
};

export type MasterTreeBuildResult = {
  roots: MasterTreeViewNode[];
  issues: MasterTreeValidationIssue[];
};

export type MasterTreeCycleGuardResult = {
  hasCycle: boolean;
  cycleNodeIds: string[];
};

export type MasterTreeDropRejectionReason =
  | 'NODE_NOT_FOUND'
  | 'TARGET_NOT_FOUND'
  | 'TARGET_NOT_FOLDER'
  | 'TARGET_IS_SELF'
  | 'TARGET_IN_SUBTREE'
  | 'PROFILE_RULE_BLOCKED';

export type MasterTreeCanDropResult = {
  ok: boolean;
  reason?: MasterTreeDropRejectionReason | undefined;
  resolvedParentId: MasterTreeId | null;
};

export type MasterTreeMutationErrorCode =
  | MasterTreeDropRejectionReason
  | 'TARGET_PARENT_NOT_FOUND';

export type MasterTreeMutationResult =
  | {
      ok: true;
      nodes: MasterTreeNode[];
    }
  | {
      ok: false;
      code: MasterTreeMutationErrorCode;
      nodes: MasterTreeNode[];
    };

export type BuildMasterTreeOptions = {
  strict?: boolean | undefined;
};

export type CanDropMasterTreeNodeInput = {
  nodes: MasterTreeNode[];
  nodeId: MasterTreeId;
  targetId: MasterTreeId | null;
  position?: MasterTreeDropPosition | undefined;
  profile?: FolderTreeProfileV2 | undefined;
};

export type MoveMasterTreeNodeInput = {
  nodes: MasterTreeNode[];
  nodeId: MasterTreeId;
  targetParentId: MasterTreeId | null;
  targetIndex?: number | undefined;
  profile?: FolderTreeProfileV2 | undefined;
};

export type ReorderMasterTreeNodeInput = {
  nodes: MasterTreeNode[];
  nodeId: MasterTreeId;
  targetId: MasterTreeId;
  position: MasterTreeDropPosition;
  profile?: FolderTreeProfileV2 | undefined;
};

const createNodeMap = (nodes: MasterTreeNode[]): Map<MasterTreeId, MasterTreeNode> => {
  const map = new Map<MasterTreeId, MasterTreeNode>();
  nodes.forEach((node: MasterTreeNode) => {
    if (map.has(node.id)) return;
    map.set(node.id, node);
  });
  return map;
};

const sanitizeMasterTreeNode = (node: MasterTreeNode): MasterTreeNode => {
  const normalizedType = node.type === 'folder' ? 'folder' : 'file';
  return {
    ...node,
    type: normalizedType,
    kind: normalizeMasterTreeKind(node.kind, normalizedType === 'folder' ? 'folder' : 'file'),
    parentId: node.parentId ?? null,
    path: normalizeMasterTreePath(node.path),
    sortOrder: Number.isFinite(node.sortOrder) ? node.sortOrder : 0,
  };
};

const sanitizeMasterTreeNodes = (nodes: MasterTreeNode[]): MasterTreeNode[] =>
  nodes.map((node: MasterTreeNode) => sanitizeMasterTreeNode(node));

export const guardAgainstMasterTreeCycles = (nodes: MasterTreeNode[]): MasterTreeCycleGuardResult => {
  const byId = createNodeMap(nodes);
  const visited = new Set<string>();
  const cycleIds = new Set<string>();

  nodes.forEach((node: MasterTreeNode) => {
    if (visited.has(node.id)) return;

    const path: string[] = [];
    const pathIndex = new Map<string, number>();
    let cursor: string | null = node.id;

    while (cursor) {
      if (!byId.has(cursor)) break;
      if (visited.has(cursor)) break;

      const existingIndex = pathIndex.get(cursor);
      if (existingIndex !== undefined) {
        path.slice(existingIndex).forEach((id: string) => cycleIds.add(id));
        break;
      }

      pathIndex.set(cursor, path.length);
      path.push(cursor);
      const currentNode = byId.get(cursor);
      const parentId: string | null = currentNode ? currentNode.parentId : null;
      if (!parentId) break;
      cursor = parentId;
    }

    path.forEach((id: string) => visited.add(id));
  });

  return {
    hasCycle: cycleIds.size > 0,
    cycleNodeIds: Array.from(cycleIds).sort((a: string, b: string) => a.localeCompare(b)),
  };
};

export const validateMasterTreeNodes = (nodes: MasterTreeNode[]): MasterTreeValidationIssue[] => {
  const issues: MasterTreeValidationIssue[] = [];
  const seen = new Set<string>();
  const ids = new Set<string>();

  nodes.forEach((node: MasterTreeNode) => {
    ids.add(node.id);
    if (seen.has(node.id)) {
      issues.push({
        code: 'DUPLICATE_ID',
        nodeId: node.id,
        message: `Duplicate node id "${node.id}" detected.`,
      });
      return;
    }
    seen.add(node.id);
  });

  nodes.forEach((node: MasterTreeNode) => {
    if (!node.parentId) return;
    if (ids.has(node.parentId)) return;
    issues.push({
      code: 'MISSING_PARENT',
      nodeId: node.id,
      message: `Node "${node.id}" references missing parent "${node.parentId}".`,
    });
  });

  const cycleResult = guardAgainstMasterTreeCycles(nodes);
  if (cycleResult.hasCycle) {
    cycleResult.cycleNodeIds.forEach((nodeId: string) => {
      issues.push({
        code: 'CYCLE_DETECTED',
        nodeId,
        message: `Node "${nodeId}" is part of a parent cycle.`,
      });
    });
  }

  return issues;
};

const detachInvalidParentsAndCycles = (nodes: MasterTreeNode[]): MasterTreeNode[] => {
  const idSet = new Set<string>(nodes.map((node: MasterTreeNode) => node.id));
  let next = nodes.map((node: MasterTreeNode) => ({
    ...node,
    parentId: node.parentId && idSet.has(node.parentId) ? node.parentId : null,
  }));

  const cycleResult = guardAgainstMasterTreeCycles(next);
  if (!cycleResult.hasCycle) return next;

  const cycleSet = new Set<string>(cycleResult.cycleNodeIds);
  next = next.map((node: MasterTreeNode) =>
    cycleSet.has(node.id)
      ? {
        ...node,
        parentId: null,
      }
      : node
  );

  return next;
};

export const buildMasterTree = (
  nodes: MasterTreeNode[],
  options?: BuildMasterTreeOptions
): MasterTreeBuildResult => {
  const sanitized = sanitizeMasterTreeNodes(nodes);
  const issues = validateMasterTreeNodes(sanitized);

  if (options?.strict && issues.length > 0) {
    const first = issues[0];
    throw new Error(first?.message ?? 'Invalid tree state.');
  }

  const repaired = detachInvalidParentsAndCycles(sanitized);
  const byId = createNodeMap(repaired);

  const buckets = new Map<string | null, MasterTreeNode[]>();
  const pushBucket = (parentId: string | null, node: MasterTreeNode): void => {
    const bucket = buckets.get(parentId);
    if (bucket) {
      bucket.push(node);
      return;
    }
    buckets.set(parentId, [node]);
  };

  repaired.forEach((node: MasterTreeNode) => {
    const parentId = node.parentId && byId.has(node.parentId) ? node.parentId : null;
    pushBucket(parentId, {
      ...node,
      parentId,
    });
  });

  buckets.forEach((bucket: MasterTreeNode[]) => {
    bucket.sort(compareMasterTreeNodes);
  });

  const buildChildren = (parentId: string | null): MasterTreeViewNode[] => {
    const children = buckets.get(parentId) ?? [];
    return children.map((node: MasterTreeNode) => ({
      ...node,
      children: buildChildren(node.id),
    }));
  };

  return {
    roots: buildChildren(null),
    issues,
  };
};

export const flattenMasterTree = (roots: MasterTreeViewNode[]): MasterTreeNode[] => {
  const flat: MasterTreeNode[] = [];

  const walk = (items: MasterTreeViewNode[]): void => {
    items.forEach((item: MasterTreeViewNode) => {
      const { children, ...node } = item;
      flat.push(node);
      if (children.length > 0) walk(children);
    });
  };

  walk(roots);
  return flat;
};

export const normalizeMasterTreeNodes = (nodes: MasterTreeNode[]): MasterTreeNode[] => {
  const built = buildMasterTree(nodes);
  const normalized: MasterTreeNode[] = [];

  const walk = (
    items: MasterTreeViewNode[],
    parentId: string | null,
    parentPath: MasterTreePath
  ): void => {
    items.forEach((item: MasterTreeViewNode, index: number) => {
      const segment = resolveMasterTreePathSegment(item);
      const path = parentPath
        ? normalizeMasterTreePath(`${parentPath}/${segment}`)
        : normalizeMasterTreePath(segment);

      normalized.push({
        ...item,
        parentId,
        sortOrder: index,
        path,
      });

      if (item.children.length > 0) {
        walk(item.children, item.id, path);
      }
    });
  };

  walk(built.roots, null, '');
  return normalized;
};

export const normalizeMasterTreePaths = (nodes: MasterTreeNode[]): MasterTreeNode[] =>
  normalizeMasterTreeNodes(nodes).map((node: MasterTreeNode) => ({
    ...node,
    path: normalizeMasterTreePath(node.path),
  }));

export const isMasterTreeNodeInSubtree = (
  nodes: MasterTreeNode[],
  rootNodeId: MasterTreeId,
  targetNodeId: MasterTreeId
): boolean => {
  const byId = createNodeMap(nodes);
  if (!byId.has(rootNodeId) || !byId.has(targetNodeId)) return false;

  const seen = new Set<string>();
  let cursor: string | null = targetNodeId;
  while (cursor) {
    if (cursor === rootNodeId) return true;
    if (seen.has(cursor)) return false;
    seen.add(cursor);
    cursor = byId.get(cursor)?.parentId ?? null;
  }
  return false;
};

const resolveDropContext = (
  nodeMap: Map<MasterTreeId, MasterTreeNode>,
  targetId: MasterTreeId | null,
  position: MasterTreeDropPosition
): {
  targetType: MasterTreeTargetType;
  targetFolderKind: string | null;
  resolvedParentId: MasterTreeId | null;
  error?: MasterTreeDropRejectionReason | undefined;
} => {
  if (!targetId) {
    return {
      targetType: 'root',
      targetFolderKind: null,
      resolvedParentId: null,
    };
  }

  const targetNode = nodeMap.get(targetId);
  if (!targetNode) {
    return {
      targetType: 'root',
      targetFolderKind: null,
      resolvedParentId: null,
      error: 'TARGET_NOT_FOUND',
    };
  }

  if (position === 'inside') {
    if (targetNode.type !== 'folder') {
      return {
        targetType: 'folder',
        targetFolderKind: null,
        resolvedParentId: null,
        error: 'TARGET_NOT_FOLDER',
      };
    }
    return {
      targetType: 'folder',
      targetFolderKind: targetNode.kind,
      resolvedParentId: targetNode.id,
    };
  }

  const parentId = targetNode.parentId;
  if (!parentId) {
    return {
      targetType: 'root',
      targetFolderKind: null,
      resolvedParentId: null,
    };
  }

  const parentNode = nodeMap.get(parentId);
  if (parentNode?.type !== 'folder') {
    return {
      targetType: 'root',
      targetFolderKind: null,
      resolvedParentId: null,
    };
  }

  return {
    targetType: 'folder',
    targetFolderKind: parentNode.kind,
    resolvedParentId: parentNode.id,
  };
};

export const canDropMasterTreeNode = ({
  nodes,
  nodeId,
  targetId,
  position = 'inside',
  profile,
}: CanDropMasterTreeNodeInput): MasterTreeCanDropResult => {
  const normalized = normalizeMasterTreeNodes(nodes);
  const nodeMap = createNodeMap(normalized);
  const draggedNode = nodeMap.get(nodeId);
  if (!draggedNode) {
    return {
      ok: false,
      reason: 'NODE_NOT_FOUND',
      resolvedParentId: null,
    };
  }

  if (targetId && targetId === nodeId) {
    return {
      ok: false,
      reason: 'TARGET_IS_SELF',
      resolvedParentId: null,
    };
  }

  const context = resolveDropContext(nodeMap, targetId, position);
  if (context.error) {
    return {
      ok: false,
      reason: context.error,
      resolvedParentId: context.resolvedParentId,
    };
  }

  const resolvedParentId = context.resolvedParentId;
  if (resolvedParentId === nodeId) {
    return {
      ok: false,
      reason: 'TARGET_IS_SELF',
      resolvedParentId,
    };
  }

  if (
    resolvedParentId &&
    isMasterTreeNodeInSubtree(normalized, nodeId, resolvedParentId)
  ) {
    return {
      ok: false,
      reason: 'TARGET_IN_SUBTREE',
      resolvedParentId,
    };
  }

  if (profile) {
    const allowed = canNestTreeNodeV2({
      profile,
      nodeType: draggedNode.type,
      nodeKind: draggedNode.kind,
      targetType: context.targetType,
      targetFolderKind: context.targetFolderKind,
    });

    if (!allowed) {
      return {
        ok: false,
        reason: 'PROFILE_RULE_BLOCKED',
        resolvedParentId,
      };
    }
  }

  return {
    ok: true,
    resolvedParentId,
  };
};

const clampIndex = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const getSortedSiblingIds = (
  nodes: MasterTreeNode[],
  parentId: string | null,
  excludeId?: string | undefined
): string[] =>
  nodes
    .filter((node: MasterTreeNode) => node.parentId === parentId && node.id !== excludeId)
    .sort(compareMasterTreeNodes)
    .map((node: MasterTreeNode) => node.id);

export const moveMasterTreeNode = ({
  nodes,
  nodeId,
  targetParentId,
  targetIndex,
  profile,
}: MoveMasterTreeNodeInput): MasterTreeMutationResult => {
  const normalized = normalizeMasterTreeNodes(nodes);
  const nodeMap = createNodeMap(normalized);
  const draggedNode = nodeMap.get(nodeId);
  if (!draggedNode) {
    return { ok: false, code: 'NODE_NOT_FOUND', nodes: normalized };
  }

  if (targetParentId && !nodeMap.has(targetParentId)) {
    return { ok: false, code: 'TARGET_PARENT_NOT_FOUND', nodes: normalized };
  }

  const dropCheck = canDropMasterTreeNode({
    nodes: normalized,
    nodeId,
    targetId: targetParentId,
    position: 'inside',
    profile,
  });

  if (!dropCheck.ok) {
    return { ok: false, code: dropCheck.reason ?? 'PROFILE_RULE_BLOCKED', nodes: normalized };
  }

  const withoutDragged = normalized.filter((node: MasterTreeNode) => node.id !== nodeId);
  const siblingIds = getSortedSiblingIds(withoutDragged, targetParentId);
  const insertIndex = clampIndex(
    targetIndex ?? siblingIds.length,
    0,
    siblingIds.length
  );
  siblingIds.splice(insertIndex, 0, nodeId);

  const previousParentId = draggedNode.parentId;
  const previousSiblingIds =
    previousParentId !== targetParentId
      ? getSortedSiblingIds(withoutDragged, previousParentId)
      : [];

  const sortOrderById = new Map<string, number>();
  siblingIds.forEach((id: string, index: number) => {
    sortOrderById.set(id, index);
  });
  previousSiblingIds.forEach((id: string, index: number) => {
    sortOrderById.set(id, index);
  });

  const next = normalized.map((node: MasterTreeNode) => {
    if (node.id === nodeId) {
      return {
        ...node,
        parentId: targetParentId,
        sortOrder: sortOrderById.get(node.id) ?? 0,
      };
    }
    const sortOrder = sortOrderById.get(node.id);
    if (sortOrder === undefined) return node;
    return {
      ...node,
      sortOrder,
    };
  });

  return {
    ok: true,
    nodes: normalizeMasterTreeNodes(next),
  };
};

export const reorderMasterTreeNode = ({
  nodes,
  nodeId,
  targetId,
  position,
  profile,
}: ReorderMasterTreeNodeInput): MasterTreeMutationResult => {
  const normalized = normalizeMasterTreeNodes(nodes);
  const nodeMap = createNodeMap(normalized);
  if (!nodeMap.has(nodeId)) {
    return { ok: false, code: 'NODE_NOT_FOUND', nodes: normalized };
  }
  const targetNode = nodeMap.get(targetId);
  if (!targetNode) {
    return { ok: false, code: 'TARGET_NOT_FOUND', nodes: normalized };
  }

  const dropCheck = canDropMasterTreeNode({
    nodes: normalized,
    nodeId,
    targetId,
    position,
    profile,
  });
  if (!dropCheck.ok) {
    return { ok: false, code: dropCheck.reason ?? 'PROFILE_RULE_BLOCKED', nodes: normalized };
  }

  if (position === 'inside') {
    return moveMasterTreeNode({
      nodes: normalized,
      nodeId,
      targetParentId: targetId,
      profile,
    });
  }

  const targetParentId = targetNode.parentId ?? null;
  const siblingIds = getSortedSiblingIds(normalized, targetParentId, nodeId);
  const anchorIndex = siblingIds.findIndex((id: string) => id === targetId);
  if (anchorIndex < 0) {
    return { ok: false, code: 'TARGET_NOT_FOUND', nodes: normalized };
  }

  const nextIndex = position === 'before' ? anchorIndex : anchorIndex + 1;
  return moveMasterTreeNode({
    nodes: normalized,
    nodeId,
    targetParentId,
    targetIndex: nextIndex,
    profile,
  });
};

export const dropMasterTreeNodeToRoot = ({
  nodes,
  nodeId,
  targetIndex,
  profile,
}: Omit<MoveMasterTreeNodeInput, 'targetParentId'>): MasterTreeMutationResult =>
  moveMasterTreeNode({
    nodes,
    nodeId,
    targetParentId: null,
    targetIndex,
    profile,
  });
