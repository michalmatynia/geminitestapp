'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

const {
  Context: DatabaseEngineStateContext,
  useStrictContext: useDatabaseEngineStateContext,
} = createStrictContext<DatabaseEngineStateContextValue>({
  hookName: 'useDatabaseEngineStateContext',
  providerName: 'a DatabaseEngineProvider',
  displayName: 'DatabaseEngineStateContext',
  errorFactory: internalError,
});

const {
  Context: DatabaseEngineActionsContext,
  useStrictContext: useDatabaseEngineActionsContext,
} = createStrictContext<DatabaseEngineActionsContextValue>({
  hookName: 'useDatabaseEngineActionsContext',
  providerName: 'a DatabaseEngineProvider',
  displayName: 'DatabaseEngineActionsContext',
  errorFactory: internalError,
});

export { useDatabaseEngineStateContext, useDatabaseEngineActionsContext };

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
