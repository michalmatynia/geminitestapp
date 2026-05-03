'use client';

import React, { createContext, useContext } from 'react';
import { useKangurAssignmentManagerState } from './KangurAssignmentManager.hooks';
import type { KangurAssignmentManagerProps } from './KangurAssignmentManager.types';

type AssignmentManagerState = ReturnType<typeof useKangurAssignmentManagerState>;

const KangurAssignmentManagerContext = createContext<AssignmentManagerState | null>(null);

export function KangurAssignmentManagerProvider({
  children,
  ...props
}: KangurAssignmentManagerProps & { children: React.ReactNode }): React.JSX.Element {
  const state = useKangurAssignmentManagerState(props);
  return (
    <KangurAssignmentManagerContext.Provider value={state}>
      {children}
    </KangurAssignmentManagerContext.Provider>
  );
}

import { internalError } from '@/shared/errors/app-error';

export function useKangurAssignmentManagerContext(): AssignmentManagerState {
  const context = useContext(KangurAssignmentManagerContext);
  if (!context) {
    throw internalError('useKangurAssignmentManagerContext must be used within a KangurAssignmentManagerProvider');
  }
  return context;
}
