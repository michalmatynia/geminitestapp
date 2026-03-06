import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

import {
  KANGUR_PAGE_CONTAINER_CLASSNAME,
  KANGUR_PAGE_TONE_CLASSNAMES,
  KANGUR_PANEL_CLASSNAMES,
  KANGUR_TOP_BAR_CLASSNAME,
  KANGUR_TOP_BAR_INNER_CLASSNAME,
  type KangurPageTone,
} from './tokens';

const kangurButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl border text-sm font-bold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 focus-visible:ring-offset-2 ring-offset-white disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none',
  {
    variants: {
      variant: {
        primary:
          'border-transparent bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_20px_48px_-26px_rgba(99,102,241,0.7)] hover:brightness-105',
        secondary:
          'border-slate-200/85 bg-white/92 text-slate-700 shadow-sm hover:border-slate-300 hover:bg-white',
        surface:
          'border-indigo-200/85 bg-indigo-50/85 text-indigo-700 shadow-sm hover:border-indigo-300 hover:bg-indigo-100/80',
        success:
          'border-emerald-200/85 bg-emerald-50/90 text-emerald-700 shadow-sm hover:bg-emerald-100',
        warning:
          'border-amber-200/85 bg-amber-50/90 text-amber-800 shadow-sm hover:bg-amber-100',
        ghost: 'border-transparent bg-transparent text-indigo-600 hover:bg-white/70 hover:text-indigo-700',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-5 py-3 text-base',
        xl: 'px-6 py-3.5 text-lg',
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
  <div
    ref={ref}
    className={cn(kangurPanelVariants({ variant, padding }), className)}
    {...props}
  />
));
KangurPanel.displayName = 'KangurPanel';

export const KangurPageShell = ({
  tone = 'play',
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: KangurPageTone;
}): React.JSX.Element => (
  <div className={cn('flex min-h-screen flex-col items-center', KANGUR_PAGE_TONE_CLASSNAMES[tone], className)}>
    {children}
  </div>
);

export const KangurPageTopBar = ({
  left,
  right,
  className,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}): React.JSX.Element => (
  <div className={cn(KANGUR_TOP_BAR_CLASSNAME, className)}>
    <div className={KANGUR_TOP_BAR_INNER_CLASSNAME}>
      <div className='flex min-w-0 items-center gap-3'>{left}</div>
      <div className='flex items-center gap-3'>{right}</div>
    </div>
  </div>
);

export const KangurPageContainer = ({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element => (
  <div className={cn(KANGUR_PAGE_CONTAINER_CLASSNAME, className)}>{children}</div>
);
