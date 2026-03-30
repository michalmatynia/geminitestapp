import React from 'react';

import type { PanelRuntimeSlots } from '@/shared/contracts/ui';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

type JobTablePanelRuntimeValue = PanelRuntimeSlots;

export type JobTableActionsRuntimeValue = {
  onViewDetails: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete?: (id: string) => void;
  isCancelling: (id: string) => boolean;
  isDeleting?: (id: string) => boolean;
};

const { Context: JobTablePanelRuntimeContext, useStrictContext: useJobTablePanelRuntime } =
  createStrictContext<JobTablePanelRuntimeValue>({
    hookName: 'useJobTablePanelRuntime',
    providerName: 'JobTablePanelRuntimeProvider',
    displayName: 'JobTablePanelRuntimeContext',
    errorFactory: internalError,
  });

const { Context: JobTableActionsRuntimeContext, useStrictContext: useJobTableActionsRuntime } =
  createStrictContext<JobTableActionsRuntimeValue>({
    hookName: 'useJobTableActionsRuntime',
    providerName: 'JobTableActionsRuntimeProvider',
    displayName: 'JobTableActionsRuntimeContext',
    errorFactory: internalError,
  });

type JobTablePanelRuntimeProviderProps = {
  value: JobTablePanelRuntimeValue;
  children: React.ReactNode;
};

type JobTableActionsRuntimeProviderProps = {
  value: JobTableActionsRuntimeValue;
  children: React.ReactNode;
};

export function JobTablePanelRuntimeProvider({
  value,
  children,
}: JobTablePanelRuntimeProviderProps): React.JSX.Element {
  return (
    <JobTablePanelRuntimeContext.Provider value={value}>
      {children}
    </JobTablePanelRuntimeContext.Provider>
  );
}

export function JobTableActionsRuntimeProvider({
  value,
  children,
}: JobTableActionsRuntimeProviderProps): React.JSX.Element {
  return (
    <JobTableActionsRuntimeContext.Provider value={value}>
      {children}
    </JobTableActionsRuntimeContext.Provider>
  );
}

export { useJobTablePanelRuntime, useJobTableActionsRuntime };
