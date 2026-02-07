'use client';

import React from 'react';

import type { AiInsightRecord } from '@/shared/types';
import { Button, SectionPanel } from '@/shared/ui';

import { InsightCard } from './InsightCard';
import { useInsights } from '../context/InsightsContext';

export function LogInsightsPanel(): React.JSX.Element {
  const { logsQuery, runLogsMutation } = useInsights();

  return (
    <SectionPanel className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Log Insights</h2>
          <p className="text-xs text-gray-400">Error patterns, regressions, and suggested fixes.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => runLogsMutation.mutate()}
          disabled={runLogsMutation.isPending}
        >
          {runLogsMutation.isPending ? 'Running...' : 'Run'}
        </Button>
      </div>
      <div className="mt-3 space-y-3">
        {logsQuery.isLoading ? (
          <div className="text-xs text-gray-400">Loading insights…</div>
        ) : logsQuery.error ? (
          <div className="text-xs text-red-400">{logsQuery.error.message}</div>
        ) : (logsQuery.data?.insights?.length ?? 0) === 0 ? (
          <div className="text-xs text-gray-500">No insights yet.</div>
        ) : (
          logsQuery.data?.insights.map((insight: AiInsightRecord) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </div>
    </SectionPanel>
  );
}
