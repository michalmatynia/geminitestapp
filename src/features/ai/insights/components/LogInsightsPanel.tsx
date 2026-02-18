'use client';

import React from 'react';

import type { AiInsightRecord } from '@/shared/types';
import { Button, FormSection, EmptyState, LoadingState } from '@/shared/ui';

import { InsightCard } from './InsightCard';
import { useInsights } from '../context/InsightsContext';

export function LogInsightsPanel(): React.JSX.Element {
  const { logsQuery, runLogsMutation } = useInsights();

  return (
    <FormSection
      title='Log Insights'
      description='Error patterns, regressions, and suggested fixes.'
      className='p-4'
      actions={
        <Button
          variant='outline'
          size='sm'
          onClick={() => runLogsMutation.mutate()}
          disabled={runLogsMutation.isPending}
        >
          {runLogsMutation.isPending ? 'Running...' : 'Run'}
        </Button>
      }
    >
      <div className='mt-3 space-y-3'>
        {logsQuery.isLoading ? (
          <LoadingState message='Loading insights...' size='sm' className='py-4' />
        ) : logsQuery.error ? (
          <div className='text-xs text-red-400'>{(logsQuery.error).message}</div>
        ) : (logsQuery.data?.insights?.length ?? 0) === 0 ? (
          <EmptyState
            title='No insights yet'
            description='Run log analysis to identify error patterns and suggested fixes.'
            variant='compact'
            className='py-8'
          />
        ) : (
          logsQuery.data?.insights.map((insight: AiInsightRecord) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </div>
    </FormSection>
  );
}
