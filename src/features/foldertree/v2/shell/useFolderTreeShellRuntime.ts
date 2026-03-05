'use client';

import {
  useMasterFolderTreeRuntime,
  type FolderTreeRuntimeBus,
} from '@/features/foldertree/v2/runtime/MasterFolderTreeRuntimeProvider';

export type MasterFolderTreeShellRuntime = FolderTreeRuntimeBus;

/**
 * Resolves the runtime bus used by folder-tree shell primitives.
 * By default it falls back to context runtime; callers can inject
 * a runtime explicitly to decouple shell internals from React context.
 */
export const useFolderTreeShellRuntime = (
  runtime?: MasterFolderTreeShellRuntime | undefined
): MasterFolderTreeShellRuntime => runtime ?? useMasterFolderTreeRuntime();
