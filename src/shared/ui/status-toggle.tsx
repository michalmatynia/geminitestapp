'use client';

import React from 'react';

import { cn } from '@/shared/utils';
import { Badge } from './badge';

export interface StatusToggleProps {
  enabled: boolean;
  onToggle: (next: boolean) => void;
  enabledLabel?: string;
  disabledLabel?: string;
  enabledVariant?: 'emerald' | 'cyan' | 'blue';
  disabledVariant?: 'red' | 'slate' | 'gray';
  size?: 'sm' | 'default';
  disabled?: boolean;
  className?: string;
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
  const getBadgeVariant = () => {
    if (enabled) {
      switch (enabledVariant) {
        case 'cyan': return 'cyan';
        case 'blue': return 'processing';
        default: return 'active';
      }
    } else {
      switch (disabledVariant) {
        case 'slate': return 'removed';
        case 'gray': return 'neutral';
        default: return 'failed';
      }
    }
  };

  return (
    <Badge
      variant={getBadgeVariant() as any}
      onClick={disabled ? undefined : () => onToggle(!enabled)}
      className={cn(
        'cursor-pointer select-none font-bold transition-all border',
        size === 'sm' ? 'h-6 px-2 text-[9px]' : 'h-7 px-2.5 text-[10px]',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {enabled ? enabledLabel : disabledLabel}
    </Badge>
  );
}
