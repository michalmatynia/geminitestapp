import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFolderTreeInstanceV2 } from '@/shared/lib/foldertree/v2/hooks/useFolderTreeInstanceV2';
import type {
  FolderTreeAppliedTransaction,
  FolderTreePreparedTransaction,
  FolderTreeTransaction,
} from '@/shared/lib/foldertree/v2/types';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const buildNode = (id: string, name: string, parentId: string | null = null): MasterTreeNode => ({
  id,
  type: 'folder',
  kind: 'folder',
  parentId,
  name,
  path: name.toLowerCase(),
  sortOrder: 0,
});

describe('useFolderTreeInstanceV2 external sync replace', () => {
  it('updates nodes without adapter persistence for external_sync reason', async () => {
    const initialNodes = [buildNode('folder-a', 'Folder A')];
    const nextNodes = [buildNode('folder-b', 'Folder B')];

    const prepare = vi.fn(
      async (tx: FolderTreeTransaction): Promise<FolderTreePreparedTransaction> => ({
        tx,
        preparedAt: Date.now(),
      })
    );
    const apply = vi.fn(
      async (tx: FolderTreeTransaction): Promise<FolderTreeAppliedTransaction> => ({
        tx,
        appliedAt: Date.now(),
      })
    );
    const commit = vi.fn(async () => undefined);

    const { result } = renderHook(() =>
      useFolderTreeInstanceV2({
        initialNodes,
        adapter: {
          prepare,
          apply,
          commit,
        },
      })
    );

    await act(async () => {
      await result.current.replaceNodes(nextNodes, 'external_sync');
    });

    expect(result.current.nodes.map((node) => node.id)).toEqual(['folder-b']);
    expect(result.current.isApplying).toBe(false);
    expect(prepare).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });
});
