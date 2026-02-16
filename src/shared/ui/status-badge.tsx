import React, { ReactNode } from 'react';

import { cn } from '@/shared/utils';

import { Badge } from './badge';

export type StatusVariant = 'pending' | 'active' | 'failed' | 'removed' | 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'processing';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  hideLabel?: boolean;
  className?: string;
  title?: string;
  onClick?: () => void;
}

// Map common statuses to variants
const statusToVariant = (status: string): StatusVariant => {
  const s = status.toLowerCase();
  if (s === 'pending' || s === 'queued') return 'pending';
  if (s === 'active' || s === 'success' || s === 'completed' || s === 'listed') return 'active';
  if (s === 'failed' || s === 'error') return 'failed';
  if (s === 'removed' || s === 'archived' || s === 'deleted') return 'removed';
  if (s === 'processing' || s === 'in_progress') return 'processing';
  if (s === 'not_started' || s === 'not started') return 'neutral';
  return 'neutral';
};

export function StatusBadge({
  status,
  variant,
  size = 'md',
  icon,
  hideLabel,
  className,
  title,
  onClick,
}: StatusBadgeProps): React.JSX.Element {
  const resolvedVariant = variant || statusToVariant(status);
  const label = status.trim();
  
  return (
    <Badge
      variant={resolvedVariant}
      className={cn(
        'gap-1 uppercase tracking-wider',
        size === 'sm' ? 'text-[9px] px-1 py-0 h-4' : 'text-[10px] px-2 py-0.5 h-5',
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      title={title}
      onClick={onClick}
    >
      {icon && <span className={cn('flex-shrink-0', size === 'sm' ? 'size-2.5' : 'size-3')}>{icon}</span>}
      {!hideLabel && label ? <span>{label}</span> : null}
    </Badge>
  );
}
