import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { cn } from '@/shared/utils';

import {
  KANGUR_PAGE_CONTAINER_CLASSNAME,
  KANGUR_PAGE_TONE_CLASSNAMES,
  KANGUR_PANEL_CLASSNAMES,
  KANGUR_TOP_NAV_GROUP_CLASSNAME,
  KANGUR_TOP_NAV_ITEM_ACTIVE_CLASSNAME,
  KANGUR_TOP_NAV_ITEM_CLASSNAME,
  KANGUR_TOP_BAR_CLASSNAME,
  KANGUR_TOP_BAR_INNER_CLASSNAME,
  type KangurPageTone,
} from './tokens';

const kangurButtonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 border text-sm font-bold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 focus-visible:ring-offset-2 ring-offset-white disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none',
  {
    variants: {
      variant: {
        primary:
          'kangur-cta-pill border-transparent play-cta text-white hover:brightness-[1.02]',
        warm:
          'kangur-cta-pill border-transparent primary-cta text-white hover:brightness-[1.02]',
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
        ghost: 'border-transparent bg-transparent text-[#6e7ee7] hover:bg-white/70 hover:text-[#4f63d8]',
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
}): React.JSX.Element => {
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
    >
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
  <div className={cn(KANGUR_TOP_BAR_CLASSNAME, className)}>
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
  </div>
);

export const KangurPageContainer = ({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element => (
  <div className={cn(KANGUR_PAGE_CONTAINER_CLASSNAME, className)}>{children}</div>
);

export const KangurTopNavGroup = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element => (
  <div className={cn(KANGUR_TOP_NAV_GROUP_CLASSNAME, className)} {...props}>
    {children}
  </div>
);
