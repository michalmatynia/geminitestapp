'use client';

import React from 'react';

import type { DatabasePresetOption } from '@/shared/contracts/database';

export type DatabasePresetsTabContextValue = {
  builtInPresets?: DatabasePresetOption[];
  onApplyBuiltInPreset?: (presetId: string) => void;
  onRenameQueryPreset: (presetId: string, nextName: string) => Promise<void> | void;
  onDeleteQueryPreset: (presetId: string) => Promise<void> | void;
};

const DatabasePresetsTabContext = React.createContext<DatabasePresetsTabContextValue | null>(null);

export function DatabasePresetsTabContextProvider({
  value,
  children,
}: {
  value: DatabasePresetsTabContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <DatabasePresetsTabContext.Provider value={value}>
      {children}
    </DatabasePresetsTabContext.Provider>
  );
}

export function useDatabasePresetsTabContext(): DatabasePresetsTabContextValue {
  const context = React.useContext(DatabasePresetsTabContext);
  if (!context) {
    throw new Error(
      'useDatabasePresetsTabContext must be used within DatabasePresetsTabContextProvider'
    );
  }
  return context;
}
