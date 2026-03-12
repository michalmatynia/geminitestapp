import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

export const kangurTextFieldVariants = cva(
  'kangur-text-field soft-card w-full border outline-none transition disabled:cursor-not-allowed disabled:opacity-70',
  {
    variants: {
      accent: {
        indigo: 'focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/70',
        violet: 'focus:border-violet-300 focus:ring-2 focus:ring-violet-200/70',
        emerald: 'focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/70',
        sky: 'focus:border-sky-300 focus:ring-2 focus:ring-sky-200/70',
        amber: 'focus:border-amber-300 focus:ring-2 focus:ring-amber-200/70',
        rose: 'focus:border-rose-300 focus:ring-2 focus:ring-rose-200/70',
        teal: 'focus:border-teal-300 focus:ring-2 focus:ring-teal-200/70',
        slate: 'focus:border-slate-300 focus:ring-2 focus:ring-slate-200/70',
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
  VariantProps<typeof kangurTextFieldVariants>;

export const KangurTextField = React.forwardRef<HTMLInputElement, KangurTextFieldProps>(
  ({ className, accent, size, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      className={cn(kangurTextFieldVariants({ accent, size }), className)}
      type={type}
      {...props}
    />
  )
);
KangurTextField.displayName = 'KangurTextField';

export type KangurSelectFieldProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> &
  VariantProps<typeof kangurTextFieldVariants>;

export const KangurSelectField = React.forwardRef<HTMLSelectElement, KangurSelectFieldProps>(
  ({ className, accent, size, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(kangurTextFieldVariants({ accent, size }), className)}
      {...props}
    />
  )
);
KangurSelectField.displayName = 'KangurSelectField';
