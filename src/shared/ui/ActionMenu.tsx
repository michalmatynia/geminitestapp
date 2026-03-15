'use client';

import { MoreVertical } from 'lucide-react';
import React, { type ReactNode } from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { Button } from '@/shared/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { cn } from '@/shared/utils';

interface ActionMenuProps {
  children: ReactNode;
  trigger?: ReactNode;
  align?: 'start' | 'end' | 'center';
  className?: string;
  triggerClassName?: string;
  ariaLabel?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs';
  disabled?: boolean;
}

type ActionMenuRuntimeValue = {
  children: ReactNode;
  trigger?: ReactNode;
  align: 'start' | 'end' | 'center';
  className?: string;
  triggerClassName?: string;
  ariaLabel: string;
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size: 'default' | 'sm' | 'lg' | 'icon' | 'xs';
  disabled: boolean;
};

const { Context: ActionMenuRuntimeContext, useStrictContext: useActionMenuRuntime } =
  createStrictContext<ActionMenuRuntimeValue>({
    hookName: 'useActionMenuRuntime',
    providerName: 'ActionMenuRuntimeProvider',
    displayName: 'ActionMenuRuntimeContext',
  });

function ActionMenuContent(): React.JSX.Element {
  const runtime = useActionMenuRuntime();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={runtime.variant}
          size={runtime.size}
          disabled={runtime.disabled}
          className={cn(
            'p-0 text-muted-foreground hover:bg-muted/50 hover:text-white',
            runtime.size === 'icon' && 'h-8 w-8',
            runtime.triggerClassName
          )}
          aria-label={runtime.ariaLabel}
          title={runtime.ariaLabel}>
          {runtime.trigger ?? <MoreVertical className='h-4 w-4' aria-hidden='true' />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={runtime.align} className={runtime.className}>
        {runtime.children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ActionMenu({
  children,
  trigger,
  align = 'end',
  className,
  triggerClassName,
  ariaLabel = 'Open actions menu',
  variant = 'ghost',
  size = 'icon',
  disabled = false,
}: ActionMenuProps): React.JSX.Element {
  const runtimeValue = React.useMemo<ActionMenuRuntimeValue>(
    () => ({
      children,
      trigger,
      align,
      className,
      triggerClassName,
      ariaLabel,
      variant,
      size,
      disabled,
    }),
    [children, trigger, align, className, triggerClassName, ariaLabel, variant, size, disabled]
  );

  return (
    <ActionMenuRuntimeContext.Provider value={runtimeValue}>
      <ActionMenuContent />
    </ActionMenuRuntimeContext.Provider>
  );
}
