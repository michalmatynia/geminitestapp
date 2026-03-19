'use client';

import React from 'react';

import type { PatternFormData, ReplacementMode } from '@/shared/contracts/products';
import { normalizeProductValidationPatternScopes } from '@/shared/lib/products/utils/validator-instance-behavior';
import { getProductValidationSemanticOperationUiMetadata } from '@/shared/lib/products/utils/validator-semantic-operations';
import type { DynamicReplacementSourceMode } from '@/shared/lib/products/utils/validator-replacement-recipe';
import { Input, MultiSelect, SelectSimple, FormField } from '@/shared/ui';

import { PATTERN_SCOPE_OPTIONS } from '../constants';
import {
  LOCALE_OPTIONS,
  REPLACEMENT_MODE_OPTIONS,
  SEVERITY_OPTIONS,
  SOURCE_MODE_OPTIONS,
  TARGET_OPTIONS,
} from '../validator-pattern-modal-options';
import { ValidatorDocTooltip } from '../ValidatorDocsTooltips';
import { useValidatorSettingsContext } from '../ValidatorSettingsContext';

export function ValidatorPatternModalBasicSection(): React.JSX.Element {
  const {
    formData,
    modalSemanticState,
    setFormData,
    getReplacementFieldsForTarget,
    getSourceFieldOptionsForTarget,
    isLocaleTarget,
  } = useValidatorSettingsContext();

  const semanticUi = React.useMemo(
    () => getProductValidationSemanticOperationUiMetadata(modalSemanticState?.operation),
    [modalSemanticState?.operation]
  );

  return (
    <div className='space-y-4'>
      <FormField label='Label'>
        <Input
          className='h-9'
          value={formData.label}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setFormData((prev: PatternFormData) => ({ ...prev, label: event.target.value }))
          }
          placeholder={semanticUi?.labelPlaceholder ?? 'Double spaces'}
         aria-label={semanticUi?.labelPlaceholder ?? 'Double spaces'} title={semanticUi?.labelPlaceholder ?? 'Double spaces'}/>
        </FormField>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <FormField label='Target'>
          <ValidatorDocTooltip docId='validator.modal.target'>
            <SelectSimple
              size='sm'
              value={formData.target}
              onValueChange={(value: string): void =>
                setFormData((prev: PatternFormData) => {
                  const nextTarget = value as PatternFormData['target'];
                  const allowed = new Set<string>(
                    getReplacementFieldsForTarget(nextTarget).map((o) => o.value)
                  );
                  const nextSourceOptions = getSourceFieldOptionsForTarget(nextTarget);
                  const hasSourceField = nextSourceOptions.some(
                    (option) => option.value === prev.sourceField
                  );
                  const hasLaunchSourceField = nextSourceOptions.some(
                    (option) => option.value === prev.launchSourceField
                  );
                  return {
                    ...prev,
                    target: nextTarget,
                    locale: isLocaleTarget(nextTarget) ? prev.locale : '',
                    replacementFields: prev.replacementFields.filter((field: string) =>
                      allowed.has(field)
                    ),
                    sourceField: hasSourceField ? prev.sourceField : '',
                    launchSourceField: hasLaunchSourceField ? prev.launchSourceField : '',
                  };
                })
              }
              options={TARGET_OPTIONS}
             ariaLabel='Target' title='Target'/>
          </ValidatorDocTooltip>
        </FormField>

        <FormField label='Locale Context'>
          <SelectSimple
            size='sm'
            value={isLocaleTarget(formData.target) ? formData.locale || 'any' : 'any'}
            onValueChange={(value: string): void =>
              setFormData((prev: PatternFormData) => ({
                ...prev,
                locale: isLocaleTarget(prev.target) ? (value === 'any' ? '' : value) : '',
              }))
            }
            disabled={!isLocaleTarget(formData.target)}
            options={LOCALE_OPTIONS}
           ariaLabel='Locale Context' title='Locale Context'/>
        </FormField>
      </div>

      <FormField
        label='Apply In Forms'
        description='Controls where this validator pattern is active.'
      >
        <ValidatorDocTooltip docId='validator.modal.applyScopes'>
          <MultiSelect
            options={PATTERN_SCOPE_OPTIONS}
            selected={normalizeProductValidationPatternScopes(formData.appliesToScopes)}
            onChange={(values: string[]) =>
              setFormData((prev: PatternFormData) => ({
                ...prev,
                appliesToScopes: normalizeProductValidationPatternScopes(values),
              }))
            }
            placeholder='All forms'
            searchPlaceholder='Search form scope...'
            emptyMessage='No form scopes found.'
          />
        </ValidatorDocTooltip>
      </FormField>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <FormField label='Severity'>
          <SelectSimple
            size='sm'
            value={formData.severity}
            onValueChange={(value: string): void =>
              setFormData((prev: PatternFormData) => ({
                ...prev,
                severity: value as 'error' | 'warning',
              }))
            }
            options={SEVERITY_OPTIONS}
           ariaLabel='Severity' title='Severity'/>
        </FormField>
        <FormField label='Replacer Mode'>
          <SelectSimple
            size='sm'
            value={formData.replacementMode}
            onValueChange={(value: string): void =>
              setFormData((prev: PatternFormData) => ({
                ...prev,
                replacementMode: value as ReplacementMode,
              }))
            }
            options={REPLACEMENT_MODE_OPTIONS}
           ariaLabel='Replacer Mode' title='Replacer Mode'/>
        </FormField>
        <div>
          {formData.replacementMode === 'static' ? (
            <FormField label='Replacer Value'>
              <Input
                className='h-9'
                value={formData.replacementValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    replacementValue: event.target.value,
                  }))
                }
                placeholder='e.g. Przypinka'
               aria-label='e.g. Przypinka' title='e.g. Przypinka'/>
              </FormField>
            ) : (
            <FormField label='Source Mode'>
              <SelectSimple
                size='sm'
                value={formData.sourceMode}
                onValueChange={(value: string): void =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    sourceMode: value as DynamicReplacementSourceMode,
                  }))
                }
                options={SOURCE_MODE_OPTIONS}
               ariaLabel='Source Mode' title='Source Mode'/>
            </FormField>
          )}
        </div>
      </div>
    </div>
  );
}
