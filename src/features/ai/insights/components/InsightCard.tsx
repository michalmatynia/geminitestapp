'use client';

import React from 'react';

import type { AiInsightRecord } from '@/shared/types';

const statusClass = (status: AiInsightRecord['status']): string => {
  if (status === 'ok') return 'border-emerald-500/40 text-emerald-200';
  if (status === 'warning') return 'border-amber-500/40 text-amber-200';
  return 'border-rose-500/40 text-rose-200';
};

export function InsightCard({ insight }: { insight: AiInsightRecord }): React.JSX.Element {
  return (
    <div className="rounded-md border border-border/60 bg-gray-950/40 p-3 text-xs text-gray-300">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase text-gray-500">
          {new Date(insight.createdAt).toLocaleString()}
        </span>
        <span className={`rounded border px-2 py-0.5 text-[10px] ${statusClass(insight.status)}`}>
          {insight.status}
        </span>
      </div>
      <div className="mt-2 text-sm text-white">{insight.summary}</div>
      {insight.warnings.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-200">
          {insight.warnings.map((warning: string, index: number) => (
            <li key={`${insight.id}-warn-${index}`}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
