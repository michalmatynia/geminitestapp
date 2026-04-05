import type { ReorderValidationPatternUpdatePayload } from '@/features/products/api/settings';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import type { SequenceGroupView } from '@/shared/contracts/products/drafts';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

// ─── Constants ───────────────────────────────────────────────────────────────

export const VALIDATOR_SORT_ORDER_GAP = 1000;

const SEQ_GROUP_PREFIX = 'vseq_group:';
const PATTERN_PREFIX = 'vpat:';

// ─── ID helpers ──────────────────────────────────────────────────────────────

export const toSeqGroupMasterNodeId = (groupId: string): string => `${SEQ_GROUP_PREFIX}${groupId}`;

export const fromSeqGroupMasterNodeId = (nodeId: string): string | null => {
  if (!nodeId.startsWith(SEQ_GROUP_PREFIX)) return null;
  const value = nodeId.slice(SEQ_GROUP_PREFIX.length).trim();
  return value || null;
};

export const toPatternMasterNodeId = (patternId: string): string => `${PATTERN_PREFIX}${patternId}`;

export const fromPatternMasterNodeId = (nodeId: string): string | null => {
  if (!nodeId.startsWith(PATTERN_PREFIX)) return null;
  const value = nodeId.slice(PATTERN_PREFIX.length).trim();
  return value || null;
};

// ─── Metadata types ──────────────────────────────────────────────────────────

type ValidatorGroupNodeMetadata = {
  groupId: string;
  label: string;
  debounceMs: number;
};

type ValidatorPatternNodeMetadata = {
  patternId: string;
};

// ─── Slugify helper ───────────────────────────────────────────────────────────

const slugifySegment = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'item';
};

// ─── Build: domain → MasterTreeNode[] ────────────────────────────────────────

/**
 * Converts ordered patterns + sequence groups into a flat MasterTreeNode list
 * suitable for the MasterFolderTree engine.
 *
 * – Each sequence group becomes a `folder` node (kind: 'sequence-group') at root.
 * – Each pattern becomes a `file` node (kind: 'pattern').
 *   Grouped patterns get parentId pointing to their group folder.
 *   Standalone patterns get parentId: null.
 */
export function buildValidatorPatternMasterNodes(
  orderedPatterns: ProductValidationPattern[],
  sequenceGroups: Map<string, SequenceGroupView>
): MasterTreeNode[] {
  const nodes: MasterTreeNode[] = [];
  const emittedGroupIds = new Set<string>();
  const groupFirstPosition = new Map<string, number>();

  // First pass: record which position each group first appears at
  orderedPatterns.forEach((pattern, index) => {
    const groupId = pattern.sequenceGroupId?.trim() || null;
    if (groupId && !groupFirstPosition.has(groupId) && sequenceGroups.has(groupId)) {
      groupFirstPosition.set(groupId, index);
    }
  });

  // Emit group folder nodes (at root level)
  groupFirstPosition.forEach((position, groupId) => {
    if (emittedGroupIds.has(groupId)) return;
    emittedGroupIds.add(groupId);

    const group = sequenceGroups.get(groupId);
    const label = group?.label ?? 'Sequence / Group';
    nodes.push({
      id: toSeqGroupMasterNodeId(groupId),
      type: 'folder',
      kind: 'sequence-group',
      parentId: null,
      name: label,
      path: slugifySegment(label),
      sortOrder: position * VALIDATOR_SORT_ORDER_GAP,
      metadata: {
        validatorGroup: {
          groupId,
          label,
          debounceMs: group?.debounceMs ?? 0,
        } satisfies ValidatorGroupNodeMetadata,
      },
    });
  });

  // Emit pattern file nodes
  orderedPatterns.forEach((pattern, index) => {
    const groupId = pattern.sequenceGroupId?.trim() || null;
    const isGrouped = groupId !== null && emittedGroupIds.has(groupId);
    const parentId = isGrouped ? toSeqGroupMasterNodeId(groupId) : null;
    const sortOrder =
      typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)
        ? pattern.sequence
        : (index + 1) * VALIDATOR_SORT_ORDER_GAP;
    const pathSegment = slugifySegment(pattern.label || pattern.id);
    const path = parentId ? `${slugifySegment(groupId ?? 'group')}/${pathSegment}` : pathSegment;

    nodes.push({
      id: toPatternMasterNodeId(pattern.id),
      type: 'file',
      kind: 'pattern',
      parentId,
      name: pattern.label,
      path,
      sortOrder,
      metadata: {
        validatorPattern: {
          patternId: pattern.id,
        } satisfies ValidatorPatternNodeMetadata,
      },
    });
  });

  return nodes;
}

// ─── DFS helpers ─────────────────────────────────────────────────────────────

/** Returns pattern IDs in DFS display order (group folder opens, then its children, then next sibling) */
function computeDfsPatternOrder(nodes: MasterTreeNode[]): string[] {
  const childrenByParent = new Map<string | null, MasterTreeNode[]>();

  nodes.forEach((node) => {
    const parentId = node.parentId ?? null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(parentId, siblings);
  });

  childrenByParent.forEach((siblings) => {
    siblings.sort((a, b) => {
      const delta = a.sortOrder - b.sortOrder;
      return delta !== 0 ? delta : a.id.localeCompare(b.id);
    });
  });

  const result: string[] = [];

  const dfs = (parentId: string | null): void => {
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.forEach((node) => {
      if (node.type === 'file') {
        const patternId = fromPatternMasterNodeId(node.id);
        if (patternId) result.push(patternId);
      } else {
        // folder: recurse into its children
        dfs(node.id);
      }
    });
  };

  dfs(null);
  return result;
}

/** Returns a map of patternId → parent group folder node id (or null if standalone) */
function buildPatternParentMap(nodes: MasterTreeNode[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  nodes.forEach((node) => {
    const patternId = fromPatternMasterNodeId(node.id);
    if (patternId) {
      map.set(patternId, node.parentId ?? null);
    }
  });
  return map;
}

// ─── Diff: previous tree → next tree → minimal API update list ───────────────

/**
 * Compares the tree state before and after a drag operation and returns only the
 * records that need to be sent to the API — fixing the O(n) reorder bottleneck.
 *
 * – Standalone-to-standalone reorder: typically 1–a few updates
 * – Moving into/out of a group: the moved pattern + affected siblings
 * – Reordering a whole group folder: patterns in that group
 */
export function resolveValidatorPatternReorderUpdates(args: {
  previousNodes: MasterTreeNode[];
  nextNodes: MasterTreeNode[];
}): ReorderValidationPatternUpdatePayload[] {
  const prevOrder = computeDfsPatternOrder(args.previousNodes);
  const nextOrder = computeDfsPatternOrder(args.nextNodes);

  const prevIndexById = new Map<string, number>(prevOrder.map((id, i) => [id, i]));

  const nextParentById = buildPatternParentMap(args.nextNodes);
  const prevParentById = buildPatternParentMap(args.previousNodes);

  const updates: ReorderValidationPatternUpdatePayload[] = [];

  nextOrder.forEach((patternId, nextIndex) => {
    const newSequence = (nextIndex + 1) * VALIDATOR_SORT_ORDER_GAP;

    const newGroupFolderId = nextParentById.get(patternId) ?? null;
    const newGroupId = newGroupFolderId ? fromSeqGroupMasterNodeId(newGroupFolderId) : null;

    const prevIndex = prevIndexById.get(patternId);
    const oldSequence = prevIndex !== undefined ? (prevIndex + 1) * VALIDATOR_SORT_ORDER_GAP : null;

    const oldGroupFolderId = prevParentById.get(patternId) ?? null;
    const oldGroupId = oldGroupFolderId ? fromSeqGroupMasterNodeId(oldGroupFolderId) : null;

    const sequenceChanged = oldSequence !== newSequence;
    const groupChanged = oldGroupId !== newGroupId;

    if (!sequenceChanged && !groupChanged) return;

    // Resolve group metadata from next nodes
    const groupNode = newGroupFolderId
      ? args.nextNodes.find((n) => n.id === newGroupFolderId)
      : null;
    const groupMeta =
      groupNode?.metadata && typeof groupNode.metadata === 'object'
        ? (groupNode.metadata as { validatorGroup?: ValidatorGroupNodeMetadata }).validatorGroup
        : undefined;

    const update: ReorderValidationPatternUpdatePayload = {
      id: patternId,
      sequence: newSequence,
      sequenceGroupId: newGroupId ?? null,
    };

    if (groupChanged) {
      update.sequenceGroupLabel = groupMeta?.label ?? null;
      update.sequenceGroupDebounceMs = groupMeta?.debounceMs ?? 0;
    }

    updates.push(update);
  });

  return updates;
}

// ─── Reverse: MasterTreeNode[] → ProductValidationPattern[] ─────────────────

/**
 * Reconstructs an ordered ProductValidationPattern list from tree nodes.
 * Used for full refreshes (e.g. after bulk import).
 */
export function rebuildValidatorPatternListFromMasterNodes(args: {
  nodes: MasterTreeNode[];
  patternById: Map<string, ProductValidationPattern>;
}): ProductValidationPattern[] {
  const dfsOrder = computeDfsPatternOrder(args.nodes);
  const parentById = buildPatternParentMap(args.nodes);

  return dfsOrder
    .map((patternId, index): ProductValidationPattern | null => {
      const pattern = args.patternById.get(patternId);
      if (!pattern) return null;

      const groupFolderId = parentById.get(patternId) ?? null;
      const groupId = groupFolderId ? fromSeqGroupMasterNodeId(groupFolderId) : null;

      const groupNode = groupFolderId ? args.nodes.find((n) => n.id === groupFolderId) : null;
      const groupMeta =
        groupNode?.metadata && typeof groupNode.metadata === 'object'
          ? (groupNode.metadata as { validatorGroup?: ValidatorGroupNodeMetadata }).validatorGroup
          : undefined;

      return {
        ...pattern,
        sequence: (index + 1) * VALIDATOR_SORT_ORDER_GAP,
        sequenceGroupId: groupId ?? pattern.sequenceGroupId,
        sequenceGroupLabel: groupMeta?.label ?? pattern.sequenceGroupLabel,
        sequenceGroupDebounceMs: groupMeta?.debounceMs ?? pattern.sequenceGroupDebounceMs,
      };
    })
    .filter((p): p is ProductValidationPattern => p !== null);
}
