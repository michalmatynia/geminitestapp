'use client';

import React from 'react';

import type { PatternFormData } from '@/shared/contracts/products/drafts';
import type {
  DynamicReplacementMathOperation,
  DynamicReplacementRoundMode,
} from '@/shared/lib/products/utils/validator-replacement-recipe';
import { FormField } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { SelectSimple } from '@/shared/ui/select-simple';

import {
  MATH_OPERATION_OPTIONS,
  RESULT_ASSEMBLY_OPTIONS,
  ROUND_MODE_OPTIONS,
  SOURCE_FIELD_PLACEHOLDER_OPTION,
  TARGET_APPLY_OPTIONS,
} from '../validator-pattern-modal-options';
import { useValidatorSettingsContext } from '../ValidatorSettingsContext';

export function DynamicSourceField(): React.JSX.Element | null {
  const { formData, setFormData, sourceFieldOptions } = useValidatorSettingsContext();
  const sourceFieldSelectOptions = React.useMemo(
    () => [SOURCE_FIELD_PLACEHOLDER_OPTION, ...sourceFieldOptions],
    [sourceFieldOptions]
  );
  const isFieldSource =
    formData.sourceMode === 'form_field' || formData.sourceMode === 'latest_product_field';

  if (!isFieldSource) return null;

  return (
    <FormField label='Source Field'>
      <SelectSimple
        size='sm'
        value={formData.sourceField === '' ? '__none__' : formData.sourceField}
        onValueChange={(value: string): void =>
          setFormData((prev: PatternFormData) => ({
            ...prev,
            sourceField: value === '__none__' ? '' : value,
          }))
        }
        options={sourceFieldSelectOptions}
        ariaLabel='Source Field'
        title='Source Field'
      />
    </FormField>
  );
}

export function DynamicSourceParsingFields(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
      <FormField label='Extract Regex'>
        <Input
          className='h-9 font-mono'
          value={formData.sourceRegex}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setFormData((prev: PatternFormData) => ({ ...prev, sourceRegex: event.target.value }))
          }
          placeholder='(\d+)$'
          aria-label='(\\d+)$'
          title='(\\d+)$'
        />
      </FormField>
      <FormField label='Source Flags'>
        <Input
          className='h-9 font-mono'
          value={formData.sourceFlags}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setFormData((prev: PatternFormData) => ({ ...prev, sourceFlags: event.target.value }))
          }
          placeholder='i'
          aria-label='i'
          title='i'
        />
      </FormField>
      <FormField label='Group Index'>
        <Input
          className='h-9'
          value={formData.sourceMatchGroup}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setFormData((prev: PatternFormData) => ({
              ...prev,
              sourceMatchGroup: event.target.value,
            }))
          }
          placeholder='1'
          aria-label='1'
          title='1'
        />
      </FormField>
    </div>
  );
}

export function DynamicMathFields(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
      <FormField label='Math Operation'>
        <SelectSimple
          size='sm'
          value={formData.mathOperation}
          onValueChange={(value: string): void =>
            setFormData((prev: PatternFormData) => ({
              ...prev,
              mathOperation: value as DynamicReplacementMathOperation,
            }))
          }
          options={MATH_OPERATION_OPTIONS}
          ariaLabel='Math Operation'
          title='Math Operation'
        />
      </FormField>
      <FormField label='Math Operand'>
        <Input
          className='h-9'
          value={formData.mathOperand}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setFormData((prev: PatternFormData) => ({ ...prev, mathOperand: event.target.value }))
          }
          placeholder='1'
          aria-label='1'
          title='1'
        />
      </FormField>
      <FormField label='Round Mode'>
        <SelectSimple
          size='sm'
          value={formData.roundMode}
          onValueChange={(value: string): void =>
            setFormData((prev: PatternFormData) => ({
              ...prev,
              roundMode: value as DynamicReplacementRoundMode,
            }))
          }
          options={ROUND_MODE_OPTIONS}
          ariaLabel='Round Mode'
          title='Round Mode'
        />
      </FormField>
    </div>
  );
}

export function DynamicResultFields(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
      <FormField label='Result Assembly'>
        <SelectSimple
          size='sm'
          value={formData.resultAssembly}
          onValueChange={(value: string): void =>
            setFormData((prev: PatternFormData) => ({
              ...prev,
              resultAssembly: value as PatternFormData['resultAssembly'],
            }))
          }
          options={RESULT_ASSEMBLY_OPTIONS}
          ariaLabel='Result Assembly'
          title='Result Assembly'
        />
      </FormField>
      <FormField label='Apply To Target'>
        <SelectSimple
          size='sm'
          value={formData.targetApply}
          onValueChange={(value: string): void =>
            setFormData((prev: PatternFormData) => ({
              ...prev,
              targetApply: value as PatternFormData['targetApply'],
            }))
          }
          options={TARGET_APPLY_OPTIONS}
          ariaLabel='Apply To Target'
          title='Apply To Target'
        />
      </FormField>
    </div>
  );
}

export function DynamicPaddingFields(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
      <FormField label='Pad Length (optional)'>
        <Input
          className='h-9'
          value={formData.padLength}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setFormData((prev: PatternFormData) => ({ ...prev, padLength: event.target.value }))
          }
          placeholder='3'
          aria-label='3'
          title='3'
        />
      </FormField>
      <FormField label='Pad Character'>
        <Input
          className='h-9'
          value={formData.padChar}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setFormData((prev: PatternFormData) => ({ ...prev, padChar: event.target.value }))
          }
          placeholder='0'
          aria-label='0'
          title='0'
        />
      </FormField>
    </div>
  );
}
