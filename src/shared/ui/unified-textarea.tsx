'use client';

import * as React from 'react';

import { Textarea, type TextareaProps } from './textarea';

/** @deprecated Use Textarea with size="sm" instead */
export interface UnifiedTextareaProps extends TextareaProps {}

/** @deprecated Use Textarea with size="sm" instead */
export const UnifiedTextarea = React.forwardRef<HTMLTextAreaElement, UnifiedTextareaProps>(
  ({ size = 'sm', ...props }, ref) => (
    <Textarea
      ref={ref}
      size={size}
      {...props}
    />
  )
);

UnifiedTextarea.displayName = 'UnifiedTextarea';
