'use client';

import React, { memo, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductValidationState } from '@/features/products/context/ProductValidationSettingsContext';
import type { FieldValidatorIssue } from '@/features/products/validation-engine/core';
import { ProductFormData } from '@/shared/contracts/products';
import { FormField, Input, Textarea, Hint } from '@/shared/ui';
import { cn } from '@/shared/utils';

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

export const ValidatedField = memo(function ValidatedField({
  name,
  label,
  placeholder,
  type = 'input',
  step,
  required: isRequired,
  rows,
  unit,
}: ValidatedFieldProps): React.JSX.Element {
  const { register, watch } = useFormContext<ProductFormData>();
  const { errors } = useProductFormCore();
  const { validatorEnabled, visibleFieldIssues } = useProductValidationState();

  const fieldNameKey = String(name);
  const error = errors[name]?.message;
  const issues = validatorEnabled ? (visibleFieldIssues[fieldNameKey] ?? []) : [];
  const firstIssue = issues[0];

  const value = watch(name);

  const fieldValue = useMemo(() => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
  }, [value]);

  const inputClassName = cn(
    unit && 'pr-8',
    validatorEnabled &&
      firstIssue &&
      (firstIssue.severity === 'warning' ? 'border-amber-500/60' : 'border-red-500/60')
  );
  const resolvedLabel = isRequired ? `${label} *` : label;

  return (
    <FormField label={resolvedLabel} error={error} id={fieldNameKey}>
      <div className='relative'>
        {type === 'textarea' ? (
          <Textarea
            id={fieldNameKey}
            className={inputClassName}
            {...register(name)}
            placeholder={placeholder}
            rows={rows ?? 4}
          />
        ) : (
          <Input
            id={fieldNameKey}
            type={type === 'number' ? 'number' : 'text'}
            step={step}
            className={inputClassName}
            {...register(name, type === 'number' ? { valueAsNumber: true } : {})}
            placeholder={placeholder}
          />
        )}
        {unit && (
          <Hint
            uppercase
            size='xxs'
            className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-bold'
          >
            {unit}
          </Hint>
        )}
      </div>
      {validatorEnabled &&
        issues.map((issue: FieldValidatorIssue) => (
          <IssueHintRow
            key={issue.patternId}
            fieldName={fieldNameKey}
            issue={issue}
            fieldValue={fieldValue}
            numericField={type === 'number' ? name : undefined}
          />
        ))}
    </FormField>
  );
});
