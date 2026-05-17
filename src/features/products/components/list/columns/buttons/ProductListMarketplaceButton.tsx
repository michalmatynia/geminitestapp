'use client';

import { Check } from 'lucide-react';
import React from 'react';

import { Button, type ButtonProps } from '@/shared/ui/button';
import { cn } from '@/shared/utils/ui-utils';

type ProductListMarketplaceButtonProps = Omit<ButtonProps, 'size' | 'variant'> & {
  disabledInteractionClass?: string | false | null;
  isPulsing?: boolean;
  toneClass?: string;
};

type ProductListMarketplaceQuickButtonProps = Omit<
  ProductListMarketplaceButtonProps,
  'children'
> & {
  label: string;
  showCheckmark: boolean;
  showFailureDot: boolean;
};

type ProductListMarketplaceTextButtonProps = Omit<
  ProductListMarketplaceButtonProps,
  'children'
> & {
  label: string;
};

type ProductListMarketplacePendingTextButtonProps = ProductListMarketplaceTextButtonProps & {
  isPending: boolean;
};

type ProductListMarketplaceIconButtonProps = Omit<
  ProductListMarketplaceButtonProps,
  'aria-label' | 'children' | 'title'
> & {
  children: React.ReactNode;
  isPending?: boolean;
  label: string;
};

export const PRODUCT_LIST_MARKETPLACE_BUTTON_TEXT_CLASSNAME =
  'text-[9px] font-black uppercase leading-none tracking-tight';

export const PRODUCT_LIST_MARKETPLACE_DISABLED_INTERACTION_CLASS =
  'cursor-not-allowed opacity-60';

export const PRODUCT_LIST_MARKETPLACE_EXCLUDED_TONE_CLASS =
  'border-slate-700/35 bg-slate-950/40 text-slate-500 hover:border-slate-700/35 hover:bg-slate-950/40 hover:text-slate-500';

export const PRODUCT_LIST_MARKETPLACE_EXCLUDED_INTERACTION_CLASS =
  'cursor-not-allowed disabled:border-slate-700/35 disabled:bg-slate-950/40 disabled:text-slate-500 disabled:opacity-40';

export const PRODUCT_LIST_TRIGGER_BUTTON_BAR_CLASSNAME =
  '[&_button]:h-8 [&_button]:px-2 [&_button]:text-[10px] [&_button]:font-black [&_button]:uppercase [&_button]:tracking-tight';

export function ProductListMarketplaceButton({
  children,
  className,
  disabledInteractionClass,
  isPulsing = false,
  toneClass,
  ...props
}: ProductListMarketplaceButtonProps): React.JSX.Element {
  return (
    <Button
      {...props}
      variant='ghost'
      size='icon'
      className={cn(
        'relative size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
        isPulsing && 'motion-safe:animate-pulse',
        toneClass,
        disabledInteractionClass,
        className
      )}
    >
      {children}
    </Button>
  );
}

export function ProductListMarketplaceButtonText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <span aria-hidden='true' className={cn(PRODUCT_LIST_MARKETPLACE_BUTTON_TEXT_CLASSNAME, className)}>
      {children}
    </span>
  );
}

export function ProductListMarketplacePendingText(): React.JSX.Element {
  return (
    <ProductListMarketplaceButtonText className='tracking-normal'>
      ...
    </ProductListMarketplaceButtonText>
  );
}

export function ProductListMarketplaceTextButton({
  label,
  ...buttonProps
}: ProductListMarketplaceTextButtonProps): React.JSX.Element {
  const accessibleLabel = buttonProps['aria-label'] ?? label;
  const title = buttonProps.title ?? accessibleLabel;

  return (
    <ProductListMarketplaceButton {...buttonProps} aria-label={accessibleLabel} title={title}>
      <ProductListMarketplaceButtonText>{label}</ProductListMarketplaceButtonText>
    </ProductListMarketplaceButton>
  );
}

export function ProductListMarketplacePendingTextButton({
  isPending,
  label,
  ...buttonProps
}: ProductListMarketplacePendingTextButtonProps): React.JSX.Element {
  const accessibleLabel = buttonProps['aria-label'] ?? label;
  const title = buttonProps.title ?? accessibleLabel;

  return (
    <ProductListMarketplaceButton {...buttonProps} aria-label={accessibleLabel} title={title}>
      {isPending ? (
        <ProductListMarketplacePendingText />
      ) : (
        <ProductListMarketplaceButtonText>{label}</ProductListMarketplaceButtonText>
      )}
    </ProductListMarketplaceButton>
  );
}

export function ProductListMarketplaceIconButton({
  children,
  isPending = false,
  label,
  ...buttonProps
}: ProductListMarketplaceIconButtonProps): React.JSX.Element {
  return (
    <ProductListMarketplaceButton
      {...buttonProps}
      aria-label={label}
      title={label}
    >
      {isPending ? (
        <ProductListMarketplacePendingText />
      ) : (
        children
      )}
    </ProductListMarketplaceButton>
  );
}

export function ProductListMarketplaceCheckIcon(): React.JSX.Element {
  return <Check className='h-3 w-3' aria-hidden='true' />;
}

export function ProductListMarketplaceFailureDot(): React.JSX.Element {
  return (
    <span
      aria-hidden='true'
      className='absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-rose-500'
    />
  );
}

export function ProductListMarketplaceQuickButton({
  label,
  showCheckmark,
  showFailureDot,
  ...buttonProps
}: ProductListMarketplaceQuickButtonProps): React.JSX.Element {
  const accessibleLabel = buttonProps['aria-label'] ?? label;
  const title = buttonProps.title ?? accessibleLabel;

  return (
    <ProductListMarketplaceButton {...buttonProps} aria-label={accessibleLabel} title={title}>
      {showCheckmark ? (
        <ProductListMarketplaceCheckIcon />
      ) : (
        <ProductListMarketplaceButtonText>{label}</ProductListMarketplaceButtonText>
      )}
      {showFailureDot ? <ProductListMarketplaceFailureDot /> : null}
    </ProductListMarketplaceButton>
  );
}
