import {
  isInternalMasterTreeNode,
  resolveRootTopReorderAnchor,
  type MasterTreeRootDropZone,
} from '@/shared/lib/foldertree/public';
import type { NotesExternalDropAction } from '@/shared/contracts/notes';
import type { MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

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
  if (isNoteMasterNodeId(draggedNodeId) && targetId !== null && isNoteMasterNodeId(targetId)) {
    return true;
  }

  const isInternal = isInternalMasterTreeNode(nodes, draggedNodeId);
  if (isInternal) return false;

  return isNoteMasterNodeId(draggedNodeId) || isFolderMasterNodeId(draggedNodeId);
};

const resolveNoteDropAction = (
  draggedNoteId: string | null,
  targetNoteId: string | null,
  targetFolderId: string | null
): NotesExternalDropAction | null => {
  if (draggedNoteId === null || draggedNoteId === '') return null;
  if (targetNoteId !== null && targetNoteId !== '' && draggedNoteId !== targetNoteId) {
    return {
      type: 'relate_notes',
      noteId: draggedNoteId,
      targetNoteId,
    };
  }
  return {
    type: 'move_note',
    noteId: draggedNoteId,
    targetFolderId,
  };
};

const resolveRootFolderReorderAction = (
  roots: MasterTreeNode[],
  draggedFolderId: string | null,
  rootDropZone?: MasterTreeRootDropZone
): NotesExternalDropAction | null => {
  if (draggedFolderId === null || draggedFolderId === '' || rootDropZone !== 'top') return null;
  const anchorFolderId = resolveRootTopReorderAnchor({
    roots,
    decodeNodeId: fromFolderMasterNodeId,
    draggedEntityId: draggedFolderId,
  });
  return anchorFolderId !== null && anchorFolderId !== ''
    ? {
        type: 'reorder_folder_root_top',
        folderId: draggedFolderId,
        anchorFolderId,
      }
    : null;
};

const resolveFolderDropAction = ({
  draggedFolderId,
  targetId,
  targetFolderId,
  roots,
  rootDropZone,
}: {
  draggedFolderId: string | null;
  targetId: MasterTreeId | null;
  targetFolderId: string | null;
  roots: MasterTreeNode[];
  rootDropZone?: MasterTreeRootDropZone;
}): NotesExternalDropAction | null => {
  if (draggedFolderId === null || draggedFolderId === '') return null;
  if (targetId === null) {
    const reorderAction = resolveRootFolderReorderAction(roots, draggedFolderId, rootDropZone);
    if (reorderAction !== null) return reorderAction;
  }
  return {
    type: 'move_folder',
    folderId: draggedFolderId,
    targetFolderId,
  };
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
  const dragged = {
    noteId: fromNoteMasterNodeId(draggedNodeId),
    folderId: fromFolderMasterNodeId(draggedNodeId),
  };
  const target = {
    noteId: targetId !== null ? fromNoteMasterNodeId(targetId) : null,
    folderId: resolveNotesFolderTargetForNode(nodes, targetId),
  };

  return (
    resolveNoteDropAction(dragged.noteId, target.noteId, target.folderId) ??
    resolveFolderDropAction({
      draggedFolderId: dragged.folderId,
      targetId,
      targetFolderId: target.folderId,
      roots,
      rootDropZone,
    })
  );
};
