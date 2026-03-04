'use client';

import React from 'react';

import { useSystemLogsContext } from '@/features/observability/context/SystemLogsContext';
import type { AiInsightRecord } from '@/shared/contracts/ai-insights';
import { Alert, Button, Card, FormSection, LoadingState, StatusBadge } from '@/shared/ui';
import { formatTimestamp } from '../utils/formatTimestamp';

export function AiLogInterpreter(): React.JSX.Element {
  const { runInsightMutation, insightsQuery } = useSystemLogsContext();

  return (
    <FormSection
      title='AI Insights Engine'
      description='Deep-scan error patterns and identify root causes automatically.'
      actions={
        <Button
          variant='outline'
          size='xs'
          className='h-8'
          onClick={() => runInsightMutation.mutate()}
          disabled={runInsightMutation.isPending}
        >
          {runInsightMutation.isPending ? 'Running interpretation...' : 'Generate New Insight'}
        </Button>
      }
      className='p-6'
    >
      <div className='mt-4 space-y-3'>
        {insightsQuery.isLoading ? (
          <LoadingState message='Consulting AI models...' className='py-4' size='sm' />
        ) : insightsQuery.data?.insights?.length ? (
          insightsQuery.data.insights.map((insight: AiInsightRecord) => (
            <Card key={insight.id} variant='glass' padding='md' className='bg-gray-950/40'>
              <div className='flex items-center justify-between mb-3'>
                <span className='text-[10px] font-mono text-gray-500 uppercase'>
                  {formatTimestamp(insight.createdAt ?? '')}
                </span>
                <StatusBadge status={insight.status} />
              </div>
              <p className='text-sm text-gray-200 leading-relaxed'>{insight.summary}</p>
              {(insight.warnings?.length ?? 0) > 0 && (
                <Alert variant='warning' className='mt-3 p-2 text-[11px] space-y-1'>
                  <span className='font-bold uppercase text-[9px] block mb-1'>
                    Advisory Warnings
                  </span>
                  {insight.warnings?.map((w, i) => (
                    <p key={i}>• {w}</p>
                  ))}
                </Alert>
              )}
            </Card>
          ))
        ) : (
          <div className='py-8 text-center text-xs text-gray-600 uppercase tracking-widest bg-black/20 rounded border border-white/5'>
            No intelligence reports available
          </div>
        )}
      </div>
    </FormSection>
  );
}
