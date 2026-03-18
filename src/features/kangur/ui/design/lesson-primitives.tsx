import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import type { KangurAccent } from './tokens';

const kangurLessonCalloutVariants = cva(
  'soft-card kangur-lesson-callout w-full border shadow-[0_18px_44px_-36px_rgba(15,23,42,0.24)] [color:var(--kangur-page-text)]',
  {
    variants: {
      accent: {
        indigo: 'border-indigo-200/80',
        violet: 'border-violet-200/80',
        emerald: 'border-emerald-200/80',
        sky: 'border-sky-200/80',
        amber: 'border-amber-200/80',
        rose: 'border-rose-200/80',
        teal: 'border-teal-200/80',
        slate: 'border-slate-200/85',
      },
      padding: {
        sm: 'kangur-card-padding-sm',
        md: 'kangur-card-padding-md',
        lg: 'kangur-card-padding-lg',
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

type KangurLessonVisualProps = Omit<KangurLessonCalloutProps, 'children'> & {
  caption?: React.ReactNode;
  captionClassName?: string;
  center?: boolean;
  maxWidthClassName?: string;
  visualClassName?: string;
  children: React.ReactNode;
};

const kangurLessonStackVariants = cva('flex flex-col', {
  variants: {
    align: {
      center: 'items-center',
      start: 'items-start',
    },
    gap: {
      sm: 'kangur-stack-gap-sm',
      md: 'kangur-stack-gap-md',
      lg: 'kangur-stack-gap-lg',
    },
  },
  defaultVariants: {
    align: 'center',
    gap: 'md',
  },
});

type KangurLessonStackProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurLessonStackVariants>;

const kangurLessonChipVariants = cva(
  'soft-card inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold tracking-tight shadow-[0_12px_28px_-24px_rgba(15,23,42,0.32)]',
  {
    variants: {
      accent: {
        indigo: 'border-indigo-200/80 text-indigo-700',
        violet: 'border-violet-200/80 text-violet-700',
        emerald: 'border-emerald-200/80 text-emerald-700',
        sky: 'border-sky-200/80 text-sky-700',
        amber: 'border-amber-200/80 text-amber-700',
        rose: 'border-rose-200/80 text-rose-700',
        teal: 'border-teal-200/80 text-teal-700',
        slate: 'border-slate-200/85 [color:var(--kangur-page-text)]',
      },
    },
    defaultVariants: {
      accent: 'slate',
    },
  }
);

type KangurLessonChipProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof kangurLessonChipVariants>;

const kangurLessonLeadVariants = cva('[color:var(--kangur-page-text)]', {
  variants: {
    align: {
      center: 'text-center',
      left: 'text-left',
    },
  },
  defaultVariants: {
    align: 'center',
  },
});

type KangurLessonLeadProps = React.HTMLAttributes<HTMLParagraphElement> &
  VariantProps<typeof kangurLessonLeadVariants>;

const kangurLessonCaptionVariants = cva('text-sm [color:var(--kangur-page-muted-text)]', {
  variants: {
    align: {
      center: 'text-center',
      left: 'text-left',
    },
  },
  defaultVariants: {
    align: 'center',
  },
});

type KangurLessonCaptionProps = React.HTMLAttributes<HTMLParagraphElement> &
  VariantProps<typeof kangurLessonCaptionVariants>;

const kangurLessonInsetVariants = cva(
  'soft-card kangur-lesson-inset w-full border shadow-[0_16px_32px_-28px_rgba(15,23,42,0.28)] [color:var(--kangur-page-text)]',
  {
    variants: {
      accent: {
        indigo: 'border-indigo-100/90',
        violet: 'border-violet-100/90',
        emerald: 'border-emerald-100/90',
        sky: 'border-sky-100/90',
        amber: 'border-amber-100/90',
        rose: 'border-rose-100/90',
        teal: 'border-teal-100/90',
        slate: 'border-slate-200/85',
      } satisfies Record<KangurAccent, string>,
      padding: {
        sm: 'kangur-card-padding-sm',
        md: 'kangur-card-padding-md',
      },
    },
    defaultVariants: {
      accent: 'slate',
      padding: 'sm',
    },
  }
);

type KangurLessonInsetProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurLessonInsetVariants>;

export function KangurLessonCallout({
  accent,
  padding,
  className,
  ...props
}: KangurLessonCalloutProps): React.JSX.Element {
  return (
    <div className={cn(kangurLessonCalloutVariants({ accent, padding }), className)} {...props} />
  );
}

export function KangurLessonVisual({
  accent,
  padding = 'sm',
  caption,
  captionClassName,
  center = true,
  className,
  maxWidthClassName = 'max-w-sm',
  visualClassName,
  children,
  ...props
}: KangurLessonVisualProps): React.JSX.Element {
  const resolvedCaptionClassName = captionClassName ?? 'mt-2 kangur-lesson-visual-caption';

  return (
    <KangurLessonCallout
      accent={accent}
      padding={padding}
      className={cn('kangur-lesson-visual-frame', center ? 'text-center' : 'text-left', className)}
      {...props}
    >
      <div
        className={cn(center ? 'mx-auto w-full' : 'w-full', maxWidthClassName, visualClassName)}
      >
        {children}
      </div>
      {caption ? (
        <KangurLessonCaption className={resolvedCaptionClassName}>
          {caption}
        </KangurLessonCaption>
      ) : null}
    </KangurLessonCallout>
  );
}

export function KangurLessonStack({
  align,
  className,
  gap,
  ...props
}: KangurLessonStackProps): React.JSX.Element {
  return <div className={cn(kangurLessonStackVariants({ align, gap }), className)} {...props} />;
}

export function KangurLessonChip({
  accent,
  className,
  ...props
}: KangurLessonChipProps): React.JSX.Element {
  return <span className={cn(kangurLessonChipVariants({ accent, className }))} {...props} />;
}

export function KangurLessonLead({
  align,
  className,
  ...props
}: KangurLessonLeadProps): React.JSX.Element {
  return <p className={cn(kangurLessonLeadVariants({ align }), className)} {...props} />;
}

export function KangurLessonCaption({
  align,
  className,
  ...props
}: KangurLessonCaptionProps): React.JSX.Element {
  return <p className={cn(kangurLessonCaptionVariants({ align }), className)} {...props} />;
}

export function KangurLessonInset({
  accent,
  className,
  padding,
  ...props
}: KangurLessonInsetProps): React.JSX.Element {
  return (
    <div className={cn(kangurLessonInsetVariants({ accent, padding }), className)} {...props} />
  );
}
