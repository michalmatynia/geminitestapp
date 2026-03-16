import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

export const kangurDisplayEmojiVariants = cva('inline-flex items-center justify-center leading-none', {
  variants: {
    size: {
      xs: 'text-3xl',
      sm: 'text-4xl',
      md: 'text-5xl',
      lg: 'text-6xl',
    },
  },
  defaultVariants: {
    size: 'lg',
  },
});

export type KangurDisplayEmojiProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof kangurDisplayEmojiVariants> & {
    decorative?: boolean;
    label?: string;
  };

export function KangurDisplayEmoji({
  className,
  decorative,
  label,
  size,
  'aria-label': ariaLabelProp,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...props
}: KangurDisplayEmojiProps): React.JSX.Element {
  const resolvedLabel = ariaLabelProp ?? label;
  const shouldHide = decorative ?? !(resolvedLabel || ariaLabelledBy || ariaDescribedBy);

  return (
    <span
      className={cn(kangurDisplayEmojiVariants({ size }), className)}
      role={shouldHide ? 'presentation' : 'img'}
      aria-hidden={shouldHide ? 'true' : undefined}
      aria-label={shouldHide ? undefined : resolvedLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      {...props}
    />
  );
}
