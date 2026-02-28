'use client';

import React, { createContext, useContext, useMemo } from 'react';

import { useDatabaseBackupsState } from '../hooks/useDatabaseBackupsState';

type DatabaseBackupsContextValue = ReturnType<typeof useDatabaseBackupsState>;

const DatabaseBackupsContext = createContext<DatabaseBackupsContextValue | null>(null);

export function DatabaseBackupsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const state = useDatabaseBackupsState();
  const value = useMemo(() => state, [state]);

  return (
    <DatabaseBackupsContext.Provider value={value}>{children}</DatabaseBackupsContext.Provider>
  );
}

export function useDatabaseBackupsContext(): DatabaseBackupsContextValue {
  const context = useContext(DatabaseBackupsContext);
  if (!context) {
    throw new Error('useDatabaseBackupsContext must be used within a DatabaseBackupsProvider');
  }
  return context;
}
