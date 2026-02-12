import { renderHook } from '@testing-library/react';
import { Folder } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMasterFolderTreeConfig } from '@/features/foldertree/hooks/useMasterFolderTreeConfig';
import { useMasterFolderTreeInstance } from '@/features/foldertree/hooks/useMasterFolderTreeInstance';
import type { MasterTreeNode } from '@/shared/utils';
import { createDefaultFolderTreeProfilesV2 } from '@/shared/utils/folder-tree-profiles-v2';

vi.mock('@/features/foldertree/hooks/useMasterFolderTreeConfig', () => ({
  useMasterFolderTreeConfig: vi.fn(),
}));

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

describe('useMasterFolderTreeInstance', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useMasterFolderTreeConfig).mockReturnValue({
      profile: createDefaultFolderTreeProfilesV2().notes,
      appearance: {
        placeholderClasses: {
          lineIdle: 'line-idle',
          lineActive: 'line-active',
          badgeIdle: 'badge-idle',
          badgeActive: 'badge-active',
          rootIdle: 'root-idle',
          rootActive: 'root-active',
        },
        rootDropUi: {
          label: 'Drop to root',
          idleClassName: 'idle',
          activeClassName: 'active',
        },
        resolveIcon: () => Folder,
      },
    });
  });

  it('returns profile + appearance and keeps controller in sync with external nodes', () => {
    const initialNodes = createNodes('a');

    const { result, rerender } = renderHook(
      ({ nodes, selectedNodeId }: { nodes: MasterTreeNode[]; selectedNodeId: string | null }) =>
        useMasterFolderTreeInstance({
          instance: 'notes',
          nodes,
          selectedNodeId,
        }),
      {
        initialProps: {
          nodes: initialNodes,
          selectedNodeId: 'folder-a',
        },
      }
    );

    expect(useMasterFolderTreeConfig).toHaveBeenCalledWith('notes');
    expect(result.current.controller.nodes.map((node: MasterTreeNode) => node.id)).toEqual(['folder-a']);
    expect(result.current.controller.selectedNodeId).toBe('folder-a');

    rerender({
      nodes: createNodes('b'),
      selectedNodeId: null,
    });

    expect(result.current.controller.nodes.map((node: MasterTreeNode) => node.id)).toEqual(['folder-b']);
    expect(result.current.controller.selectedNodeId).toBeNull();
  });
});
