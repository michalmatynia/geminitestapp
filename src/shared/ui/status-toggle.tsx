'use client';

import { type VariantProps } from 'class-variance-authority';
import React, { useMemo } from 'react';

import type { StatusToggleProps } from '@/shared/contracts/ui';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { cn } from '@/shared/utils';

import { badgeVariants } from './badge';

export type { StatusToggleProps };

type StatusToggleRuntimeValue = {
  variant: VariantProps<typeof badgeVariants>['variant'];
  onClick: (() => void) | undefined;
  className: string;
  label: string;
  disabled: boolean;
  pressed: boolean;
};

const { Context: StatusToggleRuntimeContext, useStrictContext: useStatusToggleRuntime } =
  createStrictContext<StatusToggleRuntimeValue>({
    hookName: 'useStatusToggleRuntime',
    providerName: 'StatusToggleRuntimeProvider',
    displayName: 'StatusToggleRuntimeContext',
  });

function StatusToggleBadge(): React.JSX.Element {
  const runtime = useStatusToggleRuntime();
  return (
    <button
      type='button'
      className={cn(badgeVariants({ variant: runtime.variant }), runtime.className)}
      onClick={runtime.onClick}
      disabled={runtime.disabled}
      aria-pressed={runtime.pressed}
      aria-label={runtime.label}
    >
      {runtime.label}
    </button>
  );
}

/**
 * StatusToggle - A button that toggles between two states (ON/OFF).
 * Refactored to leverage the shared Badge component for consistent semantic styling.
 */
export function StatusToggle({
  enabled,
  onToggle,
  enabledLabel = 'ON',
  disabledLabel = 'OFF',
  enabledVariant = 'emerald',
  disabledVariant = 'red',
  size = 'default',
  disabled,
  className,
}: StatusToggleProps): React.JSX.Element {
  // Map StatusToggle variants to Badge variants
  const getBadgeVariant = (): VariantProps<typeof badgeVariants>['variant'] => {
    if (enabled) {
      switch (enabledVariant) {
        case 'cyan':
          return 'cyan';
        case 'blue':
          return 'processing';
        default:
          return 'active';
      }
    } else {
      switch (disabledVariant) {
        case 'slate':
          return 'removed';
        case 'gray':
          return 'neutral';
        default:
          return 'failed';
      }
    }
  };

  const runtimeValue = useMemo<StatusToggleRuntimeValue>(
    () => ({
      variant: getBadgeVariant(),
      onClick: disabled ? undefined : () => onToggle(!enabled),
      className: cn(
        'cursor-pointer select-none font-bold transition-all border',
        size === 'sm' ? 'h-6 px-2 text-[9px]' : 'h-7 px-2.5 text-[10px]',
        disabled && 'cursor-not-allowed opacity-50',
        className
      ),
      label: enabled ? enabledLabel : disabledLabel,
      disabled: Boolean(disabled),
      pressed: enabled,
    }),
    [className, disabled, enabled, enabledLabel, disabledLabel, onToggle, size]
  );

  return (
    <StatusToggleRuntimeContext.Provider value={runtimeValue}>
      <StatusToggleBadge />
    </StatusToggleRuntimeContext.Provider>
  );
}
