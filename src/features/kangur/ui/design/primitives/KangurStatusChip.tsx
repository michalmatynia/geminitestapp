import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_ACCENT_STYLES, type KangurAccent } from '../tokens';

export const kangurStatusChipVariants = cva(
  'inline-flex max-w-full items-center justify-center rounded-full border font-semibold tracking-tight text-center whitespace-normal break-words shadow-[0_12px_28px_-24px_rgba(15,23,42,0.32)]',
  {
    variants: {
      size: {
        sm: 'px-2.5 py-1 text-[11px]',
        md: 'px-3 py-1 text-xs',
        lg: 'px-3.5 py-1.5 text-sm',
      },
      labelStyle: {
        default: '',
        compact: 'text-[11px] uppercase tracking-[0.14em]',
        caps: 'text-[11px] uppercase tracking-[0.16em]',
        eyebrow: 'text-[11px] uppercase tracking-[0.18em]',
      },
    },
    defaultVariants: {
      size: 'md',
      labelStyle: 'default',
    },
  }
);

export type KangurStatusChipProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof kangurStatusChipVariants> & {
    accent?: KangurAccent;
  };

export function KangurStatusChip({
  accent = 'slate',
  className,
  labelStyle,
  size,
  ...props
}: KangurStatusChipProps): React.JSX.Element {
  return (
    <span
      className={cn(
        kangurStatusChipVariants({ labelStyle, size }),
        KANGUR_ACCENT_STYLES[accent].badge,
        className
      )}
      {...props}
    />
  );
}
