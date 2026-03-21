import React from 'react';

import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

type AiPathsPillButtonProps = {
  children: React.ReactNode;
  active?: boolean;
  baseClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
} & Pick<React.ComponentProps<typeof Button>, 'onClick' | 'disabled' | 'type' | 'variant' | 'className'>;

export function AiPathsPillButton({
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
}: AiPathsPillButtonProps): React.JSX.Element {
  return (
    <Button
      type={type}
      variant={variant}
      className={cn(baseClassName, active ? activeClassName : inactiveClassName, className)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
