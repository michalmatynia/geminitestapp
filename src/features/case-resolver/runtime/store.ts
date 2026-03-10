import type { SnapshotStateStore } from '@/shared/contracts/state-store';

import type { CaseResolverRuntimeSnapshot, CaseResolverRuntimeState } from './types';

type CaseResolverRuntimeStore = SnapshotStateStore<
  CaseResolverRuntimeState,
  CaseResolverRuntimeSnapshot
>;

export type { CaseResolverRuntimeStore };

const cloneSnapshot = (
  state: CaseResolverRuntimeState,
  version: number
): CaseResolverRuntimeSnapshot => ({
  version,
  state,
});

export const createCaseResolverRuntimeStore = (
  initialState: CaseResolverRuntimeState
): CaseResolverRuntimeStore => {
  let state = initialState;
  let version = 0;
  let snapshot = cloneSnapshot(state, version);
  const listeners = new Set<() => void>();

  const emit = (): void => {
    snapshot = cloneSnapshot(state, version);
    listeners.forEach((listener: () => void) => {
      listener();
    });
  };

  return {
    getSnapshot: (): CaseResolverRuntimeSnapshot => snapshot,
    getState: (): CaseResolverRuntimeState => state,
    setState: (nextState: CaseResolverRuntimeState): void => {
      if (nextState === state) return;
      state = nextState;
      version += 1;
      emit();
    },
    patchState: (
      updater: (current: CaseResolverRuntimeState) => CaseResolverRuntimeState
    ): void => {
      const nextState = updater(state);
      if (nextState === state) return;
      state = nextState;
      version += 1;
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
