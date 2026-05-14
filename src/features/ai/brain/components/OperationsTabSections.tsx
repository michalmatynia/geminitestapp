'use client';

import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import React, { type ComponentType } from 'react';

import type {
  BrainOperationsDomainKey,
  BrainOperationsDomainOverview,
  BrainOperationsMetric,
  BrainOperationsTrend,
  BrainOperationsRecentEvent,
  BrainOperationsLink,
} from '@/shared/contracts/ai-brain';
import { Card } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import {
  eventToneClass,
  formatFreshness,
  formatMetricValue,
  formatTrendValue,
  formatUpdatedAt,
  getMetricValue,
  metricCellToneClass,
  metricValueToneClass,
  normalizeMetricValue,
  parseMetricInteger,
  runtimeRiskSummaryToneClass,
  runtimeRiskToneClass,
  toEventStatusLabel,
  TREND_ICON,
  trendToneClass,
} from './OperationsTabUtils';

export function DomainCard({
  domainKey,
  domain,
  Icon,
  isExpanded,
  onToggleExpand,
  selectedRangeLabel,
}: {
  domainKey: BrainOperationsDomainKey;
  domain: BrainOperationsDomainOverview;
  Icon: ComponentType<{ className?: string }>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  selectedRangeLabel: string;
}): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-card/35 space-y-3'>
      <DomainCardHeader domain={domain} Icon={Icon} />
      
      {domain.message !== undefined && <div className='text-xs text-gray-300'>{domain.message}</div>}

      <DomainCardRuntimeRisk domainKey={domainKey} domain={domain} />

      <DomainCardTrend trend={domain.trend} />

      <DomainCardMetrics domainKey={domainKey} metrics={domain.metrics} />

      <DomainCardActions
        domainKey={domainKey}
        links={domain.links}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />

      {isExpanded && (
        <DomainCardEvents
          domainKey={domainKey}
          events={domain.recentEvents}
          selectedRangeLabel={selectedRangeLabel}
        />
      )}
    </Card>
  );
}

function DomainCardHeader({
  domain,
  Icon,
}: {
  domain: BrainOperationsDomainOverview;
  Icon: ComponentType<{ className?: string }>;
}): React.JSX.Element {
  return (
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
      <StatusBadge status={domain.state} label={domain.state.toUpperCase()} size='sm' className='font-bold' />
    </div>
  );
}

function DomainCardRuntimeRisk({
  domainKey,
  domain,
}: {
  domainKey: BrainOperationsDomainKey;
  domain: BrainOperationsDomainOverview;
}): React.JSX.Element | null {
  if (domainKey !== 'ai_paths') return null;

  return (
    <div className='space-y-2'>
      <DomainCardRuntimeRiskBadge domain={domain} />
      <DomainCardRuntimeRiskSummary domain={domain} />
    </div>
  );
}

function DomainCardRuntimeRiskBadge({
  domain,
}: {
  domain: BrainOperationsDomainOverview;
}): React.JSX.Element | null {
  const runtimeRiskMetric = domain.metrics.find((m) => m.key === 'runtime_kernel_risk');
  const runtimeRiskValue = runtimeRiskMetric ? normalizeMetricValue(runtimeRiskMetric.value) : '';
  const showBadge = runtimeRiskValue.length > 0 &&
    runtimeRiskValue !== 'disabled' &&
    runtimeRiskValue !== 'n/a';

  if (!showBadge || !runtimeRiskMetric) return null;

  return (
    <div className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium uppercase tracking-wide ${runtimeRiskToneClass(runtimeRiskValue)}`}>
      Kernel parity risk: {formatMetricValue(runtimeRiskMetric.value)}
    </div>
  );
}

function DomainCardRuntimeRiskSummary({
  domain,
}: {
  domain: BrainOperationsDomainOverview;
}): React.JSX.Element | null {
  const currentCount = parseMetricInteger(getMetricValue('ai_paths', domain.metrics, 'runtime_risk_events_current'));
  const previousCount = parseMetricInteger(getMetricValue('ai_paths', domain.metrics, 'runtime_risk_events_previous'));

  if (currentCount === null || previousCount === null) return null;

  return (
    <div className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium ${runtimeRiskSummaryToneClass(currentCount, previousCount)}`}>
      Runtime risk events: {currentCount} current / {previousCount} previous
    </div>
  );
}

function DomainCardTrend({ trend }: { trend: BrainOperationsTrend | undefined }): React.JSX.Element | null {
  if (trend === undefined) return null;
  const TrendIcon = TREND_ICON[trend.direction];

  return (
    <div className='flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-2 py-1.5 text-[11px]'>
      <div className='text-gray-400'>{trend.label}</div>
      <div className={`inline-flex items-center gap-1 ${trendToneClass(trend)}`}>
        <TrendIcon className='size-3' />
        {formatTrendValue(trend)}
      </div>
    </div>
  );
}

function DomainCardMetrics({
  domainKey,
  metrics,
}: {
  domainKey: BrainOperationsDomainKey;
  metrics: BrainOperationsMetric[];
}): React.JSX.Element {
  return (
    <div className='grid grid-cols-2 gap-2'>
      {metrics.map((metric) => (
        <div key={`${domainKey}:${metric.key}`} className={`rounded-md border px-2 py-1.5 ${metricCellToneClass(domainKey, metric)}`}>
          <div className='text-[10px] uppercase text-gray-500'>{metric.label}</div>
          <div className={`text-xs ${metricValueToneClass(domainKey, metric)}`}>{formatMetricValue(metric.value)}</div>
        </div>
      ))}
    </div>
  );
}

function DomainCardActions({
  domainKey,
  links,
  isExpanded,
  onToggleExpand,
}: {
  domainKey: BrainOperationsDomainKey;
  links: BrainOperationsLink[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      {links.map((link) => (
        <Link key={`${domainKey}:${link.href}`} href={link.href} className='inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2 py-1 text-[11px] text-gray-200 hover:bg-background/70'>
          {link.label}
          <ExternalLink className='size-3' />
        </Link>
      ))}
      <button type='button' className='inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2 py-1 text-[11px] text-gray-200 hover:bg-background/70' onClick={onToggleExpand}>
        Details
        {isExpanded ? <ChevronUp className='size-3' /> : <ChevronDown className='size-3' />}
      </button>
    </div>
  );
}

function DomainCardEvents({
  domainKey,
  events,
  selectedRangeLabel,
}: {
  domainKey: BrainOperationsDomainKey;
  events: BrainOperationsRecentEvent[];
  selectedRangeLabel: string;
}): React.JSX.Element {
  return (
    <div className='space-y-2 rounded-md border border-border/60 bg-background/30 p-2'>
      <div className='text-[10px] uppercase text-gray-500'>Recent events ({selectedRangeLabel})</div>
      {events.length === 0 ? (
        <div className='text-xs text-gray-400'>No recent events in sampled records.</div>
      ) : (
        <div className='space-y-1'>
          {events.map((event) => (
            <div key={`${domainKey}:${event.id ?? event.timestamp}:${event.status}`} className='flex items-center justify-between rounded border border-border/50 bg-background/40 px-2 py-1 text-[11px]'>
              <span className={`font-medium ${eventToneClass(event.status)}`}>{toEventStatusLabel(event.status)}</span>
              <span className='text-gray-400'>{formatUpdatedAt(event.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
