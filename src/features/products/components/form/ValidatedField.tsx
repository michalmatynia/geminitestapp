'use client';

import React, { memo, useMemo } from 'react';
import { useFormContext, type UseFormRegister } from 'react-hook-form';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductValidationState } from '@/features/products/context/ProductValidationSettingsContext';
import type { FieldValidatorIssue } from '@/features/products/validation-engine/core';
import { type ProductFormData } from '@/shared/contracts/products/drafts';
import { FormField } from '@/shared/ui/form-section';
import { Hint } from '@/shared/ui/Hint';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

import { cn } from '@/shared/utils/ui-utils';

import { IssueHintRow } from './ValidatorIssueHint';

interface ValidatedFieldProps {
  name: keyof ProductFormData;
  label: string;
  placeholder?: string;
  type?: 'input' | 'textarea' | 'number';
  step?: string;
  required?: boolean;
  rows?: number;
  unit?: string;
}

type ValidatedFieldControlProps = {
  name: keyof ProductFormData;
  fieldNameKey: string;
  inputClassName: string;
  register: UseFormRegister<ProductFormData>;
  type: 'input' | 'textarea' | 'number';
  step?: string;
  placeholder?: string;
  rows?: number;
};

const resolveFieldValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const resolveIssueBorderClassName = (
  validatorEnabled: boolean,
  firstIssue: FieldValidatorIssue | undefined
): string | undefined => {
  if (validatorEnabled === false || firstIssue === undefined) return undefined;
  return firstIssue.severity === 'warning' ? 'border-amber-500/60' : 'border-red-500/60';
};

const resolveInputClassName = ({
  unit,
  validatorEnabled,
  firstIssue,
}: {
  unit?: string;
  validatorEnabled: boolean;
  firstIssue: FieldValidatorIssue | undefined;
}): string =>
  cn(
    unit !== undefined && unit !== '' ? 'pr-8' : undefined,
    resolveIssueBorderClassName(validatorEnabled, firstIssue)
  );

function ValidatedFieldControl({
  name,
  fieldNameKey,
  inputClassName,
  register,
  type,
  step,
  placeholder,
  rows,
}: ValidatedFieldControlProps): React.JSX.Element {
  if (type === 'textarea') {
    return (
      <Textarea
        id={fieldNameKey}
        className={inputClassName}
        {...register(name)}
        placeholder={placeholder}
        rows={rows ?? 4}
      />
    );
  }

  return (
    <Input
      id={fieldNameKey}
      type={type === 'number' ? 'number' : 'text'}
      step={step}
      className={inputClassName}
      {...register(name, type === 'number' ? { valueAsNumber: true } : {})}
      placeholder={placeholder}
    />
  );
}

function ValidatedFieldUnitHint({ unit }: { unit?: string }): React.JSX.Element | null {
  if (unit === undefined || unit === '') return null;

  return (
    <Hint
      uppercase
      size='xxs'
      className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-bold'
    >
      {unit}
    </Hint>
  );
}

function ValidatedFieldIssueRows({
  validatorEnabled,
  issues,
  fieldNameKey,
  fieldValue,
}: {
  validatorEnabled: boolean;
  issues: FieldValidatorIssue[];
  fieldNameKey: string;
  fieldValue: string;
}): React.JSX.Element | null {
  if (validatorEnabled === false) return null;

  return (
    <>
      {issues.map((issue: FieldValidatorIssue) => (
        <IssueHintRow
          key={issue.patternId}
          fieldName={fieldNameKey}
          issue={issue}
          fieldValue={fieldValue}
        />
      ))}
    </>
  );
}

export const ValidatedField = memo((
  props: ValidatedFieldProps
): React.JSX.Element => {
  const {
    name,
    label,
    placeholder,
    type = 'input',
    step,
    required: isRequired,
    rows,
    unit,
  } = props;

  const { register, watch } = useFormContext<ProductFormData>();
  const { errors } = useProductFormCore();
  const { validatorEnabled, visibleFieldIssues } = useProductValidationState();

  const fieldNameKey = String(name);
  const error = errors[name]?.message;
  const issues = validatorEnabled ? (visibleFieldIssues[fieldNameKey] ?? []) : [];
  const firstIssue = issues[0];

  const value = watch(name);

  const fieldValue = useMemo(() => resolveFieldValue(value), [value]);
  const inputClassName = resolveInputClassName({ unit, validatorEnabled, firstIssue });
  const resolvedLabel = isRequired === true ? `${label} *` : label;

  return (
    <FormField label={resolvedLabel} error={error} id={fieldNameKey}>
      <div className='relative'>
        <ValidatedFieldControl
          name={name}
          fieldNameKey={fieldNameKey}
          inputClassName={inputClassName}
          register={register}
          type={type}
          step={step}
          placeholder={placeholder}
          rows={rows}
        />
        <ValidatedFieldUnitHint unit={unit} />
      </div>
      <ValidatedFieldIssueRows
        validatorEnabled={validatorEnabled}
        issues={issues}
        fieldNameKey={fieldNameKey}
        fieldValue={fieldValue}
      />
    </FormField>
  );
});
