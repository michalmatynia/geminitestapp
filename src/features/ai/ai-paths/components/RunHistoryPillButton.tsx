import React from 'react';

import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

type RunHistoryPillButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: 'default' | 'outline';
  baseClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
};

export function RunHistoryPillButton({
  children,
  onClick,
  disabled = false,
  active = false,
  variant = 'default',
  baseClassName = 'rounded-md border px-2 py-1 text-[10px]',
  activeClassName = 'border-emerald-500/50 text-emerald-200',
  inactiveClassName = 'text-gray-300 hover:bg-muted/60',
}: RunHistoryPillButtonProps): React.JSX.Element {
  return (
    <Button
      type='button'
      variant={variant}
      className={cn(baseClassName, active ? activeClassName : inactiveClassName)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
