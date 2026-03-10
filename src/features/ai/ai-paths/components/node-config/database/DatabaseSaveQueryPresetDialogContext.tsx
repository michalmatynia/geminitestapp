'use client';

import React, { useMemo } from 'react';

import { internalError } from '@/shared/errors/app-error';

export type DatabaseSaveQueryPresetDialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newQueryPresetName: string;
  setNewQueryPresetName: React.Dispatch<React.SetStateAction<string>>;
  queryTemplateValue: string;
  onCancel: () => void;
  onSave: () => void;
};

type DatabaseSaveQueryPresetDialogActionKey =
  | 'onOpenChange'
  | 'setNewQueryPresetName'
  | 'onCancel'
  | 'onSave';

export type DatabaseSaveQueryPresetDialogStateContextValue = Omit<
  DatabaseSaveQueryPresetDialogContextValue,
  DatabaseSaveQueryPresetDialogActionKey
>;
export type DatabaseSaveQueryPresetDialogActionsContextValue = Pick<
  DatabaseSaveQueryPresetDialogContextValue,
  DatabaseSaveQueryPresetDialogActionKey
>;

const DatabaseSaveQueryPresetDialogStateContext =
  React.createContext<DatabaseSaveQueryPresetDialogStateContextValue | null>(null);
const DatabaseSaveQueryPresetDialogActionsContext =
  React.createContext<DatabaseSaveQueryPresetDialogActionsContextValue | null>(null);

export function DatabaseSaveQueryPresetDialogContextProvider({
  value,
  children,
}: {
  value: DatabaseSaveQueryPresetDialogContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const {
    open,
    newQueryPresetName,
    queryTemplateValue,
    onOpenChange,
    setNewQueryPresetName,
    onCancel,
    onSave,
  } = value;
  const stateValue = useMemo<DatabaseSaveQueryPresetDialogStateContextValue>(
    () => ({
      open,
      newQueryPresetName,
      queryTemplateValue,
    }),
    [newQueryPresetName, open, queryTemplateValue]
  );
  const actionsValue = useMemo<DatabaseSaveQueryPresetDialogActionsContextValue>(
    () => ({
      onOpenChange,
      setNewQueryPresetName,
      onCancel,
      onSave,
    }),
    [onCancel, onOpenChange, onSave, setNewQueryPresetName]
  );

  return (
    <DatabaseSaveQueryPresetDialogActionsContext.Provider value={actionsValue}>
      <DatabaseSaveQueryPresetDialogStateContext.Provider value={stateValue}>
        {children}
      </DatabaseSaveQueryPresetDialogStateContext.Provider>
    </DatabaseSaveQueryPresetDialogActionsContext.Provider>
  );
}

export function useDatabaseSaveQueryPresetDialogStateContext(): DatabaseSaveQueryPresetDialogStateContextValue {
  const context = React.useContext(DatabaseSaveQueryPresetDialogStateContext);
  if (!context) {
    throw internalError(
      'useDatabaseSaveQueryPresetDialogStateContext must be used within DatabaseSaveQueryPresetDialogContextProvider'
    );
  }
  return context;
}

export function useDatabaseSaveQueryPresetDialogActionsContext(): DatabaseSaveQueryPresetDialogActionsContextValue {
  const context = React.useContext(DatabaseSaveQueryPresetDialogActionsContext);
  if (!context) {
    throw internalError(
      'useDatabaseSaveQueryPresetDialogActionsContext must be used within DatabaseSaveQueryPresetDialogContextProvider'
    );
  }
  return context;
}
