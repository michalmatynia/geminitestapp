import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

import type { DataAttributes } from '@/shared/contracts/ui';
import { cn, resolveAccessibleLabel, warnMissingAccessibleLabel } from '@/shared/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-transparent text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 ring-offset-background cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'border-foreground/15 bg-transparent text-foreground/90 hover:bg-foreground/8 hover:text-foreground',
        primary: 'border-foreground/25 bg-transparent text-foreground hover:bg-foreground/10',
        solid: 'bg-blue-600 text-white hover:bg-blue-700 border-transparent',
        'solid-destructive': 'bg-red-600 text-white hover:bg-red-700 border-transparent',
        destructive: 'bg-destructive/15 text-destructive hover:bg-destructive/25',
        outline: 'border-foreground/15 bg-transparent hover:bg-foreground/8',
        secondary: 'bg-muted/30 hover:bg-muted/45',
        surface: 'bg-muted/30 hover:bg-muted/45',
        success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20',
        info: 'bg-sky-500/10 text-sky-500 border-sky-500/20 hover:bg-sky-500/20',
        ghost: 'bg-transparent hover:bg-foreground/8',
        link: 'text-foreground/80 underline-offset-4 hover:underline hover:text-foreground',
      },
      size: {
        default: 'h-9 px-3.5 py-2',
        xs: 'h-7 rounded-md px-2 text-xs',
        sm: 'h-8 rounded-lg px-3',
        lg: 'h-10 rounded-lg px-4',
        icon: 'size-9 rounded-full',
        'icon-lg': 'size-14 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants>,
    DataAttributes {
  asChild?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      icon,
      loading = false,
      loadingText,
      children,
      onClick,
      tabIndex,
      disabled,
      title,
      type,
      'data-testid': dataTestId,
      'data-doc-id': dataDocId,
      'data-doc-alias': dataDocAlias,
      'aria-label': ariaLabelProp,
      'aria-busy': ariaBusyProp,
      'aria-labelledby': ariaLabelledByProp,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = loading || disabled;
    const resolvedAriaBusy = ariaBusyProp || loading || undefined;
    const handleClick: React.MouseEventHandler<HTMLElement> = (event) => {
      if (isDisabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      onClick?.(event as React.MouseEvent<HTMLButtonElement>);
    };
    const resolvedTabIndex = isDisabled && asChild ? -1 : tabIndex;
    const disabledClassName = isDisabled && asChild ? 'pointer-events-none cursor-not-allowed opacity-50' : null;
    const isIconButton = size === 'icon' || size === 'icon-lg';
    const { hasText, ariaLabel: resolvedAriaLabel, hasAccessibleLabel } = resolveAccessibleLabel({
      children,
      ariaLabel: ariaLabelProp,
      ariaLabelledBy: ariaLabelledByProp,
      title,
      fallbackLabel:
        loadingText ||
        (typeof dataDocAlias === 'string' ? dataDocAlias : undefined) ||
        (typeof dataDocId === 'string' ? dataDocId : undefined) ||
        (typeof dataTestId === 'string' ? dataTestId : undefined),
    });
    const resolvedType = asChild ? undefined : type;

    if (!hasAccessibleLabel && (isIconButton || !hasText)) {
      warnMissingAccessibleLabel({ componentName: 'Button', hasAccessibleLabel });
    }

    const content = loading ? (
      <>
        <Loader2 className='size-4 animate-spin' aria-hidden='true' />
        {loadingText || children}
      </>
    ) : (
      <>
        {icon}
        {children}
      </>
    );

    return (
      <Comp
        {...props}
        onClick={isDisabled || onClick ? handleClick : undefined}
        tabIndex={resolvedTabIndex}
        className={cn(buttonVariants({ variant, size, className }), loading && 'gap-2', disabledClassName)}
        disabled={asChild ? undefined : isDisabled}
        aria-disabled={isDisabled ? 'true' : undefined}
        aria-busy={resolvedAriaBusy}
        aria-label={resolvedAriaLabel}
        aria-labelledby={ariaLabelledByProp}
        aria-live={loading ? 'polite' : undefined}
        aria-atomic={loading ? 'true' : undefined}
        title={title}
        data-testid={dataTestId}
        data-doc-id={dataDocId}
        data-doc-alias={dataDocAlias}
        type={resolvedType}
        ref={ref}
      >
        {asChild ? (loading ? <Loader2 className='size-4 animate-spin' aria-hidden='true' /> : icon) : null}
        {asChild ? <Slottable>{children}</Slottable> : content}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
