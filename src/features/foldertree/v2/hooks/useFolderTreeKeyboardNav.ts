'use client';

import { useEffect, useRef } from 'react';

import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeId } from '@/shared/utils/master-folder-tree-contract';
import type {
  ResolvedFolderTreeKeyboardConfig,
  ResolvedFolderTreeMultiSelectConfig,
} from '@/shared/utils/folder-tree-profiles-v2';

import { flattenVisibleNodesV2 } from '../core/engine';
import { resolveKeyboardAction } from '../operations/keyboard';
import { useMasterFolderTreeRuntime } from '../runtime/MasterFolderTreeRuntimeProvider';

export type UseFolderTreeKeyboardNavOptions = {
  /** The tree controller to drive. */
  controller: MasterFolderTreeController;
  /** The instance ID used to register with the runtime bus. */
  instanceId: string;
  /** Called when the user presses Delete/Backspace on a selected node. */
  onDeleteRequest?: ((nodeId: MasterTreeId) => void) | undefined;
  /**
   * Optional scroll function. Called after a keyboard selection so the newly
   * selected node scrolls into view. Wire up from `scrollToNodeRef` on FolderTreeViewportV2.
   */
  scrollToNode?: ((nodeId: MasterTreeId) => void) | undefined;
  /** Resolved keyboard capability flags for this instance. */
  keyboard: ResolvedFolderTreeKeyboardConfig;
  /** Resolved multi-select capability flags for this instance. */
  multiSelect: ResolvedFolderTreeMultiSelectConfig;
};

/**
 * Opt-in hook that registers keyboard navigation for a tree instance.
 * Must be used inside a MasterFolderTreeRuntimeProvider subtree.
 *
 * Visible rows are derived automatically from controller.roots and
 * controller.expandedNodeIds — no separate ref required.
 */
export function useFolderTreeKeyboardNav({
  controller,
  instanceId,
  onDeleteRequest,
  scrollToNode,
  keyboard,
  multiSelect,
}: UseFolderTreeKeyboardNavOptions): void {
  const runtime = useMasterFolderTreeRuntime();

  // Keep refs so the handler always reads the latest values without re-registering
  const controllerRef = useRef(controller);
  controllerRef.current = controller;

  const onDeleteRef = useRef(onDeleteRequest);
  onDeleteRef.current = onDeleteRequest;

  const scrollToNodeRef = useRef(scrollToNode);
  scrollToNodeRef.current = scrollToNode;

  useEffect(() => {
    if (!keyboard.enabled || !instanceId) return;

    const handler = (event: KeyboardEvent): void => {
      const ctrl = controllerRef.current;
      // Derive visible rows from the controller at call time — always up-to-date
      const visibleRows = flattenVisibleNodesV2(ctrl.roots, ctrl.expandedNodeIds);
      const action = resolveKeyboardAction({
        event,
        controller: ctrl,
        visibleRows,
        keyboard,
        allowSelectAll: multiSelect.enabled && multiSelect.selectAll,
      });
      if (!action) return;

      event.preventDefault();

      switch (action.type) {
        case 'select': {
          ctrl.selectNode(action.nodeId);
          scrollToNodeRef.current?.(action.nodeId);
          break;
        }
        case 'expand': {
          ctrl.expandNode(action.nodeId);
          break;
        }
        case 'collapse': {
          ctrl.collapseNode(action.nodeId);
          break;
        }
        case 'start_rename': {
          ctrl.startRename(action.nodeId);
          break;
        }
        case 'cancel_rename': {
          ctrl.cancelRename();
          break;
        }
        case 'commit_rename': {
          void ctrl.commitRename();
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
        case 'select_all': {
          ctrl.selectAllNodes?.();
          break;
        }
      }
    };

    return runtime.registerKeyboardHandler(instanceId, handler);
  }, [instanceId, keyboard, multiSelect, runtime]);
}
