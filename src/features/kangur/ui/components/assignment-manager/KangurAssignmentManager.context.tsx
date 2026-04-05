'use client';

import React, { createContext, useContext } from 'react';
import { useKangurAssignmentManagerState } from './KangurAssignmentManager.hooks';
import type { KangurAssignmentManagerProps } from './KangurAssignmentManager.types';

type AssignmentManagerState = ReturnType<typeof useKangurAssignmentManagerState>;

const KangurAssignmentManagerContext = createContext<AssignmentManagerState | null>(null);

export function KangurAssignmentManagerProvider({
  children,
  ...props
}: KangurAssignmentManagerProps & { children: React.ReactNode }) {
  const state = useKangurAssignmentManagerState(props);
  return (
    <KangurAssignmentManagerContext.Provider value={state}>
      {children}
    </KangurAssignmentManagerContext.Provider>
  );
}

export function useKangurAssignmentManagerContext(): AssignmentManagerState {
  const context = useContext(KangurAssignmentManagerContext);
  if (!context) {
    throw new Error('useKangurAssignmentManagerContext must be used within a KangurAssignmentManagerProvider');
  }
  return context;
}
