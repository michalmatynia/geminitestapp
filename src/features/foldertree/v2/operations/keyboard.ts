import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeId } from '@/shared/utils/master-folder-tree-contract';

import type { FolderTreeNodeView } from '../types';

export type MasterTreeKeyboardAction =
  | { type: 'select'; nodeId: MasterTreeId }
  | { type: 'expand'; nodeId: MasterTreeId }
  | { type: 'collapse'; nodeId: MasterTreeId }
  | { type: 'start_rename'; nodeId: MasterTreeId }
  | { type: 'cancel_rename' }
  | { type: 'commit_rename' }
  | { type: 'request_delete'; nodeId: MasterTreeId }
  | { type: 'scroll_to'; nodeId: MasterTreeId };

export type MasterTreeKeyboardHandlerInput = {
  event: KeyboardEvent;
  controller: MasterFolderTreeController;
  visibleRows: FolderTreeNodeView[];
};

const getSelectedIndex = (
  visibleRows: FolderTreeNodeView[],
  selectedNodeId: MasterTreeId | null
): number => {
  if (!selectedNodeId) return -1;
  return visibleRows.findIndex((r) => r.nodeId === selectedNodeId);
};

/**
 * Pure function that resolves a keyboard action from a keydown event.
 * Returns null when the event should not be handled by the tree.
 */
export const resolveKeyboardAction = ({
  event,
  controller,
  visibleRows,
}: MasterTreeKeyboardHandlerInput): MasterTreeKeyboardAction | null => {
  // Don't interfere when modifier keys (except Shift) are held
  if (event.metaKey || event.ctrlKey || event.altKey) return null;

  const { selectedNodeId, renamingNodeId } = controller;

  // When renaming, only Enter and Escape are handled
  if (renamingNodeId) {
    if (event.key === 'Enter') return { type: 'commit_rename' };
    if (event.key === 'Escape') return { type: 'cancel_rename' };
    return null;
  }

  if (!selectedNodeId) {
    // If nothing is selected and user presses arrow, select first visible node
    if ((event.key === 'ArrowDown' || event.key === 'Home') && visibleRows.length > 0) {
      const first = visibleRows[0];
      return first ? { type: 'select', nodeId: first.nodeId } : null;
    }
    if (event.key === 'End' && visibleRows.length > 0) {
      const last = visibleRows[visibleRows.length - 1];
      return last ? { type: 'select', nodeId: last.nodeId } : null;
    }
    return null;
  }

  const currentIndex = getSelectedIndex(visibleRows, selectedNodeId);
  const currentRow = currentIndex !== -1 ? visibleRows[currentIndex] : null;

  switch (event.key) {
    case 'ArrowDown': {
      const nextRow = visibleRows[currentIndex + 1];
      if (nextRow) return { type: 'select', nodeId: nextRow.nodeId };
      return null;
    }
    case 'ArrowUp': {
      const prevRow = visibleRows[currentIndex - 1];
      if (prevRow) return { type: 'select', nodeId: prevRow.nodeId };
      return null;
    }
    case 'ArrowRight': {
      if (!currentRow) return null;
      if (currentRow.hasChildren && !currentRow.isExpanded) {
        return { type: 'expand', nodeId: selectedNodeId };
      }
      // Already expanded — move into first child
      if (currentRow.isExpanded) {
        const firstChild = visibleRows[currentIndex + 1];
        if (firstChild?.parentId === selectedNodeId) {
          return { type: 'select', nodeId: firstChild.nodeId };
        }
      }
      return null;
    }
    case 'ArrowLeft': {
      if (!currentRow) return null;
      if (currentRow.hasChildren && currentRow.isExpanded) {
        return { type: 'collapse', nodeId: selectedNodeId };
      }
      // Move to parent
      if (currentRow.parentId) {
        return { type: 'select', nodeId: currentRow.parentId };
      }
      return null;
    }
    case 'Home': {
      const firstRow = visibleRows[0];
      if (firstRow && firstRow.nodeId !== selectedNodeId) {
        return { type: 'select', nodeId: firstRow.nodeId };
      }
      return null;
    }
    case 'End': {
      const lastRow = visibleRows[visibleRows.length - 1];
      if (lastRow && lastRow.nodeId !== selectedNodeId) {
        return { type: 'select', nodeId: lastRow.nodeId };
      }
      return null;
    }
    case 'Enter': {
      return { type: 'start_rename', nodeId: selectedNodeId };
    }
    case 'Escape': {
      return { type: 'cancel_rename' };
    }
    case 'Delete':
    case 'Backspace': {
      return { type: 'request_delete', nodeId: selectedNodeId };
    }
    default:
      return null;
  }
};
