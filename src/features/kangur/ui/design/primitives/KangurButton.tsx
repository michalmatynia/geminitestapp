import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn, resolveAccessibleLabel, warnMissingAccessibleLabel } from '@/features/kangur/shared/utils';
import type { DataAttributesDto } from '@/shared/contracts/ui';

import {
  KANGUR_SEGMENTED_CONTROL_ITEM_ACTIVE_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_ITEM_CLASSNAME,
  KANGUR_TOP_NAV_ITEM_ACTIVE_CLASSNAME,
  KANGUR_TOP_NAV_ITEM_CLASSNAME,
} from '../tokens';

export const kangurButtonVariants = cva(
  'inline-flex min-w-0 max-w-full cursor-pointer touch-manipulation select-none items-center justify-center gap-2 border font-bold tracking-tight transition-all duration-200 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-white disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none disabled:active:scale-100',
  {
    variants: {
      variant: {
        primary:
          'kangur-button-shell kangur-cta-pill border-transparent primary-cta hover:brightness-[1.02] focus-visible:ring-amber-300/70',
        secondary:
          'kangur-button-shell kangur-cta-pill border-transparent soft-cta text-[var(--kangur-button-secondary-text,#2f467e)] hover:text-[var(--kangur-button-secondary-hover-text,#24386e)] focus-visible:ring-indigo-300/70',
        surface:
          'kangur-button-shell kangur-cta-pill border-transparent surface-cta text-[var(--kangur-button-surface-text,#2f4db5)] hover:text-[var(--kangur-button-surface-hover-text,#233e99)] focus-visible:ring-indigo-300/70',
        success:
          'kangur-button-shell kangur-cta-pill border-transparent success-cta text-[var(--kangur-button-success-text,#065f46)] hover:text-[var(--kangur-button-success-hover-text,#064e3b)] focus-visible:ring-emerald-300/70',
        warning:
          'kangur-button-shell kangur-cta-pill border-transparent warning-cta text-[var(--kangur-button-warning-text,#9a5418)] hover:text-[var(--kangur-button-warning-hover-text,#7f4310)] focus-visible:ring-amber-300/70',
        segment: cn(
          'border-transparent shadow-none focus-visible:ring-indigo-300/70',
          KANGUR_SEGMENTED_CONTROL_ITEM_CLASSNAME
        ),
        segmentActive: cn(
          'border-transparent shadow-none focus-visible:ring-indigo-300/70',
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
          'kangur-button-shell border-transparent bg-transparent text-[var(--kangur-button-surface-text,#6e7ee7)] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))] hover:text-[var(--kangur-button-surface-hover-text,#4f63d8)] focus-visible:ring-indigo-300/70',
      },
      size: {
        sm: 'kangur-button-size-sm [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-[3rem]',
        md: 'kangur-button-size-md [@media(pointer:coarse)]:min-h-11',
        lg: 'kangur-button-size-lg [@media(pointer:coarse)]:min-h-12',
        xl: 'kangur-button-size-xl [@media(pointer:coarse)]:min-h-12',
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

export type KangurButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof kangurButtonVariants> &
  DataAttributesDto & {
    asChild?: boolean;
  };

const resolveKangurButtonFallbackLabel = ({
  dataDocAlias,
  dataDocId,
  dataTestId,
}: {
  dataDocAlias?: string;
  dataDocId?: string;
  dataTestId?: string;
}): string | undefined => dataDocAlias || dataDocId || dataTestId;

const resolveKangurButtonTabIndex = ({
  asChild,
  isDisabled,
  tabIndex,
}: {
  asChild: boolean;
  isDisabled: boolean;
  tabIndex?: number;
}): number | undefined => (isDisabled && asChild ? -1 : tabIndex);

const resolveKangurButtonDisabledClassName = ({
  asChild,
  isDisabled,
}: {
  asChild: boolean;
  isDisabled: boolean;
}): string | null =>
  isDisabled && asChild ? 'pointer-events-none cursor-not-allowed opacity-40' : null;

const resolveKangurButtonClickHandler = ({
  isDisabled,
  onClick,
}: {
  isDisabled: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}): React.MouseEventHandler<HTMLElement> | undefined => {
  if (!isDisabled && !onClick) {
    return undefined;
  }

  return (event) => {
    if (isDisabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onClick?.(event as React.MouseEvent<HTMLButtonElement>);
  };
};

const warnMissingKangurButtonLabel = ({
  hasAccessibleLabel,
  hasText,
}: {
  hasAccessibleLabel: boolean;
  hasText: boolean;
}): void => {
  if (!hasAccessibleLabel && !hasText) {
    warnMissingAccessibleLabel({ componentName: 'KangurButton', hasAccessibleLabel });
  }
};

export const KangurButton = React.forwardRef<HTMLButtonElement, KangurButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      onClick,
      tabIndex,
      disabled,
      children,
      title,
      'data-testid': dataTestId,
      'data-doc-id': dataDocId,
      'data-doc-alias': dataDocAlias,
      'aria-label': ariaLabelProp,
      'aria-labelledby': ariaLabelledByProp,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = Boolean(disabled);
    const handleClick = resolveKangurButtonClickHandler({
      isDisabled,
      onClick,
    });
    const resolvedTabIndex = resolveKangurButtonTabIndex({
      asChild,
      isDisabled,
      tabIndex,
    });
    const disabledClassName = resolveKangurButtonDisabledClassName({
      asChild,
      isDisabled,
    });
    const { hasText, ariaLabel: resolvedAriaLabel, hasAccessibleLabel } = resolveAccessibleLabel({
      children,
      ariaLabel: ariaLabelProp,
      ariaLabelledBy: ariaLabelledByProp,
      title,
      fallbackLabel: resolveKangurButtonFallbackLabel({
        dataDocAlias: typeof dataDocAlias === 'string' ? dataDocAlias : undefined,
        dataDocId: typeof dataDocId === 'string' ? dataDocId : undefined,
        dataTestId: typeof dataTestId === 'string' ? dataTestId : undefined,
      }),
    });
    warnMissingKangurButtonLabel({ hasAccessibleLabel, hasText });

    return (
      <Comp
        {...props}
        onClick={handleClick}
        tabIndex={resolvedTabIndex}
        className={cn(kangurButtonVariants({ variant, size, fullWidth, className }), disabledClassName)}
        disabled={isDisabled}
        aria-disabled={isDisabled ? 'true' : undefined}
        aria-label={resolvedAriaLabel}
        aria-labelledby={ariaLabelledByProp}
        title={title}
        data-testid={dataTestId}
        data-doc-id={dataDocId}
        data-doc-alias={dataDocAlias}
        ref={ref}
      >
        {children}
      </Comp>
    );
  }
);
KangurButton.displayName = 'KangurButton';
