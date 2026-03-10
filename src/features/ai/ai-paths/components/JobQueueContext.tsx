'use client';

import { createContext, useContext, type JSX, type ReactNode } from 'react';

import { internalError } from '@/shared/errors/app-error';

import { useJobQueueRuntime } from './useJobQueueRuntime';

import type {
  JobQueueActionsValue,
  JobQueueStateValue,
} from './job-queue/types';

export type {
  JobQueueActionsValue,
  JobQueueContextValue,
  JobQueueStateValue,
} from './job-queue/types';

const JobQueueStateContext = createContext<JobQueueStateValue | null>(null);
const JobQueueActionsContext = createContext<JobQueueActionsValue | null>(null);

type JobQueueProviderProps = {
  children: ReactNode;
  activePathId?: string | null;
  initialSearchQuery?: string | null;
  initialExpandedRunId?: string | null;
  sourceFilter?: string | null;
  sourceMode?: 'include' | 'exclude';
  visibility?: 'scoped' | 'global';
  isActive?: boolean;
};

export function JobQueueProvider({
  children,
  activePathId,
  initialSearchQuery,
  initialExpandedRunId,
  sourceFilter,
  sourceMode = 'include',
  visibility = 'scoped',
  isActive = true,
}: JobQueueProviderProps): JSX.Element {
  const { actionsValue, stateValue } = useJobQueueRuntime({
    activePathId,
    initialSearchQuery,
    initialExpandedRunId,
    sourceFilter,
    sourceMode,
    visibility,
    isActive,
  });

  return (
    <JobQueueStateContext.Provider value={stateValue}>
      <JobQueueActionsContext.Provider value={actionsValue}>
        {children}
      </JobQueueActionsContext.Provider>
    </JobQueueStateContext.Provider>
  );
}

export function useJobQueueState(): JobQueueStateValue {
  const context = useContext(JobQueueStateContext);
  if (!context) {
    throw internalError('useJobQueueState must be used within JobQueueProvider');
  }
  return context;
}

export function useJobQueueActions(): JobQueueActionsValue {
  const context = useContext(JobQueueActionsContext);
  if (!context) {
    throw internalError('useJobQueueActions must be used within JobQueueProvider');
  }
  return context;
}
