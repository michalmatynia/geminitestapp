import { describe, expect, it } from 'vitest';

import {
  toFolderMasterNodeId,
  toSlotMasterNodeId,
} from '@/features/ai/image-studio/utils/master-folder-tree';
import {
  canDropImageStudioExternalNode,
  resolveImageStudioExternalDropAction,
} from '@/features/ai/image-studio/utils/studio-master-tree-external-drop';
import { defaultFolderTreeProfilesV2 } from '@/shared/utils/folder-tree-profiles-v2';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const folderNode = (
  folderPath: string,
  parentId: string | null,
  sortOrder: number
): MasterTreeNode => ({
  id: toFolderMasterNodeId(folderPath),
  type: 'folder',
  kind: 'folder',
  parentId,
  name: folderPath,
  path: folderPath,
  sortOrder,
});

describe('canDropImageStudioExternalNode', () => {
  it('allows card drops to root when profile allows file-to-root', () => {
    const allowed = canDropImageStudioExternalNode({
      draggedNodeId: toSlotMasterNodeId('slot-1'),
      targetId: null,
      nodes: [],
      profile: defaultFolderTreeProfilesV2.image_studio,
    });

    expect(allowed).toBe(true);
  });

  it('blocks folder drops into own subtree', () => {
    const parentId = toFolderMasterNodeId('workspace');
    const nodes: MasterTreeNode[] = [
      folderNode('workspace', null, 0),
      folderNode('workspace/child', parentId, 0),
    ];
    const allowed = canDropImageStudioExternalNode({
      draggedNodeId: toFolderMasterNodeId('workspace'),
      targetId: toFolderMasterNodeId('workspace/child'),
      nodes,
      profile: defaultFolderTreeProfilesV2.image_studio,
    });

    expect(allowed).toBe(false);
  });
});

describe('resolveImageStudioExternalDropAction', () => {
  it('resolves slot drops to move-slot action', () => {
    const targetId = toFolderMasterNodeId('assets');
    const nodes: MasterTreeNode[] = [folderNode('assets', null, 0)];
    const action = resolveImageStudioExternalDropAction({
      draggedNodeId: toSlotMasterNodeId('slot-1'),
      targetId,
      nodes,
    });

    expect(action).toEqual({
      type: 'move_slot',
      slotId: 'slot-1',
      targetFolder: 'assets',
    });
  });

  it('resolves movable folder drops to move-folder action', () => {
    const targetId = toFolderMasterNodeId('workspace');
    const nodes: MasterTreeNode[] = [folderNode('workspace', null, 0)];
    const action = resolveImageStudioExternalDropAction({
      draggedNodeId: toFolderMasterNodeId('assets'),
      targetId,
      nodes,
    });

    expect(action).toEqual({
      type: 'move_folder',
      folderPath: 'assets',
      targetFolder: 'workspace',
    });
  });
});
