'use client';

import { useCallback } from 'react';

import { type MasterTreeDropPositionDto } from '@/shared/contracts/master-folder-tree';

import { type FolderTreeStore } from '../../store/createFolderTreeStore';
import { type FolderTreeState } from '../../types';

export function useFolderTreeDragActions(store: FolderTreeStore) {
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

  return {
    startDrag,
    updateDragTarget,
    clearDrag,
  };
}
