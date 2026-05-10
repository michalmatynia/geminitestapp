'use client';

import React from 'react';

import { Input } from '@/shared/ui/primitives.public';
import { FormField } from '@/shared/ui/forms-and-actions.public';

type SettingsRangeFieldProps = {
  label: string;
  value: number;
  min: string;
  max: string;
  step: string;
  valueLabel: string;
  onChange: (value: number) => void;
  parseValue?: (value: string) => number;
};

export function SettingsRangeField({
  label,
  value,
  min,
  max,
  step,
  valueLabel,
  onChange,
  parseValue = Number.parseFloat,
}: SettingsRangeFieldProps): React.JSX.Element {
  const fieldLabel = `${label}: ${valueLabel}`;

  return (
    <FormField label={fieldLabel}>
      <Input
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseValue(event.target.value))}
        className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer p-0 border-none mt-2'
        aria-label={fieldLabel}
        title={fieldLabel}
      />
    </FormField>
  );
}
