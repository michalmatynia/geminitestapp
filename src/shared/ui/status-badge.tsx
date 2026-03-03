import React, { ReactNode } from 'react';

import { cn } from '@/shared/utils';
import { Badge } from './badge';

export type StatusVariant =
  | 'pending'
  | 'active'
  | 'failed'
  | 'removed'
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'processing';

interface StatusBadgeProps {
  status: string;
  label?: string;
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
  if (
    s === 'pending' ||
    s === 'queued' ||
    s === 'waiting' ||
    s === 'not tested' ||
    s === 'not_tested' ||
    s === 'not connected' ||
    s === 'not_connected' ||
    s === 'disconnected'
  )
    return 'pending';
  if (
    s === 'active' ||
    s === 'success' ||
    s === 'completed' ||
    s === 'listed' ||
    s === 'healthy' ||
    s === 'connected' ||
    s === 'ok'
  )
    return 'active';
  if (s === 'failed' || s === 'error' || s === 'critical' || s === 'canceled') return 'error';
  if (s === 'removed' || s === 'archived' || s === 'deleted') return 'removed';
  if (s === 'processing' || s === 'in_progress' || s === 'running' || s === 'stepping')
    return 'processing';
  if (s === 'info') return 'info';
  if (s === 'warning') return 'warning';
  return 'neutral';
};

/**
 * StatusBadge - A specialized badge for displaying operational statuses.
 * Provides automatic mapping from status strings to visual variants.
 * Leverages the shared Badge component for consistent design.
 */
export function StatusBadge({
  status,
  label,
  variant,
  size = 'md',
  icon,
  hideLabel,
  className,
  title,
  onClick,
}: StatusBadgeProps): React.JSX.Element {
  const resolvedVariant = variant || statusToVariant(status);
  const displayLabel = (label || status).trim();

  return (
    <Badge
      variant={resolvedVariant as any}
      className={cn(
        'gap-1 uppercase tracking-wider',
        size === 'sm' ? 'text-[9px] px-1 py-0 h-4' : 'text-[10px] px-2 py-0.5 h-5',
        className
      )}
      title={title}
      onClick={onClick}
      icon={icon}
    >
      {!hideLabel && displayLabel ? <span>{displayLabel}</span> : null}
    </Badge>
  );
}
