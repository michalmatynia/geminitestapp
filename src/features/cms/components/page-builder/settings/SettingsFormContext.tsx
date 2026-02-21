'use client';

import React, { createContext, useContext, useMemo } from 'react';

export interface SettingsFormContextValue {
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

const SettingsFormContext = createContext<SettingsFormContextValue | null>(null);

export function SettingsFormProvider({
  values,
  onChange,
  children,
}: {
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ values, onChange }), [values, onChange]);
  return (
    <SettingsFormContext.Provider value={value}>
      {children}
    </SettingsFormContext.Provider>
  );
}

export function useSettingsForm() {
  const context = useContext(SettingsFormContext);
  if (!context) {
    throw new Error('useSettingsForm must be used within a SettingsFormProvider');
  }
  return context;
}

export function useOptionalSettingsForm() {
  return useContext(SettingsFormContext);
}
