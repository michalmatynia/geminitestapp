import React from 'react';

import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/utils/ui-utils';

type AiPathsPillButtonProps = {
  children: React.ReactNode;
  active?: boolean;
  baseClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
} & Pick<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'disabled' | 'type' | 'className'
> & {
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

export function AiPathsPillButton(props: AiPathsPillButtonProps): React.JSX.Element {
  const {
    children,
    onClick,
    disabled = false,
    type = 'button',
    variant = 'default',
    className,
    active = false,
    baseClassName = 'rounded-md border px-2 py-1 text-[10px]',
    activeClassName = 'border-emerald-500/50 text-emerald-200',
    inactiveClassName = 'text-gray-300 hover:bg-muted/60',
  } = props;

  return (
    <button
      type={type}
      className={cn(
        buttonVariants({ variant, size: 'xs' }),
        baseClassName,
        active ? activeClassName : inactiveClassName,
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
