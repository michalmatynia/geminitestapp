'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useLearnerManagementState } from './KangurParentDashboardLearnerManagementWidget.hooks';
import { useLearnerManagementWidgetRuntime } from './KangurParentDashboardLearnerManagementWidget.runtime';
import { internalError } from '@/features/kangur/shared/errors/app-error';

type State = ReturnType<typeof useLearnerManagementState>;
type Runtime = ReturnType<typeof useLearnerManagementWidgetRuntime>;

export type LearnerManagementContextValue = {
  state: State;
  runtime: Runtime;
};

const LearnerManagementContext = createContext<LearnerManagementContextValue | null>(null);

export function LearnerManagementProvider({ children }: { children: React.ReactNode }) {
  const state = useLearnerManagementState();
  const runtime = useLearnerManagementWidgetRuntime(state);

  const value = useMemo(() => ({
    state,
    runtime,
  }), [state, runtime]);

  return (
    <LearnerManagementContext.Provider value={value}>
      {children}
    </LearnerManagementContext.Provider>
  );
}

export function useLearnerManagementContext() {
  const context = useContext(LearnerManagementContext);
  if (!context) {
    throw internalError('useLearnerManagementContext must be used within a LearnerManagementProvider');
  }
  return context;
}
