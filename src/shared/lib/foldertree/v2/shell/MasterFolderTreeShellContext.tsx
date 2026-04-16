'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { MasterFolderTreeShell } from './useMasterFolderTreeShell';

const {
  Context: MasterFolderTreeShellContext,
  useStrictContext: useMasterFolderTreeShellContext,
  useOptionalContext: useOptionalMasterFolderTreeShellContext,
} = createStrictContext<MasterFolderTreeShell>({
  hookName: 'useMasterFolderTreeShellContext',
  providerName: 'MasterFolderTreeShellProvider',
  displayName: 'MasterFolderTreeShellContext',
  errorFactory: internalError,
});

export {
  MasterFolderTreeShellContext,
  useMasterFolderTreeShellContext,
  useOptionalMasterFolderTreeShellContext,
};

export function MasterFolderTreeShellProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: MasterFolderTreeShell;
}): React.JSX.Element {
  return (
    <MasterFolderTreeShellContext.Provider value={value}>
      {children}
    </MasterFolderTreeShellContext.Provider>
  );
}
