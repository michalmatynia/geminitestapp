'use client';

import React, { createContext, useContext, useMemo } from 'react';

import { useDatabaseEngineState } from '../hooks/useDatabaseEngineState';

type DatabaseEngineContextValue = ReturnType<typeof useDatabaseEngineState>;

const DatabaseEngineContext = createContext<DatabaseEngineContextValue | null>(null);

export function DatabaseEngineProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const state = useDatabaseEngineState();
  const value = useMemo(() => state, [state]);

  return <DatabaseEngineContext.Provider value={value}>{children}</DatabaseEngineContext.Provider>;
}

export function useDatabaseEngineContext(): DatabaseEngineContextValue {
  const context = useContext(DatabaseEngineContext);
  if (!context) {
    throw new Error('useDatabaseEngineContext must be used within a DatabaseEngineProvider');
  }
  return context;
}
