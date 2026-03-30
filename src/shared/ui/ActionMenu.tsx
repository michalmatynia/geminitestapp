import { MoreVertical } from 'lucide-react';
import React, { type ReactNode } from 'react';

import { Button } from '@/shared/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { cn } from '@/shared/utils';

interface ActionMenuProps {
  children: ReactNode;
  trigger?: ReactNode;
  triggerId?: string;
  align?: 'start' | 'end' | 'center';
  className?: string;
  triggerClassName?: string;
  ariaLabel?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs';
  disabled?: boolean;
}

type ActionMenuResolvedProps = {
  children: ReactNode;
  trigger?: ReactNode;
  triggerId?: string;
  align: 'start' | 'end' | 'center';
  className?: string;
  triggerClassName?: string;
  ariaLabel: string;
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size: 'default' | 'sm' | 'lg' | 'icon' | 'xs';
  disabled: boolean;
};

const renderActionMenu = (resolvedProps: ActionMenuResolvedProps): React.JSX.Element => {
  const {
    children,
    trigger,
    triggerId,
    align,
    className,
    triggerClassName,
    ariaLabel,
    variant,
    size,
    disabled,
  } = resolvedProps;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          {...(triggerId ? { id: triggerId } : {})}
          variant={variant}
          size={size}
          disabled={disabled}
          className={cn(
            'p-0 text-muted-foreground hover:bg-muted/50 hover:text-white',
            size === 'icon' && 'h-8 w-8',
            triggerClassName
          )}
          aria-label={ariaLabel}
          title={ariaLabel}
        >
          {trigger ?? <MoreVertical className='h-4 w-4' aria-hidden='true' />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={className}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export function ActionMenu(props: ActionMenuProps): React.JSX.Element {
  const {
    children,
    trigger,
    triggerId,
    align = 'end',
    className,
    triggerClassName,
    ariaLabel = 'Open actions menu',
    variant = 'ghost',
    size = 'icon',
    disabled = false,
  } = props;

  return renderActionMenu({
    children,
    trigger,
    triggerId,
    align,
    className,
    triggerClassName,
    ariaLabel,
    variant,
    size,
    disabled,
  });
}
