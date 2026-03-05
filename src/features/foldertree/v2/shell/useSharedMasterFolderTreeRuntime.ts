'use client';

import { useEffect, useRef } from 'react';

import {
  createMasterFolderTreeRuntimeBus,
  type CreateMasterFolderTreeRuntimeBusOptions,
  type MasterFolderTreeRuntimeBusWithDispose,
} from '../runtime/createMasterFolderTreeRuntimeBus';

import type { MasterFolderTreeShellRuntime } from './useFolderTreeShellRuntime';

type UseSharedMasterFolderTreeRuntimeOptions = Omit<
  CreateMasterFolderTreeRuntimeBusOptions,
  'windowTarget'
>;

/**
 * Creates a stable shared runtime coordinator that can be injected into
 * folder-tree shell primitives without relying on a React context provider.
 */
export const useSharedMasterFolderTreeRuntime = (
  options?: UseSharedMasterFolderTreeRuntimeOptions | undefined
): MasterFolderTreeShellRuntime => {
  const runtimeRef = useRef<MasterFolderTreeRuntimeBusWithDispose | null>(null);
  if (!runtimeRef.current) {
    runtimeRef.current = createMasterFolderTreeRuntimeBus(options);
  }

  useEffect(() => {
    const runtime = runtimeRef.current;
    return (): void => {
      runtime?.dispose();
    };
  }, []);

  return runtimeRef.current;
};
