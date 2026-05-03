'use client';

import React from 'react';

import type { PatternFormData } from '@/shared/contracts/products/drafts';
import type {
  DynamicReplacementLogicAction,
  DynamicReplacementLogicOperator,
} from '@/shared/lib/products/utils/validator-replacement-recipe';
import { FormField, FormSection } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { SelectSimple } from '@/shared/ui/select-simple';

import {
  LOGIC_ACTION_OPTIONS,
  LOGIC_OPERATOR_OPTIONS,
} from '../validator-pattern-modal-options';
import { useValidatorSettingsContext } from '../ValidatorSettingsContext';

export function DynamicLogicOperatorField(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <FormField label='Logic Operator'>
      <SelectSimple
        size='sm'
        value={formData.logicOperator}
        onValueChange={(value: string): void =>
          setFormData((prev: PatternFormData) => ({
            ...prev,
            logicOperator: value as DynamicReplacementLogicOperator,
          }))
        }
        options={LOGIC_OPERATOR_OPTIONS}
        ariaLabel='Logic Operator'
        title='Logic Operator'
      />
    </FormField>
  );
}

function DynamicLogicOperandFields(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
      <FormField label='Logic Operand'>
        <Input
          className='h-9 font-mono'
          value={formData.logicOperand}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setFormData((prev: PatternFormData) => ({ ...prev, logicOperand: event.target.value }))
          }
          placeholder='Value to compare against'
          aria-label='Value to compare against'
          title='Value to compare against'
        />
      </FormField>
      <FormField label='Logic Flags (regex only)'>
        <Input
          className='h-9 font-mono'
          value={formData.logicFlags}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setFormData((prev: PatternFormData) => ({ ...prev, logicFlags: event.target.value }))
          }
          placeholder='i'
          aria-label='i'
          title='i'
        />
      </FormField>
    </div>
  );
}

function DynamicLogicActionSection({
  actionKey,
  title,
  valueKey,
  valuePlaceholder,
}: {
  actionKey: 'logicWhenFalseAction' | 'logicWhenTrueAction';
  title: string;
  valueKey: 'logicWhenFalseValue' | 'logicWhenTrueValue';
  valuePlaceholder: string;
}): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();
  const action = formData[actionKey];

  return (
    <FormSection title={title} variant='subtle' className='p-3 space-y-3'>
      <div className='mt-2 space-y-3'>
        <SelectSimple
          size='sm'
          value={action}
          onValueChange={(value: string): void =>
            setFormData((prev: PatternFormData) => ({
              ...prev,
              [actionKey]: value as DynamicReplacementLogicAction,
            }))
          }
          options={LOGIC_ACTION_OPTIONS}
          ariaLabel='Select option'
          title='Select option'
        />
        {action === 'set_value' && (
          <Input
            className='h-9 font-mono'
            value={formData[valueKey]}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              setFormData((prev: PatternFormData) => ({
                ...prev,
                [valueKey]: event.target.value,
              }))
            }
            placeholder={valuePlaceholder}
            aria-label={valuePlaceholder}
            title={valuePlaceholder}
          />
        )}
      </div>
    </FormSection>
  );
}

function DynamicLogicActionFields(): React.JSX.Element {
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
      <DynamicLogicActionSection
        actionKey='logicWhenTrueAction'
        title='When condition is TRUE'
        valueKey='logicWhenTrueValue'
        valuePlaceholder='Replacement value when TRUE'
      />
      <DynamicLogicActionSection
        actionKey='logicWhenFalseAction'
        title='When condition is FALSE'
        valueKey='logicWhenFalseValue'
        valuePlaceholder='Replacement value when FALSE'
      />
    </div>
  );
}

export function DynamicLogicConditionFields(): React.JSX.Element | null {
  const { formData } = useValidatorSettingsContext();

  if (formData.logicOperator === 'none') return null;

  return (
    <>
      <DynamicLogicOperandFields />
      <DynamicLogicActionFields />
    </>
  );
}
