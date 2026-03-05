type SnapshotStateStore<TState, TSnapshot> = {
  getSnapshot: () => TSnapshot;
  getState: () => TState;
  setState: (nextState: TState) => void;
  patchState: (updater: (current: TState) => TState) => void;
  subscribe: (listener: () => void) => () => void;
};

export type { SnapshotStateStore };
