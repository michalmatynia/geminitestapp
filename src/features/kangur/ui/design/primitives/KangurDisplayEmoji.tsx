import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

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
  VariantProps<typeof kangurDisplayEmojiVariants>;

export function KangurDisplayEmoji({
  className,
  size,
  ...props
}: KangurDisplayEmojiProps): React.JSX.Element {
  return <span className={cn(kangurDisplayEmojiVariants({ size }), className)} {...props} />;
}
