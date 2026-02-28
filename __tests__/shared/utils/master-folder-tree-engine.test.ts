import { describe, expect, it } from 'vitest';

import { createDefaultFolderTreeProfilesV2 } from '@/shared/utils/folder-tree-profiles-v2';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import {
  buildMasterTree,
  canDropMasterTreeNode,
  dropMasterTreeNodeToRoot,
  guardAgainstMasterTreeCycles,
  normalizeMasterTreePaths,
  normalizeMasterTreeNodes,
  reorderMasterTreeNode,
} from '@/shared/utils/master-folder-tree-engine';

const createNodes = (): MasterTreeNode[] => [
  {
    id: 'f-root',
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: 'Workspace',
    path: 'Workspace',
    sortOrder: 0,
  },
  {
    id: 'f-project',
    type: 'folder',
    kind: 'folder',
    parentId: 'f-root',
    name: 'Project',
    path: 'Project',
    sortOrder: 0,
  },
  {
    id: 'n-1',
    type: 'file',
    kind: 'note',
    parentId: 'f-project',
    name: 'Note One',
    path: 'Note One',
    sortOrder: 0,
  },
  {
    id: 'n-2',
    type: 'file',
    kind: 'note',
    parentId: 'f-project',
    name: 'Note Two',
    path: 'Note Two',
    sortOrder: 1,
  },
  {
    id: 'f-archive',
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: 'Archive',
    path: 'Archive',
    sortOrder: 1,
  },
];

describe('master-folder-tree-engine', () => {
  it('builds a deterministic tree and normalizes paths', () => {
    const built = buildMasterTree(createNodes(), { strict: true });
    expect(built.issues).toEqual([]);
    expect(built.roots.map((node) => node.id)).toEqual(['f-root', 'f-archive']);
    expect(built.roots[0]?.children.map((node) => node.id)).toEqual(['f-project']);

    const normalized = normalizeMasterTreePaths(createNodes());
    expect(normalized.find((node) => node.id === 'f-root')?.path).toBe('workspace');
    expect(normalized.find((node) => node.id === 'f-project')?.path).toBe('workspace/project');
    expect(normalized.find((node) => node.id === 'n-1')?.path).toBe('workspace/project/note-one');
  });

  it('detects parent cycles', () => {
    const cycleNodes: MasterTreeNode[] = [
      {
        id: 'a',
        type: 'folder',
        kind: 'folder',
        parentId: 'b',
        name: 'A',
        path: 'A',
        sortOrder: 0,
      },
      {
        id: 'b',
        type: 'folder',
        kind: 'folder',
        parentId: 'a',
        name: 'B',
        path: 'B',
        sortOrder: 1,
      },
    ];

    const cycleResult = guardAgainstMasterTreeCycles(cycleNodes);
    expect(cycleResult.hasCycle).toBe(true);
    expect(cycleResult.cycleNodeIds).toEqual(['a', 'b']);
  });

  it('blocks drops into own subtree', () => {
    const check = canDropMasterTreeNode({
      nodes: createNodes(),
      nodeId: 'f-root',
      targetId: 'f-project',
      position: 'inside',
    });

    expect(check.ok).toBe(false);
    expect(check.reason).toBe('TARGET_IN_SUBTREE');
  });

  it('reorders nodes and supports root drop moves', () => {
    const profile = createDefaultFolderTreeProfilesV2().notes;
    const reorder = reorderMasterTreeNode({
      nodes: createNodes(),
      nodeId: 'n-2',
      targetId: 'n-1',
      position: 'before',
      profile,
    });

    expect(reorder.ok).toBe(true);
    if (!reorder.ok) return;

    const sorted = normalizeMasterTreeNodes(reorder.nodes).filter(
      (node) => node.parentId === 'f-project'
    );
    expect(sorted.map((node) => node.id)).toEqual(['n-2', 'n-1']);

    const dropToRoot = dropMasterTreeNodeToRoot({
      nodes: reorder.nodes,
      nodeId: 'n-1',
      profile,
    });

    expect(dropToRoot.ok).toBe(true);
    if (!dropToRoot.ok) return;
    expect(dropToRoot.nodes.find((node) => node.id === 'n-1')?.parentId).toBeNull();
  });

  it('returns profile rejection for blocked root drops', () => {
    const baseProfile = createDefaultFolderTreeProfilesV2().notes;
    const blockedProfile = {
      ...baseProfile,
      nesting: {
        ...baseProfile.nesting,
        rules: [
          ...baseProfile.nesting.rules,
          {
            childType: 'file' as const,
            childKinds: ['*'],
            targetType: 'root' as const,
            targetKinds: ['root'],
            allow: false,
          },
        ],
      },
    };

    const result = dropMasterTreeNodeToRoot({
      nodes: createNodes(),
      nodeId: 'n-1',
      profile: blockedProfile,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('PROFILE_RULE_BLOCKED');
  });
});
