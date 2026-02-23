'use client';

import React, { createContext, useContext } from 'react';

import { useUsersState, type UseUsersStateReturn } from '../hooks/useUsersState';

const UsersContext = createContext<UseUsersStateReturn | undefined>(undefined);

export function UsersProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const state = useUsersState();
  return <UsersContext.Provider value={state}>{children}</UsersContext.Provider>;
}

export function useUsers(): UseUsersStateReturn {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UsersProvider');
  }
  return context;
}
