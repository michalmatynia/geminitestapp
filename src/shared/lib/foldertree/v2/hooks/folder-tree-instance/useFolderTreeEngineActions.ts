'use client';

import { useCallback } from 'react';

import {
  type MasterFolderTreeActionResult,
  type MasterTreeDropPositionDto,
  type MasterFolderTreePersistOperation,
  type FolderTreeProfileV2,
} from '@/shared/contracts/master-folder-tree';

import { createErrorAction, toActionOk, createTxId } from './folder-tree-utils';
import { canDropNodeV2, moveNodeV2, reorderNodeV2, dropNodeToRootV2 } from '../../core/engine';
import { type FolderTreeStore } from '../../store/createFolderTreeStore';

import type { FolderTreeState } from '../../types';

export type ApplyPersistedOperationArgs = {
  operation: MasterFolderTreePersistOperation;
  optimisticNodes: FolderTreeState['nodes'];
  undoLabel: string;
  selectedNodeId?: string | null | undefined;
  expandedNodeIds?: string[] | undefined;
  persistedVersion?: number | undefined;
  txId: string;
  txVersion: number;
  instanceId?: string;
};

export function useFolderTreeEngineActions(
  store: FolderTreeStore,
  profile: FolderTreeProfileV2,
  applyPersistedOperation: (
    args: ApplyPersistedOperationArgs
  ) => Promise<MasterFolderTreeActionResult>,
  txVersionRef: React.MutableRefObject<number>,
  instanceId?: string
) {
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

      const actionResult = await applyPersistedOperation({
        operation: {
          type: 'move',
          nodeId,
          targetParentId,
          ...(targetIndex !== undefined ? { targetIndex } : {}),
        },
        optimisticNodes: result.nodes,
        undoLabel: 'Move item',
        txId: createTxId(),
        txVersion: ++txVersionRef.current,
        instanceId,
      });

      return actionResult;
    },
    [applyPersistedOperation, profile, store, txVersionRef, instanceId]
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

      const actionResult = await applyPersistedOperation({
        operation: {
          type: 'reorder',
          nodeId,
          targetId,
          position,
        },
        optimisticNodes: result.nodes,
        undoLabel: 'Reorder item',
        txId: createTxId(),
        txVersion: ++txVersionRef.current,
        instanceId,
      });

      return actionResult;
    },
    [applyPersistedOperation, profile, store, txVersionRef, instanceId]
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

      const actionResult = await applyPersistedOperation({
        operation: {
          type: 'move',
          nodeId,
          targetParentId: null,
          ...(targetIndex !== undefined ? { targetIndex } : {}),
        },
        optimisticNodes: result.nodes,
        undoLabel: 'Move to root',
        txId: createTxId(),
        txVersion: ++txVersionRef.current,
        instanceId,
      });

      return actionResult;
    },
    [applyPersistedOperation, profile, store, txVersionRef, instanceId]
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

      const actionResult = await applyPersistedOperation({
        operation: {
          type: 'rename',
          nodeId,
          name: rawName,
        },
        optimisticNodes,
        undoLabel: `Rename ${existing.name}`,
        txId: createTxId(),
        txVersion: ++txVersionRef.current,
        instanceId,
      });

      store.patchState((prev: FolderTreeState) => ({
        ...prev,
        renamingNodeId: null,
        renameDraft: '',
      }));

      return actionResult;
    },
    [applyPersistedOperation, cancelRename, store, txVersionRef, instanceId]
  );

  return {
    canDropNode,
    moveNode,
    reorderNode,
    dropNodeToRoot,
    startRename,
    updateRenameDraft,
    cancelRename,
    commitRename,
  };
}
