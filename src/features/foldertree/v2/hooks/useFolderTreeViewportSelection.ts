'use client';

 
 
 
 
 
 

import React, { useCallback, useRef, useEffect } from 'react';
import { 
  MasterFolderTreeController, 
  MasterTreeId 
} from '@/shared/contracts/master-folder-tree';
import { 
  ResolvedFolderTreeMultiSelectConfig 
} from '@/shared/utils/folder-tree-profiles-v2';
import { 
  resolveNextSelectedNodeIds 
} from '../operations/selection';
import { FolderTreeNodeView } from '../types';

export function useFolderTreeViewportSelection(args: {
  controller: MasterFolderTreeController;
  resolvedMultiSelectConfig: ResolvedFolderTreeMultiSelectConfig;
  rows: FolderTreeNodeView[];
}) {
  const { controller, resolvedMultiSelectConfig, rows } = args;
  const selectionAnchorRef = useRef<MasterTreeId | null>(null);

  const handleSelectNode = useCallback(
    (nodeId: MasterTreeId, event?: React.MouseEvent<HTMLElement>): void => {
      controller.selectNode(nodeId);

      const setSelectedNodeIds = controller.setSelectedNodeIds;
      const currentSelectedIds = Array.from(controller.selectedNodeIds ?? []);
      if (!setSelectedNodeIds) {
        selectionAnchorRef.current = nodeId;
        return;
      }

      if (!resolvedMultiSelectConfig.enabled) {
        setSelectedNodeIds([nodeId]);
        selectionAnchorRef.current = nodeId;
        return;
      }

      const isToggleGesture =
        (event?.metaKey === true || event?.ctrlKey === true) &&
        resolvedMultiSelectConfig.ctrlClick;
      const isRangeGesture = event?.shiftKey === true && resolvedMultiSelectConfig.shiftClick;

      const nextSelectedIds = isRangeGesture
        ? resolveNextSelectedNodeIds({
          mode: 'range',
          nodeId,
          anchorId:
              selectionAnchorRef.current ??
              controller.selectedNodeId ??
              currentSelectedIds[0] ??
              nodeId,
          currentSelectedIds,
          visibleRows: rows,
        })
        : isToggleGesture
          ? resolveNextSelectedNodeIds({
            mode: 'toggle',
            nodeId,
            currentSelectedIds,
            visibleRows: rows,
          })
          : resolveNextSelectedNodeIds({
            mode: 'single',
            nodeId,
            currentSelectedIds,
            visibleRows: rows,
          });

      setSelectedNodeIds(nextSelectedIds);
      selectionAnchorRef.current = nodeId;
    },
    [controller, resolvedMultiSelectConfig, rows]
  );

  useEffect(() => {
    if (!controller.selectedNodeId) return;
    selectionAnchorRef.current = controller.selectedNodeId;
  }, [controller.selectedNodeId]);

  return {
    handleSelectNode,
    selectionAnchorRef,
  };
}
