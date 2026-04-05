import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn, resolveAccessibleLabel, warnMissingAccessibleLabel } from '@/features/kangur/shared/utils';
import type { DataAttributesDto } from '@/shared/contracts/ui/ui/base';

import { KANGUR_ACCENT_STYLES, KANGUR_OPTION_CARD_CLASSNAME, type KangurAccent } from '../tokens';

export const kangurOptionCardButtonVariants = cva(
  `${KANGUR_OPTION_CARD_CLASSNAME} relative touch-manipulation select-none text-left active:scale-[0.995] [@media(pointer:coarse)]:min-h-11 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white`,
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
  VariantProps<typeof kangurOptionCardButtonVariants> &
  DataAttributesDto & {
    accent?: KangurAccent;
  };

const resolveKangurOptionCardCursorClassName = ({
  disabled,
  state,
}: {
  disabled?: boolean;
  state?: KangurOptionCardButtonProps['state'];
}): string | null => {
  if (disabled) {
    return 'cursor-not-allowed';
  }

  return state === 'muted' ? null : 'cursor-pointer';
};

const resolveKangurOptionCardStateClassName = ({
  accent,
  disabled,
  emphasis,
  state,
}: {
  accent: KangurAccent;
  disabled?: boolean;
  emphasis?: KangurOptionCardButtonProps['emphasis'];
  state?: KangurOptionCardButtonProps['state'];
}): string | null => {
  const accentStyles = KANGUR_ACCENT_STYLES[accent];

  if (disabled) {
    return 'cursor-not-allowed [border-color:var(--kangur-text-field-disabled-border)] [background:var(--kangur-text-field-disabled-background)] [color:var(--kangur-page-muted-text)] opacity-70';
  }

  if (state === 'muted') {
    return null;
  }

  return emphasis === 'accent'
    ? cn(accentStyles.activeCard, accentStyles.hoverCard)
    : accentStyles.hoverCard;
};

const resolveKangurOptionCardFallbackLabel = ({
  dataDocAlias,
  dataDocId,
  dataTestId,
}: {
  dataDocAlias?: string;
  dataDocId?: string;
  dataTestId?: string;
}): string | undefined => dataDocAlias || dataDocId || dataTestId;

export const KangurOptionCardButton = React.forwardRef<
  HTMLButtonElement,
  KangurOptionCardButtonProps
>(
  (
    {
      accent = 'slate',
      className,
      disabled,
      emphasis,
      state,
      type,
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
  const cursorClassName = resolveKangurOptionCardCursorClassName({
    disabled,
    state,
  });
  const interactiveClassName = resolveKangurOptionCardStateClassName({
    accent,
    disabled,
    emphasis,
    state,
  });
  const { hasText, ariaLabel: resolvedAriaLabel, hasAccessibleLabel } = resolveAccessibleLabel({
    children,
    ariaLabel: ariaLabelProp,
    ariaLabelledBy: ariaLabelledByProp,
    title,
    fallbackLabel: resolveKangurOptionCardFallbackLabel({
      dataDocAlias: typeof dataDocAlias === 'string' ? dataDocAlias : undefined,
      dataDocId: typeof dataDocId === 'string' ? dataDocId : undefined,
      dataTestId: typeof dataTestId === 'string' ? dataTestId : undefined,
    }),
  });
  if (!hasAccessibleLabel && !hasText) {
    warnMissingAccessibleLabel({ componentName: 'KangurOptionCardButton', hasAccessibleLabel });
  }

  return (
    <button
      ref={ref}
      className={cn(
        kangurOptionCardButtonVariants({ emphasis, state }),
        cursorClassName,
        interactiveClassName,
        className
      )}
      disabled={disabled}
      type={type ?? 'button'}
      aria-label={resolvedAriaLabel}
      aria-labelledby={ariaLabelledByProp}
      title={title}
      data-testid={dataTestId}
      data-doc-id={dataDocId}
      data-doc-alias={dataDocAlias}
      {...props}
    >
      {children}
    </button>
  );
}
);
KangurOptionCardButton.displayName = 'KangurOptionCardButton';
