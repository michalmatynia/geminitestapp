'use client';

import { Loader2 } from 'lucide-react';
import React from 'react';

import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/utils';

type ValidationActionButtonProps = Pick<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'className' | 'disabled' | 'onClick'
> & {
  icon?: React.ReactNode;
  loading?: boolean;
  variant?:
    | 'default'
    | 'primary'
    | 'solid'
    | 'solid-destructive'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'info'
    | 'ghost'
    | 'link';
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
    <button
      type='button'
      className={cn(
        buttonVariants({ variant, size: 'sm' }),
        (icon || loading) && 'gap-2',
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      {loading ? <Loader2 className='size-4 animate-spin' aria-hidden='true' /> : icon}
      {children}
    </button>
  );
}
