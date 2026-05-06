import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const { useMasterFolderTreeShellMock, useMasterFolderTreeSearchMock } = vi.hoisted(() => ({
  useMasterFolderTreeShellMock: vi.fn(),
  useMasterFolderTreeSearchMock: vi.fn(),
}));

vi.mock('@/shared/lib/foldertree/v2/shell/useMasterFolderTreeShell', () => ({
  useMasterFolderTreeShell: (options: unknown) => useMasterFolderTreeShellMock(options),
}));

vi.mock('@/shared/lib/foldertree/v2/search/useMasterFolderTreeSearch', () => ({
  useMasterFolderTreeSearch: (...args: unknown[]) => useMasterFolderTreeSearchMock(...args),
}));

import { useMasterFolderTreeViewModel } from '@/shared/lib/foldertree/v2/shell/useMasterFolderTreeViewModel';

const buildNode = (id: string, name: string): MasterTreeNode => ({
  id,
  type: 'file',
  kind: 'file',
  parentId: null,
  name,
  path: id,
  sortOrder: 0,
});

describe('useMasterFolderTreeViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('combines shell state with profile-backed search state', () => {
    const nodes = [buildNode('alpha', 'Alpha'), buildNode('beta', 'Beta')];
    const searchConfig = {
      enabled: true,
      debounceMs: 200,
      filterMode: 'highlight',
      matchFields: ['name'],
      minQueryLength: 1,
    };
    const searchState = {
      isActive: true,
      results: [{ node: nodes[1] }],
    };

    useMasterFolderTreeShellMock.mockReturnValue({
      capabilities: {
        search: searchConfig,
      },
      controller: {
        nodes,
      },
    });
    useMasterFolderTreeSearchMock.mockReturnValue(searchState);

    const { result } = renderHook(() =>
      useMasterFolderTreeViewModel({
        instance: 'case_resolver_case_hierarchy',
        nodes,
        searchQuery: 'beta',
      })
    );

    expect(useMasterFolderTreeShellMock).toHaveBeenCalledWith({
      instance: 'case_resolver_case_hierarchy',
      nodes,
    });
    expect(useMasterFolderTreeSearchMock).toHaveBeenCalledWith(nodes, 'beta', {
      config: searchConfig,
    });
    expect(result.current.controller.nodes).toEqual(nodes);
    expect(result.current.searchState).toBe(searchState);
  });
});
