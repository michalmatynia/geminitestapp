import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/utils';

const kangurLessonCalloutVariants = cva(
  'w-full rounded-[24px] border shadow-[0_18px_44px_-36px_rgba(15,23,42,0.24)]',
  {
    variants: {
      accent: {
        indigo: 'border-indigo-200/80 bg-indigo-50/90',
        violet: 'border-violet-200/80 bg-violet-50/90',
        emerald: 'border-emerald-200/80 bg-emerald-50/90',
        sky: 'border-sky-200/80 bg-sky-50/92',
        amber: 'border-amber-200/80 bg-amber-50/92',
        rose: 'border-rose-200/80 bg-rose-50/92',
        teal: 'border-teal-200/80 bg-teal-50/92',
        slate: 'border-slate-200/85 bg-white/92',
      },
      padding: {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-5',
      },
    },
    defaultVariants: {
      accent: 'slate',
      padding: 'md',
    },
  }
);

type KangurLessonCalloutProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurLessonCalloutVariants>;

const kangurLessonChipVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold tracking-tight shadow-[0_12px_28px_-24px_rgba(15,23,42,0.32)]',
  {
    variants: {
      accent: {
        indigo: 'border-indigo-200/80 bg-indigo-50/92 text-indigo-700',
        violet: 'border-violet-200/80 bg-violet-50/92 text-violet-700',
        emerald: 'border-emerald-200/80 bg-emerald-50/92 text-emerald-700',
        sky: 'border-sky-200/80 bg-sky-50/92 text-sky-700',
        amber: 'border-amber-200/80 bg-amber-50/92 text-amber-700',
        rose: 'border-rose-200/80 bg-rose-50/92 text-rose-700',
        teal: 'border-teal-200/80 bg-teal-50/92 text-teal-700',
        slate: 'border-slate-200/85 bg-white/92 text-slate-700',
      },
    },
    defaultVariants: {
      accent: 'slate',
    },
  }
);

type KangurLessonChipProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof kangurLessonChipVariants>;

export function KangurLessonCallout({
  accent,
  padding,
  className,
  ...props
}: KangurLessonCalloutProps): React.JSX.Element {
  return (
    <div
      className={cn(kangurLessonCalloutVariants({ accent, padding }), className)}
      {...props}
    />
  );
}

export function KangurLessonChip({
  accent,
  className,
  ...props
}: KangurLessonChipProps): React.JSX.Element {
  return <span className={cn(kangurLessonChipVariants({ accent, className }))} {...props} />;
}
