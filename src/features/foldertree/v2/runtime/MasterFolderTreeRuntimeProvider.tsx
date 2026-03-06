'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';

import { createMasterFolderTreeRuntimeBus } from './createMasterFolderTreeRuntimeBus';
import type { FolderTreeRuntimeBus } from './types';

export type {
  FolderTreeRuntimeBus,
  FolderTreeRuntimeInstanceInfo,
  FolderTreeRuntimeMetric,
} from './types';

const FolderTreeRuntimeContext = createContext<FolderTreeRuntimeBus | null>(null);

export function MasterFolderTreeRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const bus = useMemo(() => createMasterFolderTreeRuntimeBus(), []);

  useEffect(() => {
    return (): void => {
      bus.dispose();
    };
  }, [bus]);

  return (
    <FolderTreeRuntimeContext.Provider value={bus}>{children}</FolderTreeRuntimeContext.Provider>
  );
}

export const masterFolderTreeRuntimeFallbackBus: FolderTreeRuntimeBus = {
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
  registerKeyboardHandler: () => (): void => {
    // no-op
  },
  recordMetric: () => {
    // no-op
  },
  getMetricsSnapshot: () => ({}),
};

export const useMasterFolderTreeRuntime = (): FolderTreeRuntimeBus =>
  useContext(FolderTreeRuntimeContext) ?? masterFolderTreeRuntimeFallbackBus;
