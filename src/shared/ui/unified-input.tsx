'use client';

import * as React from 'react';

import { Input, type InputProps } from './input';

/** @deprecated Use Input with size="sm" instead */
export interface UnifiedInputProps extends InputProps {}

/** @deprecated Use Input with size="sm" instead */
export const UnifiedInput = React.forwardRef<HTMLInputElement, UnifiedInputProps>(
  ({ size = 'sm', ...props }, ref) => (
    <Input
      ref={ref}
      size={size}
      {...props}
    />
  )
);

UnifiedInput.displayName = 'UnifiedInput';
