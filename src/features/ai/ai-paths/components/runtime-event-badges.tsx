import { StatusBadge } from '@/shared/ui';

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
