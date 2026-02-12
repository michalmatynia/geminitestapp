'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';

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
  
  const getEnabledStyles = () => {
    switch (enabledVariant) {
      case 'cyan':
        return 'border-cyan-500/60 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25';
      case 'blue':
        return 'border-blue-500/60 bg-blue-500/15 text-blue-100 hover:bg-blue-500/25';
      default:
        return 'border-emerald-500/60 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25';
    }
  };

  const getDisabledStyles = () => {
    switch (disabledVariant) {
      case 'slate':
        return 'border-slate-500/40 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20';
      case 'gray':
        return 'border-gray-500/40 bg-gray-500/10 text-gray-300 hover:bg-gray-500/20';
      default:
        return 'border-red-500/60 bg-red-500/15 text-red-200 hover:bg-red-500/25';
    }
  };

  return (
    <Button
      type='button'
      onClick={(): void => onToggle(!enabled)}
      disabled={disabled}
      className={cn(
        size === 'sm' ? 'h-7 px-2 text-[10px]' : 'h-8 px-2.5 text-[10px]',
        'rounded border font-semibold tracking-wide transition-colors',
        enabled ? getEnabledStyles() : getDisabledStyles(),
        className
      )}
    >
      {enabled ? enabledLabel : disabledLabel}
    </Button>
  );
}
