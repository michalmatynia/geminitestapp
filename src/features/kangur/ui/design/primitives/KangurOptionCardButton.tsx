import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

import { KANGUR_ACCENT_STYLES, KANGUR_OPTION_CARD_CLASSNAME, type KangurAccent } from '../tokens';

export const kangurOptionCardButtonVariants = cva(
  `${KANGUR_OPTION_CARD_CLASSNAME} relative text-left disabled:pointer-events-none`,
  {
    variants: {
      emphasis: {
        neutral:
          '[border-color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_92%,var(--kangur-page-background))] [color:var(--kangur-page-text)]',
        accent: '',
      },
      state: {
        default: '',
        muted:
          'cursor-default [border-color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_88%,var(--kangur-page-background))] [color:var(--kangur-page-muted-text)] opacity-70 hover:translate-y-0 hover:[border-color:var(--kangur-soft-card-border)] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_88%,var(--kangur-page-background))]',
      },
    },
    defaultVariants: {
      emphasis: 'neutral',
      state: 'default',
    },
  }
);

export type KangurOptionCardButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
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
