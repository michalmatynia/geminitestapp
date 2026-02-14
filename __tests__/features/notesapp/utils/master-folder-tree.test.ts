import { describe, expect, it } from 'vitest';

import {
  buildMasterNodesFromNotesFolderTree,
  fromFolderMasterNodeId,
  fromNoteMasterNodeId,
  isFolderMasterNodeId,
  isNoteMasterNodeId,
  toFolderMasterNodeId,
  toNoteMasterNodeId,
} from '@/features/notesapp/utils/master-folder-tree';
import type { CategoryWithChildren } from '@/shared/types/domain/notes';

const createTree = (): CategoryWithChildren[] => [
  {
    id: 'f-1',
    name: 'Work',
    parentId: null,
    children: [
      {
        id: 'f-1-1',
        name: 'Projects',
        parentId: 'f-1',
        children: [],
        notes: [
          {
            id: 'n-2',
            title: 'Beta',
            content: '',
            editorType: 'markdown',
            color: null,
            isPinned: false,
            isArchived: false,
            isFavorite: false,
            notebookId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    ],
    notes: [
      {
        id: 'n-1',
        title: 'Alpha',
        content: '',
        editorType: 'markdown',
        color: null,
        isPinned: false,
        isArchived: false,
        isFavorite: false,
        notebookId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
];

describe('notesapp master-folder-tree adapter', () => {
  it('encodes and decodes folder/note node ids', () => {
    const folderNodeId = toFolderMasterNodeId('folder-1');
    const noteNodeId = toNoteMasterNodeId('note-1');

    expect(isFolderMasterNodeId(folderNodeId)).toBe(true);
    expect(isNoteMasterNodeId(folderNodeId)).toBe(false);
    expect(fromFolderMasterNodeId(folderNodeId)).toBe('folder-1');
    expect(fromNoteMasterNodeId(folderNodeId)).toBeNull();

    expect(isNoteMasterNodeId(noteNodeId)).toBe(true);
    expect(isFolderMasterNodeId(noteNodeId)).toBe(false);
    expect(fromNoteMasterNodeId(noteNodeId)).toBe('note-1');
    expect(fromFolderMasterNodeId(noteNodeId)).toBeNull();
  });

  it('builds hierarchical master nodes from notes folder tree', () => {
    const nodes = buildMasterNodesFromNotesFolderTree(createTree());

    const work = nodes.find((node) => node.id === 'folder:f-1');
    const projects = nodes.find((node) => node.id === 'folder:f-1-1');
    const alpha = nodes.find((node) => node.id === 'note:n-1');
    const beta = nodes.find((node) => node.id === 'note:n-2');

    expect(work?.parentId).toBeNull();
    expect(projects?.parentId).toBe('folder:f-1');
    expect(alpha?.parentId).toBe('folder:f-1');
    expect(beta?.parentId).toBe('folder:f-1-1');
    expect(alpha?.path).toContain('Work/Alpha');
    expect(beta?.path).toContain('Work/Projects/Beta');
  });
});
