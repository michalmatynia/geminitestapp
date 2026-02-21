'use client';

import React from 'react';

import type { ValidatorSettingsController } from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';


const ValidatorSettingsContext = React.createContext<ValidatorSettingsController | null>(null);

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatorsettingsprovider
 */
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

/**
 * Validator docs: see docs/validator/function-reference.md#ui.usevalidatorsettingscontext
 */
export function useValidatorSettingsContext(): ValidatorSettingsController {
  const context = React.useContext(ValidatorSettingsContext);
  if (!context) {
    throw internalError(
      'useValidatorSettingsContext must be used within ValidatorSettingsProvider'
    );
  }
  return context;
}
