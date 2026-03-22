'use client';

import React from 'react';

import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

type ValidationActionButtonProps = Pick<
  React.ComponentProps<typeof Button>,
  'children' | 'className' | 'disabled' | 'loading' | 'onClick' | 'variant'
> & {
  icon?: React.ReactNode;
};

export function ValidationActionButton({
  children,
  className,
  disabled,
  icon,
  loading,
  onClick,
  variant = 'outline',
}: ValidationActionButtonProps): React.JSX.Element {
  return (
    <Button
      type='button'
      variant={variant}
      size='sm'
      className={cn(icon && 'gap-2', className)}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
    >
      {icon}
      {children}
    </Button>
  );
}
