'use client';

import React from 'react';

import type { AiInsightRecord } from '@/shared/contracts';
import { Button, FormSection, EmptyState, LoadingState } from '@/shared/ui';

import { InsightCard } from './InsightCard';

type InsightQueryLike = {
  isLoading: boolean;
  error: Error | null;
  data?: {
    insights?: AiInsightRecord[] | null;
  } | null;
};

type RunMutationLike = {
  mutate: () => void;
  isPending: boolean;
};

interface InsightsResultPanelProps {
  title: string;
  description: string;
  emptyDescription: string;
  query: InsightQueryLike;
  runMutation: RunMutationLike;
}

export function InsightsResultPanel({
  title,
  description,
  emptyDescription,
  query,
  runMutation,
}: InsightsResultPanelProps): React.JSX.Element {
  return (
    <FormSection
      title={title}
      description={description}
      className='p-4'
      actions={
        <Button
          variant='outline'
          size='sm'
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
        >
          {runMutation.isPending ? 'Running...' : 'Run'}
        </Button>
      }
    >
      <div className='mt-3 space-y-3'>
        {query.isLoading ? (
          <LoadingState message='Loading insights...' size='sm' className='py-4' />
        ) : query.error ? (
          <div className='text-xs text-red-400'>{query.error.message}</div>
        ) : (query.data?.insights?.length ?? 0) === 0 ? (
          <EmptyState
            title='No insights yet'
            description={emptyDescription}
            variant='compact'
            className='py-8'
          />
        ) : (
          query.data?.insights?.map((insight: AiInsightRecord) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </div>
    </FormSection>
  );
}
