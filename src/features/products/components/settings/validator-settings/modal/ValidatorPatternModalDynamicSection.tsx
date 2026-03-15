'use client';

import React from 'react';

import type { PatternFormData } from '@/shared/contracts/products';
import type {
  DynamicReplacementMathOperation,
  DynamicReplacementRoundMode,
  DynamicReplacementLogicOperator,
  DynamicReplacementLogicAction,
} from '@/shared/lib/products/utils/validator-replacement-recipe';
import { Input, SelectSimple, FormField, FormSection } from '@/shared/ui';

import {
  LOGIC_ACTION_OPTIONS,
  LOGIC_OPERATOR_OPTIONS,
  MATH_OPERATION_OPTIONS,
  RESULT_ASSEMBLY_OPTIONS,
  ROUND_MODE_OPTIONS,
  SOURCE_FIELD_PLACEHOLDER_OPTION,
  TARGET_APPLY_OPTIONS,
} from '../validator-pattern-modal-options';
import { useValidatorSettingsContext } from '../ValidatorSettingsContext';

export function ValidatorPatternModalDynamicSection(): React.JSX.Element | null {
  const { formData, setFormData, sourceFieldOptions } = useValidatorSettingsContext();

  if (formData.replacementMode !== 'dynamic') return null;

  return (
    <FormSection
      title='Dynamic Replacer Config'
      variant='subtle'
      className='border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-4'
    >
      <div className='space-y-4 mt-4'>
        {(formData.sourceMode === 'form_field' ||
          formData.sourceMode === 'latest_product_field') && (
          <FormField label='Source Field'>
            <SelectSimple
              size='sm'
              value={formData.sourceField || '__none__'}
              onValueChange={(value: string): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  sourceField: value === '__none__' ? '' : value,
                }))
              }
              options={[SOURCE_FIELD_PLACEHOLDER_OPTION, ...sourceFieldOptions]}
             ariaLabel='Source Field' title='Source Field'/>
          </FormField>
        )}

        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <FormField label='Extract Regex'>
            <Input
              className='h-9 font-mono'
              value={formData.sourceRegex}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  sourceRegex: event.target.value,
                }))
              }
              placeholder='(\d+)$'
             aria-label='(\\d+)$' title='(\\d+)$'/>
          </FormField>
          <FormField label='Source Flags'>
            <Input
              className='h-9 font-mono'
              value={formData.sourceFlags}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  sourceFlags: event.target.value,
                }))
              }
              placeholder='i'
             aria-label='i' title='i'/>
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
             aria-label='1' title='1'/>
          </FormField>
        </div>

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
             ariaLabel='Math Operation' title='Math Operation'/>
          </FormField>
          <FormField label='Math Operand'>
            <Input
              className='h-9'
              value={formData.mathOperand}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  mathOperand: event.target.value,
                }))
              }
              placeholder='1'
             aria-label='1' title='1'/>
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
             ariaLabel='Round Mode' title='Round Mode'/>
          </FormField>
        </div>

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
           ariaLabel='Logic Operator' title='Logic Operator'/>
        </FormField>

        {formData.logicOperator !== 'none' && (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <FormField label='Logic Operand'>
              <Input
                className='h-9 font-mono'
                value={formData.logicOperand}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    logicOperand: event.target.value,
                  }))
                }
                placeholder='Value to compare against'
               aria-label='Value to compare against' title='Value to compare against'/>
            </FormField>
            <FormField label='Logic Flags (regex only)'>
              <Input
                className='h-9 font-mono'
                value={formData.logicFlags}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    logicFlags: event.target.value,
                  }))
                }
                placeholder='i'
               aria-label='i' title='i'/>
            </FormField>
          </div>
        )}

        {formData.logicOperator !== 'none' && (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <FormSection title='When condition is TRUE' variant='subtle' className='p-3 space-y-3'>
              <div className='mt-2 space-y-3'>
                <SelectSimple
                  size='sm'
                  value={formData.logicWhenTrueAction}
                  onValueChange={(value: string): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      logicWhenTrueAction: value as DynamicReplacementLogicAction,
                    }))
                  }
                  options={LOGIC_ACTION_OPTIONS}
                 ariaLabel='Select option' title='Select option'/>
                {formData.logicWhenTrueAction === 'set_value' && (
                  <Input
                    className='h-9 font-mono'
                    value={formData.logicWhenTrueValue}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        logicWhenTrueValue: event.target.value,
                      }))
                    }
                    placeholder='Replacement value when TRUE'
                   aria-label='Replacement value when TRUE' title='Replacement value when TRUE'/>
                )}
              </div>
            </FormSection>

            <FormSection title='When condition is FALSE' variant='subtle' className='p-3 space-y-3'>
              <div className='mt-2 space-y-3'>
                <SelectSimple
                  size='sm'
                  value={formData.logicWhenFalseAction}
                  onValueChange={(value: string): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      logicWhenFalseAction: value as DynamicReplacementLogicAction,
                    }))
                  }
                  options={LOGIC_ACTION_OPTIONS}
                 ariaLabel='Select option' title='Select option'/>
                {formData.logicWhenFalseAction === 'set_value' && (
                  <Input
                    className='h-9 font-mono'
                    value={formData.logicWhenFalseValue}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        logicWhenFalseValue: event.target.value,
                      }))
                    }
                    placeholder='Replacement value when FALSE'
                   aria-label='Replacement value when FALSE' title='Replacement value when FALSE'/>
                )}
              </div>
            </FormSection>
          </div>
        )}

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
             ariaLabel='Result Assembly' title='Result Assembly'/>
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
             ariaLabel='Apply To Target' title='Apply To Target'/>
          </FormField>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <FormField label='Pad Length (optional)'>
            <Input
              className='h-9'
              value={formData.padLength}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  padLength: event.target.value,
                }))
              }
              placeholder='3'
             aria-label='3' title='3'/>
          </FormField>
          <FormField label='Pad Character'>
            <Input
              className='h-9'
              value={formData.padChar}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  padChar: event.target.value,
                }))
              }
              placeholder='0'
             aria-label='0' title='0'/>
          </FormField>
        </div>
      </div>
    </FormSection>
  );
}
