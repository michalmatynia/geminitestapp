'use client';

import React from 'react';

import type { AiInsightRecord } from '@/shared/contracts';
import { Button, FormSection, EmptyState, LoadingState } from '@/shared/ui';

import { InsightCard } from './InsightCard';
import { useInsights } from '../context/InsightsContext';

export function AnalyticsInsightsPanel(): React.JSX.Element {
  const { analyticsQuery, runAnalyticsMutation } = useInsights();

  return (
    <FormSection
      title='Analytics Insights'
      description='Interaction anomalies, traffic changes, and warnings.'
      className='p-4'
      actions={
        <Button
          variant='outline'
          size='sm'
          onClick={() => runAnalyticsMutation.mutate()}
          disabled={runAnalyticsMutation.isPending}
        >
          {runAnalyticsMutation.isPending ? 'Running...' : 'Run'}
        </Button>
      }
    >
      <div className='mt-3 space-y-3'>
        {analyticsQuery.isLoading ? (
          <LoadingState message='Loading insights...' size='sm' className='py-4' />
        ) : analyticsQuery.error ? (
          <div className='text-xs text-red-400'>{analyticsQuery.error.message}</div>
        ) : (analyticsQuery.data?.insights?.length ?? 0) === 0 ? (
          <EmptyState
            title='No insights yet'
            description='Run analytics analysis to identify traffic changes and anomalies.'
            variant='compact'
            className='py-8'
          />
        ) : (
          analyticsQuery.data?.insights.map((insight: AiInsightRecord) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </div>
    </FormSection>
  );
}
