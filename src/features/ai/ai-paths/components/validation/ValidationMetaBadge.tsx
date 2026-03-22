'use client';

import React from 'react';

import { Badge } from '@/shared/ui';
import { cn } from '@/shared/utils';

type ValidationMetaBadgeProps = {
  children: React.ReactNode;
  className?: string;
  uppercase?: boolean;
  variant?: React.ComponentProps<typeof Badge>['variant'];
};

export function ValidationMetaBadge({
  children,
  className,
  uppercase = false,
  variant = 'outline',
}: ValidationMetaBadgeProps): React.JSX.Element {
  return (
    <Badge
      variant={variant}
      className={cn('text-[10px]', uppercase && 'uppercase', className)}
    >
      {children}
    </Badge>
  );
}
