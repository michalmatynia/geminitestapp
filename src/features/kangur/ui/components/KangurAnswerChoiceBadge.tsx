'use client';

import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

type KangurAnswerChoiceBadgeProps = {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'xs';
};

const KANGUR_ANSWER_CHOICE_BADGE_SIZE_CLASSNAMES = {
  sm: 'h-7 w-7 text-sm',
  xs: 'h-7 w-7 text-xs',
} as const;

export function KangurAnswerChoiceBadge({
  children,
  className,
  size = 'sm',
}: KangurAnswerChoiceBadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-extrabold',
        KANGUR_ANSWER_CHOICE_BADGE_SIZE_CLASSNAMES[size],
        className
      )}
    >
      {children}
    </span>
  );
}
