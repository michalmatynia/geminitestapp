import React from 'react';

import { Badge } from '@/shared/ui';

export type SocialJobStatusValue = string | null | undefined;

const STATUS_LABEL_BY_KEY: Record<string, string> = {
  active: 'Running',
  completed: 'Completed',
  delayed: 'Delayed',
  failed: 'Failed',
  idle: 'Idle',
  offline: 'Offline',
  paused: 'Paused',
  queued: 'Queued',
  running: 'Running',
  waiting: 'Queued',
};

const normalizeSocialJobStatus = (status: SocialJobStatusValue): string | null => {
  const normalized = status?.trim().toLowerCase();
  if ((normalized?.length ?? 0) === 0) return null;
  return normalized;
};

export const getSocialJobStatusLabel = (status: SocialJobStatusValue): string | null => {
  const normalized = normalizeSocialJobStatus(status);
  if (normalized === null) return null;

  return STATUS_LABEL_BY_KEY[normalized] ?? toTitleCase(normalized);
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

const toTitleCase = (value: string): string =>
  value.replace(/\b\w/g, (match) => match.toUpperCase());

const pickConfigValue = (
  explicitValue: string | undefined,
  configValue: string | undefined
): string => {
  if (explicitValue !== undefined) return explicitValue;
  return configValue ?? '';
};

const resolvePillConfig = ({
  className,
  config,
  label,
  title,
}: {
  className?: string;
  config?: SocialJobStatusPillConfig;
  label?: string;
  title?: string;
}): Required<SocialJobStatusPillConfig> => ({
  className: pickConfigValue(className, config?.className),
  label: pickConfigValue(label, config?.label),
  title: pickConfigValue(title, config?.title),
});

export function SocialJobStatusPill({
  status,
  label,
  title,
  className,
  config,
}: {
  status: SocialJobStatusValue;
  label?: string;
  title?: string;
  className?: string;
  config?: SocialJobStatusPillConfig;
}): React.JSX.Element | null {
  const statusLabel = getSocialJobStatusLabel(status);
  if (statusLabel === null) {
    return null;
  }

  const resolvedConfig = resolvePillConfig({ className, config, label, title });

  return (
    <Badge
      variant={getSocialJobStatusBadgeVariant(status)}
      className={resolvedConfig.className}
      title={resolvedConfig.title}
    >
      {formatPillLabel(resolvedConfig.label, statusLabel)}
    </Badge>
  );
}

const formatPillLabel = (label: string, statusLabel: string): string =>
  label.length > 0 ? `${label}: ${statusLabel}` : statusLabel;
