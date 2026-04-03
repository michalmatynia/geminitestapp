'use client';

import React from 'react';

import type { ValidatorSettingsController } from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

const {
  Context: ValidatorSettingsContext,
  useStrictContext: useValidatorSettingsContext,
} = createStrictContext<ValidatorSettingsController>({
  hookName: 'useValidatorSettingsContext',
  providerName: 'ValidatorSettingsProvider',
  displayName: 'ValidatorSettingsContext',
  errorFactory: internalError,
});

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
    <ValidatorSettingsContext.Provider value={value}>{children}</ValidatorSettingsContext.Provider>
  );
}

export { useValidatorSettingsContext };
