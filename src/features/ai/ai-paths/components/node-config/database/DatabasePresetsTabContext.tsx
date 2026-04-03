'use client';

import React, { useMemo } from 'react';

import type { DatabasePresetOption } from '@/shared/contracts/database';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

const { Context: DatabasePresetsTabStateContext, useStrictContext: useDatabasePresetsTabStateContext } =
  createStrictContext<DatabasePresetsTabStateContextValue>({
    hookName: 'useDatabasePresetsTabStateContext',
    providerName: 'DatabasePresetsTabContextProvider',
    displayName: 'DatabasePresetsTabStateContext',
    errorFactory: internalError,
  });
const {
  Context: DatabasePresetsTabActionsContext,
  useStrictContext: useDatabasePresetsTabActionsContext,
} = createStrictContext<DatabasePresetsTabActionsContextValue>({
  hookName: 'useDatabasePresetsTabActionsContext',
  providerName: 'DatabasePresetsTabContextProvider',
  displayName: 'DatabasePresetsTabActionsContext',
  errorFactory: internalError,
});

export function DatabasePresetsTabContextProvider({
  value,
  children,
}: {
  value: DatabasePresetsTabContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const { builtInPresets, onApplyBuiltInPreset, onRenameQueryPreset, onDeleteQueryPreset } = value;

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

export { useDatabasePresetsTabStateContext, useDatabasePresetsTabActionsContext };
