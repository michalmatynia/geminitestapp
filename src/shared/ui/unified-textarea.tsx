'use client';

import * as React from 'react';

import { cn } from '@/shared/utils';

import { Textarea, type TextareaProps } from './textarea';

export interface UnifiedTextareaProps extends TextareaProps {}

export const UnifiedTextarea = React.forwardRef<HTMLTextAreaElement, UnifiedTextareaProps>(
  ({ className, ...props }, ref) => (
    <Textarea
      ref={ref}
      className={cn('text-xs', className)}
      {...props}
    />
  )
);

UnifiedTextarea.displayName = 'UnifiedTextarea';
