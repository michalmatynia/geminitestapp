'use client';

import type { AiInsightRecord } from '@/shared/types';
import { Button, StatusBadge, DocumentationSection, Hint, FormSection } from '@/shared/ui';

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
        <Hint variant='danger' className='mt-1'>{insightsQuery.error.message}</Hint>
      ) : (insightsQuery.data?.insights?.length ?? 0) === 0 ? (
        <Hint className='mt-1' italic>No insights yet.</Hint>
      ) : (
        <div className='mt-1 space-y-3'>
          {insightsQuery.data?.insights.map((insight: AiInsightRecord) => (
            <div key={insight.id} className='rounded-md border border-border/60 bg-gray-950/40 p-3 text-xs text-gray-300'>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-[10px] uppercase text-gray-500'>
                  {new Date(insight.createdAt).toLocaleString()}
                </span>
                <StatusBadge status={insight.status} />
              </div>
              <div className='mt-2 text-sm text-white'>{insight.summary}</div>
              {insight.warnings.length > 0 ? (
                <DocumentationSection title='Warnings' className='mt-3 p-3 bg-amber-500/5 border-amber-500/20'>
                  <ul className='list-disc space-y-1 pl-4 text-[11px] text-amber-200'>
                    {insight.warnings.map((warning: string, index: number) => (
                      <li key={`${insight.id}-warn-${index}`}>{warning}</li>
                    ))}
                  </ul>
                </DocumentationSection>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </FormSection>
  );
}
