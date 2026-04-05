'use client';

import React, { useMemo } from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

const {
  Context: DatabaseSaveQueryPresetDialogStateContext,
  useStrictContext: useDatabaseSaveQueryPresetDialogStateContextValue,
} = createStrictContext<DatabaseSaveQueryPresetDialogStateContextValue>({
  hookName: 'useDatabaseSaveQueryPresetDialogStateContext',
  providerName: 'DatabaseSaveQueryPresetDialogContextProvider',
  errorFactory: internalError,
});
const {
  Context: DatabaseSaveQueryPresetDialogActionsContext,
  useStrictContext: useDatabaseSaveQueryPresetDialogActionsContextValue,
} = createStrictContext<DatabaseSaveQueryPresetDialogActionsContextValue>({
  hookName: 'useDatabaseSaveQueryPresetDialogActionsContext',
  providerName: 'DatabaseSaveQueryPresetDialogContextProvider',
  errorFactory: internalError,
});

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

export const useDatabaseSaveQueryPresetDialogStateContext =
  useDatabaseSaveQueryPresetDialogStateContextValue;
export const useDatabaseSaveQueryPresetDialogActionsContext =
  useDatabaseSaveQueryPresetDialogActionsContextValue;
