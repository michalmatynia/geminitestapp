'use client';

import type { MasterTreeId, MasterTreeNode } from '@/shared/utils';

import { useMasterFolderTree } from './useMasterFolderTree';
import { useSyncMasterFolderTreeExternalState } from './useSyncMasterFolderTreeExternalState';

import type { MasterFolderTreeController, UseMasterFolderTreeOptions } from './types';

export type UseConfiguredMasterFolderTreeOptions = Omit<
  UseMasterFolderTreeOptions,
  'initialNodes' | 'initialSelectedNodeId'
> & {
  nodes: MasterTreeNode[];
  selectedNodeId?: MasterTreeId | null;
};

export function useConfiguredMasterFolderTree({
  nodes,
  selectedNodeId,
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
  });

  return controller;
}
