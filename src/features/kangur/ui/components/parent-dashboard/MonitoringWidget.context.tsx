'use client';

import React, { createContext, useContext } from 'react';
import { useMonitoringWidgetState } from './monitoring-widget/MonitoringWidget.hooks';

type MonitoringWidgetState = ReturnType<typeof useMonitoringWidgetState>;

const MonitoringWidgetContext = createContext<MonitoringWidgetState | null>(null);

export function MonitoringWidgetProvider({ children }: { children: React.ReactNode }) {
  const state = useMonitoringWidgetState();
  return (
    <MonitoringWidgetContext.Provider value={state}>
      {children}
    </MonitoringWidgetContext.Provider>
  );
}

export function useMonitoringWidgetContext(): MonitoringWidgetState {
  const context = useContext(MonitoringWidgetContext);
  if (!context) {
    throw new Error('useMonitoringWidgetContext must be used within a MonitoringWidgetProvider');
  }
  return context;
}
