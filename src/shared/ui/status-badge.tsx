'use client';

import { type VariantProps } from 'class-variance-authority';
import React, { type ReactNode } from 'react';

import type { StatusVariant } from '@/shared/contracts/ui/base';

import { cn } from '@/shared/utils/ui-utils';

import { Badge, type badgeVariants } from './badge';

export type { StatusVariant };

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

const normalizeStatusLabel = (status: unknown): string => {
  if (typeof status === 'string') return status;
  if (
    typeof status === 'number' ||
    typeof status === 'boolean' ||
    typeof status === 'bigint'
  ) {
    return String(status);
  }
  return 'Unknown';
};

const STATUS_VARIANT_ENTRIES: Array<{
  statuses: readonly string[];
  variant: StatusVariant;
}> = [
  {
    statuses: [
      'pending',
      'queued',
      'waiting',
      'not tested',
      'not_tested',
      'not connected',
      'not_connected',
      'disconnected',
    ],
    variant: 'pending',
  },
  {
    statuses: ['active', 'success', 'completed', 'listed', 'healthy', 'connected', 'ok'],
    variant: 'active',
  },
  {
    statuses: ['failed', 'error', 'critical', 'canceled'],
    variant: 'error',
  },
  {
    statuses: ['removed', 'archived', 'deleted', 'ended', 'unsold', 'closed'],
    variant: 'removed',
  },
  {
    statuses: ['processing', 'in_progress', 'running', 'stepping'],
    variant: 'processing',
  },
  {
    statuses: ['info'],
    variant: 'info',
  },
  {
    statuses: ['warning'],
    variant: 'warning',
  },
];

const STATUS_VARIANT_LOOKUP = new Map<string, StatusVariant>(
  STATUS_VARIANT_ENTRIES.flatMap(({ statuses, variant }) =>
    statuses.map((status) => [status, variant] as const)
  )
);

// Map common statuses to variants
export const resolveStatusBadgeVariant = (status: string | null | undefined): StatusVariant => {
  if (typeof status !== 'string') return 'neutral';
  return STATUS_VARIANT_LOOKUP.get(status.toLowerCase()) ?? 'neutral';
};

/**
 * StatusBadge - A specialized badge for displaying operational statuses.
 * Provides automatic mapping from status strings to visual variants.
 * Leverages the shared Badge component for consistent design.
 */
export function StatusBadge(props: StatusBadgeProps): React.JSX.Element {
  const { status, label, variant, size = 'md', icon, hideLabel, className, title, onClick } = props;
  const normalizedStatus = normalizeStatusLabel(status as unknown);

  const resolvedVariant: VariantProps<typeof badgeVariants>['variant'] =
    variant ?? resolveStatusBadgeVariant(normalizedStatus);
  const displayLabel = (label ?? normalizedStatus).trim();
  const shouldRenderLabel = hideLabel !== true && displayLabel !== '';

  return (
    <Badge
      variant={resolvedVariant}
      className={cn(
        'gap-1 uppercase tracking-wider',
        size === 'sm' ? 'text-[9px] px-1 py-0 h-4' : 'text-[10px] px-2 py-0.5 h-5',
        className
      )}
      title={title}
      onClick={onClick}
      icon={icon}
    >
      {shouldRenderLabel ? <span>{displayLabel}</span> : null}
    </Badge>
  );
}
