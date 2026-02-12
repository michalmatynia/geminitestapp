'use client';

import React from 'react';

import type { ValidatorSettingsController } from './useValidatorSettingsController';

const ValidatorSettingsContext = React.createContext<ValidatorSettingsController | null>(null);

export function ValidatorSettingsProvider({
  value,
  children,
}: {
  value: ValidatorSettingsController;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ValidatorSettingsContext.Provider value={value}>
      {children}
    </ValidatorSettingsContext.Provider>
  );
}

export function useValidatorSettingsContext(): ValidatorSettingsController {
  const context = React.useContext(ValidatorSettingsContext);
  if (!context) {
    throw new Error(
      'useValidatorSettingsContext must be used within ValidatorSettingsProvider'
    );
  }
  return context;
}
