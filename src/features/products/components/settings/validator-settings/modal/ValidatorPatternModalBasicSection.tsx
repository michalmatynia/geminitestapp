'use client';

import React from 'react';

import type { PatternFormData } from '@/shared/contracts/products/drafts';
import type { ReplacementMode } from '@/shared/contracts/products/validation';
import { normalizeProductValidationPatternScopes } from '@/shared/lib/products/utils/validator-instance-behavior';
import { getProductValidationSemanticOperationUiMetadata } from '@/shared/lib/products/utils/validator-semantic-operations';
import type { DynamicReplacementSourceMode } from '@/shared/lib/products/utils/validator-replacement-recipe';
import { FormField } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { MultiSelect } from '@/shared/ui/multi-select';
import { SelectSimple } from '@/shared/ui/select-simple';

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

type TargetChangeDependencies = Pick<
  ReturnType<typeof useValidatorSettingsContext>,
  'getReplacementFieldsForTarget' | 'getSourceFieldOptionsForTarget' | 'isLocaleTarget'
>;

const buildTargetChange = (
  prev: PatternFormData,
  nextTarget: PatternFormData['target'],
  dependencies: TargetChangeDependencies
): PatternFormData => {
  const allowed = new Set<string>(
    dependencies.getReplacementFieldsForTarget(nextTarget).map((option) => option.value)
  );
  const nextSourceOptions = dependencies.getSourceFieldOptionsForTarget(nextTarget);
  const hasSourceField = nextSourceOptions.some((option) => option.value === prev.sourceField);
  const hasLaunchSourceField = nextSourceOptions.some(
    (option) => option.value === prev.launchSourceField
  );

  return {
    ...prev,
    target: nextTarget,
    locale: dependencies.isLocaleTarget(nextTarget) ? prev.locale : '',
    replacementFields: prev.replacementFields.filter((field: string) => allowed.has(field)),
    sourceField: hasSourceField ? prev.sourceField : '',
    launchSourceField: hasLaunchSourceField ? prev.launchSourceField : '',
  };
};

const resolveLocaleSelectValue = (
  formData: PatternFormData,
  isLocaleTarget: (target: PatternFormData['target']) => boolean
): string => {
  if (!isLocaleTarget(formData.target)) return 'any';
  return formData.locale === '' ? 'any' : formData.locale;
};

const resolveLocaleFormValue = (
  prev: PatternFormData,
  value: string,
  isLocaleTarget: (target: PatternFormData['target']) => boolean
): string => {
  if (!isLocaleTarget(prev.target)) return '';
  return value === 'any' ? '' : value;
};

function LabelField(): React.JSX.Element {
  const { formData, modalSemanticState, setFormData } = useValidatorSettingsContext();
  const semanticUi = React.useMemo(
    () => getProductValidationSemanticOperationUiMetadata(modalSemanticState?.operation),
    [modalSemanticState?.operation]
  );
  const placeholder = semanticUi?.labelPlaceholder ?? 'Double spaces';

  return (
    <FormField label='Label'>
      <Input
        className='h-9'
        value={formData.label}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
          setFormData((prev: PatternFormData) => ({ ...prev, label: event.target.value }))
        }
        placeholder={placeholder}
        aria-label={placeholder}
        title={placeholder}
      />
    </FormField>
  );
}

function TargetField(): React.JSX.Element {
  const {
    formData,
    setFormData,
    getReplacementFieldsForTarget,
    getSourceFieldOptionsForTarget,
    isLocaleTarget,
  } = useValidatorSettingsContext();

  return (
    <FormField label='Target'>
      <ValidatorDocTooltip docId='validator.modal.target'>
        <SelectSimple
          size='sm'
          value={formData.target}
          onValueChange={(value: string): void =>
            setFormData((prev: PatternFormData) =>
              buildTargetChange(prev, value as PatternFormData['target'], {
                getReplacementFieldsForTarget,
                getSourceFieldOptionsForTarget,
                isLocaleTarget,
              })
            )
          }
          options={TARGET_OPTIONS}
          ariaLabel='Target'
          title='Target'
        />
      </ValidatorDocTooltip>
    </FormField>
  );
}

function LocaleField(): React.JSX.Element {
  const { formData, setFormData, isLocaleTarget } = useValidatorSettingsContext();
  const localeValue = resolveLocaleSelectValue(formData, isLocaleTarget);

  return (
    <FormField label='Locale Context'>
      <SelectSimple
        size='sm'
        value={localeValue}
        onValueChange={(value: string): void =>
          setFormData((prev: PatternFormData) => ({
            ...prev,
            locale: resolveLocaleFormValue(prev, value, isLocaleTarget),
          }))
        }
        disabled={!isLocaleTarget(formData.target)}
        options={LOCALE_OPTIONS}
        ariaLabel='Locale Context'
        title='Locale Context'
      />
    </FormField>
  );
}

function ScopeField(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <FormField label='Apply In Forms' description='Controls where this validator pattern is active.'>
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
  );
}

function SeverityAndModeFields(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <>
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
          ariaLabel='Severity'
          title='Severity'
        />
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
          ariaLabel='Replacer Mode'
          title='Replacer Mode'
        />
      </FormField>
    </>
  );
}

function ReplacementValueField(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
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
        aria-label='e.g. Przypinka'
        title='e.g. Przypinka'
      />
    </FormField>
  );
}

function SourceModeField(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
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
        ariaLabel='Source Mode'
        title='Source Mode'
      />
    </FormField>
  );
}

function ReplacementValueOrSourceModeField(): React.JSX.Element {
  const { formData } = useValidatorSettingsContext();

  if (formData.replacementMode === 'static') return <ReplacementValueField />;
  return <SourceModeField />;
}

export function ValidatorPatternModalBasicSection(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <LabelField />
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <TargetField />
        <LocaleField />
      </div>
      <ScopeField />
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <SeverityAndModeFields />
        <ReplacementValueOrSourceModeField />
      </div>
    </div>
  );
}
