import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import type { KangurAccent } from './tokens';

const KANGUR_LESSON_BORDER_ACCENT_CLASSNAMES = {
  indigo: 'kangur-border-accent-indigo',
  violet: 'kangur-border-accent-violet',
  emerald: 'kangur-border-accent-emerald',
  sky: 'kangur-border-accent-sky',
  amber: 'kangur-border-accent-amber',
  rose: 'kangur-border-accent-rose',
  teal: 'kangur-border-accent-teal',
  slate: 'kangur-border-accent-slate',
} satisfies Record<KangurAccent, string>;

const kangurLessonCalloutVariants = cva(
  'soft-card kangur-lesson-callout w-full border shadow-[0_18px_44px_-36px_rgba(15,23,42,0.24)] [color:var(--kangur-page-text)]',
  {
    variants: {
      accent: KANGUR_LESSON_BORDER_ACCENT_CLASSNAMES,
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

type KangurLessonVisualConfig = {
  center?: boolean;
  maxWidthClassName?: string;
  visualClassName?: string;
  supportingContent?: React.ReactNode;
  supportingClassName?: string;
};

type KangurLessonVisualProps = Omit<KangurLessonCalloutProps, 'children'> & {
  caption?: React.ReactNode;
  captionClassName?: string;
  config?: KangurLessonVisualConfig;
  center?: boolean;
  maxWidthClassName?: string;
  supportingContent?: React.ReactNode;
  supportingClassName?: string;
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
        indigo: 'kangur-border-accent-indigo text-indigo-700',
        violet: 'kangur-border-accent-violet text-violet-700',
        emerald: 'kangur-border-accent-emerald text-emerald-700',
        sky: 'kangur-border-accent-sky text-sky-700',
        amber: 'kangur-border-accent-amber text-amber-700',
        rose: 'kangur-border-accent-rose text-rose-700',
        teal: 'kangur-border-accent-teal text-teal-700',
        slate: 'kangur-border-accent-slate [color:var(--kangur-page-text)]',
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
      accent: KANGUR_LESSON_BORDER_ACCENT_CLASSNAMES,
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

const resolveLessonVisualFrameClassName = (
  center: boolean,
  className: string | undefined
): string => cn('kangur-lesson-visual-frame w-full', center ? 'text-center' : 'text-left', className);

const resolveLessonVisualContentClassName = (input: {
  center: boolean;
  hasSupportingContent: boolean;
  maxWidthClassName: string;
  visualClassName: string | undefined;
}): string =>
  cn(
    input.center ? 'mx-auto w-full' : 'w-full',
    input.maxWidthClassName,
    input.hasSupportingContent
      ? 'grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.95fr)]'
      : '',
    input.visualClassName
  );

function KangurLessonVisualCaptionSlot(props: {
  caption: React.ReactNode;
  className: string;
}): React.JSX.Element {
  return <KangurLessonCaption className={props.className}>{props.caption}</KangurLessonCaption>;
}

function KangurLessonVisualSupportingSlot(props: {
  accent: KangurLessonVisualProps['accent'];
  supportingClassName: string | undefined;
  supportingContent: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'kangur-lesson-visual-supporting min-w-0 border-t pt-4 text-left text-sm [color:var(--kangur-page-text)] xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0',
        props.accent ? KANGUR_LESSON_BORDER_ACCENT_CLASSNAMES[props.accent] : null,
        props.supportingClassName
      )}
    >
      {props.supportingContent}
    </div>
  );
}

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
  caption,
  captionClassName,
  config = {},
  center: propCenter,
  maxWidthClassName: propMaxWidthClassName,
  supportingContent: propSupportingContent,
  supportingClassName: propSupportingClassName,
  className,
  children,
  ...props
}: KangurLessonVisualProps): React.JSX.Element {
  const {
    center = propCenter ?? true,
    maxWidthClassName = propMaxWidthClassName ?? 'max-w-full',
    visualClassName,
    supportingContent = propSupportingContent,
    supportingClassName = propSupportingClassName,
  } = config;

  const resolvedCaptionClassName = captionClassName ?? 'mt-2 kangur-lesson-visual-caption';
  const hasSupportingContent = Boolean(supportingContent);

  return (
    <div className={resolveLessonVisualFrameClassName(center, className)} {...props}>
      <div
        className={resolveLessonVisualContentClassName({
          center,
          hasSupportingContent,
          maxWidthClassName,
          visualClassName,
        })}
      >
        <div className='min-w-0'>
          {children}
          {caption ? (
            <KangurLessonVisualCaptionSlot
              caption={caption}
              className={resolvedCaptionClassName}
            />
          ) : null}
        </div>
        {hasSupportingContent ? (
          <KangurLessonVisualSupportingSlot
            accent={accent}
            supportingClassName={supportingClassName}
            supportingContent={supportingContent}
          />
        ) : null}
      </div>
    </div>
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
