'use client';

import * as React from 'react';

import { cn } from '@/shared/utils';

import { Button, type ButtonProps } from './button';

export interface UnifiedButtonProps extends ButtonProps {}

export const UnifiedButton = React.forwardRef<HTMLButtonElement, UnifiedButtonProps>(
  ({ className, ...props }, ref) => (
    <Button
      ref={ref}
      className={cn('text-xs', className)}
      {...props}
    />
  )
);

UnifiedButton.displayName = 'UnifiedButton';
