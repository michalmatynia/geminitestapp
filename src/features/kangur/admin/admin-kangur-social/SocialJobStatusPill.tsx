'use client';

import React from 'react';

import { Badge } from '@/features/kangur/shared/ui';

export type SocialJobStatusValue = string | null | undefined;

const normalizeSocialJobStatus = (status: SocialJobStatusValue): string | null => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return null;
  return normalized;
};

export const getSocialJobStatusLabel = (status: SocialJobStatusValue): string | null => {
  const normalized = normalizeSocialJobStatus(status);
  if (!normalized) return null;

  switch (normalized) {
    case 'waiting':
    case 'queued':
      return 'Queued';
    case 'active':
    case 'running':
      return 'Running';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'delayed':
      return 'Delayed';
    case 'paused':
      return 'Paused';
    case 'idle':
      return 'Idle';
    case 'offline':
      return 'Offline';
    default:
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
};

export const getSocialJobStatusBadgeVariant = (
  status: SocialJobStatusValue
): 'default' | 'secondary' | 'outline' | 'destructive' => {
  const normalized = normalizeSocialJobStatus(status);
  switch (normalized) {
    case 'active':
    case 'running':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
};

export function SocialJobStatusPill({
  status,
  label,
  title,
  className,
}: {
  status: SocialJobStatusValue;
  label?: string;
  title?: string;
  className?: string;
}): React.JSX.Element | null {
  const statusLabel = getSocialJobStatusLabel(status);
  if (!statusLabel) {
    return null;
  }

  return (
    <Badge
      variant={getSocialJobStatusBadgeVariant(status)}
      className={className}
      title={title}
    >
      {label ? `${label}: ${statusLabel}` : statusLabel}
    </Badge>
  );
}
