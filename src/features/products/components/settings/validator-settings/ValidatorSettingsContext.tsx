'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';

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
    throw internalError(
      'useValidatorSettingsContext must be used within ValidatorSettingsProvider'
    );
  }
  return context;
}
