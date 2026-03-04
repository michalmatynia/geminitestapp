'use client';

import {
  Bot,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GitBranch,
  Image as ImageIcon,
  Minus,
  TrendingDown,
  TrendingUp,
  WandSparkles,
} from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import type { ComponentType } from 'react';

import type {
  BrainOperationsDomainKey,
  BrainOperationsMetric,
  BrainOperationsRange,
  BrainOperationsTrend,
} from '@/shared/contracts/ai-brain';
import { Card, EmptyState, SectionHeader, SelectSimple, StatusBadge } from '@/shared/ui';

import { useBrain } from '../context/BrainContext';

const DOMAIN_ORDER: BrainOperationsDomainKey[] = [
  'ai_paths',
  'chatbot',
  'agent_runtime',
  'image_studio',
];

const DOMAIN_ICONS: Record<BrainOperationsDomainKey, ComponentType<{ className?: string }>> = {
  ai_paths: GitBranch,
  chatbot: Bot,
  agent_runtime: WandSparkles,
  image_studio: ImageIcon,
};

const RANGE_OPTIONS: Array<{ value: BrainOperationsRange; label: string; description: string }> = [
  { value: '15m', label: 'Last 15m', description: 'Short incident window' },
  { value: '1h', label: 'Last 1h', description: 'Fast operational drift' },
  { value: '6h', label: 'Last 6h', description: 'Shift-level trend' },
  { value: '24h', label: 'Last 24h', description: 'Daily baseline' },
];

const TREND_ICON: Record<
  BrainOperationsTrend['direction'],
  ComponentType<{ className?: string }>
> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
  unknown: Minus,
};

const formatUpdatedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

const formatFreshness = (value: string): string => {
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

const formatMetricValue = (value: BrainOperationsMetric['value']): string =>
  typeof value === 'number' ? value.toLocaleString() : String(value);

const formatTrendValue = (trend: BrainOperationsTrend): string => {
  if (trend.direction === 'unknown') return 'n/a';
  const signed = trend.delta > 0 ? `+${trend.delta}` : String(trend.delta);
  if (typeof trend.current === 'number' && typeof trend.previous === 'number') {
    return `${signed} (${trend.current}/${trend.previous})`;
  }
  return signed;
};

const trendToneClass = (trend: BrainOperationsTrend): string => {
  if (trend.direction === 'up') return 'text-amber-300';
  if (trend.direction === 'down') return 'text-emerald-300';
  if (trend.direction === 'flat') return 'text-gray-300';
  return 'text-gray-400';
};

export function OperationsTab(): React.JSX.Element {
  const { operationsRange, setOperationsRange, operationsOverviewQuery } = useBrain();
  const data = operationsOverviewQuery.data;
  const [expandedDomain, setExpandedDomain] = React.useState<BrainOperationsDomainKey | null>(null);

  const selectedRangeLabel =
    RANGE_OPTIONS.find((option) => option.value === operationsRange)?.label ?? operationsRange;

  return (
    <div className='space-y-4'>
      <SectionHeader
        title='Operations'
        description='Read-only AI operations overview across core runtime domains.'
        actions={
          <div className='w-40'>
            <SelectSimple
              size='sm'
              value={operationsRange}
              onValueChange={(value: string): void =>
                setOperationsRange(value as BrainOperationsRange)
              }
              options={RANGE_OPTIONS}
              ariaLabel='Operations range'
            />
          </div>
        }
      />

      {operationsOverviewQuery.isLoading && !data ? (
        <Card variant='subtle' padding='md' className='border-border/60 bg-card/35'>
          <div className='text-xs text-gray-400'>Loading operations overview...</div>
        </Card>
      ) : null}

      {!operationsOverviewQuery.isLoading && !data ? (
        <EmptyState
          title='Operations data unavailable'
          description={
            operationsOverviewQuery.error instanceof Error
              ? operationsOverviewQuery.error.message
              : 'Failed to load Brain operations overview.'
          }
          variant='compact'
        />
      ) : null}

      {data ? (
        <div className='space-y-4'>
          <div className='text-[11px] text-gray-500'>
            Snapshot: {formatUpdatedAt(data.generatedAt)} ({formatFreshness(data.generatedAt)}) ·
            Range: {selectedRangeLabel}
          </div>

          <div className='grid gap-4 lg:grid-cols-2'>
            {DOMAIN_ORDER.map((key: BrainOperationsDomainKey) => {
              const domain = data.domains[key];
              const Icon = DOMAIN_ICONS[key];
              const trend = domain.trend;
              const TrendIcon = trend ? TREND_ICON[trend.direction] : Minus;
              const isExpanded = expandedDomain === key;

              return (
                <Card
                  key={key}
                  variant='subtle'
                  padding='md'
                  className='border-border/60 bg-card/35 space-y-3'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <Icon className='size-4 text-emerald-300' />
                        <div className='text-sm font-semibold text-white'>{domain.label}</div>
                      </div>
                      <div className='text-[11px] text-gray-500'>
                        Updated {formatFreshness(domain.updatedAt)} · sample {domain.sampleSize}
                      </div>
                    </div>
                    <StatusBadge
                      status={domain.state}
                      label={domain.state.toUpperCase()}
                      size='sm'
                      className='font-bold'
                    />
                  </div>

                  {domain.message ? (
                    <div className='text-xs text-gray-300'>{domain.message}</div>
                  ) : null}

                  {trend ? (
                    <div className='flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-2 py-1.5 text-[11px]'>
                      <div className='text-gray-400'>{trend.label}</div>
                      <div className={`inline-flex items-center gap-1 ${trendToneClass(trend)}`}>
                        <TrendIcon className='size-3' />
                        {formatTrendValue(trend)}
                      </div>
                    </div>
                  ) : null}

                  <div className='grid grid-cols-2 gap-2'>
                    {domain.metrics.map((metric: BrainOperationsMetric) => (
                      <div
                        key={`${key}:${metric.key}`}
                        className='rounded-md border border-border/60 bg-background/40 px-2 py-1.5'
                      >
                        <div className='text-[10px] uppercase text-gray-500'>{metric.label}</div>
                        <div className='text-xs text-gray-200'>
                          {formatMetricValue(metric.value)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className='flex flex-wrap items-center gap-2'>
                    {domain.links.map((link) => (
                      <Link
                        key={`${key}:${link.href}`}
                        href={link.href}
                        className='inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2 py-1 text-[11px] text-gray-200 hover:bg-background/70'
                      >
                        {link.label}
                        <ExternalLink className='size-3' />
                      </Link>
                    ))}
                    <button
                      type='button'
                      className='inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2 py-1 text-[11px] text-gray-200 hover:bg-background/70'
                      onClick={(): void => setExpandedDomain(isExpanded ? null : key)}
                    >
                      Details
                      {isExpanded ? (
                        <ChevronUp className='size-3' />
                      ) : (
                        <ChevronDown className='size-3' />
                      )}
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className='space-y-2 rounded-md border border-border/60 bg-background/30 p-2'>
                      <div className='text-[10px] uppercase text-gray-500'>
                        Recent events ({selectedRangeLabel})
                      </div>
                      {domain.recentEvents.length === 0 ? (
                        <div className='text-xs text-gray-400'>
                          No recent events in sampled records.
                        </div>
                      ) : (
                        <div className='space-y-1'>
                          {domain.recentEvents.map((event) => (
                            <div
                              key={`${key}:${event.id ?? event.timestamp}:${event.status}`}
                              className='flex items-center justify-between rounded border border-border/50 bg-background/40 px-2 py-1 text-[11px]'
                            >
                              <span className='font-medium text-gray-200'>{event.status}</span>
                              <span className='text-gray-400'>
                                {formatUpdatedAt(event.timestamp)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
