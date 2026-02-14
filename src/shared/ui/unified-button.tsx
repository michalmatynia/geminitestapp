'use client';

import * as React from 'react';

import { Button, type ButtonProps } from './button';

/** @deprecated Use Button with size="xs" instead */
export interface UnifiedButtonProps extends ButtonProps {}

/** @deprecated Use Button with size="xs" instead */
export const UnifiedButton = React.forwardRef<HTMLButtonElement, UnifiedButtonProps>(
  ({ size = 'xs', ...props }, ref) => (
    <Button
      ref={ref}
      size={size}
      {...props}
    />
  )
);

UnifiedButton.displayName = 'UnifiedButton';
