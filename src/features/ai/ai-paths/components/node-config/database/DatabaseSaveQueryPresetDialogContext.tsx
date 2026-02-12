'use client';

import React from 'react';

export type DatabaseSaveQueryPresetDialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newQueryPresetName: string;
  setNewQueryPresetName: React.Dispatch<React.SetStateAction<string>>;
  queryTemplateValue: string;
  onCancel: () => void;
  onSave: () => void;
};

const DatabaseSaveQueryPresetDialogContext =
  React.createContext<DatabaseSaveQueryPresetDialogContextValue | null>(null);

export function DatabaseSaveQueryPresetDialogContextProvider({
  value,
  children,
}: {
  value: DatabaseSaveQueryPresetDialogContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <DatabaseSaveQueryPresetDialogContext.Provider value={value}>
      {children}
    </DatabaseSaveQueryPresetDialogContext.Provider>
  );
}

export function useDatabaseSaveQueryPresetDialogContext(): DatabaseSaveQueryPresetDialogContextValue {
  const context = React.useContext(DatabaseSaveQueryPresetDialogContext);
  if (!context) {
    throw new Error(
      'useDatabaseSaveQueryPresetDialogContext must be used within DatabaseSaveQueryPresetDialogContextProvider'
    );
  }
  return context;
}
