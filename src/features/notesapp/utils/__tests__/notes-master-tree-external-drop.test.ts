import { describe, expect, it } from 'vitest';

import {
  toFolderMasterNodeId,
  toNoteMasterNodeId,
} from '@/features/notesapp/utils/master-folder-tree';
import {
  canDropNotesNode,
  resolveNotesExternalDropAction,
} from '@/features/notesapp/utils/notes-master-tree-external-drop';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const folderNode = (
  id: string,
  parentId: string | null,
  sortOrder: number,
): MasterTreeNode => ({
  id: toFolderMasterNodeId(id),
  type: 'folder',
  kind: 'folder',
  parentId,
  name: id,
  path: id,
  sortOrder,
});

const noteNode = (
  id: string,
  parentId: string,
  sortOrder: number,
): MasterTreeNode => ({
  id: toNoteMasterNodeId(id),
  type: 'file',
  kind: 'note',
  parentId,
  name: id,
  path: id,
  sortOrder,
});

describe('canDropNotesNode', () => {
  it('allows note to note external relation drops', () => {
    const allowed = canDropNotesNode({
      draggedNodeId: toNoteMasterNodeId('note-a'),
      targetId: toNoteMasterNodeId('note-b'),
      nodes: [],
    });

    expect(allowed).toBe(true);
  });

  it('blocks internal master node drops', () => {
    const nodes = [folderNode('work', null, 0)];
    const allowed = canDropNotesNode({
      draggedNodeId: toFolderMasterNodeId('work'),
      targetId: null,
      nodes,
    });

    expect(allowed).toBe(false);
  });
});

describe('resolveNotesExternalDropAction', () => {
  it('resolves note-to-note drops as relation action', () => {
    const folderId = toFolderMasterNodeId('work');
    const nodes: MasterTreeNode[] = [
      folderNode('work', null, 0),
      noteNode('note-b', folderId, 0),
    ];
    const action = resolveNotesExternalDropAction({
      draggedNodeId: toNoteMasterNodeId('note-a'),
      targetId: toNoteMasterNodeId('note-b'),
      nodes,
      roots: nodes,
    });

    expect(action).toEqual({
      type: 'relate_notes',
      noteId: 'note-a',
      targetNoteId: 'note-b',
    });
  });

  it('resolves root-top folder drops as reorder action with anchor', () => {
    const roots: MasterTreeNode[] = [
      folderNode('alpha', null, 0),
      folderNode('beta', null, 1),
    ];
    const action = resolveNotesExternalDropAction({
      draggedNodeId: toFolderMasterNodeId('beta'),
      targetId: null,
      nodes: roots,
      roots,
      rootDropZone: 'top',
    });

    expect(action).toEqual({
      type: 'reorder_folder_root_top',
      folderId: 'beta',
      anchorFolderId: 'alpha',
    });
  });

  it('resolves note drops to move-note action with folder target', () => {
    const folderId = toFolderMasterNodeId('work');
    const nodes: MasterTreeNode[] = [folderNode('work', null, 0)];
    const action = resolveNotesExternalDropAction({
      draggedNodeId: toNoteMasterNodeId('note-a'),
      targetId: folderId,
      nodes,
      roots: nodes,
    });

    expect(action).toEqual({
      type: 'move_note',
      noteId: 'note-a',
      targetFolderId: 'work',
    });
  });
});
