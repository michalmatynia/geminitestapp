import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FolderTreeProfileV2 } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const { useMasterFolderTreeSearchMock } = vi.hoisted(() => ({
  useMasterFolderTreeSearchMock: vi.fn(),
}));

vi.mock('@/shared/lib/foldertree/v2/search/useMasterFolderTreeSearch', () => ({
  useMasterFolderTreeSearch: (...args: unknown[]) => useMasterFolderTreeSearchMock(...args),
}));

import { useMasterFolderTreeControllerViewModel } from '../useMasterFolderTreeControllerViewModel';

const profile: FolderTreeProfileV2 = {
  version: 2,
  placeholders: {
    preset: 'sublime',
    style: 'ghost',
    emphasis: 'subtle',
    rootDropLabel: 'Drop section here',
    inlineDropLabel: 'Drop block here',
  },
  icons: {
    slots: {
      folderClosed: 'Folder',
      folderOpen: 'FolderOpen',
      file: 'FileText',
      root: 'Folder',
      dragHandle: 'GripVertical',
    },
    byKind: {},
  },
  nesting: {
    defaultAllow: true,
    blockedTargetKinds: [],
    rules: [],
  },
  interactions: {
    selectionBehavior: 'click_away',
  },
  search: {
    enabled: true,
    debounceMs: 25,
    filterMode: 'highlight',
    matchFields: ['name'],
    minQueryLength: 1,
  },
};

const nodes: MasterTreeNode[] = [
  {
    id: 'node-a',
    type: 'file',
    kind: 'file',
    parentId: null,
    name: 'Alpha',
    path: 'node-a',
    sortOrder: 0,
  },
];

describe('useMasterFolderTreeControllerViewModel', () => {
  it('derives viewport wrapper state from an existing controller and profile', () => {
    const searchState = { isActive: true, results: [] };
    const controller = { nodes, selectNode: vi.fn(), expandToNode: vi.fn() };
    useMasterFolderTreeSearchMock.mockReturnValue(searchState);

    const { result } = renderHook(() =>
      useMasterFolderTreeControllerViewModel({
        controller: controller as never,
        profile,
        nodes,
        searchQuery: 'alpha',
      })
    );

    expect(useMasterFolderTreeSearchMock).toHaveBeenCalledWith(nodes, 'alpha', {
      config: expect.objectContaining({
        enabled: true,
        filterMode: 'highlight',
      }),
    });
    expect(result.current.controller).toBe(controller);
    expect(result.current.appearance.rootDropUi.label).toBe('Drop section here');
    expect(result.current.capabilities.search.enabled).toBe(true);
    expect(result.current.searchState).toBe(searchState);
    expect(result.current.viewport.scrollToNodeRef.current).toBeNull();
  });
});
