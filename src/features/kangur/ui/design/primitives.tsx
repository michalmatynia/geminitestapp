import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import * as React from 'react';

import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { cn } from '@/shared/utils';

import {
  KANGUR_ACCENT_STYLES,
  KANGUR_OPTION_CARD_CLASSNAME,
  KANGUR_PAGE_CONTAINER_CLASSNAME,
  KANGUR_PAGE_TONE_CLASSNAMES,
  KANGUR_PANEL_CLASSNAMES,
  KANGUR_SEGMENTED_CONTROL_ITEM_ACTIVE_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_ITEM_CLASSNAME,
  KANGUR_SURFACE_CARD_CLASSNAME,
  KANGUR_TOP_NAV_GROUP_CLASSNAME,
  KANGUR_TOP_NAV_ITEM_ACTIVE_CLASSNAME,
  KANGUR_TOP_NAV_ITEM_CLASSNAME,
  KANGUR_TOP_BAR_CLASSNAME,
  KANGUR_TOP_BAR_INNER_CLASSNAME,
  type KangurAccent,
  type KangurPageTone,
} from './tokens';

const kangurButtonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 border text-sm font-bold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-white disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none',
  {
    variants: {
      variant: {
        primary:
          'kangur-cta-pill border-transparent primary-cta text-white hover:brightness-[1.02] focus-visible:ring-amber-300/70',
        secondary:
          'kangur-cta-pill border-transparent soft-cta text-[var(--kangur-button-secondary-text,#2f467e)] hover:text-[var(--kangur-button-secondary-hover-text,#24386e)] focus-visible:ring-indigo-300/70',
        surface:
          'kangur-cta-pill border-transparent surface-cta text-[var(--kangur-button-surface-text,#2f4db5)] hover:text-[var(--kangur-button-surface-hover-text,#233e99)] focus-visible:ring-indigo-300/70',
        success:
          'kangur-cta-pill border-transparent success-cta text-[var(--kangur-button-success-text,#065f46)] hover:text-[var(--kangur-button-success-hover-text,#064e3b)] focus-visible:ring-emerald-300/70',
        warning:
          'kangur-cta-pill border-transparent warning-cta text-[var(--kangur-button-warning-text,#9a5418)] hover:text-[var(--kangur-button-warning-hover-text,#7f4310)] focus-visible:ring-amber-300/70',
        segment: cn(
          'border-transparent text-sm shadow-none focus-visible:ring-indigo-300/70',
          KANGUR_SEGMENTED_CONTROL_ITEM_CLASSNAME
        ),
        segmentActive: cn(
          'border-transparent text-sm shadow-none focus-visible:ring-indigo-300/70',
          KANGUR_SEGMENTED_CONTROL_ITEM_CLASSNAME,
          KANGUR_SEGMENTED_CONTROL_ITEM_ACTIVE_CLASSNAME
        ),
        navigation: cn(KANGUR_TOP_NAV_ITEM_CLASSNAME, 'focus-visible:ring-indigo-300/70'),
        navigationActive: cn(
          KANGUR_TOP_NAV_ITEM_CLASSNAME,
          KANGUR_TOP_NAV_ITEM_ACTIVE_CLASSNAME,
          'focus-visible:ring-indigo-300/70'
        ),
        ghost:
          'border-transparent bg-transparent text-[#6e7ee7] hover:bg-white/70 hover:text-[#4f63d8] focus-visible:ring-indigo-300/70',
      },
      size: {
        sm: 'h-[44px] px-4 text-sm',
        md: 'h-[50px] px-5 text-sm',
        lg: 'h-[56px] px-6 text-base',
        xl: 'h-[62px] px-7 text-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
      fullWidth: false,
    },
  }
);

const kangurPanelVariants = cva('', {
  variants: {
    variant: {
      elevated: KANGUR_PANEL_CLASSNAMES.elevated,
      soft: KANGUR_PANEL_CLASSNAMES.soft,
      subtle: KANGUR_PANEL_CLASSNAMES.subtle,
    },
    padding: {
      md: 'p-5',
      lg: 'p-6',
      xl: 'p-8',
    },
  },
  defaultVariants: {
    variant: 'soft',
    padding: 'lg',
  },
});

const kangurStatusChipVariants = cva(
  'inline-flex items-center justify-center rounded-full border font-semibold tracking-tight shadow-[0_12px_28px_-24px_rgba(15,23,42,0.32)]',
  {
    variants: {
      size: {
        sm: 'px-2.5 py-1 text-[11px]',
        md: 'px-3 py-1 text-xs',
        lg: 'px-3.5 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const kangurResultBadgeVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl border font-bold shadow-[0_18px_42px_-30px_rgba(15,23,42,0.18)]',
  {
    variants: {
      tone: {
        success: 'border-emerald-200 bg-emerald-100 text-emerald-700',
        error: 'border-rose-200 bg-rose-100 text-rose-700',
        warning: 'border-amber-200 bg-amber-100 text-amber-700',
        neutral: 'border-slate-200 bg-slate-100 text-slate-700',
      },
      size: {
        md: 'px-4 py-2 text-base',
        lg: 'px-5 py-2.5 text-lg',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'lg',
    },
  }
);

const kangurAccentDotVariants = cva(
  'inline-flex shrink-0 rounded-full border border-white/85 shadow-[0_0_0_1px_rgba(15,23,42,0.05)]',
  {
    variants: {
      size: {
        sm: 'h-2.5 w-2.5',
        md: 'h-3 w-3',
        lg: 'h-4 w-4',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const kangurIconBadgeVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full font-bold shadow-[0_18px_40px_-30px_rgba(15,23,42,0.28)]',
  {
    variants: {
      size: {
        sm: 'h-9 w-9 text-sm',
        md: 'h-12 w-12 text-base',
        lg: 'h-16 w-16 text-xl',
        xl: 'h-16 w-16 text-3xl',
        '2xl': 'h-20 w-20 text-4xl',
        '3xl': 'h-24 w-24 text-5xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const kangurGradientIconTileVariants = cva(
  'inline-flex shrink-0 items-center justify-center bg-gradient-to-br shadow-sm',
  {
    variants: {
      size: {
        md: 'h-12 w-12 rounded-2xl text-3xl',
        lg: 'h-16 w-16 rounded-[24px] text-5xl',
      },
    },
    defaultVariants: {
      size: 'lg',
    },
  }
);

const kangurDisplayEmojiVariants = cva('inline-flex items-center justify-center leading-none', {
  variants: {
    size: {
      xs: 'text-3xl',
      sm: 'text-4xl',
      md: 'text-5xl',
      lg: 'text-6xl',
    },
  },
  defaultVariants: {
    size: 'lg',
  },
});

const kangurGradientHeadingVariants = cva(
  'bg-gradient-to-r bg-clip-text font-extrabold text-transparent',
  {
    variants: {
      size: {
        md: 'text-2xl',
        lg: 'text-4xl',
      },
      shadow: {
        true: 'drop-shadow',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      shadow: true,
    },
  }
);

const kangurHeadlineVariants = cva('font-extrabold tracking-tight leading-tight', {
  variants: {
    size: {
      xs: 'text-lg',
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-3xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const kangurEquationDisplayVariants = cva('font-extrabold leading-tight tracking-tight', {
  variants: {
    size: {
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-3xl',
    },
  },
  defaultVariants: {
    size: 'lg',
  },
});

const kangurDividerVariants = cva('rounded-full', {
  variants: {
    size: {
      sm: 'h-px w-12',
      md: 'h-0.5 w-16',
      lg: 'h-1 w-20',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const kangurInfoCardVariants = cva(`${KANGUR_SURFACE_CARD_CLASSNAME}`, {
  variants: {
    tone: {
      neutral: '[color:var(--kangur-soft-card-text)]',
      accent: '',
      muted:
        '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_68%,var(--kangur-page-background))] [border-color:var(--kangur-soft-card-border)] [color:var(--kangur-page-muted-text)]',
    },
    padding: {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5',
      xl: 'p-6',
    },
    dashed: {
      true: 'border-dashed',
      false: '',
    },
  },
  defaultVariants: {
    tone: 'neutral',
    padding: 'md',
    dashed: false,
  },
});

const kangurSurfacePanelVariants = cva('glass-panel rounded-[34px]', {
  variants: {
    accent: {
      indigo: 'border-indigo-200/70 [color:var(--kangur-page-text)]',
      violet: 'border-violet-200/80 [color:var(--kangur-page-text)]',
      emerald: 'border-emerald-200/80 [color:var(--kangur-page-text)]',
      sky: 'border-sky-200/80 [color:var(--kangur-page-text)]',
      amber: 'border-amber-200/80 [color:var(--kangur-page-text)]',
      rose: 'border-rose-200/80 [color:var(--kangur-page-text)]',
      teal: 'border-teal-200/80 [color:var(--kangur-page-text)]',
      slate: '[border-color:var(--kangur-soft-card-border)] [color:var(--kangur-page-text)]',
    },
    padding: {
      md: 'p-5',
      lg: 'p-6',
      xl: 'p-8',
    },
    fillHeight: {
      true: 'flex h-full flex-col',
      false: '',
    },
  },
  defaultVariants: {
    accent: 'slate',
    padding: 'lg',
    fillHeight: false,
  },
});

const kangurMenuItemVariants = cva(
  'relative flex cursor-default select-none items-center rounded-[16px] px-3.5 py-2.5 text-[15px] font-medium [color:var(--kangur-page-muted-text)] outline-none transition-colors focus:[background:var(--kangur-nav-item-hover-background)] focus:[color:var(--kangur-page-text)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:[background:var(--kangur-nav-item-hover-background)] data-[highlighted]:[color:var(--kangur-page-text)]'
);

const kangurMediaFrameVariants = cva(`${KANGUR_SURFACE_CARD_CLASSNAME}`, {
  variants: {
    accent: {
      indigo: 'border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50',
      violet: 'border-violet-100 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50',
      emerald: 'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50',
      sky: 'border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50',
      amber: 'border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50',
      rose: 'border-rose-100 bg-gradient-to-br from-rose-50 via-white to-pink-50',
      teal: 'border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50',
      slate: 'border-slate-200/85 bg-gradient-to-br from-slate-50 via-white to-slate-100',
    },
    padding: {
      sm: 'p-3',
      md: 'p-4',
    },
    fillHeight: {
      true: 'flex h-full items-center',
      false: '',
    },
    dashed: {
      true: 'border-dashed',
      false: '',
    },
    overflowHidden: {
      true: 'overflow-hidden',
      false: '',
    },
  },
  defaultVariants: {
    accent: 'slate',
    padding: 'md',
    fillHeight: false,
    dashed: false,
    overflowHidden: false,
  },
});

const kangurProseVariants = cva(
  'mx-auto max-w-none text-[1rem] leading-7 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:leading-tight [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:my-3 [&_strong]:font-semibold [&_a]:underline',
  {
    variants: {
      accent: {
        indigo: '[&_a]:text-indigo-600 [&_blockquote]:border-indigo-200',
        violet: '[&_a]:text-violet-600 [&_blockquote]:border-violet-200',
        emerald: '[&_a]:text-emerald-600 [&_blockquote]:border-emerald-200',
        sky: '[&_a]:text-sky-600 [&_blockquote]:border-sky-200',
        amber: '[&_a]:text-amber-700 [&_blockquote]:border-amber-200',
        rose: '[&_a]:text-rose-600 [&_blockquote]:border-rose-200',
        teal: '[&_a]:text-teal-600 [&_blockquote]:border-teal-200',
        slate: '[&_a]:text-slate-700 [&_blockquote]:border-slate-200',
      },
    },
    defaultVariants: {
      accent: 'slate',
    },
  }
);

const kangurTextFieldVariants = cva(
  'kangur-text-field soft-card w-full rounded-[22px] border text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-70',
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

const kangurProgressBarVariants = cva(
  'w-full overflow-hidden rounded-full [background:var(--kangur-progress-track)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)]',
  {
    variants: {
      size: {
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const kangurOptionCardButtonVariants = cva(
  `${KANGUR_OPTION_CARD_CLASSNAME} relative text-left disabled:pointer-events-none`,
  {
    variants: {
      emphasis: {
        neutral: 'border-slate-200/80 bg-white/92',
        accent: '',
      },
      state: {
        default: '',
        muted:
          'cursor-default border-slate-200/80 bg-white/92 text-slate-400 opacity-70 hover:translate-y-0 hover:border-slate-200/80 hover:bg-white/92',
      },
    },
    defaultVariants: {
      emphasis: 'neutral',
      state: 'default',
    },
  }
);

type KangurButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof kangurButtonVariants> & {
    asChild?: boolean;
  };

const KANGUR_GLASS_PANEL_SURFACE_CLASSNAMES = {
  mist: 'border-white/78 bg-white/58',
  mistSoft: 'border-white/70 bg-white/45',
  mistStrong: 'border-white/78 bg-white/68',
  frost: 'border-white/75 bg-white/88',
  solid: 'border-white/88 bg-white/94',
  neutral: 'border-slate-200/70 bg-white/88',
  rose: 'border-rose-200/70 bg-white/88',
  warmGlow:
    'border-amber-200/70 bg-[radial-gradient(circle_at_top,rgba(254,243,199,0.9),rgba(255,255,255,0.94)_42%,rgba(238,242,255,0.9)_100%)]',
  successGlow:
    'border-emerald-200/70 bg-[radial-gradient(circle_at_top,rgba(209,250,229,0.85),rgba(255,255,255,0.95)_44%,rgba(238,242,255,0.92)_100%)]',
  playGlow:
    'border-indigo-200/70 bg-[radial-gradient(circle_at_top,rgba(255,251,235,0.85),rgba(255,255,255,0.97)_42%,rgba(238,242,255,0.92)_100%)]',
  playField:
    'border-white/80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(244,247,255,0.94)_58%,rgba(255,247,237,0.86)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
  tealField:
    'border-white/75 bg-white/86 shadow-[0_14px_34px_-26px_rgba(20,184,166,0.28)]',
} as const;

export const KangurButton = React.forwardRef<HTMLButtonElement, KangurButtonProps>(
  ({ className, variant, size, fullWidth, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        {...props}
        className={cn(kangurButtonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
      />
    );
  }
);
KangurButton.displayName = 'KangurButton';

export const KangurPanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof kangurPanelVariants>
>(({ className, variant, padding, ...props }, ref) => (
  <div ref={ref} className={cn(kangurPanelVariants({ variant, padding }), className)} {...props} />
));
KangurPanel.displayName = 'KangurPanel';

type KangurGlassPanelProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurPanelVariants> & {
    surface?: keyof typeof KANGUR_GLASS_PANEL_SURFACE_CLASSNAMES;
  };

export const KangurGlassPanel = React.forwardRef<HTMLDivElement, KangurGlassPanelProps>(
  ({ className, padding, surface = 'mist', variant = 'soft', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        kangurPanelVariants({ padding, variant }),
        KANGUR_GLASS_PANEL_SURFACE_CLASSNAMES[surface],
        className
      )}
      {...props}
    />
  )
);
KangurGlassPanel.displayName = 'KangurGlassPanel';

type KangurOptionCardButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof kangurOptionCardButtonVariants> & {
    accent?: KangurAccent;
  };

export const KangurOptionCardButton = React.forwardRef<
  HTMLButtonElement,
  KangurOptionCardButtonProps
>(({ accent = 'slate', className, disabled, emphasis, state, type, ...props }, ref) => {
  const accentStyles = KANGUR_ACCENT_STYLES[accent];
  const cursorClassName = disabled
    ? 'cursor-not-allowed'
    : state === 'muted'
      ? null
      : 'cursor-pointer';

  return (
    <button
      ref={ref}
      className={cn(
        kangurOptionCardButtonVariants({ emphasis, state }),
        cursorClassName,
        disabled
          ? 'cursor-not-allowed [border-color:var(--kangur-text-field-disabled-border)] [background:var(--kangur-text-field-disabled-background)] [color:var(--kangur-page-muted-text)] opacity-70'
          : state === 'muted'
            ? null
            : emphasis === 'accent'
              ? cn(accentStyles.activeCard, accentStyles.hoverCard)
              : accentStyles.hoverCard,
        className
      )}
      disabled={disabled}
      type={type ?? 'button'}
      {...props}
    />
  );
});
KangurOptionCardButton.displayName = 'KangurOptionCardButton';

type KangurStatusChipProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof kangurStatusChipVariants> & {
    accent?: KangurAccent;
  };

const KANGUR_ACCENT_DOT_CLASSNAMES: Record<KangurAccent, string> = {
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  amber: 'bg-amber-400',
  rose: 'bg-rose-500',
  teal: 'bg-teal-500',
  slate: 'bg-slate-400',
};

const KANGUR_DIVIDER_CLASSNAMES: Record<KangurAccent, string> = {
  indigo: 'bg-indigo-200',
  violet: 'bg-violet-200',
  emerald: 'bg-emerald-200',
  sky: 'bg-sky-200',
  amber: 'bg-amber-200',
  rose: 'bg-rose-200',
  teal: 'bg-teal-200',
  slate: 'bg-slate-200',
};

const KANGUR_ACTIVITY_COLUMN_CLASSNAMES: Record<KangurAccent, string> = {
  indigo: 'from-indigo-500 to-purple-400',
  violet: 'from-violet-500 to-fuchsia-400',
  emerald: 'from-emerald-500 to-teal-400',
  sky: 'from-sky-400 to-indigo-300',
  amber: 'from-amber-400 to-orange-400',
  rose: 'from-rose-500 to-pink-400',
  teal: 'from-teal-500 to-cyan-400',
  slate: 'from-slate-300 to-slate-200',
};

export function KangurStatusChip({
  accent = 'slate',
  className,
  size,
  ...props
}: KangurStatusChipProps): React.JSX.Element {
  return (
    <span
      className={cn(
        kangurStatusChipVariants({ size }),
        KANGUR_ACCENT_STYLES[accent].badge,
        className
      )}
      {...props}
    />
  );
}

type KangurResultBadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurResultBadgeVariants>;

export function KangurResultBadge({
  className,
  size,
  tone,
  ...props
}: KangurResultBadgeProps): React.JSX.Element {
  return <div className={cn(kangurResultBadgeVariants({ size, tone }), className)} {...props} />;
}

type KangurDividerProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurDividerVariants> & {
    accent?: KangurAccent;
  };

export function KangurDivider({
  accent = 'slate',
  className,
  size,
  ...props
}: KangurDividerProps): React.JSX.Element {
  return (
    <div
      className={cn(kangurDividerVariants({ size }), KANGUR_DIVIDER_CLASSNAMES[accent], className)}
      {...props}
    />
  );
}

type KangurAccentDotProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof kangurAccentDotVariants> & {
    accent?: KangurAccent;
  };

export function KangurAccentDot({
  accent = 'slate',
  className,
  size,
  ...props
}: KangurAccentDotProps): React.JSX.Element {
  return (
    <span
      className={cn(
        kangurAccentDotVariants({ size }),
        KANGUR_ACCENT_DOT_CLASSNAMES[accent],
        className
      )}
      {...props}
    />
  );
}

type KangurIconBadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof kangurIconBadgeVariants> & {
    accent?: KangurAccent;
  };

export function KangurIconBadge({
  accent = 'slate',
  className,
  size,
  ...props
}: KangurIconBadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        kangurIconBadgeVariants({ size }),
        KANGUR_ACCENT_STYLES[accent].icon,
        className
      )}
      {...props}
    />
  );
}

type KangurGradientIconTileProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof kangurGradientIconTileVariants> & {
    gradientClass: string;
  };

export function KangurGradientIconTile({
  className,
  gradientClass,
  size,
  ...props
}: KangurGradientIconTileProps): React.JSX.Element {
  return (
    <span
      className={cn(kangurGradientIconTileVariants({ size }), gradientClass, className)}
      {...props}
    />
  );
}

type KangurDisplayEmojiProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof kangurDisplayEmojiVariants>;

export function KangurDisplayEmoji({
  className,
  size,
  ...props
}: KangurDisplayEmojiProps): React.JSX.Element {
  return <span className={cn(kangurDisplayEmojiVariants({ size }), className)} {...props} />;
}

type KangurFeatureHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  accent?: KangurAccent;
  badgeAccent?: KangurAccent;
  badgeSize?: VariantProps<typeof kangurIconBadgeVariants>['size'];
  headingAs?: 'h1' | 'h2' | 'h3';
  headingSize?: VariantProps<typeof kangurHeadlineVariants>['size'];
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
};

export function KangurFeatureHeader({
  accent = 'slate',
  badgeAccent,
  badgeSize = 'lg',
  className,
  description,
  headingAs = 'h2',
  headingSize = 'md',
  icon,
  title,
  ...props
}: KangurFeatureHeaderProps): React.JSX.Element {
  const HeadingComp = headingAs;

  return (
    <div className={cn('flex flex-col items-center gap-3 text-center', className)} {...props}>
      <span
        className={cn(
          kangurIconBadgeVariants({ size: badgeSize }),
          KANGUR_ACCENT_STYLES[badgeAccent ?? accent].icon
        )}
      >
        {icon}
      </span>
      <HeadingComp
        className={cn(kangurHeadlineVariants({ size: headingSize }), KANGUR_HEADLINE_CLASSNAMES[accent])}
      >
        {title}
      </HeadingComp>
      {description ? (
        <p className='max-w-sm text-sm [color:var(--kangur-page-muted-text)]'>{description}</p>
      ) : null}
    </div>
  );
}

type KangurSectionHeadingProps = React.HTMLAttributes<HTMLDivElement> & {
  accent?: KangurAccent;
  align?: 'left' | 'center';
  description?: React.ReactNode;
  descriptionId?: string;
  headingAs?: 'h1' | 'h2' | 'h3';
  headingSize?: VariantProps<typeof kangurHeadlineVariants>['size'];
  icon?: React.ReactNode;
  iconAccent?: KangurAccent;
  iconSize?: VariantProps<typeof kangurIconBadgeVariants>['size'];
  layout?: 'stacked' | 'inline';
  title: React.ReactNode;
  titleId?: string;
};

export function KangurSectionHeading({
  accent = 'slate',
  align = 'center',
  className,
  description,
  descriptionId,
  headingAs = 'h2',
  headingSize = 'sm',
  icon,
  iconAccent,
  iconSize = 'md',
  layout = 'stacked',
  title,
  titleId,
  ...props
}: KangurSectionHeadingProps): React.JSX.Element {
  const isInline = layout === 'inline';
  const alignmentClassName = align === 'left' ? 'items-start text-left' : 'items-center text-center';
  const HeadingComp = headingAs;

  return (
    <div
      className={cn(
        'flex gap-3',
        isInline ? 'flex-row' : 'flex-col',
        alignmentClassName,
        className
      )}
      {...props}
    >
      {icon ? (
        <span
          className={cn(
            kangurIconBadgeVariants({ size: iconSize }),
            KANGUR_ACCENT_STYLES[iconAccent ?? accent].icon
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className={cn('space-y-1', isInline ? 'min-w-0' : undefined)}>
        <HeadingComp
          className={cn(kangurHeadlineVariants({ size: headingSize }), KANGUR_HEADLINE_CLASSNAMES[accent])}
          id={titleId}
        >
          {title}
        </HeadingComp>
        {description ? (
          <p className='text-sm [color:var(--kangur-page-muted-text)]' id={descriptionId}>
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type KangurGradientHeadingProps = React.HTMLAttributes<HTMLHeadingElement> &
  VariantProps<typeof kangurGradientHeadingVariants> & {
    as?: 'h1' | 'h2' | 'h3';
    gradientClass: string;
  };

export function KangurGradientHeading({
  as: Comp = 'h1',
  className,
  gradientClass,
  shadow,
  size,
  ...props
}: KangurGradientHeadingProps): React.JSX.Element {
  return (
    <Comp
      className={cn(kangurGradientHeadingVariants({ size, shadow }), gradientClass, className)}
      {...props}
    />
  );
}

const KANGUR_HEADLINE_CLASSNAMES: Record<KangurAccent, string> = {
  indigo: 'text-indigo-700',
  violet: 'text-violet-700',
  emerald: 'text-green-700',
  sky: 'text-sky-700',
  amber: 'text-amber-700',
  rose: 'text-rose-700',
  teal: 'text-teal-700',
  slate: '[color:var(--kangur-page-text)]',
};

const KANGUR_SECTION_EYEBROW_CLASSNAMES = {
  muted: '[color:var(--kangur-page-muted-text)]',
  slate: 'text-slate-500',
} as const;

type KangurHeadlineProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof kangurHeadlineVariants> & {
    accent?: KangurAccent;
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div';
  };

export function KangurHeadline({
  accent = 'slate',
  as: Comp = 'h2',
  className,
  size,
  ...props
}: KangurHeadlineProps): React.JSX.Element {
  return (
    <Comp
      className={cn(
        kangurHeadlineVariants({ size }),
        KANGUR_HEADLINE_CLASSNAMES[accent],
        className
      )}
      {...props}
    />
  );
}

type KangurSectionEyebrowProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'p' | 'span';
  tone?: keyof typeof KANGUR_SECTION_EYEBROW_CLASSNAMES;
};

export function KangurSectionEyebrow({
  as: Comp = 'div',
  className,
  tone = 'muted',
  ...props
}: KangurSectionEyebrowProps): React.JSX.Element {
  return (
    <Comp
      className={cn(
        'text-[11px] font-bold uppercase tracking-[0.22em]',
        KANGUR_SECTION_EYEBROW_CLASSNAMES[tone],
        className
      )}
      {...props}
    />
  );
}

type KangurPanelIntroProps = React.HTMLAttributes<HTMLDivElement> & {
  description?: React.ReactNode;
  descriptionClassName?: string;
  eyebrow?: React.ReactNode;
  eyebrowClassName?: string;
  eyebrowTone?: keyof typeof KANGUR_SECTION_EYEBROW_CLASSNAMES;
  title?: React.ReactNode;
  titleAs?: 'div' | 'h2' | 'h3' | 'p';
  titleClassName?: string;
};

export function KangurPanelIntro({
  className,
  description,
  descriptionClassName,
  eyebrow,
  eyebrowClassName,
  eyebrowTone = 'muted',
  title,
  titleAs: TitleComp = 'div',
  titleClassName,
  ...props
}: KangurPanelIntroProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-col gap-1', className)} {...props}>
      {eyebrow ? (
        <KangurSectionEyebrow className={eyebrowClassName} tone={eyebrowTone}>
          {eyebrow}
        </KangurSectionEyebrow>
      ) : null}
      {title ? (
        <TitleComp className={cn('font-semibold [color:var(--kangur-page-text)]', titleClassName)}>
          {title}
        </TitleComp>
      ) : null}
      {description ? (
        <div className={cn('text-sm [color:var(--kangur-page-muted-text)]', descriptionClassName)}>
          {description}
        </div>
      ) : null}
    </div>
  );
}

const KANGUR_EQUATION_CLASSNAMES: Record<KangurAccent, string> = {
  indigo: 'text-indigo-700',
  violet: 'text-purple-600',
  emerald: 'text-green-600',
  sky: 'text-blue-600',
  amber: 'text-orange-500',
  rose: 'text-red-500',
  teal: 'text-teal-600',
  slate: 'text-gray-700',
};

type KangurEquationDisplayProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof kangurEquationDisplayVariants> & {
    accent?: KangurAccent;
    as?: 'p' | 'div' | 'h2' | 'h3' | 'span';
  };

export function KangurEquationDisplay({
  accent = 'slate',
  as: Comp = 'p',
  className,
  size,
  ...props
}: KangurEquationDisplayProps): React.JSX.Element {
  return (
    <Comp
      className={cn(
        kangurEquationDisplayVariants({ size }),
        KANGUR_EQUATION_CLASSNAMES[accent],
        className
      )}
      {...props}
    />
  );
}

type KangurActivityColumnProps = React.HTMLAttributes<HTMLDivElement> & {
  accent?: KangurAccent;
  active?: boolean;
  value: number;
};

export function KangurActivityColumn({
  accent = 'indigo',
  active = false,
  className,
  value,
  ...props
}: KangurActivityColumnProps): React.JSX.Element {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn(
        'w-full rounded-lg bg-gradient-to-t transition-[height] duration-500',
        active
          ? cn(
            KANGUR_ACTIVITY_COLUMN_CLASSNAMES[accent],
            'shadow-[0_18px_28px_-18px_rgba(99,102,241,0.42)]'
          )
          : KANGUR_ACTIVITY_COLUMN_CLASSNAMES.slate,
        className
      )}
      data-active={active ? 'true' : 'false'}
      style={{ height: `${clampedValue}%` }}
      {...props}
    />
  );
}

type KangurInfoCardProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurInfoCardVariants> & {
    accent?: KangurAccent;
  };

export const KangurInfoCard = React.forwardRef<HTMLDivElement, KangurInfoCardProps>(
  ({ accent = 'slate', className, dashed, padding, tone, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        kangurInfoCardVariants({ tone, padding, dashed }),
        tone === 'accent' &&
          cn(KANGUR_ACCENT_STYLES[accent].activeCard, KANGUR_ACCENT_STYLES[accent].activeText),
        className
      )}
      {...props}
    />
  )
);
KangurInfoCard.displayName = 'KangurInfoCard';

type KangurSurfacePanelProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurSurfacePanelVariants>;

export const KangurSurfacePanel = React.forwardRef<HTMLDivElement, KangurSurfacePanelProps>(
  ({ accent, className, fillHeight, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(kangurSurfacePanelVariants({ accent, fillHeight, padding }), className)}
      {...props}
    />
  )
);
KangurSurfacePanel.displayName = 'KangurSurfacePanel';

type KangurMenuItemProps = React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
};

export const KangurMenuItem = React.forwardRef<HTMLDivElement, KangurMenuItemProps>(
  ({ asChild = false, className, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    return (
      <Comp
        ref={ref}
        className={cn(kangurMenuItemVariants(), className)}
        {...props}
      />
    );
  }
);
KangurMenuItem.displayName = 'KangurMenuItem';

type KangurMediaFrameProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurMediaFrameVariants> & {
    accent?: KangurAccent;
    fit?: 'cover' | 'contain' | 'none';
    mediaType?: 'generic' | 'image' | 'svg';
  };

const KANGUR_MEDIA_FRAME_FIT_CLASSNAMES = {
  generic: {
    cover: '',
    contain: '',
    none: '',
  },
  image: {
    cover: 'overflow-hidden [&_img]:h-[260px] [&_img]:w-full [&_img]:object-cover',
    contain: '[&_img]:h-auto [&_img]:max-h-[320px] [&_img]:w-full [&_img]:object-contain',
    none: '[&_img]:h-auto [&_img]:w-auto [&_img]:max-w-full',
  },
  svg: {
    cover: '[&_svg]:h-[260px] [&_svg]:w-full [&_svg]:object-cover',
    contain: '[&_svg]:h-auto [&_svg]:max-h-[320px] [&_svg]:w-full [&_svg]:object-contain',
    none: '[&_svg]:h-auto [&_svg]:w-auto [&_svg]:max-w-full',
  },
} as const;

export const KangurMediaFrame = React.forwardRef<HTMLDivElement, KangurMediaFrameProps>(
  (
    {
      accent = 'slate',
      className,
      dashed,
      fillHeight,
      fit = 'contain',
      mediaType = 'generic',
      overflowHidden,
      padding,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        kangurMediaFrameVariants({
          accent,
          dashed,
          fillHeight,
          overflowHidden: overflowHidden ?? (mediaType === 'image' && fit === 'cover'),
          padding,
        }),
        KANGUR_MEDIA_FRAME_FIT_CLASSNAMES[mediaType][fit],
        className
      )}
      {...props}
    />
  )
);
KangurMediaFrame.displayName = 'KangurMediaFrame';

type KangurProseProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof kangurProseVariants> & {
    as?: React.ElementType;
  };

export function KangurProse({
  accent = 'slate',
  as: Comp = 'div',
  className,
  ...props
}: KangurProseProps): React.JSX.Element {
  const Component = Comp as React.ElementType<Record<string, unknown>>;
  return React.createElement(Component, {
    ...props,
    className: cn(kangurProseVariants({ accent }), className),
  });
}

type KangurTextFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> &
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

type KangurSelectFieldProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> &
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

const KANGUR_PROGRESS_BAR_GRADIENTS: Record<KangurAccent, string> = {
  indigo: 'from-purple-500 to-indigo-500',
  violet: 'from-violet-500 to-fuchsia-500',
  emerald: 'from-emerald-500 to-cyan-500',
  sky: 'from-sky-400 to-indigo-400',
  amber: 'from-orange-400 to-yellow-400',
  rose: 'from-red-400 to-pink-400',
  teal: 'from-blue-500 to-teal-400',
  slate: 'from-slate-400 to-slate-600',
};

type KangurProgressBarProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurProgressBarVariants> & {
    accent?: KangurAccent;
    animated?: boolean;
    fillClassName?: string;
    value: number;
  };

export function KangurProgressBar({
  accent = 'indigo',
  animated = false,
  className,
  fillClassName,
  size,
  value,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: KangurProgressBarProps): React.JSX.Element {
  const clampedValue = Math.max(0, Math.min(100, value));
  const fillClasses = cn(
    'h-full rounded-full bg-gradient-to-r',
    KANGUR_PROGRESS_BAR_GRADIENTS[accent],
    !animated && 'transition-[width] duration-500 ease-out',
    fillClassName
  );

  return (
    <div
      aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : 'Postep')}
      aria-labelledby={ariaLabelledBy}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clampedValue)}
      className={cn(kangurProgressBarVariants({ size }), className)}
      role='progressbar'
      {...props}
    >
      {animated ? (
        <motion.div
          animate={{ width: `${clampedValue}%` }}
          className={fillClasses}
          initial={{ width: 0 }}
          transition={{ duration: 0.8 }}
        />
      ) : (
        <div className={fillClasses} style={{ width: `${clampedValue}%` }} />
      )}
    </div>
  );
}

type KangurSummaryPanelProps = React.HTMLAttributes<HTMLDivElement> &
  Pick<KangurInfoCardProps, 'accent' | 'padding'> & {
    align?: 'left' | 'center';
    description?: React.ReactNode;
    label?: React.ReactNode;
    labelAccent?: KangurAccent;
    title?: React.ReactNode;
    tone?: 'neutral' | 'accent';
  };

export function KangurSummaryPanel({
  accent = 'slate',
  align = 'left',
  children,
  className,
  description,
  label,
  labelAccent,
  padding = 'lg',
  title,
  tone = 'neutral',
  ...props
}: KangurSummaryPanelProps): React.JSX.Element {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        kangurInfoCardVariants({ tone, padding }),
        tone === 'accent' &&
          cn(KANGUR_ACCENT_STYLES[accent].activeCard, KANGUR_ACCENT_STYLES[accent].activeText),
        'space-y-2',
        centered && 'text-center',
        className
      )}
      {...props}
    >
      {label ? (
        <span
          className={cn(
            kangurStatusChipVariants({ size: 'sm' }),
            KANGUR_ACCENT_STYLES[labelAccent ?? accent].badge,
            centered && 'mx-auto'
          )}
        >
          {label}
        </span>
      ) : null}
      {title ? (
        <div
          className={cn(
            'text-2xl font-extrabold leading-tight',
            tone === 'accent'
              ? KANGUR_ACCENT_STYLES[accent].activeText
              : '[color:var(--kangur-page-text)]'
          )}
        >
          {title}
        </div>
      ) : null}
      {description ? (
        <p
          className={cn(
            'text-sm leading-6',
            tone === 'accent'
              ? KANGUR_ACCENT_STYLES[accent].mutedText
              : '[color:var(--kangur-page-muted-text)]',
            centered && 'mx-auto max-w-2xl'
          )}
        >
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}

type KangurEmptyStateProps = React.HTMLAttributes<HTMLDivElement> &
  Pick<KangurInfoCardProps, 'accent' | 'padding'> & {
    align?: 'left' | 'center';
    description?: React.ReactNode;
    icon?: React.ReactNode;
    title?: React.ReactNode;
  };

export function KangurEmptyState({
  accent = 'slate',
  align = 'center',
  children,
  className,
  description,
  icon,
  padding = 'lg',
  title,
  ...props
}: KangurEmptyStateProps): React.JSX.Element {
  const centered = align === 'center';
  const emptyStateAccent = accent;
  const emptyStateClassName = className;
  const emptyStateDescription = description;
  const emptyStateIcon = icon;
  const emptyStatePadding = padding;
  const emptyStateTitle = title;

  return (
    <div
      className={cn(
        kangurInfoCardVariants({ dashed: true, padding: emptyStatePadding, tone: 'muted' }),
        'space-y-3',
        centered && 'text-center',
        emptyStateClassName
      )}
      {...props}
    >
      {emptyStateIcon ? (
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl',
            KANGUR_ACCENT_STYLES[emptyStateAccent].icon,
            centered && 'mx-auto'
          )}
        >
          {emptyStateIcon}
        </div>
      ) : null}
      {emptyStateTitle ? (
        <div className='text-base font-bold [color:var(--kangur-page-text)]'>{emptyStateTitle}</div>
      ) : null}
      {emptyStateDescription ? (
        <p className='text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
          {emptyStateDescription}
        </p>
      ) : null}
      {children}
    </div>
  );
}

type KangurInlineFallbackProps = React.HTMLAttributes<HTMLDivElement> &
  Pick<KangurEmptyStateProps, 'accent'> & {
    align?: 'left' | 'center';
    description?: React.ReactNode;
    icon?: React.ReactNode;
    title: React.ReactNode;
  };

export function KangurInlineFallback({
  accent = 'slate',
  align = 'center',
  children,
  className,
  description,
  icon,
  title,
  ...props
}: KangurInlineFallbackProps): React.JSX.Element {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        kangurInfoCardVariants({ dashed: true, padding: 'md', tone: 'muted' }),
        'w-full space-y-3',
        centered && 'text-center',
        className
      )}
      {...props}
    >
      {icon ? (
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl',
            KANGUR_ACCENT_STYLES[accent].icon,
            centered && 'mx-auto'
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className='text-base font-bold [color:var(--kangur-page-text)]'>{title}</div>
      {description ? (
        <p className='text-sm leading-6 [color:var(--kangur-page-muted-text)]'>{description}</p>
      ) : null}
      {children}
    </div>
  );
}

type KangurMetricCardProps = React.HTMLAttributes<HTMLDivElement> &
  Pick<KangurInfoCardProps, 'accent' | 'padding'> & {
    align?: 'left' | 'center';
    description?: React.ReactNode;
    label: React.ReactNode;
    value: React.ReactNode;
    valueClassName?: string;
  };

export function KangurMetricCard({
  accent = 'slate',
  align = 'left',
  children,
  className,
  description,
  label,
  padding = 'md',
  value,
  valueClassName,
  ...props
}: KangurMetricCardProps): React.JSX.Element {
  const centered = align === 'center';
  const tone = accent === 'slate' ? 'neutral' : 'accent';
  const metricAccent = accent;
  const metricCardClassName = className;
  const metricDescription = description;
  const metricLabel = label;
  const metricPadding = padding;
  const metricTone = tone;
  const metricValue = value;
  const metricValueClassName = valueClassName;

  return (
    <div
      className={cn(
        kangurInfoCardVariants({ tone: metricTone, padding: metricPadding }),
        metricTone === 'accent' &&
          cn(KANGUR_ACCENT_STYLES[metricAccent].activeCard, KANGUR_ACCENT_STYLES[metricAccent].activeText),
        'space-y-1.5',
        centered && 'text-center',
        metricCardClassName
      )}
      {...props}
    >
      <div
        className={cn(
          'text-[11px] font-bold uppercase tracking-wide',
          metricTone === 'accent'
            ? KANGUR_ACCENT_STYLES[metricAccent].activeText
            : '[color:var(--kangur-page-muted-text)]'
        )}
      >
        {metricLabel}
      </div>
      <div
        className={cn(
          'text-3xl font-extrabold leading-none',
          metricTone === 'accent'
            ? KANGUR_ACCENT_STYLES[metricAccent].activeText
            : '[color:var(--kangur-page-text)]',
          metricValueClassName
        )}
      >
        {metricValue}
      </div>
      {metricDescription ? (
        <div
          className={cn(
            'text-xs leading-5',
            metricTone === 'accent'
              ? KANGUR_ACCENT_STYLES[metricAccent].mutedText
              : '[color:var(--kangur-page-muted-text)]'
          )}
        >
          {metricDescription}
        </div>
      ) : null}
      {children}
    </div>
  );
}

type KangurPageShellProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: KangurPageTone;
  skipLinkTargetId?: string;
  skipLinkLabel?: string;
};

export const KangurPageShell = ({
  tone = 'play',
  className,
  children,
  skipLinkTargetId,
  skipLinkLabel = 'Przejdz do glownej tresci',
  ...props
}: KangurPageShellProps): React.JSX.Element => {
  const routing = useOptionalKangurRouting();
  const embedded = routing?.embedded ?? false;

  return (
    <div
      className={cn(
        'relative isolate flex w-full flex-col items-center overflow-hidden [color:var(--kangur-page-text)]',
        embedded ? 'min-h-full' : 'min-h-screen',
        KANGUR_PAGE_TONE_CLASSNAMES[tone],
        className
      )}
      {...props}
    >
      {skipLinkTargetId ? (
        <a
          href={`#${skipLinkTargetId}`}
          className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-full focus:bg-white/96 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-indigo-700 focus:shadow-[0_18px_40px_-28px_rgba(79,99,216,0.6)] focus:outline-none focus:ring-2 focus:ring-indigo-300/70'
        >
          {skipLinkLabel}
        </a>
      ) : null}
      <div
        className={cn(
          'relative z-10 flex w-full flex-col items-center',
          embedded ? 'min-h-full' : 'min-h-screen'
        )}
      >
        {children}
      </div>
    </div>
  );
};

export const KangurPageTopBar = ({
  left,
  right,
  className,
  contentClassName,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}): React.JSX.Element => (
  <div className={cn(KANGUR_TOP_BAR_CLASSNAME, className)} data-testid='kangur-page-top-bar'>
    <div
      className={cn(
        KANGUR_TOP_BAR_INNER_CLASSNAME,
        contentClassName,
        right ? 'justify-between' : 'justify-center'
      )}
      data-testid='kangur-page-top-bar-content'
    >
      <div className='flex min-w-0 flex-1 items-center'>{left}</div>
      {right ? (
        <div
          className='ml-auto flex w-full items-center justify-end gap-3 sm:w-auto'
          data-testid='kangur-page-top-bar-right'
        >
          {right}
        </div>
      ) : null}
    </div>
  </div>
);

type KangurPageContainerProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'main' | 'section';
};

export const KangurPageContainer = ({
  as: Comp = 'main',
  className,
  children,
  tabIndex,
  ...props
}: KangurPageContainerProps): React.JSX.Element => {
  const routing = useOptionalKangurRouting();
  const ResolvedComp = routing?.embedded && Comp === 'main' ? 'div' : Comp;

  return (
    <ResolvedComp
      className={cn(KANGUR_PAGE_CONTAINER_CLASSNAME, className)}
      data-kangur-route-main={Comp === 'main' ? 'true' : undefined}
      tabIndex={tabIndex ?? -1}
      {...props}
    >
      {children}
    </ResolvedComp>
  );
};

type KangurTopNavGroupProps = React.HTMLAttributes<HTMLElement> & {
  label?: string;
};

export const KangurTopNavGroup = ({
  label = 'Glowna nawigacja Kangur',
  className,
  children,
  ...props
}: KangurTopNavGroupProps): React.JSX.Element => (
  <nav aria-label={label} className={cn(KANGUR_TOP_NAV_GROUP_CLASSNAME, className)} {...props}>
    {children}
  </nav>
);
