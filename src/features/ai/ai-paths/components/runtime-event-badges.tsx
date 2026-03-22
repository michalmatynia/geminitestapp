'use client';

import React from 'react';

import { StatusBadge } from '@/shared/ui';

type RuntimeEventLevelBadgeProps = {
  level: string | null | undefined;
  className?: string;
  hideLabel?: boolean;
};

type RuntimeEventKindBadgeProps = {
  kind: string | null | undefined;
  className?: string;
};

export const getRuntimeEventLevelVariant = (
  level: string | null | undefined
): React.ComponentProps<typeof StatusBadge>['variant'] => {
  const normalizedLevel = level?.toLowerCase();
  if (normalizedLevel === 'error') return 'error';
  if (normalizedLevel === 'warn' || normalizedLevel === 'warning') return 'warning';
  return 'info';
};

export const getRuntimeEventDotVariant = (
  level: string | null | undefined
): React.ComponentProps<typeof StatusBadge>['variant'] => {
  const normalizedLevel = level?.toLowerCase();
  if (normalizedLevel === 'error') return 'error';
  if (normalizedLevel === 'warn' || normalizedLevel === 'warning') return 'warning';
  return 'neutral';
};

export const getRuntimeEventKindLabel = (
  kind: string | null | undefined,
  fallback = 'event'
): string => kind ?? fallback;

export const getRuntimeEventKindVariant = (
  kind: string | null | undefined
): React.ComponentProps<typeof StatusBadge>['variant'] => {
  const label = getRuntimeEventKindLabel(kind);
  if (label.startsWith('run_')) return 'info';
  if (label.startsWith('node_')) return 'success';
  return 'neutral';
};

export function RuntimeEventLevelBadge({
  level,
  className,
  hideLabel = false,
}: RuntimeEventLevelBadgeProps): React.JSX.Element {
  return (
    <StatusBadge
      status={hideLabel ? '' : level ?? 'info'}
      variant={hideLabel ? getRuntimeEventDotVariant(level) : getRuntimeEventLevelVariant(level)}
      size='sm'
      hideLabel={hideLabel}
      className={className}
    />
  );
}

export function RuntimeEventKindBadge({
  kind,
  className,
}: RuntimeEventKindBadgeProps): React.JSX.Element {
  return (
    <StatusBadge
      status={getRuntimeEventKindLabel(kind)}
      variant={getRuntimeEventKindVariant(kind)}
      size='sm'
      className={className}
    />
  );
}
