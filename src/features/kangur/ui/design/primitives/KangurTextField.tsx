import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn, resolveAccessibleLabel, warnMissingAccessibleLabel } from '@/features/kangur/shared/utils';

type DataAttributes = {
  'data-testid'?: string;
  'data-doc-id'?: string;
  'data-doc-alias'?: string;
};

export const kangurTextFieldVariants = cva(
  'kangur-text-field soft-card w-full border outline-none transition disabled:cursor-not-allowed disabled:opacity-70',
  {
    variants: {
      accent: {
        indigo: 'focus:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-200/70',
        violet: 'focus:border-violet-300 focus-visible:ring-2 focus-visible:ring-violet-200/70',
        emerald: 'focus:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-200/70',
        sky: 'focus:border-sky-300 focus-visible:ring-2 focus-visible:ring-sky-200/70',
        amber: 'focus:border-amber-300 focus-visible:ring-2 focus-visible:ring-amber-200/70',
        rose: 'focus:border-rose-300 focus-visible:ring-2 focus-visible:ring-rose-200/70',
        teal: 'focus:border-teal-300 focus-visible:ring-2 focus-visible:ring-teal-200/70',
        slate: 'focus:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200/70',
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
  DataAttributes;

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
  DataAttributes;

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
