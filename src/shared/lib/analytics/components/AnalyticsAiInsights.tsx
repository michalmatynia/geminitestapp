'use client';

import type { AiInsightRecord } from '@/shared/contracts';
import { Button, StatusBadge, Hint, FormSection, Card } from '@/shared/ui';

import { useAnalytics } from '../context/AnalyticsContext';

export function AnalyticsAiInsights(): React.JSX.Element {
  const { insightsQuery, runInsightMutation } = useAnalytics();

  return (
    <FormSection
      title='AI Insights'
      description='Automated overview of interactions and possible issues.'
      className='mb-6 p-4'
      actions={
        <Button
          variant='outline'
          size='sm'
          onClick={() => runInsightMutation.mutate()}
          disabled={runInsightMutation.isPending}
        >
          {runInsightMutation.isPending ? 'Running...' : 'Run AI Insight'}
        </Button>
      }
    >
      {insightsQuery.isLoading ? (
        <Hint className='mt-1'>Loading AI insights…</Hint>
      ) : insightsQuery.error ? (
        <Hint variant='danger' className='mt-1'>
          {insightsQuery.error.message}
        </Hint>
      ) : (insightsQuery.data?.insights?.length ?? 0) === 0 ? (
        <Hint className='mt-1' italic>
          No insights yet.
        </Hint>
      ) : (
        <div className='mt-1 space-y-3'>
          {insightsQuery.data?.insights.map((insight: AiInsightRecord) => {
            const warnings = (insight.warnings as string[]) ?? [];
            return (
              <Card
                key={insight.id}
                variant='subtle-compact'
                padding='sm'
                className='border-border/60 bg-card/40 text-xs text-gray-300'
              >
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-[10px] uppercase text-gray-500'>
                    {new Date(insight.createdAt || 0).toLocaleString()}
                  </span>
                  <StatusBadge status={insight.status} />
                </div>
                <div className='mt-2 text-sm text-white'>{insight.summary}</div>
                {warnings.length > 0 ? (
                  <Card variant='warning' padding='sm' className='mt-3 border-amber-500/20'>
                    <div className='mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-200/70'>
                      Warnings
                    </div>
                    <ul className='list-disc space-y-1 pl-4 text-[11px] text-amber-200'>
                      {warnings.map((warning: string, index: number) => (
                        <li key={`${insight.id}-warn-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  </Card>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </FormSection>
  );
}
