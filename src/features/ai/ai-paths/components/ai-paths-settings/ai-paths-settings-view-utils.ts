import type { PathMeta } from '@/shared/contracts/ai-paths';
import type { StatusVariant } from '@/shared/ui';

export const EXECUTION_OPTIONS = [
  { value: 'server', label: 'Run on Server' },
  { value: 'local', label: 'Run Locally' },
] as const;

export const FLOW_OPTIONS = [
  { value: 'off', label: 'Flow: Off' },
  { value: 'low', label: 'Flow: Low' },
  { value: 'medium', label: 'Flow: Medium' },
  { value: 'high', label: 'Flow: High' },
] as const;

export const RUN_MODE_OPTIONS = [
  { value: 'manual', label: 'Run: Manual' },
  { value: 'automatic', label: 'Run: Automatic' },
  { value: 'step', label: 'Run: Step' },
] as const;

const isTemplatePathName = (name: string): boolean =>
  /^new path\b/i.test(name) || /^e2e test path\b/i.test(name);

const isGenericPathName = (name: string): boolean =>
  /^new path\b/i.test(name) || /^path\b/i.test(name);

export const formatDurationMs = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  if (value < 1000) return `${Math.round(value)}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

export const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

export const formatStatusLabel = (status: string): string =>
  status === 'waiting_callback'
    ? 'Waiting'
    : status === 'advance_pending'
      ? 'Processing'
      : status
        .split('_')
        .map((part: string) => (part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part))
        .join(' ');

export const statusToVariant = (status: string): StatusVariant => {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'cached' || s === 'success') return 'success';
  if (s === 'failed' || s === 'canceled' || s === 'timeout' || s === 'error') {
    return 'error';
  }
  if (s === 'queued' || s === 'pending') return 'warning';
  if (
    s === 'running' ||
    s === 'polling' ||
    s === 'waiting_callback' ||
    s === 'advance_pending' ||
    s === 'paused' ||
    s === 'processing'
  ) {
    return 'processing';
  }
  return 'neutral';
};

export const sortPathMetas = (paths: PathMeta[]): PathMeta[] =>
  [...paths].sort((a: PathMeta, b: PathMeta): number => {
    const templateA = isTemplatePathName(a.name);
    const templateB = isTemplatePathName(b.name);
    if (templateA !== templateB) {
      return templateA ? 1 : -1;
    }
    if (a.updatedAt !== b.updatedAt) {
      return b.updatedAt.localeCompare(a.updatedAt);
    }
    return a.name.localeCompare(b.name);
  });

export const buildSwitchPathOptions = (
  sortedPaths: PathMeta[]
): Array<{ value: string; label: string }> => {
  const nameCounts = sortedPaths.reduce<Map<string, number>>((acc, path: PathMeta) => {
    acc.set(path.name, (acc.get(path.name) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());

  return sortedPaths.map((path: PathMeta) => {
    const isDuplicateName = (nameCounts.get(path.name) ?? 0) > 1;
    const suffix = isDuplicateName || isGenericPathName(path.name) ? ` · ${path.id.slice(-6)}` : '';
    return {
      value: path.id,
      label: `${path.name}${suffix}`,
    };
  });
};

export const buildHistoryRetentionOptions = (
  historyRetentionPasses: number,
  historyRetentionOptionsMax: number
): Array<{ value: string; label: string }> => {
  const optionCount = Math.max(historyRetentionPasses, historyRetentionOptionsMax);
  return Array.from({ length: optionCount }, (_value, index) => {
    const passes = index + 1;
    return {
      value: String(passes),
      label: `${passes} pass${passes === 1 ? '' : 'es'}`,
    };
  });
};
