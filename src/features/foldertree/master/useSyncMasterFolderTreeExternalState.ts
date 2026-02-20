'use client';

import { useEffect, useRef } from 'react';

import type { MasterTreeId, MasterTreeNode } from '@/shared/utils';

import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';

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
  const replaceNodesRef = useRef(replaceNodes);
  const selectNodeRef = useRef(selectNode);
  const setExpandedNodeIdsRef = useRef(setExpandedNodeIds);

  useEffect(() => {
    replaceNodesRef.current = replaceNodes;
  }, [replaceNodes]);

  useEffect(() => {
    selectNodeRef.current = selectNode;
  }, [selectNode]);

  useEffect(() => {
    setExpandedNodeIdsRef.current = setExpandedNodeIds;
  }, [setExpandedNodeIds]);

  useEffect(() => {
    void replaceNodesRef.current(nodes, 'external_sync');
  }, [nodes]);

  useEffect(() => {
    if (selectedNodeId === undefined) return;
    selectNodeRef.current(selectedNodeId ?? null);
  }, [selectedNodeId]);

  useEffect(() => {
    if (expandedNodeIds === undefined) return;
    setExpandedNodeIdsRef.current(expandedNodeIds);
  }, [expandedNodeIds]);
}
