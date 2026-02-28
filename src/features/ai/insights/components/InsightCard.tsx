

import React from 'react';

import type { AiInsightRecord } from '@/shared/contracts';
import { StatusBadge, ResourceCard, DocumentationSection } from '@/shared/ui';

export function InsightCard({ insight }: { insight: AiInsightRecord }): React.JSX.Element {
  const warnings = insight.warnings ?? [];
  const recommendations = insight.recommendations ?? [];

  return (
    <ResourceCard
      title={new Date(insight.createdAt || 0).toLocaleString()}
      actions={<StatusBadge status={insight.status} />}
      className='text-xs text-gray-300'
    >
      <div className='text-sm text-white'>{insight.summary}</div>
      {warnings.length > 0 ? (
        <DocumentationSection
          title='Warnings'
          className='mt-3 p-3 bg-amber-500/5 border-amber-500/20'
        >
          <ul className='list-disc space-y-1 pl-4 text-[11px] text-amber-200'>
            {warnings.map((warning: string, index: number) => (
              <li key={`${insight.id}-warn-${index}`}>{warning}</li>
            ))}
          </ul>
        </DocumentationSection>
      ) : null}
      {recommendations.length > 0 ? (
        <DocumentationSection
          title='Recommendations'
          className='mt-3 p-3 bg-blue-500/5 border-blue-500/20'
        >
          <ul className='list-disc space-y-1 pl-4 text-[11px] text-blue-200'>
            {recommendations.map((rec: string, index: number) => (
              <li key={`${insight.id}-rec-${index}`}>{rec}</li>
            ))}
          </ul>
        </DocumentationSection>
      ) : null}
    </ResourceCard>
  );
}
