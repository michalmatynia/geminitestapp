'use client';

import { useEffect } from 'react';

import type { MasterTreeId, MasterTreeNode } from '@/shared/utils';

import type { MasterFolderTreeController } from './types';

type UseSyncMasterFolderTreeExternalStateOptions = {
  controller: Pick<MasterFolderTreeController, 'replaceNodes' | 'selectNode'>;
  nodes: MasterTreeNode[];
  selectedNodeId?: MasterTreeId | null;
};

export function useSyncMasterFolderTreeExternalState({
  controller,
  nodes,
  selectedNodeId,
}: UseSyncMasterFolderTreeExternalStateOptions): void {
  const { replaceNodes, selectNode } = controller;

  useEffect(() => {
    void replaceNodes(nodes, 'external_sync');
  }, [nodes, replaceNodes]);

  useEffect(() => {
    if (selectedNodeId === undefined) return;
    selectNode(selectedNodeId ?? null);
  }, [selectedNodeId, selectNode]);
}
