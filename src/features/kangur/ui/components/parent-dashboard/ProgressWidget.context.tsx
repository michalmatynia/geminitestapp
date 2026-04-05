'use client';

import React, { createContext, useContext } from 'react';
import { useKangurParentDashboardProgressWidgetState } from './ProgressWidget.hooks';

type ProgressWidgetState = ReturnType<typeof useKangurParentDashboardProgressWidgetState>;

const ProgressWidgetContext = createContext<ProgressWidgetState | null>(null);

export function ProgressWidgetProvider({ children }: { children: React.ReactNode }) {
  const state = useKangurParentDashboardProgressWidgetState();
  return (
    <ProgressWidgetContext.Provider value={state}>
      {children}
    </ProgressWidgetContext.Provider>
  );
}

export function useProgressWidgetContext(): ProgressWidgetState {
  const context = useContext(ProgressWidgetContext);
  if (!context) {
    throw new Error('useProgressWidgetContext must be used within a ProgressWidgetProvider');
  }
  return context;
}
