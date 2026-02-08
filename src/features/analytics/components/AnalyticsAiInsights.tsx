'use client';

import type { AiInsightRecord } from '@/shared/types';
import { Button, SectionPanel } from '@/shared/ui';

import { useAnalytics } from '../context/AnalyticsContext';

export function AnalyticsAiInsights(): React.JSX.Element {
  const { insightsQuery, runInsightMutation } = useAnalytics();

  return (
    <SectionPanel className='mb-6 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-sm font-semibold text-white'>AI Insights</h2>
          <p className='text-xs text-gray-400'>
            Automated overview of interactions and possible issues.
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => runInsightMutation.mutate()}
          disabled={runInsightMutation.isPending}
        >
          {runInsightMutation.isPending ? 'Running...' : 'Run AI Insight'}
        </Button>
      </div>
      {insightsQuery.isLoading ? (
        <p className='mt-3 text-xs text-gray-500'>Loading AI insights…</p>
      ) : insightsQuery.error ? (
        <p className='mt-3 text-xs text-red-400'>{insightsQuery.error.message}</p>
      ) : (insightsQuery.data?.insights?.length ?? 0) === 0 ? (
        <p className='mt-3 text-xs text-gray-500'>No insights yet.</p>
      ) : (
        <div className='mt-3 space-y-3'>
          {insightsQuery.data?.insights.map((insight: AiInsightRecord) => (
            <div key={insight.id} className='rounded-md border border-border/60 bg-gray-950/40 p-3 text-xs text-gray-300'>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-[10px] uppercase text-gray-500'>
                  {new Date(insight.createdAt).toLocaleString()}
                </span>
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] ${
                    insight.status === 'ok'
                      ? 'border-emerald-500/40 text-emerald-200'
                      : insight.status === 'warning'
                        ? 'border-amber-500/40 text-amber-200'
                        : 'border-rose-500/40 text-rose-200'
                  }`}
                >
                  {insight.status}
                </span>
              </div>
              <div className='mt-2 text-sm text-white'>{insight.summary}</div>
              {insight.warnings.length > 0 ? (
                <ul className='mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-200'>
                  {insight.warnings.map((warning: string, index: number) => (
                    <li key={`${insight.id}-warn-${index}`}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </SectionPanel>
  );
}
