import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MasterFolderTreeViewModel } from '@/shared/lib/foldertree/v2/shell/useMasterFolderTreeViewModel';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const folderTreeViewportMock = vi.fn();

vi.mock('../FolderTreeViewportV2', () => ({
  FolderTreeViewportV2: (props: unknown) => {
    folderTreeViewportMock(props);
    return <div data-testid='folder-tree-viewport' />;
  },
}));

import { MasterFolderTreeViewport } from '../MasterFolderTreeViewport';

const buildTree = (): Pick<
  MasterFolderTreeViewModel,
  'appearance' | 'capabilities' | 'controller' | 'searchState' | 'viewport'
> => {
  const scrollToNodeRef = { current: null };
  const searchState = {
    isActive: false,
    results: [],
    matchNodeIds: new Set<string>(),
    filteredNodes: [] as MasterTreeNode[],
    filteredExpandedNodeIds: [],
    query: '',
    effectiveQuery: '',
    config: {
      enabled: true,
      debounceMs: 200,
      filterMode: 'highlight' as const,
      matchFields: ['name'] as const,
      minQueryLength: 1,
    },
  };

  return {
    appearance: {
      placeholderClasses: {},
      rootDropUi: {
        label: 'Drop here',
        idleClassName: 'idle',
        activeClassName: 'active',
      },
      resolveIcon: vi.fn(),
    },
    capabilities: {
      keyboard: { enabled: true },
      multiSelect: { enabled: true },
      search: searchState.config,
    },
    controller: {
      nodes: [],
    },
    searchState,
    viewport: {
      scrollToNodeRef,
      scrollToNode: vi.fn(),
      revealNode: vi.fn(),
    },
  } as unknown as Pick<
    MasterFolderTreeViewModel,
    'appearance' | 'capabilities' | 'controller' | 'searchState' | 'viewport'
  >;
};

describe('MasterFolderTreeViewport', () => {
  it('passes view-model managed viewport props to FolderTreeViewportV2', () => {
    const tree = buildTree();
    const renderNode = vi.fn();

    render(
      <MasterFolderTreeViewport tree={tree} renderNode={renderNode} emptyLabel='Empty tree' />
    );

    expect(folderTreeViewportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        controller: tree.controller,
        scrollToNodeRef: tree.viewport.scrollToNodeRef,
        rootDropUi: tree.appearance.rootDropUi,
        multiSelectConfig: tree.capabilities.multiSelect,
        searchState: tree.searchState,
        renderNode,
        emptyLabel: 'Empty tree',
      })
    );
  });
});
