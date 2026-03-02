'use client';

import { useSettingsMap } from '@/shared/hooks/use-settings';
import { Card, StatusBadge } from '@/shared/ui';

import { useBrain } from '../context/BrainContext';
import { AI_BRAIN_SETTINGS_KEY } from '../settings';

const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return 'never';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'never';
  return date.toLocaleString();
};

export function BrainStateOverview(): React.JSX.Element {
  const brain = useBrain();
  const settingsQuery = useSettingsMap();

  const insightsData = brain.insightsQuery.data;
  const latestLogsInsight = insightsData?.logs?.[0];
  const latestAnalyticsInsight = insightsData?.analytics?.[0];

  const brainConfigured = settingsQuery.data?.get(AI_BRAIN_SETTINGS_KEY);
  const hasCustomRouting =
    Object.values(brain.overridesEnabled).some(Boolean) ||
    Object.values(brain.settings.capabilities ?? {}).some((value) => Boolean(value));

  return (
    <Card
      variant='subtle'
      padding='md'
      className='border-border/60 bg-linear-to-r from-emerald-500/10 via-cyan-500/5 to-blue-500/10'
    >
      <div className='grid gap-3 text-xs md:grid-cols-4'>
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
        <div>
          <div className='text-[11px] uppercase tracking-wide text-blue-300'>Latest insight</div>
          <div className='mt-1 text-gray-200'>
            {latestLogsInsight ? formatDate(latestLogsInsight.createdAt) : 'No insight runs yet'}
          </div>
          {latestAnalyticsInsight ? (
            <div className='mt-1 text-[11px] text-gray-300 line-clamp-1'>
              {latestAnalyticsInsight.summary}
            </div>
          ) : null}
        </div>
        <div>
          <div className='text-[11px] uppercase tracking-wide text-emerald-200'>Key feature</div>
          <div className='mt-1 text-gray-200'>
            Products routing:{' '}
            {brain.effectiveAssignments.products.modelId
              ? brain.effectiveAssignments.products.modelId
              : 'inherits default'}
          </div>
        </div>
      </div>
    </Card>
  );
}
