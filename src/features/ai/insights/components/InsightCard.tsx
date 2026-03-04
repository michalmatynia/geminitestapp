import React from 'react';

import type { AiInsightRecord } from '@/shared/contracts';
import { StatusBadge, ResourceCard, DocumentationList } from '@/shared/ui';

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
      <DocumentationList title='Warnings' items={warnings} variant='warning' size='sm' />
      <DocumentationList
        title='Recommendations'
        items={recommendations}
        variant='recommendation'
        size='sm'
      />
    </ResourceCard>
  );
}
