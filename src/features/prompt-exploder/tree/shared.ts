'use client';

import React from 'react';

import type { FolderTreeViewportV2Props } from '@/features/foldertree/v2';
import type { MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

export const PROMPT_EXPLODER_DRAG_HANDLE_SELECTOR = '[data-master-tree-drag-handle="true"]';

export const buildPromptExploderTreeRevision = (nodes: ReadonlyArray<MasterTreeNode>): string =>
  nodes
    .map((node) => `${node.id}:${node.parentId ?? 'root'}:${node.sortOrder}:${node.name}`)
    .join('|');

export const canStartPromptExploderHandleOnlyDrag = (input: {
  nodeId: MasterTreeId;
  eventTarget: EventTarget | null;
  pointerElement: Element | null;
  armedNodeId: MasterTreeId | null;
}): {
  canStart: boolean;
  nextArmedNodeId: MasterTreeId | null;
} => {
  const fromEventTargetHandle =
    input.eventTarget instanceof Element &&
    input.eventTarget.closest(PROMPT_EXPLODER_DRAG_HANDLE_SELECTOR) !== null;
  const fromPointerHandle =
    input.pointerElement instanceof Element &&
    input.pointerElement.closest(PROMPT_EXPLODER_DRAG_HANDLE_SELECTOR) !== null;
  const fromHandleGesture = fromEventTargetHandle || fromPointerHandle;
  const nextArmedNodeId = fromHandleGesture ? input.nodeId : input.armedNodeId;
  return {
    canStart: fromHandleGesture && nextArmedNodeId === input.nodeId,
    nextArmedNodeId,
  };
};

export function usePromptExploderHandleOnlyDrag(): {
  armDragHandle: (nodeId: MasterTreeId) => void;
  releaseDragHandle: () => void;
  clearDragHandleArming: () => void;
  canStartHandleOnlyDrag: NonNullable<FolderTreeViewportV2Props['canStartDrag']>;
} {
  const dragHandleNodeIdRef = React.useRef<MasterTreeId | null>(null);

  const clearDragHandleArming = React.useCallback((): void => {
    dragHandleNodeIdRef.current = null;
  }, []);

  React.useEffect((): (() => void) => {
    const events = ['dragend', 'drop', 'pointerup', 'pointercancel', 'mouseup', 'blur'] as const;
    events.forEach((eventName) => {
      window.addEventListener(eventName, clearDragHandleArming);
    });
    return (): void => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, clearDragHandleArming);
      });
    };
  }, [clearDragHandleArming]);

  const armDragHandle = React.useCallback((nodeId: MasterTreeId): void => {
    dragHandleNodeIdRef.current = nodeId;
  }, []);

  const releaseDragHandle = React.useCallback((): void => {
    clearDragHandleArming();
  }, [clearDragHandleArming]);

  const canStartHandleOnlyDrag = React.useCallback<
    NonNullable<FolderTreeViewportV2Props['canStartDrag']>
  >(({ node, event }): boolean => {
    let pointerElement: Element | null = null;
    if (typeof document !== 'undefined') {
      pointerElement = document.elementFromPoint(event.clientX, event.clientY);
    }
    const result = canStartPromptExploderHandleOnlyDrag({
      nodeId: node.id,
      eventTarget: event.target,
      pointerElement,
      armedNodeId: dragHandleNodeIdRef.current,
    });
    dragHandleNodeIdRef.current = result.nextArmedNodeId;
    return result.canStart;
  }, []);

  return {
    armDragHandle,
    releaseDragHandle,
    clearDragHandleArming,
    canStartHandleOnlyDrag,
  };
}
