'use client';

import { ArrowUpRightIcon } from 'lucide-react';
import Link from 'next/link';
import { type JSX, type ReactNode } from 'react';

import { Button, Card, MetadataItem, StatusBadge } from '@/shared/ui';
import type { KangurRouteHealth } from '@/shared/contracts';

import { useObservabilitySummaryContext } from '../../AdminKangurObservabilityPage';
import { formatDuration, formatNumber, formatPercent } from './utils';

export function MetricCard({
  title,
  value,
  hint,
  icon,
  alert,
}: {
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
  alert?: any; // Avoiding deep type import issues for now
}): JSX.Element {
  const alertStatus = alert?.status;

  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-2'>
          <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400'>
            {icon}
            <span>{title}</span>
          </div>
          <div className='text-2xl font-semibold text-white'>{value}</div>
        </div>
        {alertStatus ? <StatusBadge status={alertStatus} /> : null}
      </div>
      <p className='mt-3 text-xs leading-relaxed text-gray-400'>{hint}</p>
    </Card>
  );
}

export function RouteMetricCard({
  label,
  description,
  route,
}: {
  label: string;
  description: string;
  route: KangurRouteHealth;
}): JSX.Element {
  const metrics = route.metrics;
  const latency = route.latency;
  const errorCount = metrics?.levels.error ?? 0;
  const totalCount = metrics?.total ?? 0;
  const topPath = metrics?.topPaths[0]?.path ?? '—';
  const p95DurationMs = latency?.p95DurationMs ?? null;
  const slowThresholdMs = latency?.slowThresholdMs ?? null;
  const status =
    metrics === null && latency === null
      ? 'insufficient_data'
      : errorCount > 0
        ? 'warning'
        : p95DurationMs !== null && slowThresholdMs !== null && p95DurationMs >= slowThresholdMs * 2
          ? 'critical'
          : p95DurationMs !== null && slowThresholdMs !== null && p95DurationMs >= slowThresholdMs
            ? 'warning'
            : totalCount > 0 || (latency?.sampleSize ?? 0) > 0
              ? 'ok'
              : 'insufficient_data';

  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-sm font-semibold text-white'>{label}</div>
          <p className='mt-1 text-xs leading-relaxed text-gray-400'>{description}</p>
        </div>
        <div className='flex items-center gap-2'>
          <StatusBadge status={status} />
          <Button asChild variant='ghost' size='sm' className='gap-2'>
            <Link href={route.investigation.href}>
              Logs
              <ArrowUpRightIcon className='size-3.5' />
            </Link>
          </Button>
        </div>
      </div>

      <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
        <MetadataItem label='Requests' value={formatNumber(totalCount)} variant='card' />
        <MetadataItem label='Errors' value={formatNumber(errorCount)} variant='card' />
        <MetadataItem label='Avg' value={formatDuration(latency?.avgDurationMs)} variant='card' />
        <MetadataItem label='p95' value={formatDuration(p95DurationMs)} variant='card' />
        <MetadataItem
          label='Slow Requests'
          value={
            latency
              ? `${formatNumber(latency.slowRequestCount)} (${formatPercent(
                latency.slowRequestRatePercent
              )})`
              : '—'
          }
          variant='card'
        />
      </div>

      <div className='mt-3 grid gap-3 sm:grid-cols-2'>
        <MetadataItem label='Top Path' value={topPath} variant='minimal' mono />
        <MetadataItem
          label='Slow Threshold'
          value={formatDuration(slowThresholdMs)}
          variant='minimal'
        />
      </div>
    </Card>
  );
}

export function AlertsGrid(): JSX.Element {
  const {
    summary: { alerts },
  } = useObservabilitySummaryContext();

  return (
    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
      {alerts.map((alert) => (
        <Card
          key={alert.id}
          variant='subtle'
          padding='md'
          className='border-border/60 bg-card/40'
        >
          <div className='flex items-start justify-between gap-3'>
            <div className='space-y-1'>
              <div className='text-sm font-semibold text-white'>{alert.title}</div>
              <div className='text-xs text-gray-400'>{alert.summary}</div>
            </div>
            <StatusBadge status={alert.status} />
          </div>

          <div className='mt-4 grid gap-2 text-xs text-gray-300'>
            <MetadataItem
              label='Current'
              value={
                alert.unit === '%'
                  ? formatPercent(alert.value)
                  : alert.unit === 'count'
                    ? formatNumber(alert.value)
                    : alert.value === null
                      ? '—'
                      : `${formatNumber(alert.value)} ${alert.unit}`
              }
              variant='minimal'
            />
            <MetadataItem
              label='Warning'
              value={
                alert.warningThreshold === null
                  ? '—'
                  : alert.unit === '%'
                    ? formatPercent(alert.warningThreshold)
                    : formatNumber(alert.warningThreshold)
              }
              variant='minimal'
            />
            <MetadataItem
              label='Critical'
              value={
                alert.criticalThreshold === null
                  ? '—'
                  : alert.unit === '%'
                    ? formatPercent(alert.criticalThreshold)
                    : formatNumber(alert.criticalThreshold)
              }
              variant='minimal'
            />
          </div>
          {alert.investigation ? (
            <Button
              asChild
              variant='ghost'
              size='sm'
              className='mt-4 w-full justify-between gap-2'
            >
              <Link href={alert.investigation.href}>
                {alert.investigation.label}
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
