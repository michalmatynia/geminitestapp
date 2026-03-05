'use client';

import React, { createContext, useContext, useMemo } from 'react';

export interface SettingsFormContextValue {
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export type SettingsFormStateContextValue = Pick<SettingsFormContextValue, 'values'>;
export type SettingsFormActionsContextValue = Pick<SettingsFormContextValue, 'onChange'>;

const SettingsFormStateContext = createContext<SettingsFormStateContextValue | null>(null);
const SettingsFormActionsContext = createContext<SettingsFormActionsContextValue | null>(null);

export function SettingsFormProvider({
  values,
  onChange,
  children,
}: {
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  children: React.ReactNode;
}) {
  const stateValue = useMemo((): SettingsFormStateContextValue => ({ values }), [values]);
  const actionsValue = useMemo((): SettingsFormActionsContextValue => ({ onChange }), [onChange]);
  return (
    <SettingsFormActionsContext.Provider value={actionsValue}>
      <SettingsFormStateContext.Provider value={stateValue}>
        {children}
      </SettingsFormStateContext.Provider>
    </SettingsFormActionsContext.Provider>
  );
}

export function useOptionalSettingsFormState(): SettingsFormStateContextValue | null {
  return useContext(SettingsFormStateContext);
}

export function useOptionalSettingsFormActions(): SettingsFormActionsContextValue | null {
  return useContext(SettingsFormActionsContext);
}
