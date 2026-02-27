'use client';

import React, { createContext, useContext, useMemo, useRef, useState } from 'react';

export type FolderTreeRuntimeInstanceInfo = {
  id: string;
  getNodeCount: () => number;
  canUndo?: () => boolean;
  undo?: () => Promise<void> | void;
};

export type FolderTreeRuntimeBus = {
  registerInstance: (instance: FolderTreeRuntimeInstanceInfo) => () => void;
  setFocusedInstance: (instanceId: string | null) => void;
  getFocusedInstance: () => string | null;
  getInstanceIds: () => string[];
  getCachedSearchIndex: (instanceId: string) => string[] | null;
  setCachedSearchIndex: (instanceId: string, nodeIds: string[]) => void;
  recordMetric: (
    metric:
      | 'transaction_conflict'
      | 'transaction_rollback'
      | 'frame_budget_miss'
      | 'row_rerender'
      | 'migration_success'
      | 'migration_failure',
    value?: number
  ) => void;
  getMetricsSnapshot: () => Record<string, number>;
};

const FolderTreeRuntimeContext = createContext<FolderTreeRuntimeBus | null>(null);

export function MasterFolderTreeRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const instancesRef = useRef<Map<string, FolderTreeRuntimeInstanceInfo>>(new Map());
  const searchCacheRef = useRef<Map<string, string[]>>(new Map());
  const metricsRef = useRef<Record<string, number>>({});
  const [focusedInstanceId, setFocusedInstanceId] = useState<string | null>(null);

  const bus = useMemo<FolderTreeRuntimeBus>(
    () => ({
      registerInstance: (instance: FolderTreeRuntimeInstanceInfo): (() => void) => {
        instancesRef.current.set(instance.id, instance);
        return (): void => {
          instancesRef.current.delete(instance.id);
          searchCacheRef.current.delete(instance.id);
          setFocusedInstanceId((current: string | null) =>
            current === instance.id ? null : current
          );
        };
      },
      setFocusedInstance: (instanceId: string | null): void => {
        setFocusedInstanceId(instanceId);
      },
      getFocusedInstance: (): string | null => focusedInstanceId,
      getInstanceIds: (): string[] => Array.from(instancesRef.current.keys()),
      getCachedSearchIndex: (instanceId: string): string[] | null =>
        searchCacheRef.current.get(instanceId) ?? null,
      setCachedSearchIndex: (instanceId: string, nodeIds: string[]): void => {
        searchCacheRef.current.set(instanceId, [...nodeIds]);
      },
      recordMetric: (metric, value = 1): void => {
        metricsRef.current[metric] = (metricsRef.current[metric] ?? 0) + value;
      },
      getMetricsSnapshot: (): Record<string, number> => ({ ...metricsRef.current }),
    }),
    [focusedInstanceId]
  );

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return;
      const isUndoShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'z';
      if (!isUndoShortcut) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const focusedId = focusedInstanceId;
      if (!focusedId) return;
      const instance = instancesRef.current.get(focusedId);
      if (!instance?.undo) return;
      if (instance.canUndo && !instance.canUndo()) return;

      event.preventDefault();
      void instance.undo();
    };

    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusedInstanceId]);

  return (
    <FolderTreeRuntimeContext.Provider value={bus}>
      {children}
    </FolderTreeRuntimeContext.Provider>
  );
}

const fallbackRuntimeBus: FolderTreeRuntimeBus = {
  registerInstance: () => (): void => {
    // no-op
  },
  setFocusedInstance: () => {
    // no-op
  },
  getFocusedInstance: () => null,
  getInstanceIds: () => [],
  getCachedSearchIndex: () => null,
  setCachedSearchIndex: () => {
    // no-op
  },
  recordMetric: () => {
    // no-op
  },
  getMetricsSnapshot: () => ({}),
};

export const useMasterFolderTreeRuntime = (): FolderTreeRuntimeBus =>
  useContext(FolderTreeRuntimeContext) ?? fallbackRuntimeBus;
