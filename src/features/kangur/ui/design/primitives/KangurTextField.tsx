import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn, resolveAccessibleLabel, warnMissingAccessibleLabel } from '@/features/kangur/shared/utils';
import type { DataAttributesDto } from '@/shared/contracts/ui';

export const kangurTextFieldVariants = cva(
  'kangur-text-field soft-card w-full border outline-none transition disabled:cursor-not-allowed disabled:opacity-70',
  {
    variants: {
      accent: {
        indigo: 'kangur-text-field-accent-indigo',
        violet: 'kangur-text-field-accent-violet',
        emerald: 'kangur-text-field-accent-emerald',
        sky: 'kangur-text-field-accent-sky',
        amber: 'kangur-text-field-accent-amber',
        rose: 'kangur-text-field-accent-rose',
        teal: 'kangur-text-field-accent-teal',
        slate: 'kangur-text-field-accent-slate',
      },
      size: {
        sm: 'px-3 py-2.5',
        md: 'px-4 py-3',
        lg: 'px-5 py-3.5',
      },
    },
    defaultVariants: {
      accent: 'slate',
      size: 'md',
    },
  }
);

export type KangurTextFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> &
  VariantProps<typeof kangurTextFieldVariants> &
  DataAttributesDto;

export const KangurTextField = React.forwardRef<HTMLInputElement, KangurTextFieldProps>(
  (
    {
      className,
      accent,
      size,
      type = 'text',
      id,
      name,
      placeholder,
      title,
      'data-testid': dataTestId,
      'data-doc-id': dataDocId,
      'data-doc-alias': dataDocAlias,
      'aria-label': ariaLabelProp,
      'aria-labelledby': ariaLabelledByProp,
      ...props
    },
    ref
  ) => {
    const allowFallbackLabel = !ariaLabelledByProp && !id;
    const { ariaLabel: resolvedAriaLabel, hasAccessibleLabel } = resolveAccessibleLabel({
      children: null,
      ariaLabel: ariaLabelProp,
      ariaLabelledBy: ariaLabelledByProp,
      title: allowFallbackLabel ? title : undefined,
      fallbackLabel: allowFallbackLabel
        ? placeholder ??
          name ??
          (typeof dataDocAlias === 'string' ? dataDocAlias : undefined) ??
          (typeof dataDocId === 'string' ? dataDocId : undefined) ??
          (typeof dataTestId === 'string' ? dataTestId : undefined)
        : undefined,
    });
    const hasLabel = hasAccessibleLabel || Boolean(id);
    if (!hasLabel) {
      warnMissingAccessibleLabel({ componentName: 'KangurTextField', hasAccessibleLabel: hasLabel });
    }

    return (
      <input
        ref={ref}
        className={cn(kangurTextFieldVariants({ accent, size }), className)}
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        aria-label={resolvedAriaLabel}
        aria-labelledby={ariaLabelledByProp}
        title={title}
        data-testid={dataTestId}
        data-doc-id={dataDocId}
        data-doc-alias={dataDocAlias}
        {...props}
      />
    );
  }
);
KangurTextField.displayName = 'KangurTextField';

export type KangurSelectFieldProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'size'
> &
  VariantProps<typeof kangurTextFieldVariants> &
  DataAttributesDto;

export const KangurSelectField = React.forwardRef<HTMLSelectElement, KangurSelectFieldProps>(
  (
    {
      className,
      accent,
      size,
      id,
      name,
      title,
      'data-testid': dataTestId,
      'data-doc-id': dataDocId,
      'data-doc-alias': dataDocAlias,
      'aria-label': ariaLabelProp,
      'aria-labelledby': ariaLabelledByProp,
      ...props
    },
    ref
  ) => {
    const allowFallbackLabel = !ariaLabelledByProp && !id;
    const { ariaLabel: resolvedAriaLabel, hasAccessibleLabel } = resolveAccessibleLabel({
      children: null,
      ariaLabel: ariaLabelProp,
      ariaLabelledBy: ariaLabelledByProp,
      title: allowFallbackLabel ? title : undefined,
      fallbackLabel: allowFallbackLabel
        ? name ??
          (typeof dataDocAlias === 'string' ? dataDocAlias : undefined) ??
          (typeof dataDocId === 'string' ? dataDocId : undefined) ??
          (typeof dataTestId === 'string' ? dataTestId : undefined)
        : undefined,
    });
    const hasLabel = hasAccessibleLabel || Boolean(id);
    if (!hasLabel) {
      warnMissingAccessibleLabel({
        componentName: 'KangurSelectField',
        hasAccessibleLabel: hasLabel,
      });
    }

    return (
      <select
        ref={ref}
        className={cn(kangurTextFieldVariants({ accent, size }), className)}
        id={id}
        name={name}
        aria-label={resolvedAriaLabel}
        aria-labelledby={ariaLabelledByProp}
        title={title}
        data-testid={dataTestId}
        data-doc-id={dataDocId}
        data-doc-alias={dataDocAlias}
        {...props}
      />
    );
  }
);
KangurSelectField.displayName = 'KangurSelectField';
