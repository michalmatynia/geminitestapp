'use client';

import React from 'react';
import { Card } from '@/shared/ui/primitives.public';
import { MetadataItem } from '@/shared/ui/navigation-and-layout.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import type { AiInsightRecord } from '@/shared/contracts/ai-insights';

export const formatNumber = (value: number | undefined): string =>
  Number.isFinite(value) ? Number(value).toLocaleString() : '—';

export const formatDate = (value: string | Date | null | undefined): string => {
  if (value === null || value === undefined || value === '') return 'never';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'never';
  return date.toLocaleString();
};

export const formatDurationMs = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value < 1000) return `${Math.round(value)}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

export const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0%';
  return `${value.toFixed(1)}%`;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

export const getRuntimeKernelRisk = (metadata: unknown): string => {
  const record = asRecord(metadata);
  const raw = record?.['runtimeKernelParityRiskLevel'];
  if (typeof raw !== 'string') return '—';
  const normalized = raw.trim().toLowerCase();
  if (normalized.length === 0) return '—';
  return normalized.toUpperCase();
};

export function InsightCard({
  title,
  titleColor,
  insight,
  emptyText,
  includeRisk = false,
}: {
  title: string;
  titleColor: string;
  insight: AiInsightRecord | undefined;
  emptyText: string;
  includeRisk?: boolean;
}): React.JSX.Element {
  if (!insight) {
    return (
      <Card variant='subtle-compact' padding='md' className='bg-card/30 border-border/40'>
        <div className='flex items-center justify-between'>
          <span className={`text-[11px] font-medium ${titleColor} uppercase`}>
            {title}
          </span>
          <StatusBadge status='none' label='never' />
        </div>
        <div className='mt-3 space-y-2'>
          <MetadataItem label='Generated' value='—' />
          <div className='text-[11px] text-gray-400 line-clamp-2 mt-1'>
            {emptyText}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant='subtle-compact' padding='md' className='bg-card/30 border-border/40'>
      <div className='flex items-center justify-between'>
        <span className={`text-[11px] font-medium ${titleColor} uppercase`}>
          {title}
        </span>
        <StatusBadge status={insight.status} label={insight.status} />
      </div>
      <div className='mt-3 space-y-2'>
        <MetadataItem
          label='Generated'
          value={formatDate(insight.createdAt)}
        />
        {includeRisk && (
          <MetadataItem
            label='Kernel parity risk'
            value={getRuntimeKernelRisk(insight.metadata)}
          />
        )}
        <div className='text-[11px] text-gray-400 line-clamp-2 mt-1'>
          {insight.summary}
        </div>
      </div>
    </Card>
  );
}
