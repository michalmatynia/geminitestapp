'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  MasterFolderTreeController,
  MasterTreeId,
  MasterTreeDropPositionDto,
} from '@/shared/contracts/master-folder-tree';
import { getMasterTreeDragNodeData } from '../operations/drag-data';
import { resolveVerticalDropPosition } from '@/shared/utils/drag-drop';
import { MasterTreeViewNode } from '@/shared/utils/master-folder-tree-engine';

export type FolderTreeDropInput = {
  draggedNodeId: MasterTreeId;
  targetId: MasterTreeId | null;
  position: MasterTreeDropPositionDto;
  defaultAllowed: boolean;
};

export type FolderTreeResolveDropPositionInput = {
  draggedNodeId: MasterTreeId;
  targetId: MasterTreeId;
};

export function useFolderTreeViewportDnd(args: {
  controller: MasterFolderTreeController;
  enableDnd: boolean;
  canDrop?: (input: FolderTreeDropInput, controller: MasterFolderTreeController) => boolean;
  onNodeDrop?: (input: FolderTreeDropInput, controller: MasterFolderTreeController) => Promise<void> | void;
  resolveDropPosition?: (
    event: React.DragEvent<HTMLElement>,
    input: FolderTreeResolveDropPositionInput,
    controller: MasterFolderTreeController
  ) => MasterTreeDropPositionDto;
  resolveDraggedNodeId?: (event: React.DragEvent<HTMLElement>) => MasterTreeId | null;
}) {
  const { controller, canDrop, resolveDropPosition, resolveDraggedNodeId } = args;
  const [rootDropHoverZone, setRootDropHoverZone] = useState<'top' | 'bottom' | null>(null);

  const autoExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoExpandTargetRef = useRef<MasterTreeId | null>(null);

  const clearDragState = useCallback((): void => {
    controller.clearDrag();
    setRootDropHoverZone(null);
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current);
      autoExpandTimerRef.current = null;
    }
    autoExpandTargetRef.current = null;
  }, [controller]);

  const resolveDraggedNode = useCallback(
    (event: React.DragEvent<HTMLElement>): MasterTreeId | null => {
      if (controller.dragState?.draggedNodeId) {
        return controller.dragState.draggedNodeId;
      }
      const payloadNodeId = getMasterTreeDragNodeData(event.dataTransfer);
      if (payloadNodeId) return payloadNodeId;
      return resolveDraggedNodeId?.(event) ?? null;
    },
    [controller.dragState?.draggedNodeId, resolveDraggedNodeId]
  );

  const resolveDropAllowance = useCallback(
    (
      draggedNodeId: MasterTreeId,
      targetId: MasterTreeId | null,
      position: MasterTreeDropPositionDto
    ): boolean => {
      const defaultCheck = controller.canDropNode(draggedNodeId, targetId, position);
      if (defaultCheck.ok) {
        if (!canDrop) return true;
        return canDrop(
          {
            draggedNodeId,
            targetId,
            position,
            defaultAllowed: true,
          },
          controller
        );
      }
      if (!canDrop) return false;
      return canDrop(
        {
          draggedNodeId,
          targetId,
          position,
          defaultAllowed: false,
        },
        controller
      );
    },
    [canDrop, controller]
  );

  const resolveNodeDropPosition = useCallback(
    (
      event: React.DragEvent<HTMLDivElement>,
      draggedNodeId: MasterTreeId,
      targetNode: MasterTreeViewNode
    ): MasterTreeDropPositionDto | null => {
      const targetRect = event.currentTarget.getBoundingClientRect();
      const edgePosition = resolveVerticalDropPosition(event.clientY, targetRect, {
        thresholdRatio: 0.34,
      });
      const requestedPosition =
        resolveDropPosition?.(
          event,
          {
            draggedNodeId,
            targetId: targetNode.id,
          },
          controller
        ) ??
        edgePosition ??
        'inside';

      const insideAllowed = resolveDropAllowance(draggedNodeId, targetNode.id, 'inside');
      const requestedAllowed = resolveDropAllowance(
        draggedNodeId,
        targetNode.id,
        requestedPosition
      );

      if (
        !resolveDropPosition &&
        requestedPosition !== 'inside' &&
        targetNode.type === 'folder' &&
        insideAllowed
      ) {
        const draggedNode =
          controller.nodes.find((candidate) => candidate.id === draggedNodeId) ?? null;
        if (!draggedNode || draggedNode.type === 'file') {
          return 'inside';
        }
      }

      if (requestedAllowed) return requestedPosition;
      if (requestedPosition !== 'inside' && insideAllowed) return 'inside';
      return null;
    },
    [controller, resolveDropAllowance, resolveDropPosition]
  );

  return {
    rootDropHoverZone,
    setRootDropHoverZone,
    autoExpandTimerRef,
    autoExpandTargetRef,
    clearDragState,
    resolveDraggedNode,
    resolveDropAllowance,
    resolveNodeDropPosition,
  };
}
