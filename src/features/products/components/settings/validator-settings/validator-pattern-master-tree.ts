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
  return value.length > 0 ? value : null;
};

export const toPatternMasterNodeId = (patternId: string): string => `${PATTERN_PREFIX}${patternId}`;

export const fromPatternMasterNodeId = (nodeId: string): string | null => {
  if (!nodeId.startsWith(PATTERN_PREFIX)) return null;
  const value = nodeId.slice(PATTERN_PREFIX.length).trim();
  return value.length > 0 ? value : null;
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

type ReorderUpdateInput = {
  patternId: string;
  sequence: number;
  sequenceGroupId: string | null;
  groupChanged: boolean;
  groupMeta: ValidatorGroupNodeMetadata | undefined;
};

// ─── Slugify helper ───────────────────────────────────────────────────────────

const slugifySegment = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length > 0 ? normalized : 'item';
};

const getPatternSequenceGroupId = (pattern: ProductValidationPattern): string | null => {
  const groupId = pattern.sequenceGroupId?.trim();
  return groupId !== undefined && groupId.length > 0 ? groupId : null;
};

const getGroupIdFromParent = (parentId: string | null): string | null =>
  parentId !== null ? fromSeqGroupMasterNodeId(parentId) : null;

const getValidatorGroupMetadata = (
  node: MasterTreeNode | null | undefined
): ValidatorGroupNodeMetadata | undefined =>
  node?.metadata !== undefined
    ? (node.metadata as { validatorGroup?: ValidatorGroupNodeMetadata }).validatorGroup
    : undefined;

const getSequenceForIndex = (index: number): number => (index + 1) * VALIDATOR_SORT_ORDER_GAP;

const getPreviousSequence = (prevIndex: number | undefined): number | null =>
  prevIndex !== undefined ? getSequenceForIndex(prevIndex) : null;

const findNodeById = (nodes: MasterTreeNode[], nodeId: string | null): MasterTreeNode | null =>
  nodeId !== null ? nodes.find((node) => node.id === nodeId) ?? null : null;

const hasNoReorderChange = (
  oldSequence: number | null,
  newSequence: number,
  oldGroupId: string | null,
  newGroupId: string | null
): boolean => oldSequence === newSequence && oldGroupId === newGroupId;

const getPatternParentId = (
  parentById: Map<string, string | null>,
  patternId: string
): string | null => parentById.get(patternId) ?? null;

const buildReorderUpdate = ({
  patternId,
  sequence,
  sequenceGroupId,
  groupChanged,
  groupMeta,
}: ReorderUpdateInput): ReorderValidationPatternUpdatePayload => {
  const update: ReorderValidationPatternUpdatePayload = { id: patternId, sequence, sequenceGroupId };
  if (!groupChanged) return update;
  return {
    ...update,
    sequenceGroupLabel: groupMeta?.label ?? null,
    sequenceGroupDebounceMs: groupMeta?.debounceMs ?? 0,
  };
};

const buildSequenceGroupNode = (
  groupId: string,
  position: number,
  group: SequenceGroupView | undefined
): MasterTreeNode => {
  const label = group?.label ?? 'Sequence / Group';
  return {
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
  };
};

const getPatternSortOrder = (pattern: ProductValidationPattern, index: number): number =>
  typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)
    ? pattern.sequence
    : getSequenceForIndex(index);

const getPatternPath = (
  pattern: ProductValidationPattern,
  groupId: string | null,
  parentId: string | null
): string => {
  const label = pattern.label.trim().length > 0 ? pattern.label : pattern.id;
  const pathSegment = slugifySegment(label);
  return parentId !== null ? `${slugifySegment(groupId ?? 'group')}/${pathSegment}` : pathSegment;
};

const buildPatternNode = (
  pattern: ProductValidationPattern,
  index: number,
  emittedGroupIds: Set<string>
): MasterTreeNode => {
  const groupId = getPatternSequenceGroupId(pattern);
  const isGrouped = groupId !== null && emittedGroupIds.has(groupId);
  const parentId = isGrouped ? toSeqGroupMasterNodeId(groupId) : null;
  return {
    id: toPatternMasterNodeId(pattern.id),
    type: 'file',
    kind: 'pattern',
    parentId,
    name: pattern.label,
    path: getPatternPath(pattern, groupId, parentId),
    sortOrder: getPatternSortOrder(pattern, index),
    metadata: {
      validatorPattern: {
        patternId: pattern.id,
      } satisfies ValidatorPatternNodeMetadata,
    },
  };
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

  orderedPatterns.forEach((pattern, index) => {
    const groupId = getPatternSequenceGroupId(pattern);
    if (groupId !== null && !groupFirstPosition.has(groupId) && sequenceGroups.has(groupId)) {
      groupFirstPosition.set(groupId, index);
    }
  });

  groupFirstPosition.forEach((position, groupId) => {
    if (emittedGroupIds.has(groupId)) return;
    emittedGroupIds.add(groupId);
    nodes.push(buildSequenceGroupNode(groupId, position, sequenceGroups.get(groupId)));
  });

  orderedPatterns.forEach((pattern, index) => {
    nodes.push(buildPatternNode(pattern, index, emittedGroupIds));
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
        if (patternId !== null) result.push(patternId);
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
    if (patternId !== null) {
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
    const newSequence = getSequenceForIndex(nextIndex);

    const newGroupFolderId = getPatternParentId(nextParentById, patternId);
    const newGroupId = getGroupIdFromParent(newGroupFolderId);

    const prevIndex = prevIndexById.get(patternId);
    const oldSequence = getPreviousSequence(prevIndex);

    const oldGroupFolderId = getPatternParentId(prevParentById, patternId);
    const oldGroupId = getGroupIdFromParent(oldGroupFolderId);

    const groupChanged = oldGroupId !== newGroupId;
    if (hasNoReorderChange(oldSequence, newSequence, oldGroupId, newGroupId)) return;

    const groupNode = findNodeById(args.nextNodes, newGroupFolderId);
    const groupMeta = getValidatorGroupMetadata(groupNode);
    const update = buildReorderUpdate({
      patternId,
      sequence: newSequence,
      sequenceGroupId: newGroupId,
      groupChanged,
      groupMeta,
    });

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
      if (pattern === undefined) return null;

      const groupFolderId = parentById.get(patternId) ?? null;
      const groupId = getGroupIdFromParent(groupFolderId);

      const groupNode = findNodeById(args.nodes, groupFolderId);
      const groupMeta = getValidatorGroupMetadata(groupNode);

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
