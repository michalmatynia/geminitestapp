'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  toMasterFolderTreeActionFail,
  type MasterFolderTreeActionResult,
  type MasterFolderTreeController,
  type MasterFolderTreePersistOperation,
  type MasterTreeDropPositionDto,
  type MasterTreeId,
  type UseMasterFolderTreeOptions,
} from '@/shared/contracts/master-folder-tree';
import { defaultFolderTreeProfilesV2 } from '@/shared/utils/folder-tree-profiles-v2';
import { validateMasterTreeNodes } from '@/shared/utils/master-folder-tree-engine';

import {
  buildRootsV2,
  canDropNodeV2,
  dropNodeToRootV2,
  moveNodeV2,
  normalizeNodesV2,
  reorderNodeV2,
} from '../core/engine';
import { getAncestorIds } from '../operations/expansion';
import { useMasterFolderTreeRuntime } from '../runtime/MasterFolderTreeRuntimeProvider';
import { createFolderTreeStore, type FolderTreeStore } from '../store/createFolderTreeStore';
import { useFolderTreeStoreSelector } from '../store/useFolderTreeStoreSelector';
import type {
  FolderTreeAppliedTransaction,
  FolderTreePreparedTransaction,
  FolderTreeState,
  FolderTreeTransaction,
  MasterFolderTreeAdapterV3,
} from '../types';

const toActionOk = (): MasterFolderTreeActionResult => ({
  success: true,
  ok: true,
});

const createErrorAction = (code: string, message?: string): MasterFolderTreeActionResult =>
  toMasterFolderTreeActionFail(message ?? code, code);

const areNodesEqual = (
  left: ReadonlyArray<{
    id: string;
    type: string;
    kind: string;
    parentId?: string | null;
    name: string;
    path: string;
    sortOrder: number;
  }>,
  right: ReadonlyArray<{
    id: string;
    type: string;
    kind: string;
    parentId?: string | null;
    name: string;
    path: string;
    sortOrder: number;
  }>
): boolean => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftNode = left[index];
    const rightNode = right[index];
    if (!leftNode || !rightNode) return false;
    if (leftNode.id !== rightNode.id) return false;
    if (leftNode.type !== rightNode.type) return false;
    if (leftNode.kind !== rightNode.kind) return false;
    if ((leftNode.parentId ?? null) !== (rightNode.parentId ?? null)) return false;
    if (leftNode.name !== rightNode.name) return false;
    if (leftNode.path !== rightNode.path) return false;
    if (leftNode.sortOrder !== rightNode.sortOrder) return false;
  }
  return true;
};

const cloneNodes = (nodes: UseMasterFolderTreeOptions['initialNodes']) =>
  nodes.map((node) => ({ ...node }));

const cloneUndoStack = (entries: FolderTreeState['undoStack']): FolderTreeState['undoStack'] =>
  entries.map((entry) => ({
    ...entry,
    nodes: cloneNodes(entry.nodes),
    expandedNodeIds: [...entry.expandedNodeIds],
  }));

const createInitialState = (options: UseMasterFolderTreeOptions): FolderTreeState => {
  const normalizedNodes = normalizeNodesV2(options.initialNodes);
  const validNodeIds = new Set(normalizedNodes.map((node) => node.id));
  const initialExpandedNodeIds = Array.from(
    new Set((options.initiallyExpandedNodeIds ?? []).map((id) => id.trim()).filter(Boolean))
  ).filter((id) => validNodeIds.has(id));

  return {
    nodes: normalizedNodes,
    selectedNodeId:
      options.initialSelectedNodeId && validNodeIds.has(options.initialSelectedNodeId)
        ? options.initialSelectedNodeId
        : null,
    selectedNodeIds: [],
    expandedNodeIds: initialExpandedNodeIds,
    renamingNodeId: null,
    renameDraft: '',
    dragState: null,
    undoStack: [],
    isApplying: false,
    lastError: null,
    version: 1,
  };
};

const toUndoEntry = (
  state: FolderTreeState,
  label: string
): FolderTreeState['undoStack'][number] => ({
  label,
  createdAt: Date.now(),
  nodes: cloneNodes(state.nodes),
  selectedNodeId: state.selectedNodeId,
  expandedNodeIds: [...state.expandedNodeIds],
});

const createTxId = (): string =>
  `mftx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const createPreparedTx = (tx: FolderTreeTransaction): FolderTreePreparedTransaction => ({
  tx,
  preparedAt: Date.now(),
});

const createAppliedTx = (tx: FolderTreeTransaction): FolderTreeAppliedTransaction => ({
  tx,
  appliedAt: Date.now(),
});

const normalizeError = (
  operationType: MasterFolderTreePersistOperation['type'] | 'unknown',
  error: unknown
): NonNullable<FolderTreeState['lastError']> => ({
  code: 'PERSIST_FAILED',
  message: error instanceof Error ? error.message : 'Failed to persist tree operation.',
  operationType,
  at: new Date().toISOString(),
  ...(error instanceof Error ? { cause: error } : {}),
});

const isConflictError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const maybeCode = (error as { code?: unknown }).code;
  if (typeof maybeCode === 'string' && maybeCode.toLowerCase().includes('conflict')) {
    return true;
  }
  const maybeMessage = (error as { message?: unknown }).message;
  if (typeof maybeMessage === 'string' && maybeMessage.toLowerCase().includes('conflict')) {
    return true;
  }
  return false;
};

const toV3Adapter = (
  adapter: UseMasterFolderTreeOptions['adapter']
): MasterFolderTreeAdapterV3 | undefined => {
  if (!adapter) return undefined;

  const maybeV3 = adapter as unknown as MasterFolderTreeAdapterV3;
  if (typeof maybeV3.apply === 'function') {
    return maybeV3;
  }

  const legacy = adapter as {
    loadNodes?: (() => Promise<UseMasterFolderTreeOptions['initialNodes']>) | undefined;
    applyOperation?: (
      operation: MasterFolderTreePersistOperation,
      context: {
        previousNodes: UseMasterFolderTreeOptions['initialNodes'];
        nextNodes: UseMasterFolderTreeOptions['initialNodes'];
      }
    ) => Promise<UseMasterFolderTreeOptions['initialNodes'] | void>;
  };

  return {
    ...(legacy.loadNodes
      ? {
        fetchState: async (_instanceId?: string) => ({
          nodes: (await legacy.loadNodes?.()) ?? [],
          version: 0,
        }),
      }
      : {}),
    prepare: async (tx: FolderTreeTransaction): Promise<FolderTreePreparedTransaction> =>
      createPreparedTx(tx),
    apply: async (
      tx: FolderTreeTransaction,
      _prepared: FolderTreePreparedTransaction
    ): Promise<FolderTreeAppliedTransaction | void> => {
      const applyOperation = legacy.applyOperation;
      if (!applyOperation) return;
      const result = await applyOperation(tx.operation, {
        previousNodes: tx.previousNodes,
        nextNodes: tx.nextNodes,
      });
      if (!result) return createAppliedTx(tx);
      return {
        tx,
        appliedAt: Date.now(),
        nodes: result,
      };
    },
    commit: async (): Promise<void> => {
      // no-op for legacy adapters
    },
    rollback: async (): Promise<void> => {
      // no-op for legacy adapters
    },
  };
};

const withUndoEntry = (
  state: FolderTreeState,
  label: string,
  maxUndoEntries: number
): FolderTreeState['undoStack'] => {
  const next = [...state.undoStack, toUndoEntry(state, label)];
  if (next.length <= maxUndoEntries) return next;
  return next.slice(next.length - maxUndoEntries);
};

export type UseFolderTreeInstanceV2Options = UseMasterFolderTreeOptions & {
  instanceId?: string | undefined;
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
  const adapter = useMemo(() => toV3Adapter(options.adapter), [options.adapter]);
  const txVersionRef = useRef(0);
  const runtime = useMasterFolderTreeRuntime();
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

  const clearError = useCallback((): void => {
    store.patchState((prev: FolderTreeState) => ({
      ...prev,
      lastError: null,
    }));
  }, [store]);

  const executeAdapterTransaction = useCallback(
    async ({
      tx,
      operationType,
    }: {
      tx: FolderTreeTransaction;
      operationType: MasterFolderTreePersistOperation['type'];
    }): Promise<
      | {
          ok: true;
          applied: FolderTreeAppliedTransaction;
        }
      | {
          ok: false;
          error: NonNullable<FolderTreeState['lastError']>;
        }
    > => {
      if (!adapter) {
        return {
          ok: true,
          applied: createAppliedTx(tx),
        };
      }

      let stage: 'prepare' | 'apply' | 'commit' = 'prepare';
      try {
        const prepared = adapter.prepare ? await adapter.prepare(tx) : createPreparedTx(tx);
        stage = 'apply';
        const applied = (await adapter.apply(tx, prepared)) ?? createAppliedTx(tx);
        stage = 'commit';
        if (adapter.commit) {
          await adapter.commit(tx, applied);
        }
        return {
          ok: true,
          applied,
        };
      } catch (error) {
        if (isConflictError(error)) {
          runtime.recordMetric('transaction_conflict');
        } else {
          runtime.recordMetric('transaction_rollback');
        }
        if (adapter.rollback) {
          try {
            await adapter.rollback(tx, stage, error);
          } catch {
            // no-op
          }
        }
        return {
          ok: false,
          error: normalizeError(operationType, error),
        };
      }
    },
    [adapter, runtime]
  );

  const applyPersistedOperation = useCallback(
    async ({
      operation,
      optimisticNodes,
      undoLabel,
      selectedNodeId,
      expandedNodeIds,
      persistedVersion,
    }: {
      operation: MasterFolderTreePersistOperation;
      optimisticNodes: FolderTreeState['nodes'];
      undoLabel: string;
      selectedNodeId?: string | null | undefined;
      expandedNodeIds?: string[] | undefined;
      persistedVersion?: number | undefined;
    }): Promise<MasterFolderTreeActionResult> => {
      const previousState = store.getState();
      const previousSnapshot: FolderTreeState = {
        ...previousState,
        nodes: cloneNodes(previousState.nodes),
        expandedNodeIds: [...previousState.expandedNodeIds],
        undoStack: cloneUndoStack(previousState.undoStack),
      };

      const nextState: FolderTreeState = {
        ...previousState,
        nodes: normalizeNodesV2(optimisticNodes),
        selectedNodeId:
          selectedNodeId !== undefined ? selectedNodeId : previousState.selectedNodeId,
        expandedNodeIds: expandedNodeIds ?? previousState.expandedNodeIds,
        undoStack: withUndoEntry(previousState, undoLabel, maxUndoEntries),
        isApplying: Boolean(adapter),
        lastError: null,
        version:
          persistedVersion !== undefined && Number.isFinite(persistedVersion)
            ? persistedVersion
            : previousState.version + 1,
      };

      store.setState(nextState);
      if (!adapter) {
        return toActionOk();
      }

      const tx: FolderTreeTransaction = {
        id: createTxId(),
        instanceId,
        version: ++txVersionRef.current,
        createdAt: Date.now(),
        operation,
        previousNodes: previousSnapshot.nodes,
        nextNodes: nextState.nodes,
      };

      const execution = await executeAdapterTransaction({
        tx,
        operationType: operation.type,
      });
      if (!execution.ok) {
        store.setState({
          ...previousSnapshot,
          isApplying: false,
          lastError: execution.error,
          dragState: null,
          version: previousSnapshot.version,
        });
        return createErrorAction(execution.error.code, execution.error.message);
      }

      const applied = execution.applied;
      if (Array.isArray(applied.nodes)) {
        const normalizedAppliedNodes = normalizeNodesV2(applied.nodes);
        store.patchState((current: FolderTreeState) => ({
          ...current,
          nodes: normalizedAppliedNodes,
          isApplying: false,
          lastError: null,
          version:
            applied.version !== undefined && Number.isFinite(applied.version)
              ? applied.version
              : current.version + 1,
        }));
      } else {
        store.patchState((current: FolderTreeState) => ({
          ...current,
          isApplying: false,
          lastError: null,
          version:
            applied.version !== undefined && Number.isFinite(applied.version)
              ? applied.version
              : current.version + 1,
        }));
      }

      return toActionOk();
    },
    [adapter, executeAdapterTransaction, instanceId, maxUndoEntries, store]
  );

  const canDropNode = useCallback(
    (nodeId: string, targetId: string | null, position: MasterTreeDropPositionDto = 'inside') =>
      canDropNodeV2({
        nodes: store.getState().nodes,
        nodeId,
        targetId,
        position,
        profile,
      }),
    [profile, store]
  );

  const selectNode = useCallback(
    (nodeId: string | null): void => {
      store.patchState((prev: FolderTreeState) => {
        if (prev.selectedNodeId === nodeId) return prev;
        return {
          ...prev,
          selectedNodeId: nodeId,
        };
      });
    },
    [store]
  );

  const setExpandedNodeIds = useCallback(
    (nodeIds: string[]): void => {
      const ids = Array.from(new Set(nodeIds.map((id) => id.trim()).filter(Boolean)));
      store.patchState((prev: FolderTreeState) => {
        if (
          prev.expandedNodeIds.length === ids.length &&
          prev.expandedNodeIds.every((id, index) => id === ids[index])
        ) {
          return prev;
        }
        return {
          ...prev,
          expandedNodeIds: ids,
        };
      });
    },
    [store]
  );

  const toggleNodeExpanded = useCallback(
    (nodeId: string): void => {
      store.patchState((prev: FolderTreeState) => {
        const expanded = new Set(prev.expandedNodeIds);
        if (expanded.has(nodeId)) {
          expanded.delete(nodeId);
        } else {
          expanded.add(nodeId);
        }
        return {
          ...prev,
          expandedNodeIds: Array.from(expanded),
        };
      });
    },
    [store]
  );

  const expandNode = useCallback(
    (nodeId: string): void => {
      store.patchState((prev: FolderTreeState) => {
        if (prev.expandedNodeIds.includes(nodeId)) return prev;
        return {
          ...prev,
          expandedNodeIds: [...prev.expandedNodeIds, nodeId],
        };
      });
    },
    [store]
  );

  const collapseNode = useCallback(
    (nodeId: string): void => {
      store.patchState((prev: FolderTreeState) => {
        if (!prev.expandedNodeIds.includes(nodeId)) return prev;
        return {
          ...prev,
          expandedNodeIds: prev.expandedNodeIds.filter((id) => id !== nodeId),
        };
      });
    },
    [store]
  );

  const expandAll = useCallback((): void => {
    const nodes = store.getState().nodes;
    setExpandedNodeIds(nodes.filter((node) => node.type === 'folder').map((node) => node.id));
  }, [setExpandedNodeIds, store]);

  const collapseAll = useCallback((): void => {
    setExpandedNodeIds([]);
  }, [setExpandedNodeIds]);

  const expandToNode = useCallback(
    (nodeId: MasterTreeId): void => {
      const ancestors = getAncestorIds(store.getState().nodes, nodeId);
      if (ancestors.length === 0) return;
      store.patchState((prev: FolderTreeState) => {
        const expanded = new Set(prev.expandedNodeIds);
        let changed = false;
        ancestors.forEach((id) => {
          if (!expanded.has(id)) {
            expanded.add(id);
            changed = true;
          }
        });
        if (!changed) return prev;
        return {
          ...prev,
          expandedNodeIds: Array.from(expanded),
        };
      });
    },
    [store]
  );

  const toggleSelectNode = useCallback(
    (nodeId: MasterTreeId): void => {
      store.patchState((prev: FolderTreeState) => {
        const next = new Set(prev.selectedNodeIds);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return {
          ...prev,
          selectedNodeIds: Array.from(next),
        };
      });
    },
    [store]
  );

  const selectNodeRange = useCallback(
    (anchorId: MasterTreeId, nodeId: MasterTreeId, visibleNodeIds: MasterTreeId[]): void => {
      const fromIdx = visibleNodeIds.indexOf(anchorId);
      const toIdx = visibleNodeIds.indexOf(nodeId);
      if (fromIdx === -1 || toIdx === -1) return;
      const lo = Math.min(fromIdx, toIdx);
      const hi = Math.max(fromIdx, toIdx);
      const rangeIds = visibleNodeIds.slice(lo, hi + 1);
      store.patchState((prev: FolderTreeState) => ({
        ...prev,
        selectedNodeIds: rangeIds,
        selectedNodeId: nodeId,
      }));
    },
    [store]
  );

  const selectAllNodes = useCallback((): void => {
    store.patchState((prev: FolderTreeState) => ({
      ...prev,
      selectedNodeIds: prev.nodes.map((n) => n.id),
    }));
  }, [store]);

  const clearMultiSelection = useCallback((): void => {
    store.patchState((prev: FolderTreeState) => {
      if (prev.selectedNodeIds.length === 0) return prev;
      return {
        ...prev,
        selectedNodeIds: [],
      };
    });
  }, [store]);

  const setSelectedNodeIds = useCallback(
    (nodeIds: MasterTreeId[]): void => {
      const ids = Array.from(new Set(nodeIds));
      store.patchState((prev: FolderTreeState) => ({
        ...prev,
        selectedNodeIds: ids,
      }));
    },
    [store]
  );

  const startRename = useCallback(
    (nodeId: string): void => {
      const current = store.getState();
      const node = current.nodes.find((candidate) => candidate.id === nodeId);
      if (!node) return;
      store.patchState((prev: FolderTreeState) => ({
        ...prev,
        renamingNodeId: nodeId,
        renameDraft: node.name,
      }));
    },
    [store]
  );

  const updateRenameDraft = useCallback(
    (value: string): void => {
      store.patchState((prev: FolderTreeState) => ({
        ...prev,
        renameDraft: value,
      }));
    },
    [store]
  );

  const cancelRename = useCallback((): void => {
    store.patchState((prev: FolderTreeState) => ({
      ...prev,
      renamingNodeId: null,
      renameDraft: '',
    }));
  }, [store]);

  const commitRename = useCallback(
    async (name?: string): Promise<MasterFolderTreeActionResult> => {
      const current = store.getState();
      const nodeId = current.renamingNodeId;
      if (!nodeId) return createErrorAction('NO_RENAME_NODE');
      const rawName = (name ?? current.renameDraft).trim();
      if (!rawName) return createErrorAction('INVALID_NAME');
      const existing = current.nodes.find((node) => node.id === nodeId);
      if (!existing) return createErrorAction('NODE_NOT_FOUND');
      if (existing.name === rawName) {
        cancelRename();
        return toActionOk();
      }

      const optimisticNodes = current.nodes.map((node) =>
        node.id === nodeId
          ? {
            ...node,
            name: rawName,
          }
          : node
      );

      const result = await applyPersistedOperation({
        operation: {
          type: 'rename',
          nodeId,
          name: rawName,
        },
        optimisticNodes,
        undoLabel: `Rename ${existing.name}`,
      });

      store.patchState((prev: FolderTreeState) => ({
        ...prev,
        renamingNodeId: null,
        renameDraft: '',
      }));

      return result;
    },
    [applyPersistedOperation, cancelRename, store]
  );

  const startDrag = useCallback(
    (nodeId: string): void => {
      store.patchState((prev: FolderTreeState) => ({
        ...prev,
        dragState: {
          draggedNodeId: nodeId,
          targetId: null,
          position: 'inside',
        },
      }));
    },
    [store]
  );

  const updateDragTarget = useCallback(
    (targetId: string | null, position: MasterTreeDropPositionDto = 'inside'): void => {
      store.patchState((prev: FolderTreeState) => {
        if (!prev.dragState) return prev;
        if (prev.dragState.targetId === targetId && prev.dragState.position === position) {
          return prev;
        }
        return {
          ...prev,
          dragState: {
            ...prev.dragState,
            targetId,
            position,
          },
        };
      });
    },
    [store]
  );

  const clearDrag = useCallback((): void => {
    store.patchState((prev: FolderTreeState) => {
      if (!prev.dragState) return prev;
      return {
        ...prev,
        dragState: null,
      };
    });
  }, [store]);

  const moveNode = useCallback(
    async (
      nodeId: string,
      targetParentId: string | null,
      targetIndex?: number
    ): Promise<MasterFolderTreeActionResult> => {
      const current = store.getState();
      const result = moveNodeV2({
        nodes: current.nodes,
        nodeId,
        targetParentId,
        targetIndex,
        profile,
      });
      if (!result.ok) return createErrorAction(result.code);

      return await applyPersistedOperation({
        operation: {
          type: 'move',
          nodeId,
          targetParentId,
          ...(targetIndex !== undefined ? { targetIndex } : {}),
        },
        optimisticNodes: result.nodes,
        undoLabel: 'Move item',
      });
    },
    [applyPersistedOperation, profile, store]
  );

  const reorderNode = useCallback(
    async (
      nodeId: string,
      targetId: string,
      position: 'before' | 'after'
    ): Promise<MasterFolderTreeActionResult> => {
      const current = store.getState();
      const result = reorderNodeV2({
        nodes: current.nodes,
        nodeId,
        targetId,
        position,
        profile,
      });
      if (!result.ok) return createErrorAction(result.code);

      return await applyPersistedOperation({
        operation: {
          type: 'reorder',
          nodeId,
          targetId,
          position,
        },
        optimisticNodes: result.nodes,
        undoLabel: 'Reorder item',
      });
    },
    [applyPersistedOperation, profile, store]
  );

  const dropNodeToRoot = useCallback(
    async (nodeId: string, targetIndex?: number): Promise<MasterFolderTreeActionResult> => {
      const current = store.getState();
      const result = dropNodeToRootV2({
        nodes: current.nodes,
        nodeId,
        targetIndex,
        profile,
      });
      if (!result.ok) return createErrorAction(result.code);

      return await applyPersistedOperation({
        operation: {
          type: 'move',
          nodeId,
          targetParentId: null,
          ...(targetIndex !== undefined ? { targetIndex } : {}),
        },
        optimisticNodes: result.nodes,
        undoLabel: 'Move to root',
      });
    },
    [applyPersistedOperation, profile, store]
  );

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

      // External prop sync should never persist back through adapter.
      // It mirrors source-of-truth updates and must not produce mutation toasts.
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
        ...(persistedVersion !== undefined ? { persistedVersion } : {}),
      });
    },
    [applyPersistedOperation, store]
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
  const selectedNodeIdsSet = useMemo(
    () => new Set(state.selectedNodeIds),
    [state.selectedNodeIds]
  );
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
