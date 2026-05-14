'use client';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { ComponentType } from 'react';
import type {
  BrainOperationsDomainKey,
  BrainOperationsMetric,
  BrainOperationsTrend,
} from '@/shared/contracts/ai-brain';

export const TREND_ICON: Record<
  BrainOperationsTrend['direction'],
  ComponentType<{ className?: string }>
> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
  unknown: Minus,
};

export const formatUpdatedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

export const formatFreshness = (value: string): string => {
  const date = new Date(value);
  const now = Date.now();
  if (Number.isNaN(date.getTime())) return 'unknown';
  const deltaMs = Math.max(0, now - date.getTime());
  if (deltaMs < 60_000) return 'just now';
  const deltaMinutes = Math.floor(deltaMs / 60_000);
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
};

export const formatMetricValue = (value: BrainOperationsMetric['value']): string =>
  typeof value === 'number' ? value.toLocaleString() : String(value);

export const normalizeMetricValue = (value: BrainOperationsMetric['value']): string =>
  (typeof value === 'string' ? value : String(value)).trim().toLowerCase();

export const runtimeRiskToneClass = (value: string): string => {
  if (value === 'high') return 'text-red-200 border-red-500/40 bg-red-500/10';
  if (value === 'medium') return 'text-amber-200 border-amber-500/40 bg-amber-500/10';
  if (value === 'low') return 'text-emerald-200 border-emerald-500/40 bg-emerald-500/10';
  return 'text-gray-300 border-border/60 bg-background/40';
};

export const metricCellToneClass = (
  domainKey: BrainOperationsDomainKey,
  metric: BrainOperationsMetric
): string => {
  if (domainKey !== 'ai_paths') return 'border-border/60 bg-background/40';
  
  const normalized = normalizeMetricValue(metric.value);
  if (metric.key === 'runtime_kernel_risk') {
    return runtimeRiskToneClass(normalized);
  }
  
  if (metric.key === 'runtime_audit_age_min') {
    const value = typeof metric.value === 'number' ? metric.value : Number.parseInt(String(metric.value), 10);
    if (value >= 240) return 'border-red-500/40 bg-red-500/10';
    if (value >= 120) return 'border-amber-500/40 bg-amber-500/10';
  }
  
  return 'border-border/60 bg-background/40';
};

const runtimeKernelRiskTone = (normalized: string): string => {
  if (normalized === 'high') return 'text-red-200 font-semibold';
  if (normalized === 'medium') return 'text-amber-200 font-semibold';
  if (normalized === 'low') return 'text-emerald-200 font-semibold';
  return 'text-gray-200';
};

const runtimeAuditAgeTone = (value: BrainOperationsMetric['value']): string => {
  const numValue = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (numValue >= 240) return 'text-red-200 font-semibold';
  if (numValue >= 120) return 'text-amber-200 font-semibold';
  return 'text-gray-200';
};

export const metricValueToneClass = (
  domainKey: BrainOperationsDomainKey,
  metric: BrainOperationsMetric
): string => {
  if (domainKey !== 'ai_paths') return 'text-gray-200';
  
  if (metric.key === 'runtime_kernel_risk') {
    return runtimeKernelRiskTone(normalizeMetricValue(metric.value));
  }
  
  if (metric.key === 'runtime_audit_age_min') {
    return runtimeAuditAgeTone(metric.value);
  }
  
  return 'text-gray-200';
};

export const getMetricValue = (
  domainKey: BrainOperationsDomainKey,
  metrics: BrainOperationsMetric[],
  metricKey: string
): BrainOperationsMetric['value'] | null => {
  if (domainKey !== 'ai_paths') return null;
  const metric = metrics.find((entry) => entry.key === metricKey);
  return metric !== undefined ? metric.value : null;
};

export const parseMetricInteger = (value: BrainOperationsMetric['value'] | null): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const runtimeRiskSummaryToneClass = (current: number, previous: number): string => {
  if (current > previous) return 'text-red-200 border-red-500/40 bg-red-500/10';
  if (current > 0) return 'text-amber-200 border-amber-500/40 bg-amber-500/10';
  return 'text-emerald-200 border-emerald-500/40 bg-emerald-500/10';
};

export const toEventStatusLabel = (status: string): string => {
  if (status.startsWith('runtime_kernel_')) {
    return status
      .replace('runtime_kernel_', 'Runtime Kernel ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return status;
};

export const eventToneClass = (status: string): string => {
  if (status === 'runtime_kernel_high') return 'text-red-200';
  if (status === 'runtime_kernel_medium') return 'text-amber-200';
  if (status === 'runtime_kernel_low') return 'text-emerald-200';
  return 'text-gray-200';
};

export const formatTrendValue = (trend: BrainOperationsTrend): string => {
  if (trend.direction === 'unknown') return 'n/a';
  const signed = trend.delta > 0 ? `+${trend.delta}` : String(trend.delta);
  if (typeof trend.current === 'number' && typeof trend.previous === 'number') {
    return `${signed} (${trend.current}/${trend.previous})`;
  }
  return signed;
};

export const trendToneClass = (trend: BrainOperationsTrend): string => {
  if (trend.direction === 'up') return 'text-amber-300';
  if (trend.direction === 'down') return 'text-emerald-300';
  if (trend.direction === 'flat') return 'text-gray-300';
  return 'text-gray-400';
};
