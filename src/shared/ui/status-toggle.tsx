'use client';

import React, { useMemo } from 'react';
import { type VariantProps } from 'class-variance-authority';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { cn } from '@/shared/utils';
import { Badge, badgeVariants } from './badge';

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

type StatusToggleRuntimeValue = {
  variant: VariantProps<typeof badgeVariants>['variant'];
  onClick: (() => void) | undefined;
  className: string;
  label: string;
};

const {
  Context: StatusToggleRuntimeContext,
  useStrictContext: useStatusToggleRuntime,
} = createStrictContext<StatusToggleRuntimeValue>({
  hookName: 'useStatusToggleRuntime',
  providerName: 'StatusToggleRuntimeProvider',
  displayName: 'StatusToggleRuntimeContext',
});

function StatusToggleBadge(): React.JSX.Element {
  const runtime = useStatusToggleRuntime();
  return (
    <Badge variant={runtime.variant} onClick={runtime.onClick} className={runtime.className}>
      {runtime.label}
    </Badge>
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
        disabled && 'opacity-50 pointer-events-none',
        className
      ),
      label: enabled ? enabledLabel : disabledLabel,
    }),
    [className, disabled, enabled, enabledLabel, disabledLabel, onToggle, size]
  );

  return (
    <StatusToggleRuntimeContext.Provider value={runtimeValue}>
      <StatusToggleBadge />
    </StatusToggleRuntimeContext.Provider>
  );
}
