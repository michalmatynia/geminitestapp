'use client';

import { useEffect } from 'react';

import type { MasterTreeId, MasterTreeNode } from '@/shared/utils';

import type { MasterFolderTreeController } from './types';

type UseSyncMasterFolderTreeExternalStateOptions = {
  controller: Pick<
    MasterFolderTreeController,
    'replaceNodes' | 'selectNode' | 'setExpandedNodeIds'
  >;
  nodes: MasterTreeNode[];
  selectedNodeId?: MasterTreeId | null | undefined;
  expandedNodeIds?: MasterTreeId[] | undefined;
};

export function useSyncMasterFolderTreeExternalState({
  controller,
  nodes,
  selectedNodeId,
  expandedNodeIds,
}: UseSyncMasterFolderTreeExternalStateOptions): void {
  const { replaceNodes, selectNode, setExpandedNodeIds } = controller;

  useEffect(() => {
    void replaceNodes(nodes, 'external_sync');
  }, [nodes, replaceNodes]);

  useEffect(() => {
    if (selectedNodeId === undefined) return;
    selectNode(selectedNodeId ?? null);
  }, [selectedNodeId, selectNode]);

  useEffect(() => {
    if (expandedNodeIds === undefined) return;
    setExpandedNodeIds(expandedNodeIds);
  }, [expandedNodeIds, setExpandedNodeIds]);
}
