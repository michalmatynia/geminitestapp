'use client';

import React from 'react';

import type { AiInsightRecord } from '@/shared/types';
import { StatusBadge } from '@/shared/ui';

export function InsightCard({ insight }: { insight: AiInsightRecord }): React.JSX.Element {
  return (
    <div className='rounded-md border border-border/60 bg-gray-950/40 p-3 text-xs text-gray-300'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-[10px] uppercase text-gray-500'>
          {new Date(insight.createdAt).toLocaleString()}
        </span>
        <StatusBadge status={insight.status} />
      </div>
      <div className='mt-2 text-sm text-white'>{insight.summary}</div>
      {insight.warnings.length > 0 ? (
        <ul className='mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-200'>
          {insight.warnings.map((warning: string, index: number) => (
            <li key={`${insight.id}-warn-${index}`}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
