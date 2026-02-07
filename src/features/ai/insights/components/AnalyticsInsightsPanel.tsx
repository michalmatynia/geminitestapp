'use client';

import React from 'react';

import type { AiInsightRecord } from '@/shared/types';
import { Button, SectionPanel } from '@/shared/ui';

import { InsightCard } from './InsightCard';
import { useInsights } from '../context/InsightsContext';

export function AnalyticsInsightsPanel(): React.JSX.Element {
  const { analyticsQuery, runAnalyticsMutation } = useInsights();

  return (
    <SectionPanel className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Analytics Insights</h2>
          <p className="text-xs text-gray-400">Interaction anomalies, traffic changes, and warnings.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => runAnalyticsMutation.mutate()}
          disabled={runAnalyticsMutation.isPending}
        >
          {runAnalyticsMutation.isPending ? 'Running...' : 'Run'}
        </Button>
      </div>
      <div className="mt-3 space-y-3">
        {analyticsQuery.isLoading ? (
          <div className="text-xs text-gray-400">Loading insights…</div>
        ) : analyticsQuery.error ? (
          <div className="text-xs text-red-400">{analyticsQuery.error.message}</div>
        ) : (analyticsQuery.data?.insights?.length ?? 0) === 0 ? (
          <div className="text-xs text-gray-500">No insights yet.</div>
        ) : (
          analyticsQuery.data?.insights.map((insight: AiInsightRecord) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </div>
    </SectionPanel>
  );
}
