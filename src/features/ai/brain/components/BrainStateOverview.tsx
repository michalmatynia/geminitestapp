'use client';

import { useSettingsMap } from '@/shared/hooks/use-settings';
import { Card } from '@/shared/ui';

import { useBrain } from '../context/BrainContext';
import { AI_BRAIN_SETTINGS_KEY } from '../settings';
import type { InsightsSnapshot } from '@/shared/contracts/ai-brain';

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

  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-blue-500/10'>
      <div className='grid gap-3 text-xs md:grid-cols-3'>
        <div>
          <div className='text-[11px] uppercase tracking-wide text-emerald-300'>Brain state</div>
          <div className='mt-1 text-gray-200'>
            Source: {settingsQuery.data?.get(AI_BRAIN_SETTINGS_KEY) ? 'saved settings' : 'defaults'}
          </div>
        </div>
        <div>
          <div className='text-[11px] uppercase tracking-wide text-cyan-300'>Report cadence</div>
          <div className='mt-1 text-gray-200'>
            Analytics {brain.analyticsScheduleEnabled ? `every ${brain.analyticsScheduleMinutes}m` : 'paused'} · Runtime {brain.runtimeAnalyticsScheduleEnabled ? `every ${brain.runtimeAnalyticsScheduleMinutes}m` : 'paused'} · Logs {brain.logsScheduleEnabled ? `every ${brain.logsScheduleMinutes}m` : 'paused'}
          </div>
        </div>
        <div>
          <div className='text-[11px] uppercase tracking-wide text-blue-300'>Latest insight</div>
          <div className='mt-1 text-gray-200'>
            {latestLogsInsight ? formatDate((latestLogsInsight).createdAt) : 'No insight runs yet'}
          </div>
        </div>
      </div>
    </Card>
  );
}
