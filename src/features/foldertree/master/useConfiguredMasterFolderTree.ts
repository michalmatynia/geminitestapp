'use client';

import type { MasterTreeId, MasterTreeNode } from '@/shared/utils';

import { useMasterFolderTree } from './useMasterFolderTree';
import { useSyncMasterFolderTreeExternalState } from './useSyncMasterFolderTreeExternalState';

import type { MasterFolderTreeController, UseMasterFolderTreeOptions } from '@/shared/contracts/master-folder-tree';

export type UseConfiguredMasterFolderTreeOptions = Omit<
  UseMasterFolderTreeOptions,
  'initialNodes' | 'initialSelectedNodeId'
> & {
  nodes: MasterTreeNode[];
  selectedNodeId?: MasterTreeId | null;
  expandedNodeIds?: MasterTreeId[] | undefined;
};

export function useConfiguredMasterFolderTree({
  nodes,
  selectedNodeId,
  expandedNodeIds,
  ...options
}: UseConfiguredMasterFolderTreeOptions): MasterFolderTreeController {
  const controller = useMasterFolderTree({
    ...options,
    initialNodes: nodes,
    ...(selectedNodeId !== undefined ? { initialSelectedNodeId: selectedNodeId } : {}),
  });

  useSyncMasterFolderTreeExternalState({
    controller,
    nodes,
    ...(selectedNodeId !== undefined ? { selectedNodeId } : {}),
    ...(expandedNodeIds !== undefined ? { expandedNodeIds } : {}),
  });

  return controller;
}
