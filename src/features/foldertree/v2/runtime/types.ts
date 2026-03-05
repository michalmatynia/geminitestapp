'use client';

export type FolderTreeRuntimeInstanceInfo = {
  id: string;
  getNodeCount: () => number;
  canUndo?: () => boolean;
  undo?: () => Promise<void> | void;
};

export type FolderTreeRuntimeMetric =
  | 'transaction_conflict'
  | 'transaction_rollback'
  | 'frame_budget_miss'
  | 'row_rerender'
  | 'ui_state_parse_failure';

export type FolderTreeRuntimeBus = {
  registerInstance: (instance: FolderTreeRuntimeInstanceInfo) => () => void;
  setFocusedInstance: (instanceId: string | null) => void;
  getFocusedInstance: () => string | null;
  getInstanceIds: () => string[];
  getCachedSearchIndex: (instanceId: string) => string[] | null;
  setCachedSearchIndex: (instanceId: string, nodeIds: string[]) => void;
  registerKeyboardHandler: (
    instanceId: string,
    handler: (event: KeyboardEvent) => void
  ) => () => void;
  recordMetric: (metric: FolderTreeRuntimeMetric, value?: number) => void;
  getMetricsSnapshot: () => Record<string, number>;
};
