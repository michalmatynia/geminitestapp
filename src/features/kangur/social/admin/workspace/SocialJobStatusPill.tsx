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
      return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
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

export type SocialJobStatusPillConfig = {
  label?: string;
  title?: string;
  className?: string;
};

export function SocialJobStatusPill({
  status,
  config = {},
}: {
  status: SocialJobStatusValue;
  config?: SocialJobStatusPillConfig;
}): React.JSX.Element | null {
  const { label, title, className } = config;
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
