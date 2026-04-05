'use client';

import { type VariantProps } from 'class-variance-authority';
import React from 'react';

import type { StatusToggleProps } from '@/shared/contracts/ui/ui/controls';
import { cn } from '@/shared/utils/ui-utils';

import { badgeVariants } from './badge';

export type { StatusToggleProps };

/**
 * StatusToggle - A button that toggles between two states (ON/OFF).
 * Refactored to leverage the shared Badge component for consistent semantic styling.
 */
export function StatusToggle(props: StatusToggleProps): React.JSX.Element {
  const {
    enabled,
    onToggle,
    enabledLabel = 'ON',
    disabledLabel = 'OFF',
    enabledVariant = 'emerald',
    disabledVariant = 'red',
    size = 'default',
    disabled,
    className,
  } = props;

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
    <button
      type='button'
      className={cn(
        badgeVariants({ variant: getBadgeVariant() }),
        'cursor-pointer select-none font-bold transition-all border',
        size === 'sm' ? 'h-6 px-2 text-[9px]' : 'h-7 px-2.5 text-[10px]',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      onClick={disabled ? undefined : () => onToggle(!enabled)}
      disabled={Boolean(disabled)}
      aria-pressed={enabled}
      aria-label={enabled ? enabledLabel : disabledLabel}
    >
      {enabled ? enabledLabel : disabledLabel}
    </button>
  );
}
