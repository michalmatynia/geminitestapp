'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  type MasterFolderTreeActionResult,
  type MasterFolderTreeController,
  type MasterFolderTreePersistOperation,
  type MasterFolderTreeAdapterV3,
  type MasterTreeDropPositionDto,
  type UseMasterFolderTreeOptions,
} from '@/shared/contracts/master-folder-tree';
import { validationError } from '@/shared/errors/app-error';
import { defaultFolderTreeProfilesV2 } from '@/shared/utils/folder-tree-profiles-v2';
import { validateMasterTreeNodes } from '@/shared/utils/master-folder-tree-engine';

import { buildRootsV2, normalizeNodesV2 } from '../core/engine';
import {
  useFolderTreeShellRuntime,
  type MasterFolderTreeShellRuntime,
} from '../shell/useFolderTreeShellRuntime';
import { createFolderTreeStore, type FolderTreeStore } from '../store/createFolderTreeStore';
import { useFolderTreeStoreSelector } from '../store/useFolderTreeStoreSelector';
import {
  createInitialState,
  toActionOk,
  createErrorAction,
  areNodesEqual,
  cloneNodes,
  createTxId,
  normalizeError,
} from './folder-tree-instance/folder-tree-utils';
import { useFolderTreeDragActions } from './folder-tree-instance/useFolderTreeDragActions';
import { useFolderTreeEngineActions } from './folder-tree-instance/useFolderTreeEngineActions';
import { useFolderTreeNavigationActions } from './folder-tree-instance/useFolderTreeNavigationActions';
import { useFolderTreeTransaction } from './folder-tree-instance/useFolderTreeTransaction';

import type { FolderTreeState, FolderTreeTransaction } from '../types';

export type UseFolderTreeInstanceV2Options = UseMasterFolderTreeOptions & {
  instanceId?: string | undefined;
  runtime?: MasterFolderTreeShellRuntime | undefined;
};

export function useFolderTreeInstanceV2(
  options: UseFolderTreeInstanceV2Options
): MasterFolderTreeController {
  const {
    profile = defaultFolderTreeProfilesV2.notes,
    maxUndoEntries: maxUndoEntriesInput,
    instanceId,
  } = options;
  const maxUndoEntries = Math.max(1, maxUndoEntriesInput ?? 50);
  const adapter = useMemo((): MasterFolderTreeAdapterV3 | undefined => {
    const candidate = options.adapter;
    if (!candidate) return undefined;
    const record = candidate as Partial<
      Record<'prepare' | 'apply' | 'commit' | 'rollback', unknown>
    >;
    const missingMethods = (['prepare', 'apply', 'commit', 'rollback'] as const).filter(
      (method): boolean => typeof record[method] !== 'function'
    );
    if (missingMethods.length > 0) {
      throw validationError('Folder tree adapter must implement V3 transaction methods.', {
        source: 'folder_tree.v2',
        reason: 'invalid_adapter_shape',
        missingMethods,
      });
    }
    return candidate;
  }, [options.adapter]);
  const txVersionRef = useRef(0);
  const runtime = useFolderTreeShellRuntime(options.runtime);
  const undoRef = useRef<() => Promise<MasterFolderTreeActionResult>>(async () =>
    createErrorAction('UNDO_UNAVAILABLE')
  );
  const canUndoRef = useRef<boolean>(false);

  const storeRef = useRef<FolderTreeStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createFolderTreeStore(createInitialState(options));
  }
  const store = storeRef.current;

  const state = useFolderTreeStoreSelector(store, (snapshot) => snapshot.state);

  const roots = useMemo(() => buildRootsV2(state.nodes), [state.nodes]);
  const validationIssues = useMemo(() => validateMasterTreeNodes(state.nodes), [state.nodes]);

  const { applyPersistedOperation, executeAdapterTransaction } = useFolderTreeTransaction(
    store,
    adapter,
    maxUndoEntries,
    runtime
  );

  const {
    selectNode,
    setExpandedNodeIds,
    toggleNodeExpanded,
    expandNode,
    collapseNode,
    expandAll,
    collapseAll,
    expandToNode,
    toggleSelectNode,
    selectNodeRange,
    selectAllNodes,
    clearMultiSelection,
    setSelectedNodeIds,
  } = useFolderTreeNavigationActions(store);

  const { startDrag, updateDragTarget, clearDrag } = useFolderTreeDragActions(store);

  const {
    canDropNode,
    moveNode,
    reorderNode,
    dropNodeToRoot,
    startRename,
    updateRenameDraft,
    cancelRename,
    commitRename,
  } = useFolderTreeEngineActions(store, profile, applyPersistedOperation, txVersionRef, instanceId);

  const clearError = useCallback((): void => {
    store.patchState((prev: FolderTreeState) => ({
      ...prev,
      lastError: null,
    }));
  }, [store]);

  const replaceNodes = useCallback(
    async (
      nodes: UseMasterFolderTreeOptions['initialNodes'],
      reason: 'refresh' | 'external_sync' = 'refresh',
      persistedVersion?: number | undefined
    ): Promise<MasterFolderTreeActionResult> => {
      const normalizedNodes = normalizeNodesV2(nodes);
      const current = store.getState();
      if (areNodesEqual(current.nodes, normalizedNodes)) {
        return toActionOk();
      }

      if (reason === 'external_sync') {
        store.patchState((prev: FolderTreeState) => ({
          ...prev,
          nodes: normalizedNodes,
          isApplying: false,
          lastError: null,
          version:
            persistedVersion !== undefined && Number.isFinite(persistedVersion)
              ? persistedVersion
              : prev.version + 1,
        }));
        return toActionOk();
      }

      return await applyPersistedOperation({
        operation: {
          type: 'replace_nodes',
          nodes: normalizedNodes,
          reason,
        },
        optimisticNodes: normalizedNodes,
        undoLabel: 'Replace tree',
        txId: createTxId(),
        txVersion: ++txVersionRef.current,
        instanceId,
        ...(persistedVersion !== undefined ? { persistedVersion } : {}),
      });
    },
    [applyPersistedOperation, store, instanceId]
  );

  const refreshFromAdapter = useCallback(async (): Promise<MasterFolderTreeActionResult> => {
    if (!adapter?.fetchState) return createErrorAction('NO_ADAPTER_LOADER');
    try {
      const next = await adapter.fetchState(instanceId);
      return await replaceNodes(
        next.nodes,
        'refresh',
        next.version !== undefined && Number.isFinite(next.version) ? next.version : undefined
      );
    } catch (error) {
      const normalizedError = normalizeError('unknown', error);
      store.patchState((prev: FolderTreeState) => ({
        ...prev,
        lastError: normalizedError,
        isApplying: false,
      }));
      return createErrorAction(normalizedError.code, normalizedError.message);
    }
  }, [adapter, instanceId, replaceNodes, store]);

  const undo = useCallback(async (): Promise<MasterFolderTreeActionResult> => {
    const current = store.getState();
    const entry = current.undoStack[current.undoStack.length - 1];
    if (!entry) return createErrorAction('UNDO_EMPTY');

    const nextUndo = current.undoStack.slice(0, -1);
    const operation: MasterFolderTreePersistOperation = {
      type: 'replace_nodes',
      nodes: entry.nodes,
      reason: 'undo',
    };

    store.patchState((prev: FolderTreeState) => ({
      ...prev,
      nodes: cloneNodes(entry.nodes),
      selectedNodeId: entry.selectedNodeId,
      expandedNodeIds: [...entry.expandedNodeIds],
      undoStack: nextUndo,
      isApplying: Boolean(adapter),
      lastError: null,
      version: prev.version + 1,
    }));

    if (!adapter) return toActionOk();

    const tx: FolderTreeTransaction = {
      id: createTxId(),
      instanceId,
      version: ++txVersionRef.current,
      createdAt: Date.now(),
      operation,
      previousNodes: current.nodes,
      nextNodes: entry.nodes,
    };

    const execution = await executeAdapterTransaction({
      tx,
      operationType: 'replace_nodes',
    });
    if (!execution.ok) {
      store.patchState((prev: FolderTreeState) => ({
        ...prev,
        isApplying: false,
        lastError: execution.error,
      }));
      return createErrorAction(execution.error.code, execution.error.message);
    }

    const applied = execution.applied;
    store.patchState((prev: FolderTreeState) => ({
      ...prev,
      isApplying: false,
      lastError: null,
      version:
        applied.version !== undefined && Number.isFinite(applied.version)
          ? applied.version
          : prev.version + 1,
    }));
    return toActionOk();
  }, [adapter, executeAdapterTransaction, instanceId, store]);

  const dropDraggedNode = useCallback(
    async (
      targetId: string | null,
      position: MasterTreeDropPositionDto = 'inside'
    ): Promise<MasterFolderTreeActionResult> => {
      const current = store.getState();
      const draggedNodeId = current.dragState?.draggedNodeId;
      if (!draggedNodeId) return createErrorAction('NO_DRAG_NODE');

      let result: MasterFolderTreeActionResult;
      if (targetId === null) {
        result = await dropNodeToRoot(draggedNodeId);
      } else if (position === 'inside') {
        result = await moveNode(draggedNodeId, targetId);
      } else {
        result = await reorderNode(draggedNodeId, targetId, position);
      }
      clearDrag();
      return result;
    },
    [clearDrag, dropNodeToRoot, moveNode, reorderNode, store]
  );

  const expandedNodeSet = useMemo(() => new Set(state.expandedNodeIds), [state.expandedNodeIds]);
  const selectedNodeIdsSet = useMemo(() => new Set(state.selectedNodeIds), [state.selectedNodeIds]);
  const selectedNode = useMemo(
    () => state.nodes.find((node) => node.id === state.selectedNodeId) ?? null,
    [state.nodes, state.selectedNodeId]
  );

  const controller = useMemo<MasterFolderTreeController>(
    () => ({
      nodes: state.nodes,
      roots,
      validationIssues,
      selectedNodeId: state.selectedNodeId,
      selectedNode,
      expandedNodeIds: expandedNodeSet,
      renamingNodeId: state.renamingNodeId,
      renameDraft: state.renameDraft,
      dragState: state.dragState,
      canUndo: state.undoStack.length > 0,
      undoHistory: state.undoStack.map((entry) => ({
        label: entry.label,
        createdAt: entry.createdAt,
      })),
      isApplying: state.isApplying,
      lastError: state.lastError,
      canDropNode,
      selectNode,
      setExpandedNodeIds,
      toggleNodeExpanded,
      expandNode,
      collapseNode,
      expandAll,
      collapseAll,
      startRename,
      updateRenameDraft,
      cancelRename,
      commitRename,
      startDrag,
      updateDragTarget,
      clearDrag,
      dropDraggedNode,
      moveNode,
      reorderNode,
      dropNodeToRoot,
      replaceNodes,
      refreshFromAdapter,
      undo,
      clearError,
      expandToNode,
      selectedNodeIds: selectedNodeIdsSet,
      toggleSelectNode,
      selectNodeRange,
      selectAllNodes,
      clearMultiSelection,
      setSelectedNodeIds,
    }),
    [
      state.nodes,
      state.selectedNodeId,
      state.renamingNodeId,
      state.renameDraft,
      state.dragState,
      state.undoStack,
      state.isApplying,
      state.lastError,
      roots,
      validationIssues,
      selectedNode,
      expandedNodeSet,
      selectedNodeIdsSet,
      canDropNode,
      selectNode,
      setExpandedNodeIds,
      toggleNodeExpanded,
      expandNode,
      collapseNode,
      expandAll,
      collapseAll,
      startRename,
      updateRenameDraft,
      cancelRename,
      commitRename,
      startDrag,
      updateDragTarget,
      clearDrag,
      dropDraggedNode,
      moveNode,
      reorderNode,
      dropNodeToRoot,
      replaceNodes,
      refreshFromAdapter,
      undo,
      clearError,
      expandToNode,
      toggleSelectNode,
      selectNodeRange,
      selectAllNodes,
      clearMultiSelection,
      setSelectedNodeIds,
    ]
  );

  useEffect(() => {
    undoRef.current = undo;
    canUndoRef.current = controller.canUndo;
  }, [controller.canUndo, undo]);

  useEffect(() => {
    if (!instanceId) return;
    return runtime.registerInstance({
      id: instanceId,
      getNodeCount: () => controller.nodes.length,
      canUndo: () => canUndoRef.current,
      undo: async (): Promise<void> => {
        await undoRef.current();
      },
    });
  }, [controller.nodes.length, instanceId, runtime]);

  useEffect(() => {
    if (!instanceId) return;
    if (!controller.selectedNodeId && !controller.dragState?.draggedNodeId) return;
    runtime.setFocusedInstance(instanceId);
  }, [controller.dragState?.draggedNodeId, controller.selectedNodeId, instanceId, runtime]);

  return controller;
}
