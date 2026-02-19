'use client';

import React from 'react';

import type { AiInsightRecord } from '@/shared/types';
import { StatusBadge, ResourceCard, DocumentationSection } from '@/shared/ui';

export function InsightCard({ insight }: { insight: AiInsightRecord }): React.JSX.Element {
  return (
    <ResourceCard
      title={new Date(insight.createdAt).toLocaleString()}
      actions={<StatusBadge status={insight.status} />}
      className='text-xs text-gray-300'
    >
      <div className='text-sm text-white'>{insight.summary}</div>
      {insight.warnings.length > 0 ? (
        <DocumentationSection title='Warnings' className='mt-3 p-3 bg-amber-500/5 border-amber-500/20'>
          <ul className='list-disc space-y-1 pl-4 text-[11px] text-amber-200'>
            {insight.warnings.map((warning: string, index: number) => (
              <li key={`${insight.id}-warn-${index}`}>{warning}</li>
            ))}
          </ul>
        </DocumentationSection>
      ) : null}
    </ResourceCard>
  );
}
