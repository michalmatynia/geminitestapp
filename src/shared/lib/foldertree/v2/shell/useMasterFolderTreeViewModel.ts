'use client';

import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  useMasterFolderTreeSearch,
  type MasterFolderTreeSearchState,
} from '../search/useMasterFolderTreeSearch';
import {
  useMasterFolderTreeShell,
  type MasterFolderTreeShell,
  type UseMasterFolderTreeShellOptions,
} from './useMasterFolderTreeShell';

export type UseMasterFolderTreeViewModelOptions = UseMasterFolderTreeShellOptions & {
  searchQuery?: string | undefined;
  searchNodes?: MasterTreeNode[] | undefined;
};

export type MasterFolderTreeViewModel = MasterFolderTreeShell & {
  searchState: MasterFolderTreeSearchState;
};

export function useMasterFolderTreeViewModel({
  searchQuery = '',
  searchNodes,
  ...shellOptions
}: UseMasterFolderTreeViewModelOptions): MasterFolderTreeViewModel {
  const shell = useMasterFolderTreeShell(shellOptions);
  const searchState = useMasterFolderTreeSearch(searchNodes ?? shellOptions.nodes, searchQuery, {
    config: shell.capabilities.search,
  });

  return {
    ...shell,
    searchState,
  };
}
