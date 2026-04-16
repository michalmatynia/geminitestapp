'use client';

import { createMasterFolderTreeRuntimeBus } from '@/shared/lib/foldertree/v2/runtime/createMasterFolderTreeRuntimeBus';
import {
  masterFolderTreeRuntimeFallbackBus,
  useMasterFolderTreeRuntime,
  type FolderTreeRuntimeBus,
} from '@/shared/lib/foldertree/v2/runtime/MasterFolderTreeRuntimeProvider';

export type MasterFolderTreeShellRuntime = FolderTreeRuntimeBus;

let sharedShellRuntime: MasterFolderTreeShellRuntime | null = null;

const getSharedShellRuntime = (): MasterFolderTreeShellRuntime => {
  if (!sharedShellRuntime) {
    sharedShellRuntime = createMasterFolderTreeRuntimeBus();
  }
  return sharedShellRuntime;
};

/**
 * Resolves the runtime bus used by folder-tree shell primitives.
 * By default it falls back to context runtime; callers can inject
 * a runtime explicitly to decouple shell internals from React context.
 */
export const useFolderTreeShellRuntime = (
  runtime?: MasterFolderTreeShellRuntime | undefined
): MasterFolderTreeShellRuntime => {
  if (runtime) return runtime;
  const contextRuntime = useMasterFolderTreeRuntime();
  if (contextRuntime === masterFolderTreeRuntimeFallbackBus) {
    return getSharedShellRuntime();
  }
  return contextRuntime;
};
