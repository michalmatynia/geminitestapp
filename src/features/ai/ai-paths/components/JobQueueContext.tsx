'use client';

import { type JSX, type ReactNode } from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

const { Context: JobQueueStateContext, useStrictContext: useJobQueueState } =
  createStrictContext<JobQueueStateValue>({
    hookName: 'useJobQueueState',
    providerName: 'JobQueueProvider',
    displayName: 'JobQueueStateContext',
    errorFactory: internalError,
  });
const { Context: JobQueueActionsContext, useStrictContext: useJobQueueActions } =
  createStrictContext<JobQueueActionsValue>({
    hookName: 'useJobQueueActions',
    providerName: 'JobQueueProvider',
    displayName: 'JobQueueActionsContext',
    errorFactory: internalError,
  });

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

export function JobQueueProvider(props: JobQueueProviderProps): JSX.Element {
  const {
    children,
    activePathId,
    initialSearchQuery,
    initialExpandedRunId,
    sourceFilter,
    sourceMode = 'include',
    visibility = 'scoped',
    isActive = true,
  } = props;
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

export { useJobQueueState, useJobQueueActions };
