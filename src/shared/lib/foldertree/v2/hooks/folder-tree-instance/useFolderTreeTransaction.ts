'use client';

import { useCallback } from 'react';

import {
  type MasterFolderTreeActionResult,
  type MasterFolderTreePersistOperation,
  type UseMasterFolderTreeOptions,
} from '@/shared/contracts/master-folder-tree';

import {
  createAppliedTx,
  createErrorAction,
  isConflictError,
  normalizeError,
  toActionOk,
  cloneNodes,
  cloneUndoStack,
  withUndoEntry,
} from './folder-tree-utils';
import { type ApplyPersistedOperationArgs } from './useFolderTreeEngineActions';
import { normalizeNodesV2 } from '../../core/engine';
import { type FolderTreeStore } from '../../store/createFolderTreeStore';
import { type FolderTreeAppliedTransaction, type FolderTreeState, type FolderTreeTransaction } from '../../types';

import type { MasterFolderTreeShellRuntime } from '../../shell/useFolderTreeShellRuntime';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export function useFolderTreeTransaction(
  store: FolderTreeStore,
  adapter: UseMasterFolderTreeOptions['adapter'],
  maxUndoEntries: number,
  runtime: MasterFolderTreeShellRuntime
) {
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
        const prepared = await adapter.prepare(tx);
        stage = 'apply';
        const applied = (await adapter.apply(tx, prepared)) ?? createAppliedTx(tx);
        stage = 'commit';
        await adapter.commit(tx, applied);
        return {
          ok: true,
          applied,
        };
      } catch (error) {
        logClientError(error);
        if (isConflictError(error)) {
          runtime.recordMetric('transaction_conflict');
        } else {
          runtime.recordMetric('transaction_rollback');
        }
        try {
          await adapter.rollback(tx, stage, error);
        } catch (error) {
          logClientError(error);
        
          // no-op
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
    async (args: ApplyPersistedOperationArgs): Promise<MasterFolderTreeActionResult> => {
      const {
        operation,
        optimisticNodes,
        undoLabel,
        selectedNodeId,
        expandedNodeIds,
        persistedVersion,
        txId,
        txVersion,
        instanceId,
      } = args;
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
        id: txId,
        instanceId,
        version: txVersion,
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
    [adapter, executeAdapterTransaction, maxUndoEntries, store]
  );

  return {
    executeAdapterTransaction,
    applyPersistedOperation,
  };
}
