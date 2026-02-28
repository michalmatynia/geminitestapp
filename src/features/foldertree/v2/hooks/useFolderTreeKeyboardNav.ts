'use client';

import { useEffect, useRef } from 'react';

import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeId } from '@/shared/utils/master-folder-tree-contract';

import { resolveKeyboardAction } from '../operations/keyboard';
import { useMasterFolderTreeRuntime } from '../runtime/MasterFolderTreeRuntimeProvider';
import type { FolderTreeNodeView } from '../types';

export type UseFolderTreeKeyboardNavOptions = {
  /** The tree controller to drive. */
  controller: MasterFolderTreeController;
  /** The instance ID used to register with the runtime bus. */
  instanceId: string;
  /**
   * Ref that must be kept up-to-date with the currently visible flattened rows.
   * The viewport's `rows` array is the source of truth.
   */
  visibleRowsRef: React.RefObject<FolderTreeNodeView[]>;
  /** Called when the user presses Delete/Backspace on a selected node. */
  onDeleteRequest?: ((nodeId: MasterTreeId) => void) | undefined;
  /**
   * Optional scroll function. Called after a keyboard selection so the newly
   * selected node scrolls into view. Wire up from `scrollToNodeRef` on FolderTreeViewportV2.
   */
  scrollToNode?: ((nodeId: MasterTreeId) => void) | undefined;
  /** Set to false to temporarily disable keyboard navigation (e.g. during modal). Default true. */
  enabled?: boolean | undefined;
};

/**
 * Opt-in hook that registers keyboard navigation for a tree instance.
 * Must be used inside a MasterFolderTreeRuntimeProvider subtree.
 */
export function useFolderTreeKeyboardNav({
  controller,
  instanceId,
  visibleRowsRef,
  onDeleteRequest,
  scrollToNode,
  enabled = true,
}: UseFolderTreeKeyboardNavOptions): void {
  const runtime = useMasterFolderTreeRuntime();

  // Keep refs to avoid re-registering on every render
  const controllerRef = useRef(controller);
  controllerRef.current = controller;

  const onDeleteRef = useRef(onDeleteRequest);
  onDeleteRef.current = onDeleteRequest;

  const scrollToNodeRef = useRef(scrollToNode);
  scrollToNodeRef.current = scrollToNode;

  useEffect(() => {
    if (!enabled || !instanceId) return;

    const handler = (event: KeyboardEvent): void => {
      const visibleRows = visibleRowsRef.current ?? [];
      const action = resolveKeyboardAction({
        event,
        controller: controllerRef.current,
        visibleRows,
      });
      if (!action) return;

      event.preventDefault();

      switch (action.type) {
        case 'select': {
          controllerRef.current.selectNode(action.nodeId);
          scrollToNodeRef.current?.(action.nodeId);
          break;
        }
        case 'expand': {
          controllerRef.current.expandNode(action.nodeId);
          break;
        }
        case 'collapse': {
          controllerRef.current.collapseNode(action.nodeId);
          break;
        }
        case 'start_rename': {
          controllerRef.current.startRename(action.nodeId);
          break;
        }
        case 'cancel_rename': {
          controllerRef.current.cancelRename();
          break;
        }
        case 'commit_rename': {
          void controllerRef.current.commitRename();
          break;
        }
        case 'request_delete': {
          onDeleteRef.current?.(action.nodeId);
          break;
        }
        case 'scroll_to': {
          scrollToNodeRef.current?.(action.nodeId);
          break;
        }
      }
    };

    return runtime.registerKeyboardHandler(instanceId, handler);
  }, [enabled, instanceId, runtime, visibleRowsRef]);
}
