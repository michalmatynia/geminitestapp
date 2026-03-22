'use client';

import { type VariantProps } from 'class-variance-authority';
import React from 'react';

import type { StatusToggleProps } from '@/shared/contracts/ui';
import { cn } from '@/shared/utils';

import { badgeVariants } from './badge';

export type { StatusToggleProps };

type StatusToggleBadgeProps = {
  variant: VariantProps<typeof badgeVariants>['variant'];
  onClick: (() => void) | undefined;
  className: string;
  label: string;
  disabled: boolean;
  pressed: boolean;
};

function StatusToggleBadge({
  variant,
  onClick,
  className,
  label,
  disabled,
  pressed,
}: StatusToggleBadgeProps): React.JSX.Element {
  return (
    <button
      type='button'
      className={cn(badgeVariants({ variant }), className)}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
    >
      {label}
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

  return (
    <StatusToggleBadge
      variant={getBadgeVariant()}
      onClick={disabled ? undefined : () => onToggle(!enabled)}
      className={cn(
        'cursor-pointer select-none font-bold transition-all border',
        size === 'sm' ? 'h-6 px-2 text-[9px]' : 'h-7 px-2.5 text-[10px]',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      label={enabled ? enabledLabel : disabledLabel}
      disabled={Boolean(disabled)}
      pressed={enabled}
    />
  );
}
