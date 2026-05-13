'use client';

import React from 'react';

import { useSettingsMap } from '@/shared/hooks/use-settings';
import { Card } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import type { AiInsightRecord } from '@/shared/contracts/ai-insights';

import { useBrain } from '../context/BrainContext';
import type { BrainContextType } from '../context/BrainContext.types';
import { AI_BRAIN_SETTINGS_KEY } from '../settings';

const formatDate = (value: string | Date | null | undefined): string => {
  if (value === null || value === undefined || value === '') return 'never';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'never';
  return date.toLocaleString();
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const getRuntimeKernelRisk = (metadata: unknown): string => {
  const record = asRecord(metadata);
  const raw = record?.['runtimeKernelParityRiskLevel'];
  if (typeof raw !== 'string') return '';
  const normalized = raw.trim().toLowerCase();
  return normalized.length > 0 ? normalized.toUpperCase() : '';
};

export function BrainStateOverview(): React.JSX.Element {
  const brain = useBrain();
  const settingsQuery = useSettingsMap();

  const insightsData = brain.insightsQuery.data;
  const latestLogsInsight = insightsData?.logs[0];
  const latestAnalyticsInsight = insightsData?.analytics[0];
  const latestRuntimeInsight = insightsData?.runtimeAnalytics[0];

  const latestInsight = React.useMemo(() => {
    const candidates = [latestRuntimeInsight, latestLogsInsight, latestAnalyticsInsight].filter(
      (insight): insight is AiInsightRecord => insight !== undefined
    );

    return candidates.sort((left, right) => {
      const leftTime = new Date(left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.createdAt ?? 0).getTime();
      return rightTime - leftTime;
    })[0];
  }, [latestAnalyticsInsight, latestLogsInsight, latestRuntimeInsight]);

  const runtimeRisk = latestRuntimeInsight
    ? getRuntimeKernelRisk(latestRuntimeInsight.metadata)
    : '';

  const brainConfigured = settingsQuery.data?.get(AI_BRAIN_SETTINGS_KEY) !== undefined;
  const hasCustomRouting =
    Object.values(brain.overridesEnabled).some((value) => Boolean(value)) ||
    Object.values(brain.settings.capabilities).some((value) => Boolean(value));

  return (
    <Card
      variant='subtle'
      padding='md'
      className='border-border/60 bg-linear-to-r from-emerald-500/10 via-cyan-500/5 to-blue-500/10'
    >
      <div className='grid gap-3 text-xs md:grid-cols-4'>
        <BrainStateColumn brainConfigured={brainConfigured} hasCustomRouting={hasCustomRouting} />
        <ReportCadenceColumn brain={brain} />
        <LatestInsightColumn latestInsight={latestInsight} runtimeRisk={runtimeRisk} />
        <KeyFeatureColumn brain={brain} />
      </div>
    </Card>
  );
}

function BrainStateColumn({
  brainConfigured,
  hasCustomRouting,
}: {
  brainConfigured: boolean;
  hasCustomRouting: boolean;
}): React.JSX.Element {
  return (
    <div>
      <div className='text-[11px] uppercase tracking-wide text-emerald-300'>Brain state</div>
      <div className='mt-1 text-gray-200'>
        Source: {brainConfigured ? 'saved settings' : 'defaults'}
      </div>
      <div className='mt-2 flex items-center gap-2'>
        <StatusBadge
          status={brainConfigured ? 'ok' : 'none'}
          size='sm'
          className='uppercase tracking-wide text-[10px]'
          label={brainConfigured ? 'ok' : 'none'}
        />
        <span className='text-[11px] text-gray-300'>
          {hasCustomRouting ? 'Custom routing active' : 'Using global defaults'}
        </span>
      </div>
    </div>
  );
}

function ReportCadenceColumn({ brain }: { brain: BrainContextType }): React.JSX.Element {
  return (
    <div>
      <div className='text-[11px] uppercase tracking-wide text-cyan-300'>Report cadence</div>
      <div className='mt-1 text-gray-200'>
        Analytics{' '}
        {brain.analyticsScheduleEnabled ? `every ${brain.analyticsScheduleMinutes}m` : 'paused'}{' '}
        · Runtime{' '}
        {brain.runtimeAnalyticsScheduleEnabled
          ? `every ${brain.runtimeAnalyticsScheduleMinutes}m`
          : 'paused'}{' '}
        · Logs {brain.logsScheduleEnabled ? `every ${brain.logsScheduleMinutes}m` : 'paused'}
      </div>
    </div>
  );
}

function LatestInsightColumn({
  latestInsight,
  runtimeRisk,
}: {
  latestInsight: AiInsightRecord | undefined;
  runtimeRisk: string;
}): React.JSX.Element {
  return (
    <div>
      <div className='text-[11px] uppercase tracking-wide text-blue-300'>Latest insight</div>
      <div className='mt-1 text-gray-200'>
        {latestInsight !== undefined ? formatDate(latestInsight.createdAt) : 'No insight runs yet'}
      </div>
      {latestInsight !== undefined ? (
        <div className='mt-1 text-[11px] text-gray-300 line-clamp-1'>
          {latestInsight.summary}
        </div>
      ) : null}
      {runtimeRisk.length > 0 ? (
        <div className='mt-1 text-[10px] uppercase tracking-wide text-amber-300'>
          Runtime kernel risk: {runtimeRisk}
        </div>
      ) : null}
    </div>
  );
}

function KeyFeatureColumn({ brain }: { brain: BrainContextType }): React.JSX.Element {
  return (
    <div>
      <div className='text-[11px] uppercase tracking-wide text-emerald-200'>Key feature</div>
      <div className='mt-1 text-gray-200'>
        Products routing:{' '}
        {brain.effectiveAssignments.products.modelId.length > 0
          ? brain.effectiveAssignments.products.modelId
          : 'inherits default'}
      </div>
    </div>
  );
}
