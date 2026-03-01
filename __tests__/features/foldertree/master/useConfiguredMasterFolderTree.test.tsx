import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useConfiguredMasterFolderTree } from '@/features/foldertree/master/useConfiguredMasterFolderTree';
import type { MasterTreeNode } from '@/shared/utils';
import { createDefaultFolderTreeProfilesV2 } from '@/shared/utils/folder-tree-profiles-v2';

const createNodes = (suffix: string): MasterTreeNode[] => [
  {
    id: `folder-${suffix}`,
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: `Folder ${suffix}`,
    path: `folder-${suffix}`,
    sortOrder: 0,
  },
];

describe('useConfiguredMasterFolderTree', () => {
  it('creates a controller and syncs external nodes + selection', () => {
    const profile = createDefaultFolderTreeProfilesV2().notes;
    const initialNodes = createNodes('a');

    const { result, rerender } = renderHook(
      ({ nodes, selectedNodeId }: { nodes: MasterTreeNode[]; selectedNodeId?: string | null }) =>
        useConfiguredMasterFolderTree({
          nodes,
          ...(selectedNodeId !== undefined ? { selectedNodeId } : {}),
          profile,
        }),
      {
        initialProps: {
          nodes: initialNodes,
          selectedNodeId: 'folder-a' as string | null,
        },
      }
    );

    expect(result.current.selectedNodeId).toBe('folder-a');
    expect(result.current.nodes.map((node: MasterTreeNode) => node.id)).toEqual(['folder-a']);

    rerender({
      nodes: createNodes('b'),
      selectedNodeId: null as string | null,
    });

    expect(result.current.selectedNodeId as any).toBeNull();
    expect(result.current.nodes.map((node: MasterTreeNode) => node.id)).toEqual(['folder-b']);
  });
});
