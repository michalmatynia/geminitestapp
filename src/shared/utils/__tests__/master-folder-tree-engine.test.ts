import { describe, expect, it } from 'vitest';

import { defaultFolderTreeProfilesV2 } from '@/shared/utils/folder-tree-profiles-v2';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import {
  buildMasterTree,
  canDropMasterTreeNode,
  dropMasterTreeNodeToRoot,
  normalizeMasterTreeNodes,
} from '@/shared/utils/master-folder-tree-engine';

const node = (
  overrides: Partial<MasterTreeNode> & Pick<MasterTreeNode, 'id' | 'name'>
): MasterTreeNode => ({
  id: overrides.id,
  type: overrides.type ?? 'file',
  kind: overrides.kind ?? 'note',
  parentId: overrides.parentId ?? null,
  name: overrides.name,
  path: overrides.path ?? overrides.name.toLowerCase(),
  sortOrder: overrides.sortOrder ?? 0,
  icon: overrides.icon ?? null,
  metadata: overrides.metadata,
});

const findNode = (nodes: MasterTreeNode[], id: string): MasterTreeNode | undefined =>
  nodes.find((entry: MasterTreeNode) => entry.id === id);

describe('master-folder-tree-engine', () => {
  it('drops nested file to root when profile allows file-to-root', () => {
    const nodes: MasterTreeNode[] = [
      node({ id: 'folder-a', type: 'folder', kind: 'folder', name: 'Folder A', path: 'folder-a' }),
      node({
        id: 'note-1',
        type: 'file',
        kind: 'note',
        parentId: 'folder-a',
        name: 'Note 1',
        path: 'folder-a/note-1',
      }),
    ];

    const result = dropMasterTreeNodeToRoot({
      nodes,
      nodeId: 'note-1',
      profile: defaultFolderTreeProfilesV2.notes,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const moved = findNode(result.nodes, 'note-1');
    expect(moved?.parentId).toBeNull();
    expect(moved?.path.includes('/')).toBe(false);
  });

  it('allows file drop to root when the profile default allows it', () => {
    const nodes: MasterTreeNode[] = [
      node({
        id: 'cat-root',
        type: 'folder',
        kind: 'category',
        name: 'Root category',
        path: 'root',
      }),
      node({
        id: 'file-1',
        type: 'file',
        kind: 'note',
        parentId: 'cat-root',
        name: 'Detached file',
        path: 'root/file-1',
      }),
    ];

    const result = dropMasterTreeNodeToRoot({
      nodes,
      nodeId: 'file-1',
      profile: defaultFolderTreeProfilesV2.product_categories,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(findNode(result.nodes, 'file-1')?.parentId).toBeNull();
  });

  it('rejects drop inside non-folder targets', () => {
    const nodes: MasterTreeNode[] = [
      node({ id: 'file-a', type: 'file', kind: 'note', name: 'File A' }),
      node({ id: 'file-b', type: 'file', kind: 'note', name: 'File B', sortOrder: 1 }),
    ];

    const result = canDropMasterTreeNode({
      nodes,
      nodeId: 'file-a',
      targetId: 'file-b',
      position: 'inside',
      profile: defaultFolderTreeProfilesV2.notes,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('TARGET_NOT_FOLDER');
  });

  it('rejects moving a folder into its own subtree', () => {
    const nodes: MasterTreeNode[] = [
      node({ id: 'folder-a', type: 'folder', kind: 'folder', name: 'Folder A' }),
      node({
        id: 'folder-b',
        type: 'folder',
        kind: 'folder',
        parentId: 'folder-a',
        name: 'Folder B',
        path: 'folder-a/folder-b',
      }),
    ];

    const result = canDropMasterTreeNode({
      nodes,
      nodeId: 'folder-a',
      targetId: 'folder-b',
      position: 'inside',
      profile: defaultFolderTreeProfilesV2.notes,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('TARGET_IN_SUBTREE');
  });

  it('repairs cyclic trees during normalization and reports cycle issues', () => {
    const cyclicNodes: MasterTreeNode[] = [
      node({
        id: 'folder-a',
        type: 'folder',
        kind: 'folder',
        parentId: 'folder-b',
        name: 'Folder A',
        path: 'folder-a',
      }),
      node({
        id: 'folder-b',
        type: 'folder',
        kind: 'folder',
        parentId: 'folder-a',
        name: 'Folder B',
        path: 'folder-b',
      }),
    ];

    const built = buildMasterTree(cyclicNodes);
    expect(built.issues.some((issue) => issue.code === 'CYCLE_DETECTED')).toBe(true);

    const normalized = normalizeMasterTreeNodes(cyclicNodes);
    expect(findNode(normalized, 'folder-a')?.parentId).toBeNull();
    expect(findNode(normalized, 'folder-b')?.parentId).toBeNull();
  });
});
