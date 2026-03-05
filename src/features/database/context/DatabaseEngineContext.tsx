'use client';

import React, { createContext, useContext } from 'react';

import {
  useDatabaseEngineState,
  type UseDatabaseEngineStateReturn,
} from '../hooks/useDatabaseEngineState';

type DatabaseEngineContextValue = UseDatabaseEngineStateReturn;

export type DatabaseEngineStateContextValue = Omit<
  DatabaseEngineContextValue,
  | 'setActiveView'
  | 'updatePolicy'
  | 'updateServiceRoute'
  | 'updateCollectionRoute'
  | 'updateBackupSchedule'
  | 'updateOperationControls'
  | 'saveSettings'
  | 'refetchAll'
>;

export type DatabaseEngineActionsContextValue = Pick<
  DatabaseEngineContextValue,
  | 'setActiveView'
  | 'updatePolicy'
  | 'updateServiceRoute'
  | 'updateCollectionRoute'
  | 'updateBackupSchedule'
  | 'updateOperationControls'
  | 'saveSettings'
  | 'refetchAll'
>;

const DatabaseEngineStateContext = createContext<DatabaseEngineStateContextValue | null>(null);
const DatabaseEngineActionsContext = createContext<DatabaseEngineActionsContextValue | null>(null);

export function DatabaseEngineProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const state = useDatabaseEngineState();

  const {
    setActiveView,
    updatePolicy,
    updateServiceRoute,
    updateCollectionRoute,
    updateBackupSchedule,
    updateOperationControls,
    saveSettings,
    refetchAll,
    ...stateValue
  } = state;

  const actionsValue: DatabaseEngineActionsContextValue = {
    setActiveView,
    updatePolicy,
    updateServiceRoute,
    updateCollectionRoute,
    updateBackupSchedule,
    updateOperationControls,
    saveSettings,
    refetchAll,
  };

  return (
    <DatabaseEngineActionsContext.Provider value={actionsValue}>
      <DatabaseEngineStateContext.Provider value={stateValue}>
        {children}
      </DatabaseEngineStateContext.Provider>
    </DatabaseEngineActionsContext.Provider>
  );
}

export function useDatabaseEngineStateContext(): DatabaseEngineStateContextValue {
  const context = useContext(DatabaseEngineStateContext);
  if (!context) {
    throw new Error('useDatabaseEngineStateContext must be used within a DatabaseEngineProvider');
  }
  return context;
}

export function useDatabaseEngineActionsContext(): DatabaseEngineActionsContextValue {
  const context = useContext(DatabaseEngineActionsContext);
  if (!context) {
    throw new Error(
      'useDatabaseEngineActionsContext must be used within a DatabaseEngineProvider'
    );
  }
  return context;
}
