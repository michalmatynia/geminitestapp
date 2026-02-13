'use client';

import * as React from 'react';

import { cn } from '@/shared/utils';

import { Input, type InputProps } from './input';

export interface UnifiedInputProps extends InputProps {}

export const UnifiedInput = React.forwardRef<HTMLInputElement, UnifiedInputProps>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      className={cn('h-8 text-xs', className)}
      {...props}
    />
  )
);

UnifiedInput.displayName = 'UnifiedInput';
