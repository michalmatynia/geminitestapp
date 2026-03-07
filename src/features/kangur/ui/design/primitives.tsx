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
  'inline-flex cursor-pointer items-center justify-center gap-2 border text-sm font-bold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 focus-visible:ring-offset-2 ring-offset-white disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none',
  {
    variants: {
      variant: {
        primary: 'kangur-cta-pill border-transparent play-cta text-white hover:brightness-[1.02]',
        warm: 'kangur-cta-pill border-transparent primary-cta text-white hover:brightness-[1.02]',
        secondary:
          'kangur-cta-pill border-transparent soft-cta text-[#2f467e] hover:text-[#24386e]',
        surface:
          'kangur-cta-pill border-transparent surface-cta text-[#2f4db5] hover:text-[#233e99]',
        success:
          'kangur-cta-pill border-transparent success-cta text-emerald-800 hover:text-emerald-900',
        warning:
          'kangur-cta-pill border-transparent warning-cta text-[#9a5418] hover:text-[#7f4310]',
        navigation: KANGUR_TOP_NAV_ITEM_CLASSNAME,
        navigationActive: cn(KANGUR_TOP_NAV_ITEM_CLASSNAME, KANGUR_TOP_NAV_ITEM_ACTIVE_CLASSNAME),
        ghost:
          'border-transparent bg-transparent text-[#6e7ee7] hover:bg-white/70 hover:text-[#4f63d8]',
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
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

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
      neutral: 'border-slate-200/80 bg-white/92 text-slate-700',
      accent: '',
      muted: 'border-slate-200/80 bg-slate-50/88 text-slate-600',
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
      indigo: 'border-indigo-200/70 bg-white/95 text-slate-800',
      violet: 'border-violet-200/80 bg-white/90 text-slate-800',
      emerald: 'border-emerald-200/80 bg-white/95 text-slate-800',
      sky: 'border-sky-200/80 bg-white/95 text-slate-800',
      amber: 'border-amber-200/80 bg-white/95 text-slate-800',
      rose: 'border-rose-200/80 bg-white/95 text-slate-800',
      teal: 'border-teal-200/80 bg-white/95 text-slate-800',
      slate: 'border-slate-200/80 bg-white/92 text-slate-800',
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
  'relative flex cursor-default select-none items-center rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 outline-none transition-colors focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900'
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
  'soft-card w-full rounded-[22px] border border-slate-200/80 bg-white/92 text-sm text-slate-700 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.18)] outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70',
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
  'w-full overflow-hidden rounded-full bg-slate-100/95 shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)]',
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

type KangurOptionCardButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof kangurOptionCardButtonVariants> & {
    accent?: KangurAccent;
  };

export const KangurOptionCardButton = React.forwardRef<
  HTMLButtonElement,
  KangurOptionCardButtonProps
>(({ accent = 'slate', className, disabled, emphasis, state, type, ...props }, ref) => {
  const accentStyles = KANGUR_ACCENT_STYLES[accent];

  return (
    <button
      ref={ref}
      className={cn(
        kangurOptionCardButtonVariants({ emphasis, state }),
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70'
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
    <KangurInfoCard
      accent={accent}
      className={cn('space-y-2', centered && 'text-center', className)}
      padding={padding}
      tone={tone}
      {...props}
    >
      {label ? (
        <KangurStatusChip
          accent={labelAccent ?? accent}
          className={centered ? 'mx-auto' : undefined}
          size='sm'
        >
          {label}
        </KangurStatusChip>
      ) : null}
      {title ? (
        <div
          className={cn(
            'text-2xl font-extrabold leading-tight',
            tone === 'accent' ? KANGUR_ACCENT_STYLES[accent].activeText : 'text-slate-900'
          )}
        >
          {title}
        </div>
      ) : null}
      {description ? (
        <p
          className={cn(
            'text-sm leading-6',
            tone === 'accent' ? KANGUR_ACCENT_STYLES[accent].mutedText : 'text-slate-600',
            centered && 'mx-auto max-w-2xl'
          )}
        >
          {description}
        </p>
      ) : null}
      {children}
    </KangurInfoCard>
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

  return (
    <KangurInfoCard
      accent={accent}
      className={cn('space-y-3', centered && 'text-center', className)}
      dashed
      padding={padding}
      tone='muted'
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
      {title ? <div className='text-base font-bold text-slate-700'>{title}</div> : null}
      {description ? <p className='text-sm leading-6 text-slate-500'>{description}</p> : null}
      {children}
    </KangurInfoCard>
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

  return (
    <KangurInfoCard
      accent={accent}
      className={cn('space-y-1.5', centered && 'text-center', className)}
      padding={padding}
      tone={tone}
      {...props}
    >
      <div
        className={cn(
          'text-[11px] font-bold uppercase tracking-wide',
          tone === 'accent' ? KANGUR_ACCENT_STYLES[accent].activeText : 'text-slate-500'
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          'text-3xl font-extrabold leading-none',
          tone === 'accent' ? KANGUR_ACCENT_STYLES[accent].activeText : 'text-slate-900',
          valueClassName
        )}
      >
        {value}
      </div>
      {description ? (
        <div
          className={cn(
            'text-xs leading-5',
            tone === 'accent' ? KANGUR_ACCENT_STYLES[accent].mutedText : 'text-slate-500'
          )}
        >
          {description}
        </div>
      ) : null}
      {children}
    </KangurInfoCard>
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
        'relative isolate flex w-full flex-col items-center overflow-hidden text-slate-800',
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
  <header className={cn(KANGUR_TOP_BAR_CLASSNAME, className)}>
    <div
      className={cn(
        KANGUR_TOP_BAR_INNER_CLASSNAME,
        right ? 'justify-between' : 'justify-center',
        contentClassName
      )}
    >
      <div className='flex min-w-0 flex-1 items-center'>{left}</div>
      {right ? <div className='flex shrink-0 items-center gap-3'>{right}</div> : null}
    </div>
  </header>
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
}: KangurPageContainerProps): React.JSX.Element => (
  <Comp
    className={cn(KANGUR_PAGE_CONTAINER_CLASSNAME, className)}
    tabIndex={Comp === 'main' ? tabIndex ?? -1 : tabIndex}
    {...props}
  >
    {children}
  </Comp>
);

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
