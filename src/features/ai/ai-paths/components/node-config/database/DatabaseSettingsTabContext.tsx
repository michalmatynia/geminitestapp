'use client';

import React from 'react';

import type { DatabaseOperation } from '@/features/ai/ai-paths/lib';

export type DatabaseSettingsTabContextValue = {
  queryEditor: React.ReactNode;
  availablePorts: string[];
  bundleKeys: Set<string>;
  operation: DatabaseOperation;
};

const DatabaseSettingsTabContext = React.createContext<DatabaseSettingsTabContextValue | null>(null);

export function DatabaseSettingsTabContextProvider({
  value,
  children,
}: {
  value: DatabaseSettingsTabContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <DatabaseSettingsTabContext.Provider value={value}>
      {children}
    </DatabaseSettingsTabContext.Provider>
  );
}

export function useDatabaseSettingsTabContext(): DatabaseSettingsTabContextValue {
  const context = React.useContext(DatabaseSettingsTabContext);
  if (!context) {
    throw new Error('useDatabaseSettingsTabContext must be used within DatabaseSettingsTabContextProvider');
  }
  return context;
}
