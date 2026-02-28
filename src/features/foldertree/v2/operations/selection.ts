import type { MasterTreeId } from '@/shared/utils/master-folder-tree-contract';

import type { FolderTreeNodeView } from '../types';

export type MultiSelectionMode = 'single' | 'toggle' | 'range' | 'all';

/**
 * Resolves the next `selectedNodeIds` array based on the selection mode.
 *
 * - `single`:  Replace selection with just this node.
 * - `toggle`:  Add the node if not selected; remove it if already selected.
 * - `range`:   Select the contiguous visible slice between anchorId and nodeId.
 * - `all`:     Select every node ID provided in visibleRows.
 */
export const resolveNextSelectedNodeIds = ({
  mode,
  nodeId,
  anchorId,
  currentSelectedIds,
  visibleRows,
}: {
  mode: MultiSelectionMode;
  nodeId: MasterTreeId;
  anchorId?: MasterTreeId | undefined;
  currentSelectedIds: MasterTreeId[];
  visibleRows: FolderTreeNodeView[];
}): MasterTreeId[] => {
  switch (mode) {
    case 'single': {
      return [nodeId];
    }
    case 'toggle': {
      const next = new Set(currentSelectedIds);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return Array.from(next);
    }
    case 'range': {
      const anchor = anchorId ?? nodeId;
      const fromIdx = visibleRows.findIndex((r) => r.nodeId === anchor);
      const toIdx = visibleRows.findIndex((r) => r.nodeId === nodeId);
      if (fromIdx === -1 || toIdx === -1) return [nodeId];
      const lo = Math.min(fromIdx, toIdx);
      const hi = Math.max(fromIdx, toIdx);
      return visibleRows.slice(lo, hi + 1).map((r) => r.nodeId);
    }
    case 'all': {
      return visibleRows.map((r) => r.nodeId);
    }
    default: {
      return currentSelectedIds;
    }
  }
};

/** Returns true when a node ID is part of the current multi-selection. */
export const isNodeInSelection = (
  selectedIds: MasterTreeId[],
  nodeId: MasterTreeId
): boolean => selectedIds.includes(nodeId);

/**
 * Returns the first and last visible node IDs within the current selection.
 * Useful for keyboard Shift+Home / Shift+End operations.
 */
export const getSelectionBoundary = (
  selectedIds: MasterTreeId[],
  visibleRows: FolderTreeNodeView[]
): { firstId: MasterTreeId | null; lastId: MasterTreeId | null } => {
  const selectedSet = new Set(selectedIds);
  const inSelection = visibleRows.filter((r) => selectedSet.has(r.nodeId));
  return {
    firstId: inSelection[0]?.nodeId ?? null,
    lastId: inSelection[inSelection.length - 1]?.nodeId ?? null,
  };
};
