'use client';

import React from 'react';
import { SelectSimple, ValidatorFormatterToggle } from '@/shared/ui';
import {
  useProductValidationActions,
  useProductValidationState,
} from '@/features/products/context/ProductValidationSettingsContext';

export function ProductFormValidationTab(): React.JSX.Element {
  const { validatorEnabled, formatterEnabled, validationDenyBehavior, validationInstanceScope } =
    useProductValidationState();
  const {
    setValidatorEnabled,
    setFormatterEnabled,
    setValidationDenyBehavior,
  } = useProductValidationActions();

  return (
    <div className='rounded-md border border-border bg-gray-900/70 p-4'>
      <p className='text-sm font-semibold text-white'>Validation Controls</p>
      <p className='mt-1 text-xs text-gray-400'>
        `Validator` enables validation rules. `Formatter` auto-applies rules configured for
        formatter mode.
      </p>
      <ValidatorFormatterToggle
        className='mt-4'
        validatorEnabled={validatorEnabled}
        formatterEnabled={formatterEnabled}
        onValidatorChange={(next: boolean): void => {
          setValidatorEnabled(next);
        }}
        onFormatterChange={(next: boolean): void => setFormatterEnabled(next)}
      />
      <div className='mt-4 grid gap-2 md:max-w-sm'>
        <p className='text-xs font-medium text-white'>When a correction is denied</p>
        <SelectSimple
          size='sm'
          value={validationDenyBehavior}
          onValueChange={(value: string): void =>
            setValidationDenyBehavior(value === 'ask_again' ? 'ask_again' : 'mute_session')
          }
          options={[
            { value: 'mute_session', label: 'Stop For This Session' },
            { value: 'ask_again', label: 'Ask Again Next Validation' },
          ]}
        />
        <p className='text-[11px] text-gray-400'>
          Current context:{' '}
          <span className='font-medium text-gray-300'>{validationInstanceScope}</span>
        </p>
      </div>
    </div>
  );
}
