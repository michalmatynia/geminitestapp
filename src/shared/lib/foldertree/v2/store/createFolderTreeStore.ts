import type { SnapshotStateStore } from '@/shared/contracts/state-store';

import type { FolderTreeState, FolderTreeStoreSnapshot } from '../types';

type FolderTreeStore = SnapshotStateStore<FolderTreeState, FolderTreeStoreSnapshot>;

export type { FolderTreeStore };

const cloneSnapshot = (state: FolderTreeState, rootsVersion: number): FolderTreeStoreSnapshot => ({
  state,
  rootsVersion,
});

export const createFolderTreeStore = (initialState: FolderTreeState): FolderTreeStore => {
  let state = initialState;
  let rootsVersion = 0;
  let snapshot: FolderTreeStoreSnapshot = cloneSnapshot(state, rootsVersion);
  const listeners = new Set<() => void>();

  const emit = (): void => {
    snapshot = cloneSnapshot(state, rootsVersion);
    listeners.forEach((listener: () => void) => {
      listener();
    });
  };

  return {
    getSnapshot: (): FolderTreeStoreSnapshot => snapshot,
    getState: (): FolderTreeState => state,
    setState: (nextState: FolderTreeState): void => {
      if (nextState === state) return;
      state = nextState;
      rootsVersion += 1;
      emit();
    },
    patchState: (updater: (prev: FolderTreeState) => FolderTreeState): void => {
      const nextState = updater(state);
      if (nextState === state) return;
      state = nextState;
      rootsVersion += 1;
      emit();
    },
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return (): void => {
        listeners.delete(listener);
      };
    },
  };
};
