'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { defaultFolderTreeProfilesV2 } from '@/shared/utils/folder-tree-profiles-v2';
import type {
  MasterTreeDropPosition,
  MasterTreeId,
  MasterTreeNode,
} from '@/shared/utils/master-folder-tree-contract';
import {
  buildMasterTree,
  canDropMasterTreeNode,
  dropMasterTreeNodeToRoot,
  moveMasterTreeNode,
  normalizeMasterTreeNodes,
  reorderMasterTreeNode,
  validateMasterTreeNodes,
} from '@/shared/utils/master-folder-tree-engine';

import {
  toMasterFolderTreeActionFail,
  type MasterFolderTreeActionResult,
  type MasterFolderTreeController,
  type MasterFolderTreeError,
  type MasterFolderTreePersistOperation,
  type MasterFolderTreeUndoEntry,
  type UseMasterFolderTreeOptions,
} from './types';

type InternalMasterFolderTreeState = {
  nodes: MasterTreeNode[];
  selectedNodeId: MasterTreeId | null;
  expandedNodeIds: MasterTreeId[];
  renamingNodeId: MasterTreeId | null;
  renameDraft: string;
  dragState: MasterFolderTreeController['dragState'];
  undoStack: MasterFolderTreeUndoEntry[];
  isApplying: boolean;
  lastError: MasterFolderTreeError | null;
};

const dedupeStringList = (values: string[]): string[] => {
  const seen = new Set<string>();
  values.forEach((value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    seen.add(normalized);
  });
  return Array.from(seen);
};

const areMetadataValuesEqual = (
  left: Record<string, unknown> | undefined,
  right: Record<string, unknown> | undefined
): boolean => {
  if (left === right) return true;
  try {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  } catch {
    return false;
  }
};

const areMasterTreeNodesEqual = (
  left: MasterTreeNode[],
  right: MasterTreeNode[]
): boolean => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftNode = left[index];
    const rightNode = right[index];
    if (!leftNode || !rightNode) return false;
    if (leftNode.id !== rightNode.id) return false;
    if (leftNode.type !== rightNode.type) return false;
    if (leftNode.kind !== rightNode.kind) return false;
    if (leftNode.parentId !== rightNode.parentId) return false;
    if (leftNode.name !== rightNode.name) return false;
    if (leftNode.path !== rightNode.path) return false;
    if (leftNode.sortOrder !== rightNode.sortOrder) return false;
    if ((leftNode.icon ?? null) !== (rightNode.icon ?? null)) return false;
    if (!areMetadataValuesEqual(leftNode.metadata, rightNode.metadata)) return false;
  }
  return true;
};

/**
 * Structural equality check that ignores cosmetic differences (sortOrder, metadata).
 * Used by the post-optimistic cooldown guard: if the tree structure (parent-child
 * relationships, names, types) hasn't changed, external sync can safely be skipped
 * even when sortOrder or metadata differ due to rebuild from server data.
 */
const areMasterTreeNodesStructurallyEqual = (
  left: MasterTreeNode[],
  right: MasterTreeNode[]
): boolean => {
  if (left.length !== right.length) return false;
  const leftById = new Map(left.map((n: MasterTreeNode) => [n.id, n]));
  for (const rightNode of right) {
    const leftNode = leftById.get(rightNode.id);
    if (!leftNode) return false;
    if (leftNode.type !== rightNode.type) return false;
    if (leftNode.kind !== rightNode.kind) return false;
    if (leftNode.parentId !== rightNode.parentId) return false;
    if (leftNode.name !== rightNode.name) return false;
  }
  return true;
};

/** Cooldown period (ms) after an optimistic operation during which external_sync
 *  replacements are suppressed when the incoming tree is structurally identical.
 *  This guards against races where adapter-side effects (mutation onSettled refetch)
 *  produce nodes that differ only cosmetically (e.g. sortOrder) from the optimistic
 *  state and would otherwise trigger a redundant replaceNodes. */
const OPTIMISTIC_SETTLE_COOLDOWN_MS = 3_000;

/** Maximum time (ms) the isApplyingDirectRef guard can stay active before
 *  being force-cleared. Prevents the tree from becoming permanently frozen
 *  if an adapter throws an unhandled error or a requestAnimationFrame callback
 *  is never invoked (e.g. background tab throttling). */
const APPLYING_GUARD_TIMEOUT_MS = 10_000;

// ─── Dev-only guardrails ──────────────────────────────────────────────

const DEV = process.env.NODE_ENV !== 'production';

/** Warn when tree validation detects structural issues after an operation. */
const devWarnTreeIntegrity = (
  nodes: MasterTreeNode[],
  context: string
): void => {
  if (!DEV) return;
  const issues = validateMasterTreeNodes(nodes);
  if (issues.length === 0) return;
  console.warn(
    `[MasterFolderTree:guardrail] Tree integrity issues after ${context}:`,
    issues.map((i) => `${i.code}: ${i.message}`)
  );
};

/** Warn when an adapter returns void instead of nodes. Adapters that return
 *  void force the tree to rely on external sync, which is vulnerable to races. */
const devWarnAdapterVoidReturn = (
  persisted: unknown,
  operationType: string
): void => {
  if (!DEV) return;
  if (Array.isArray(persisted)) return;
  console.warn(
    `[MasterFolderTree:guardrail] Adapter returned void for "${operationType}". ` +
    'Returning context.nextNodes from the adapter is recommended to avoid race conditions.'
  );
};

// ─── End guardrails ───────────────────────────────────────────────────

const cloneMasterTreeNodes = (nodes: MasterTreeNode[]): MasterTreeNode[] => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(nodes);
  }
  return nodes.map((node: MasterTreeNode) => ({ ...node }));
};

const cloneUndoStack = (entries: MasterFolderTreeUndoEntry[]): MasterFolderTreeUndoEntry[] =>
  entries.map((entry: MasterFolderTreeUndoEntry) => ({
    ...entry,
    nodes: cloneMasterTreeNodes(entry.nodes),
    expandedNodeIds: [...entry.expandedNodeIds],
  }));

const createUndoEntry = (
  state: InternalMasterFolderTreeState,
  label: string
): MasterFolderTreeUndoEntry => ({
  label,
  createdAt: Date.now(),
  nodes: cloneMasterTreeNodes(state.nodes),
  selectedNodeId: state.selectedNodeId,
  expandedNodeIds: [...state.expandedNodeIds],
});

const initializeState = (
  options: UseMasterFolderTreeOptions
): InternalMasterFolderTreeState => {
  const normalizedNodes = normalizeMasterTreeNodes(options.initialNodes);
  const nodeIds = new Set<string>(normalizedNodes.map((node: MasterTreeNode) => node.id));
  const selectedNodeId =
    options.initialSelectedNodeId && nodeIds.has(options.initialSelectedNodeId)
      ? options.initialSelectedNodeId
      : null;
  const expandedNodeIds = dedupeStringList(options.initiallyExpandedNodeIds ?? []).filter(
    (id: string) => nodeIds.has(id)
  );

  return {
    nodes: normalizedNodes,
    selectedNodeId,
    expandedNodeIds,
    renamingNodeId: null,
    renameDraft: '',
    dragState: null,
    undoStack: [],
    isApplying: false,
    lastError: null,
  };
};

export function useMasterFolderTree(
  options: UseMasterFolderTreeOptions
): MasterFolderTreeController {
  const profile = options.profile ?? defaultFolderTreeProfilesV2.notes;
  const adapter = options.adapter;
  const maxUndoEntries = Math.max(1, options.maxUndoEntries ?? 50);

  const [state, setState] = useState<InternalMasterFolderTreeState>(() =>
    initializeState(options)
  );

  const stateRef = useRef(state);
  const persistTokenRef = useRef(0);
  /** Direct ref for isApplying – set synchronously outside setState so external sync guards
   *  are reliable regardless of React batching timing. */
  const isApplyingDirectRef = useRef(false);
  /** Timestamp of the last successful optimistic operation completion.
   *  Used as a cooldown guard: external_sync that only differs cosmetically
   *  (e.g. sortOrder) is suppressed within OPTIMISTIC_SETTLE_COOLDOWN_MS. */
  const lastOptimisticSettleRef = useRef(0);
  /** Safety-net timer that auto-clears isApplyingDirectRef if it stays stuck
   *  (e.g. adapter throws unhandled, rAF never fires in background tab). */
  const applyingGuardTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  const resolveStateUpdater = useCallback(
    (
      updater:
        | InternalMasterFolderTreeState
        | ((prev: InternalMasterFolderTreeState) => InternalMasterFolderTreeState),
      prev: InternalMasterFolderTreeState
    ): InternalMasterFolderTreeState => {
      if (typeof updater === 'function') {
        const updaterFn = updater as (
          state: InternalMasterFolderTreeState
        ) => InternalMasterFolderTreeState;
        return updaterFn(prev);
      }
      return updater;
    },
    []
  );

  const syncState = useCallback(
    (
      updater:
        | InternalMasterFolderTreeState
        | ((prev: InternalMasterFolderTreeState) => InternalMasterFolderTreeState)
    ): void => {
      setState((prev: InternalMasterFolderTreeState) => {
        const next = resolveStateUpdater(updater, prev);
        stateRef.current = next;
        return next;
      });
    },
    [resolveStateUpdater]
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (options.externalRevision === undefined) return;
    const normalizedNodes = normalizeMasterTreeNodes(options.initialNodes);
    const nodeIds = new Set<string>(normalizedNodes.map((node: MasterTreeNode) => node.id));

    syncState((prev: InternalMasterFolderTreeState) => ({
      ...prev,
      nodes: normalizedNodes,
      selectedNodeId: prev.selectedNodeId && nodeIds.has(prev.selectedNodeId) ? prev.selectedNodeId : null,
      expandedNodeIds: prev.expandedNodeIds.filter((id: string) => nodeIds.has(id)),
      renamingNodeId: prev.renamingNodeId && nodeIds.has(prev.renamingNodeId) ? prev.renamingNodeId : null,
      renameDraft: prev.renamingNodeId && nodeIds.has(prev.renamingNodeId) ? prev.renameDraft : '',
      dragState: prev.dragState && nodeIds.has(prev.dragState.draggedNodeId) ? prev.dragState : null,
      undoStack: [],
      lastError: null,
    }));
  }, [options.externalRevision, options.initialNodes, syncState]);

  const setError = useCallback(
    (
      code: string,
      message: string,
      operationType: MasterFolderTreePersistOperation['type'] | 'unknown',
      cause?: unknown
    ): void => {
      syncState((prev: InternalMasterFolderTreeState) => ({
        ...prev,
        lastError: {
          code,
          message,
          operationType,
          at: new Date().toISOString(),
          ...(cause !== undefined ? { cause } : {}),
        },
      }));
    },
    [syncState]
  );

  const clearError = useCallback((): void => {
    syncState((prev: InternalMasterFolderTreeState) => {
      if (!prev.lastError) return prev;
      return {
        ...prev,
        lastError: null,
      };
    });
  }, [syncState]);

  const pushUndoEntry = useCallback(
    (label: string): void => {
      const snapshot = createUndoEntry(stateRef.current, label);
      syncState((prev: InternalMasterFolderTreeState) => ({
        ...prev,
        undoStack: [snapshot, ...prev.undoStack].slice(0, maxUndoEntries),
      }));
    },
    [maxUndoEntries, syncState]
  );

  // ─── Guard arming helpers ──────────────────────────────────────────

  /** Activate the direct-ref guard and start a safety-net timeout that
   *  force-clears the guard if the normal rAF-based clear never fires
   *  (e.g. tab is backgrounded, adapter throws unexpected error). */
  const armApplyingGuard = useCallback((): void => {
    isApplyingDirectRef.current = true;
    if (applyingGuardTimerRef.current !== null) {
      globalThis.clearTimeout(applyingGuardTimerRef.current);
    }
    applyingGuardTimerRef.current = globalThis.setTimeout(() => {
      if (isApplyingDirectRef.current) {
        if (DEV) {
          console.warn(
            '[MasterFolderTree:guardrail] isApplyingDirectRef was stuck for',
            APPLYING_GUARD_TIMEOUT_MS,
            'ms — force-clearing to unblock external sync.'
          );
        }
        isApplyingDirectRef.current = false;
      }
      applyingGuardTimerRef.current = null;
    }, APPLYING_GUARD_TIMEOUT_MS);
  }, []);

  /** Clear the direct-ref guard and cancel the safety-net timeout. */
  const disarmApplyingGuard = useCallback((): void => {
    if (applyingGuardTimerRef.current !== null) {
      globalThis.clearTimeout(applyingGuardTimerRef.current);
      applyingGuardTimerRef.current = null;
    }
    requestAnimationFrame(() => {
      isApplyingDirectRef.current = false;
    });
  }, []);

  // Clean up guard timer on unmount
  useEffect(() => {
    return (): void => {
      if (applyingGuardTimerRef.current !== null) {
        globalThis.clearTimeout(applyingGuardTimerRef.current);
        applyingGuardTimerRef.current = null;
      }
    };
  }, []);

  const applyOptimisticOperation = useCallback(
    async (
      operation: MasterFolderTreePersistOperation,
      nextNodes: MasterTreeNode[],
      undoLabel: string
    ): Promise<MasterFolderTreeActionResult> => {
      const previousState = stateRef.current;
      const previousSnapshot: InternalMasterFolderTreeState = {
        ...previousState,
        nodes: cloneMasterTreeNodes(previousState.nodes),
        expandedNodeIds: [...previousState.expandedNodeIds],
        undoStack: cloneUndoStack(previousState.undoStack),
      };

      pushUndoEntry(undoLabel);
      const normalizedNext = normalizeMasterTreeNodes(nextNodes);

      // Guardrail: validate optimistic nodes before applying them.
      devWarnTreeIntegrity(normalizedNext, `optimistic ${operation.type}`);

      // Arm the applying guard BEFORE React state so external sync guards
      // are immediate. The guard timer ensures auto-clear if something goes wrong.
      if (adapter?.applyOperation) {
        armApplyingGuard();
      }

      syncState((prev: InternalMasterFolderTreeState) => ({
        ...prev,
        nodes: normalizedNext,
        selectedNodeId:
          prev.selectedNodeId && normalizedNext.some((node: MasterTreeNode) => node.id === prev.selectedNodeId)
            ? prev.selectedNodeId
            : null,
        expandedNodeIds: prev.expandedNodeIds.filter((id: string) =>
          normalizedNext.some((node: MasterTreeNode) => node.id === id)
        ),
        lastError: null,
        isApplying: Boolean(adapter?.applyOperation),
      }));

      if (!adapter?.applyOperation) {
        return { ok: true };
      }

      const token = persistTokenRef.current + 1;
      persistTokenRef.current = token;

      try {
        const persisted = await adapter.applyOperation(operation, {
          previousNodes: previousSnapshot.nodes,
          nextNodes: normalizedNext,
          profile,
        });

        if (token !== persistTokenRef.current) return { ok: true };

        // Guardrail: warn when adapter doesn't return nodes.
        devWarnAdapterVoidReturn(persisted, operation.type);

        if (Array.isArray(persisted)) {
          const normalizedPersisted = normalizeMasterTreeNodes(persisted);
          // Guardrail: validate adapter-returned nodes.
          devWarnTreeIntegrity(normalizedPersisted, `adapter ${operation.type}`);
          syncState((prev: InternalMasterFolderTreeState) => ({
            ...prev,
            nodes: normalizedPersisted,
            selectedNodeId:
              prev.selectedNodeId &&
              normalizedPersisted.some((node: MasterTreeNode) => node.id === prev.selectedNodeId)
                ? prev.selectedNodeId
                : null,
            expandedNodeIds: prev.expandedNodeIds.filter((id: string) =>
              normalizedPersisted.some((node: MasterTreeNode) => node.id === id)
            ),
            isApplying: false,
          }));
        } else {
          syncState((prev: InternalMasterFolderTreeState) => ({
            ...prev,
            isApplying: false,
          }));
        }
        // Mark the settle timestamp so the cooldown guard in replaceNodes can
        // suppress cosmetic-only external syncs that arrive shortly after.
        lastOptimisticSettleRef.current = Date.now();
        // Disarm the guard (deferred via rAF to survive the React render+effects
        // cycle, with a safety-net timeout as backup).
        disarmApplyingGuard();
      } catch (error) {
        if (token !== persistTokenRef.current) {
          disarmApplyingGuard();
          return { ok: false, code: 'PERSIST_CONFLICT' };
        }

        if (DEV) {
          console.warn('[MasterFolderTree:guardrail] applyOptimisticOperation failed:', {
            operationType: operation.type,
            error: error instanceof Error ? error.message : error,
          });
        }

        syncState({
          ...previousSnapshot,
          isApplying: false,
          lastError: {
            code: 'PERSIST_FAILED',
            message: error instanceof Error ? error.message : 'Operation failed while persisting.',
            operationType: operation.type,
            at: new Date().toISOString(),
            cause: error,
          },
        });
        disarmApplyingGuard();
        return toMasterFolderTreeActionFail('PERSIST_FAILED');
      }

      return { ok: true };
    },
    [adapter, armApplyingGuard, disarmApplyingGuard, profile, pushUndoEntry, syncState]
  );

  const replaceNodes = useCallback(
    async (
      incomingNodes: MasterTreeNode[],
      reason: 'refresh' | 'external_sync' = 'external_sync'
    ): Promise<MasterFolderTreeActionResult> => {
      // Guard 1: Skip external sync while an optimistic operation is in progress
      // to prevent stale external state from overwriting the optimistic nodes.
      // Use direct ref (set synchronously, not through setState) for reliable timing.
      if (reason === 'external_sync' && (isApplyingDirectRef.current || stateRef.current.isApplying)) {
        if (DEV) {
          console.debug(
            '[MasterFolderTree:guard] Blocked external_sync — optimistic operation in progress'
          );
        }
        return { ok: true };
      }

      const normalized = normalizeMasterTreeNodes(incomingNodes);
      const previousNodes = stateRef.current.nodes;
      // Guard 2: Skip if the incoming nodes are identical to current nodes.
      if (reason === 'external_sync' && areMasterTreeNodesEqual(previousNodes, normalized)) {
        return { ok: true };
      }
      // Guard 3: Cooldown — within a short window after an optimistic operation settles,
      // suppress external_sync if the incoming nodes are structurally identical
      // (same parent-child relationships, names, types). This prevents races where
      // mutation side-effects (onSuccess cache update, onSettled refetch) produce nodes
      // that differ only cosmetically (sortOrder, metadata timestamps) from the
      // optimistic state, which would otherwise cause a visual "jump back".
      if (reason === 'external_sync' && lastOptimisticSettleRef.current > 0) {
        const elapsed = Date.now() - lastOptimisticSettleRef.current;
        if (elapsed < OPTIMISTIC_SETTLE_COOLDOWN_MS && areMasterTreeNodesStructurallyEqual(previousNodes, normalized)) {
          if (DEV) {
            console.debug(
              '[MasterFolderTree:guard] Blocked external_sync — cooldown active, structurally identical',
              { elapsedMs: elapsed, cooldownMs: OPTIMISTIC_SETTLE_COOLDOWN_MS }
            );
          }
          return { ok: true };
        }
      }
      syncState((prev: InternalMasterFolderTreeState) => ({
        ...prev,
        nodes: normalized,
        selectedNodeId:
          prev.selectedNodeId && normalized.some((node: MasterTreeNode) => node.id === prev.selectedNodeId)
            ? prev.selectedNodeId
            : null,
        expandedNodeIds: prev.expandedNodeIds.filter((id: string) =>
          normalized.some((node: MasterTreeNode) => node.id === id)
        ),
        renamingNodeId:
          prev.renamingNodeId && normalized.some((node: MasterTreeNode) => node.id === prev.renamingNodeId)
            ? prev.renamingNodeId
            : null,
        renameDraft:
          prev.renamingNodeId && normalized.some((node: MasterTreeNode) => node.id === prev.renamingNodeId)
            ? prev.renameDraft
            : '',
        dragState:
          prev.dragState && normalized.some((node: MasterTreeNode) => node.id === prev.dragState?.draggedNodeId)
            ? prev.dragState
            : null,
        lastError: null,
      }));

      if (!adapter?.applyOperation) return { ok: true };

      syncState((prev: InternalMasterFolderTreeState) => ({
        ...prev,
        isApplying: true,
      }));
      try {
        const persisted = await adapter.applyOperation(
          { type: 'replace_nodes', nodes: normalized, reason },
          { previousNodes, nextNodes: normalized, profile }
        );
        if (Array.isArray(persisted)) {
          const persistedNormalized = normalizeMasterTreeNodes(persisted);
          syncState((prev: InternalMasterFolderTreeState) => ({
            ...prev,
            nodes: persistedNormalized,
            isApplying: false,
          }));
        } else {
          syncState((prev: InternalMasterFolderTreeState) => ({
            ...prev,
            isApplying: false,
          }));
        }
        return { ok: true };
      } catch (error) {
        syncState((prev: InternalMasterFolderTreeState) => ({
          ...prev,
          isApplying: false,
        }));
        setError(
          'REPLACE_PERSIST_FAILED',
          error instanceof Error ? error.message : 'Failed to persist replacement nodes.',
          'replace_nodes',
          error
        );
        return toMasterFolderTreeActionFail('REPLACE_PERSIST_FAILED');
      }
    },
    [adapter, profile, setError, syncState]
  );

  const refreshFromAdapter = useCallback(async (): Promise<MasterFolderTreeActionResult> => {
    if (!adapter?.loadNodes) {
      return toMasterFolderTreeActionFail('NO_ADAPTER_LOADER');
    }
    syncState((prev: InternalMasterFolderTreeState) => ({
      ...prev,
      isApplying: true,
    }));
    try {
      const loaded = await adapter.loadNodes();
      const normalized = normalizeMasterTreeNodes(loaded);
      syncState((prev: InternalMasterFolderTreeState) => ({
        ...prev,
        nodes: normalized,
        selectedNodeId:
          prev.selectedNodeId && normalized.some((node: MasterTreeNode) => node.id === prev.selectedNodeId)
            ? prev.selectedNodeId
            : null,
        expandedNodeIds: prev.expandedNodeIds.filter((id: string) =>
          normalized.some((node: MasterTreeNode) => node.id === id)
        ),
        renamingNodeId: null,
        renameDraft: '',
        dragState: null,
        isApplying: false,
        lastError: null,
      }));
      return { ok: true };
    } catch (error) {
      syncState((prev: InternalMasterFolderTreeState) => ({
        ...prev,
        isApplying: false,
      }));
      setError(
        'REFRESH_FAILED',
        error instanceof Error ? error.message : 'Failed to refresh nodes from adapter.',
        'replace_nodes',
        error
      );
      return toMasterFolderTreeActionFail('REFRESH_FAILED');
    }
  }, [adapter, setError, syncState]);

  const selectNode = useCallback(
    (nodeId: MasterTreeId | null): void => {
      syncState((prev: InternalMasterFolderTreeState) => ({
        ...prev,
        selectedNodeId: nodeId,
      }));
    },
    [syncState]
  );

  const setExpandedNodeIds = useCallback(
    (nodeIds: MasterTreeId[]): void => {
      syncState((prev: InternalMasterFolderTreeState) => {
        const nodeIdSet = new Set(prev.nodes.map((node: MasterTreeNode) => node.id));
        const nextExpanded = dedupeStringList(nodeIds).filter((id: string) => nodeIdSet.has(id));
        if (
          nextExpanded.length === prev.expandedNodeIds.length &&
          nextExpanded.every((id: string, index: number) => id === prev.expandedNodeIds[index])
        ) {
          return prev;
        }
        return {
          ...prev,
          expandedNodeIds: nextExpanded,
        };
      });
    },
    [syncState]
  );

  const toggleNodeExpanded = useCallback(
    (nodeId: MasterTreeId): void => {
      syncState((prev: InternalMasterFolderTreeState) => {
        const nextExpanded = new Set(prev.expandedNodeIds);
        if (nextExpanded.has(nodeId)) nextExpanded.delete(nodeId);
        else nextExpanded.add(nodeId);
        return {
          ...prev,
          expandedNodeIds: Array.from(nextExpanded),
        };
      });
    },
    [syncState]
  );

  const expandNode = useCallback(
    (nodeId: MasterTreeId): void => {
      syncState((prev: InternalMasterFolderTreeState) => {
        if (prev.expandedNodeIds.includes(nodeId)) return prev;
        return {
          ...prev,
          expandedNodeIds: [...prev.expandedNodeIds, nodeId],
        };
      });
    },
    [syncState]
  );

  const collapseNode = useCallback(
    (nodeId: MasterTreeId): void => {
      syncState((prev: InternalMasterFolderTreeState) => ({
        ...prev,
        expandedNodeIds: prev.expandedNodeIds.filter((id: string) => id !== nodeId),
      }));
    },
    [syncState]
  );

  const expandAll = useCallback((): void => {
    const ids = stateRef.current.nodes
      .filter((node: MasterTreeNode) => node.type === 'folder')
      .map((node: MasterTreeNode) => node.id);
    syncState((prev: InternalMasterFolderTreeState) => ({
      ...prev,
      expandedNodeIds: dedupeStringList(ids),
    }));
  }, [syncState]);

  const collapseAll = useCallback((): void => {
    syncState((prev: InternalMasterFolderTreeState) => ({
      ...prev,
      expandedNodeIds: [],
    }));
  }, [syncState]);

  const startRename = useCallback(
    (nodeId: MasterTreeId): void => {
      const node = stateRef.current.nodes.find((item: MasterTreeNode) => item.id === nodeId);
      if (!node) return;
      syncState((prev: InternalMasterFolderTreeState) => ({
        ...prev,
        renamingNodeId: nodeId,
        renameDraft: node.name,
      }));
    },
    [syncState]
  );

  const updateRenameDraft = useCallback(
    (value: string): void => {
      syncState((prev: InternalMasterFolderTreeState) => ({
        ...prev,
        renameDraft: value,
      }));
    },
    [syncState]
  );

  const cancelRename = useCallback((): void => {
    syncState((prev: InternalMasterFolderTreeState) => ({
      ...prev,
      renamingNodeId: null,
      renameDraft: '',
    }));
  }, [syncState]);

  const commitRename = useCallback(
    async (name?: string): Promise<MasterFolderTreeActionResult> => {
      const current = stateRef.current;
      const nodeId = current.renamingNodeId;
      if (!nodeId) return toMasterFolderTreeActionFail('NO_RENAME_NODE');
      const nextName = (name ?? current.renameDraft).trim();
      if (!nextName) return toMasterFolderTreeActionFail('INVALID_NAME');

      const node = current.nodes.find((item: MasterTreeNode) => item.id === nodeId);
      if (!node) return toMasterFolderTreeActionFail('NODE_NOT_FOUND');
      if (node.name === nextName) {
        cancelRename();
        return { ok: true };
      }

      const nextNodes = current.nodes.map((item: MasterTreeNode) =>
        item.id === nodeId ? { ...item, name: nextName, path: nextName } : item
      );
      const result = await applyOptimisticOperation(
        { type: 'rename', nodeId, name: nextName },
        nextNodes,
        `Rename "${node.name}" to "${nextName}"`
      );
      if (result.ok) cancelRename();
      return result;
    },
    [applyOptimisticOperation, cancelRename]
  );

  const canDropNode = useCallback(
    (
      nodeId: MasterTreeId,
      targetId: MasterTreeId | null,
      position: MasterTreeDropPosition = 'inside'
    ) =>
      canDropMasterTreeNode({
        nodes: stateRef.current.nodes,
        nodeId,
        targetId,
        position,
        profile,
      }),
    [profile]
  );

  const moveNode = useCallback(
    async (
      nodeId: MasterTreeId,
      targetParentId: MasterTreeId | null,
      targetIndex?: number
    ): Promise<MasterFolderTreeActionResult> => {
      const result = moveMasterTreeNode({
        nodes: stateRef.current.nodes,
        nodeId,
        targetParentId,
        targetIndex,
        profile,
      });
      if (!result.ok) {
        return toMasterFolderTreeActionFail(result.code);
      }
      const opResult = await applyOptimisticOperation(
        { type: 'move', nodeId, targetParentId, ...(targetIndex !== undefined ? { targetIndex } : {}) },
        result.nodes,
        'Move node'
      );
      return opResult;
    },
    [applyOptimisticOperation, profile]
  );

  const reorderNode = useCallback(
    async (
      nodeId: MasterTreeId,
      targetId: MasterTreeId,
      position: 'before' | 'after'
    ): Promise<MasterFolderTreeActionResult> => {
      const result = reorderMasterTreeNode({
        nodes: stateRef.current.nodes,
        nodeId,
        targetId,
        position,
        profile,
      });
      if (!result.ok) return toMasterFolderTreeActionFail(result.code);
      return applyOptimisticOperation(
        { type: 'reorder', nodeId, targetId, position },
        result.nodes,
        'Reorder node'
      );
    },
    [applyOptimisticOperation, profile]
  );

  const dropNodeToRoot = useCallback(
    async (nodeId: MasterTreeId, targetIndex?: number): Promise<MasterFolderTreeActionResult> => {
      const result = dropMasterTreeNodeToRoot({
        nodes: stateRef.current.nodes,
        nodeId,
        targetIndex,
        profile,
      });
      if (!result.ok) return toMasterFolderTreeActionFail(result.code);
      return applyOptimisticOperation(
        { type: 'move', nodeId, targetParentId: null, ...(targetIndex !== undefined ? { targetIndex } : {}) },
        result.nodes,
        'Move node to root'
      );
    },
    [applyOptimisticOperation, profile]
  );

  const startDrag = useCallback(
    (nodeId: MasterTreeId): void => {
      syncState((prev: InternalMasterFolderTreeState) => ({
        ...prev,
        dragState: {
          draggedNodeId: nodeId,
          targetId: null,
          position: 'inside',
        },
      }));
    },
    [syncState]
  );

  const updateDragTarget = useCallback(
    (targetId: MasterTreeId | null, position: MasterTreeDropPosition = 'inside'): void => {
      syncState((prev: InternalMasterFolderTreeState) => {
        if (!prev.dragState) return prev;
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
    [syncState]
  );

  const clearDrag = useCallback((): void => {
    syncState((prev: InternalMasterFolderTreeState) => ({
      ...prev,
      dragState: null,
    }));
  }, [syncState]);

  const dropDraggedNode = useCallback(
    async (
      targetId: MasterTreeId | null,
      position: MasterTreeDropPosition = 'inside'
    ): Promise<MasterFolderTreeActionResult> => {
      const currentDrag = stateRef.current.dragState;
      const draggedNodeId = currentDrag?.draggedNodeId;
      if (!draggedNodeId) return toMasterFolderTreeActionFail('NO_DRAG_NODE');

      const result =
        targetId === null
          ? await dropNodeToRoot(draggedNodeId)
          : position === 'inside'
            ? await moveNode(draggedNodeId, targetId)
            : await reorderNode(draggedNodeId, targetId, position);

      clearDrag();
      return result;
    },
    [clearDrag, dropNodeToRoot, moveNode, reorderNode]
  );

  const undo = useCallback(async (): Promise<MasterFolderTreeActionResult> => {
    const current = stateRef.current;
    const entry = current.undoStack[0];
    if (!entry) return toMasterFolderTreeActionFail('UNDO_EMPTY');

    const rest = current.undoStack.slice(1);
    const previousNodes = current.nodes;
    const nextNodes = normalizeMasterTreeNodes(entry.nodes);
    syncState((prev: InternalMasterFolderTreeState) => ({
      ...prev,
      nodes: nextNodes,
      selectedNodeId: entry.selectedNodeId,
      expandedNodeIds: [...entry.expandedNodeIds],
      renamingNodeId: null,
      renameDraft: '',
      dragState: null,
      undoStack: rest,
      isApplying: Boolean(adapter?.applyOperation),
      lastError: null,
    }));

    if (!adapter?.applyOperation) return { ok: true };

    try {
      const persisted = await adapter.applyOperation(
        { type: 'replace_nodes', nodes: nextNodes, reason: 'undo' },
        { previousNodes, nextNodes, profile }
      );
      if (Array.isArray(persisted)) {
        syncState((prev: InternalMasterFolderTreeState) => ({
          ...prev,
          nodes: normalizeMasterTreeNodes(persisted),
          isApplying: false,
        }));
      } else {
        syncState((prev: InternalMasterFolderTreeState) => ({
          ...prev,
          isApplying: false,
        }));
      }
      return { ok: true };
    } catch (error) {
      syncState({
        ...current,
        isApplying: false,
        lastError: {
          code: 'UNDO_PERSIST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to persist undo operation.',
          operationType: 'replace_nodes',
          at: new Date().toISOString(),
          cause: error,
        },
      });
      return toMasterFolderTreeActionFail('UNDO_PERSIST_FAILED');
    }
  }, [adapter, profile, syncState]);

  const built = useMemo(() => {
    const result = buildMasterTree(state.nodes);
    if (DEV && result.issues.length > 0) {
      console.warn(
        '[MasterFolderTree:guardrail] Tree validation issues detected:',
        result.issues.map((i) => `${i.code}: ${i.message}`)
      );
    }
    return result;
  }, [state.nodes]);
  const selectedNode = useMemo(
    () =>
      state.selectedNodeId
        ? state.nodes.find((node: MasterTreeNode) => node.id === state.selectedNodeId) ?? null
        : null,
    [state.nodes, state.selectedNodeId]
  );
  const expandedNodeIdSet = useMemo(
    () => new Set(state.expandedNodeIds),
    [state.expandedNodeIds]
  );

  return {
    nodes: state.nodes,
    roots: built.roots,
    validationIssues: built.issues,
    selectedNodeId: state.selectedNodeId,
    selectedNode,
    expandedNodeIds: expandedNodeIdSet,
    renamingNodeId: state.renamingNodeId,
    renameDraft: state.renameDraft,
    dragState: state.dragState,
    canUndo: state.undoStack.length > 0,
    undoHistory: state.undoStack.map((entry: MasterFolderTreeUndoEntry) => ({
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
  };
}
