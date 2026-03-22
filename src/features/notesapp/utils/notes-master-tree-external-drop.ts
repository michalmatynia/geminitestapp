import {
  isInternalMasterTreeNode,
  resolveRootTopReorderAnchor,
  type MasterTreeRootDropZone,
} from '@/features/foldertree/public';
import type { NotesExternalDropAction } from '@/shared/contracts/notes';
import type { MasterTreeId, MasterTreeNode } from '@/shared/utils';

import {
  fromFolderMasterNodeId,
  fromNoteMasterNodeId,
  isFolderMasterNodeId,
  isNoteMasterNodeId,
} from './master-folder-tree';
import { resolveNotesFolderTargetForNode } from './notes-master-tree-adapter';

export const canDropNotesNode = ({
  draggedNodeId,
  targetId,
  nodes,
}: {
  draggedNodeId: MasterTreeId;
  targetId: MasterTreeId | null;
  nodes: MasterTreeNode[];
}): boolean => {
  if (isNoteMasterNodeId(draggedNodeId) && targetId && isNoteMasterNodeId(targetId)) {
    return true;
  }

  const isInternal = isInternalMasterTreeNode(nodes, draggedNodeId);
  if (isInternal) return false;

  return isNoteMasterNodeId(draggedNodeId) || isFolderMasterNodeId(draggedNodeId);
};

export const resolveNotesExternalDropAction = ({
  draggedNodeId,
  targetId,
  nodes,
  roots,
  rootDropZone,
}: {
  draggedNodeId: MasterTreeId;
  targetId: MasterTreeId | null;
  nodes: MasterTreeNode[];
  roots: MasterTreeNode[];
  rootDropZone?: MasterTreeRootDropZone | undefined;
}): NotesExternalDropAction | null => {
  const draggedNoteId = fromNoteMasterNodeId(draggedNodeId);
  const draggedFolderId = fromFolderMasterNodeId(draggedNodeId);
  const targetNoteId = targetId ? fromNoteMasterNodeId(targetId) : null;
  const targetFolderId = resolveNotesFolderTargetForNode(nodes, targetId);

  if (draggedNoteId && targetNoteId && draggedNoteId !== targetNoteId) {
    return {
      type: 'relate_notes',
      noteId: draggedNoteId,
      targetNoteId,
    };
  }

  if (draggedNoteId) {
    return {
      type: 'move_note',
      noteId: draggedNoteId,
      targetFolderId,
    };
  }

  if (!draggedFolderId) return null;

  if (!targetId && rootDropZone === 'top') {
    const anchorFolderId = resolveRootTopReorderAnchor({
      roots,
      decodeNodeId: fromFolderMasterNodeId,
      draggedEntityId: draggedFolderId,
    });
    if (anchorFolderId) {
      return {
        type: 'reorder_folder_root_top',
        folderId: draggedFolderId,
        anchorFolderId,
      };
    }
  }

  return {
    type: 'move_folder',
    folderId: draggedFolderId,
    targetFolderId,
  };
};
