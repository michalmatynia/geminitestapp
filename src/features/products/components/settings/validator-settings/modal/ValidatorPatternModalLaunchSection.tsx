'use client';

import React from 'react';

import type { PatternFormData, ProductValidationLaunchOperator } from '@/shared/contracts/products';
import { normalizeProductValidationPatternLaunchScopes } from '@/shared/lib/products/utils/validator-instance-behavior';
import type { DynamicReplacementSourceMode } from '@/shared/lib/products/utils/validator-replacement-recipe';
import {
  Input,
  MultiSelect,
  SelectSimple,
  StatusToggle,
  FormField,
  FormSection,
} from '@/shared/ui';

import { PATTERN_SCOPE_OPTIONS } from '../constants';
import {
  LAUNCH_OPERATOR_OPTIONS,
  LAUNCH_SCOPE_BEHAVIOR_OPTIONS,
  SOURCE_MODE_OPTIONS,
  SOURCE_FIELD_PLACEHOLDER_OPTION,
} from '../validator-pattern-modal-options';
import { ValidatorDocTooltip } from '../ValidatorDocsTooltips';
import { useValidatorSettingsContext } from '../ValidatorSettingsContext';

export function ValidatorPatternModalLaunchSection(): React.JSX.Element {
  const { formData, setFormData, sourceFieldOptions } = useValidatorSettingsContext();

  return (
    <FormSection
      title='Launch Condition'
      description='Run this pattern only when the condition is satisfied.'
      variant='subtle'
      className='border border-sky-500/25 bg-sky-500/5 p-3 space-y-4'
      actions={
        <ValidatorDocTooltip docId='validator.modal.launch.toggle'>
          <StatusToggle
            enabled={formData.launchEnabled}
            onToggle={() =>
              setFormData((prev: PatternFormData) => ({
                ...prev,
                launchEnabled: !prev.launchEnabled,
              }))
            }
          />
        </ValidatorDocTooltip>
      }
    >
      {formData.launchEnabled && (
        <div className='mt-4 space-y-4'>
          <FormField
            label='Launch In Forms'
            description='Context gate for this launch node (Draft/Create/Edit).'
          >
            <ValidatorDocTooltip docId='validator.modal.launch.config'>
              <MultiSelect
                options={PATTERN_SCOPE_OPTIONS}
                selected={normalizeProductValidationPatternLaunchScopes(
                  formData.launchAppliesToScopes
                )}
                onChange={(values: string[]) =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(values),
                  }))
                }
                placeholder='Follow pattern scopes'
                searchPlaceholder='Search launch scope...'
                emptyMessage='No form scopes found.'
              />
            </ValidatorDocTooltip>
          </FormField>

          <FormField
            label='Launch Scope Behavior'
            description='`Gate` blocks pattern outside selected forms. `Condition Only` skips condition outside selected forms.'
          >
            <SelectSimple
              size='sm'
              value={formData.launchScopeBehavior}
              onValueChange={(value: string): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  launchScopeBehavior: value === 'condition_only' ? 'condition_only' : 'gate',
                }))
              }
              options={LAUNCH_SCOPE_BEHAVIOR_OPTIONS}
            />
          </FormField>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <FormField label='Launch Source Mode'>
              <SelectSimple
                size='sm'
                value={formData.launchSourceMode}
                onValueChange={(value: string): void =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    launchSourceMode: value as DynamicReplacementSourceMode,
                  }))
                }
                options={SOURCE_MODE_OPTIONS}
              />
            </FormField>
            <FormField label='Launch Operator'>
              <SelectSimple
                size='sm'
                value={formData.launchOperator}
                onValueChange={(value: string): void =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    launchOperator: value as ProductValidationLaunchOperator,
                  }))
                }
                options={LAUNCH_OPERATOR_OPTIONS}
              />
            </FormField>
            <FormField label='Launch Value'>
              <Input
                className='h-9 font-mono'
                value={formData.launchValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    launchValue: event.target.value,
                  }))
                }
                placeholder='KEYCHA000'
              />
            </FormField>
          </div>

          {(formData.launchSourceMode === 'form_field' ||
            formData.launchSourceMode === 'latest_product_field') && (
            <FormField label='Launch Source Field'>
              <SelectSimple
                size='sm'
                value={formData.launchSourceField || '__none__'}
                onValueChange={(value: string): void =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    launchSourceField: value === '__none__' ? '' : value,
                  }))
                }
                options={[SOURCE_FIELD_PLACEHOLDER_OPTION, ...sourceFieldOptions]}
              />
            </FormField>
          )}

          <FormField label='Launch Flags (regex only)'>
            <Input
              className='h-9 font-mono'
              value={formData.launchFlags}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  launchFlags: event.target.value,
                }))
              }
              placeholder='i'
            />
          </FormField>
        </div>
      )}
    </FormSection>
  );
}
