'use client';

import { Activity } from 'lucide-react';
import React, { useMemo } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Badge } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

import { useCampaignEditContext } from '../AdminFilemakerCampaignEditPage.context';
import {
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  summarizeFilemakerEmailCampaignRunTrend,
  type CampaignRunTrendDataPoint,
} from '../../settings';
import type {
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../../types';
import { formatTimestamp } from '../filemaker-page-utils';

const MAX_BAR_HEIGHT_PX = 48;

const formatRunLabel = (point: CampaignRunTrendDataPoint, index: number): string => {
  const at = point.completedAt ?? point.startedAt ?? null;
  if (at) {
    const parsed = new Date(at);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  }
  return `Run ${index + 1}`;
};

const barHeight = (percent: number): number =>
  Math.max(2, Math.round((Math.min(percent, 100) / 100) * MAX_BAR_HEIGHT_PX));

export function CampaignEngagementTrendSection(): React.JSX.Element {
  const { draft, deliveryRegistry, suppressionEntries } = useCampaignEditContext();
  const settingsStore = useSettingsStore();

  const rawRuns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY);
  const rawEvents = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY);

  const runRegistry = useMemo(
    () => parseFilemakerEmailCampaignRunRegistry(rawRuns),
    [rawRuns]
  );
  const eventRegistry = useMemo(
    () => parseFilemakerEmailCampaignEventRegistry(rawEvents),
    [rawEvents]
  );
  const suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry = useMemo(
    () => ({ version: 1, entries: suppressionEntries }),
    [suppressionEntries]
  );
  const deliveriesForCampaign: FilemakerEmailCampaignDeliveryRegistry = useMemo(
    () => deliveryRegistry,
    [deliveryRegistry]
  );

  const summary = useMemo(
    () =>
      summarizeFilemakerEmailCampaignRunTrend({
        campaign: { id: draft.id ?? '' },
        runRegistry,
        deliveryRegistry: deliveriesForCampaign,
        eventRegistry,
        suppressionRegistry,
        limit: 10,
      }),
    [
      deliveriesForCampaign,
      draft.id,
      eventRegistry,
      runRegistry,
      suppressionRegistry,
    ]
  );

  return (
    <FormSection
      title={
        <span className='flex items-center gap-2'>
          <Activity className='h-4 w-4 text-emerald-400' aria-hidden='true' />
          Engagement trend
        </span>
      }
      className='space-y-4 p-4'
    >
      {summary.points.length === 0 ? (
        <div className='rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-gray-500'>
          No completed runs yet. Trend appears after the first run finishes.
        </div>
      ) : (
        <>
          <div className='flex flex-wrap items-center gap-2 text-[10px]'>
            <Badge variant='outline'>
              Avg open: {summary.averages.openRatePercent}%
            </Badge>
            <Badge variant='outline'>
              Avg click: {summary.averages.clickRatePercent}%
            </Badge>
            <Badge
              variant={summary.averages.bounceRatePercent > 5 ? 'destructive' : 'outline'}
            >
              Avg bounce: {summary.averages.bounceRatePercent}%
            </Badge>
            <Badge variant='outline'>
              Avg failure: {summary.averages.failureRatePercent}%
            </Badge>
            <Badge variant='outline'>
              Runs analysed: {summary.points.length}
            </Badge>
          </div>

          <TrendStrip
            label='Open rate'
            colorClass='bg-emerald-500/70'
            metricKey='openRatePercent'
            points={summary.points}
          />
          <TrendStrip
            label='Click rate'
            colorClass='bg-sky-500/70'
            metricKey='clickRatePercent'
            points={summary.points}
          />
          <TrendStrip
            label='Bounce rate'
            colorClass='bg-red-500/70'
            metricKey='bounceRatePercent'
            points={summary.points}
            highlightOver={5}
          />
          <ColdStrip points={summary.points} />
        </>
      )}
    </FormSection>
  );
}

interface TrendStripProps {
  label: string;
  colorClass: string;
  metricKey:
    | 'openRatePercent'
    | 'clickRatePercent'
    | 'bounceRatePercent'
    | 'failureRatePercent';
  points: CampaignRunTrendDataPoint[];
  highlightOver?: number;
}

function TrendStrip({
  label,
  colorClass,
  metricKey,
  points,
  highlightOver,
}: TrendStripProps): React.JSX.Element {
  return (
    <div>
      <div className='mb-1 flex items-center justify-between text-[11px] text-gray-400'>
        <span>{label}</span>
        <span className='text-gray-500'>per run, oldest → newest</span>
      </div>
      <div className='flex items-end gap-1' style={{ height: `${MAX_BAR_HEIGHT_PX + 18}px` }}>
        {points.map((point, index) => {
          const value = point[metricKey];
          const isHighlighted = highlightOver !== undefined && value > highlightOver;
          return (
            <div
              key={point.runId}
              className='flex flex-1 flex-col items-center gap-1'
              title={`${formatTimestamp(point.completedAt ?? point.startedAt ?? null)} — ${value}%`}
            >
              <div
                className={`w-full rounded-sm ${isHighlighted ? 'bg-red-500' : colorClass}`}
                style={{ height: `${barHeight(value)}px` }}
                aria-label={`${label} ${value}% on ${formatRunLabel(point, index)}`}
              />
              <span className='text-[9px] text-gray-500'>{value}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ColdStrip({ points }: { points: CampaignRunTrendDataPoint[] }): React.JSX.Element {
  const max = Math.max(1, ...points.map((point) => point.coldSuppressionsAdded));
  return (
    <div>
      <div className='mb-1 flex items-center justify-between text-[11px] text-gray-400'>
        <span>Cold suppressions added</span>
        <span className='text-gray-500'>auto-suppressed by engagement tracker</span>
      </div>
      <div className='flex items-end gap-1' style={{ height: `${MAX_BAR_HEIGHT_PX + 18}px` }}>
        {points.map((point, index) => {
          const height = Math.max(2, Math.round((point.coldSuppressionsAdded / max) * MAX_BAR_HEIGHT_PX));
          return (
            <div
              key={point.runId}
              className='flex flex-1 flex-col items-center gap-1'
              title={`${formatTimestamp(point.completedAt ?? point.startedAt ?? null)} — ${point.coldSuppressionsAdded} cold suppression${point.coldSuppressionsAdded === 1 ? '' : 's'}`}
            >
              <div
                className='w-full rounded-sm bg-amber-500/70'
                style={{ height: `${height}px` }}
                aria-label={`${point.coldSuppressionsAdded} cold suppressions on ${formatRunLabel(point, index)}`}
              />
              <span className='text-[9px] text-gray-500'>{point.coldSuppressionsAdded}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
