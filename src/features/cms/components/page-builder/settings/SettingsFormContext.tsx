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

export function useSettingsFormState(): SettingsFormStateContextValue {
  const context = useContext(SettingsFormStateContext);
  if (!context) {
    throw new Error('useSettingsFormState must be used within a SettingsFormProvider');
  }
  return context;
}

export function useSettingsFormActions(): SettingsFormActionsContextValue {
  const context = useContext(SettingsFormActionsContext);
  if (!context) {
    throw new Error('useSettingsFormActions must be used within a SettingsFormProvider');
  }
  return context;
}

export function useOptionalSettingsFormState(): SettingsFormStateContextValue | null {
  return useContext(SettingsFormStateContext);
}

export function useOptionalSettingsFormActions(): SettingsFormActionsContextValue | null {
  return useContext(SettingsFormActionsContext);
}

export function useSettingsForm(): SettingsFormContextValue {
  const state = useSettingsFormState();
  const actions = useSettingsFormActions();
  return useMemo((): SettingsFormContextValue => ({ ...state, ...actions }), [state, actions]);
}

export function useOptionalSettingsForm(): SettingsFormContextValue | null {
  const state = useOptionalSettingsFormState();
  const actions = useOptionalSettingsFormActions();
  if (!state || !actions) return null;
  return { ...state, ...actions };
}
