import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_ACCENT_STYLES, type KangurAccent } from '../tokens';

export const kangurIconBadgeVariants = cva(
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

export type KangurIconBadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof kangurIconBadgeVariants> & {
    accent?: KangurAccent;
    decorative?: boolean;
    label?: string;
  };

const resolveKangurIconBadgeAccessibilityProps = ({
  ariaDescribedBy,
  ariaLabel,
  ariaLabelledBy,
  decorative,
}: {
  ariaDescribedBy?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  decorative?: boolean;
}): {
  ariaDescribedBy?: string;
  ariaHidden?: 'true';
  ariaLabel?: string;
  ariaLabelledBy?: string;
  role: 'img' | 'presentation';
} => {
  const shouldHide = decorative ?? !(ariaLabel || ariaLabelledBy || ariaDescribedBy);

  if (shouldHide) {
    return {
      ariaDescribedBy,
      ariaHidden: 'true',
      ariaLabelledBy,
      role: 'presentation',
    };
  }

  return {
    ariaDescribedBy,
    ariaLabel,
    ariaLabelledBy,
    role: 'img',
  };
};

export function KangurIconBadge(props: KangurIconBadgeProps): React.JSX.Element {
  const {
    accent = 'slate',
    className,
    decorative,
    label,
    size,
    'aria-label': ariaLabelProp,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    ...restProps
  } = props;
  const resolvedLabel = ariaLabelProp ?? label;
  const accessibilityProps = resolveKangurIconBadgeAccessibilityProps({
    ariaDescribedBy,
    ariaLabel: resolvedLabel,
    ariaLabelledBy,
    decorative,
  });

  return (
    <span
      className={cn(
        kangurIconBadgeVariants({ size }),
        KANGUR_ACCENT_STYLES[accent].icon,
        className
      )}
      role={accessibilityProps.role}
      aria-hidden={accessibilityProps.ariaHidden}
      aria-label={accessibilityProps.ariaLabel}
      aria-labelledby={accessibilityProps.ariaLabelledBy}
      aria-describedby={accessibilityProps.ariaDescribedBy}
      {...restProps}
    />
  );
}
