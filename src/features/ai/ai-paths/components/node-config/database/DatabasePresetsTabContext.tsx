'use client';

import React, { useMemo } from 'react';

import type { DatabasePresetOption } from '@/shared/contracts/database';

export type DatabasePresetsTabContextValue = {
  builtInPresets?: DatabasePresetOption[];
  onApplyBuiltInPreset?: (presetId: string) => void;
  onRenameQueryPreset: (presetId: string, nextName: string) => Promise<void> | void;
  onDeleteQueryPreset: (presetId: string) => Promise<void> | void;
};

type DatabasePresetsTabActionKey =
  | 'onApplyBuiltInPreset'
  | 'onRenameQueryPreset'
  | 'onDeleteQueryPreset';

export type DatabasePresetsTabStateContextValue = Omit<
  DatabasePresetsTabContextValue,
  DatabasePresetsTabActionKey
>;
export type DatabasePresetsTabActionsContextValue = Pick<
  DatabasePresetsTabContextValue,
  DatabasePresetsTabActionKey
>;

const DatabasePresetsTabStateContext =
  React.createContext<DatabasePresetsTabStateContextValue | null>(null);
const DatabasePresetsTabActionsContext =
  React.createContext<DatabasePresetsTabActionsContextValue | null>(null);

export function DatabasePresetsTabContextProvider({
  value,
  children,
}: {
  value: DatabasePresetsTabContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const { builtInPresets, onApplyBuiltInPreset, onRenameQueryPreset, onDeleteQueryPreset } =
    value;

  const stateValue = useMemo<DatabasePresetsTabStateContextValue>(
    () => ({
      builtInPresets,
    }),
    [builtInPresets]
  );

  const actionsValue = useMemo<DatabasePresetsTabActionsContextValue>(
    () => ({
      onApplyBuiltInPreset,
      onRenameQueryPreset,
      onDeleteQueryPreset,
    }),
    [onApplyBuiltInPreset, onRenameQueryPreset, onDeleteQueryPreset]
  );

  return (
    <DatabasePresetsTabActionsContext.Provider value={actionsValue}>
      <DatabasePresetsTabStateContext.Provider value={stateValue}>
        {children}
      </DatabasePresetsTabStateContext.Provider>
    </DatabasePresetsTabActionsContext.Provider>
  );
}

export function useDatabasePresetsTabStateContext(): DatabasePresetsTabStateContextValue {
  const context = React.useContext(DatabasePresetsTabStateContext);
  if (!context) {
    throw new Error(
      'useDatabasePresetsTabStateContext must be used within DatabasePresetsTabContextProvider'
    );
  }
  return context;
}

export function useDatabasePresetsTabActionsContext(): DatabasePresetsTabActionsContextValue {
  const context = React.useContext(DatabasePresetsTabActionsContext);
  if (!context) {
    throw new Error(
      'useDatabasePresetsTabActionsContext must be used within DatabasePresetsTabContextProvider'
    );
  }
  return context;
}

export function useDatabasePresetsTabContext(): DatabasePresetsTabContextValue {
  const state = useDatabasePresetsTabStateContext();
  const actions = useDatabasePresetsTabActionsContext();
  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
}
