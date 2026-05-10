import React from 'react';

import type { AiInsightRecord } from '@/shared/contracts/ai-insights';
import { StatusBadge, DocumentationList } from '@/shared/ui/data-display.public';
import { ResourceCard } from '@/shared/ui/navigation-and-layout.public';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const resolveRuntimeRiskTone = (runtimeRiskLevel: string): string => {
  if (runtimeRiskLevel === 'high') return 'text-red-300';
  if (runtimeRiskLevel === 'medium') return 'text-amber-300';
  if (runtimeRiskLevel === 'low') return 'text-emerald-300';
  return 'text-gray-300';
};

const resolveRuntimeRiskLevel = (
  insight: AiInsightRecord,
  metadata: Record<string, unknown> | null
): string => {
  const runtimeRiskLevelRaw =
    insight.type === 'runtime_analytics' ? metadata?.['runtimeKernelParityRiskLevel'] : null;
  return typeof runtimeRiskLevelRaw === 'string' ? runtimeRiskLevelRaw.trim().toLowerCase() : '';
};

export function InsightCard(props: { insight: AiInsightRecord }): React.JSX.Element {
  const { insight } = props;

  const warnings = insight.warnings ?? [];
  const recommendations = insight.recommendations ?? [];
  const metadata = asRecord(insight.metadata);
  const runtimeRiskLevel = resolveRuntimeRiskLevel(insight, metadata);
  const runtimeRiskTone = resolveRuntimeRiskTone(runtimeRiskLevel);
  const runtimeSignalsRaw = metadata?.['runtimeKernelParitySignals'];
  const runtimeSignals = Array.isArray(runtimeSignalsRaw)
    ? runtimeSignalsRaw
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(0, 4)
    : [];

  return (
    <ResourceCard
      title={new Date(insight.createdAt ?? 0).toLocaleString()}
      actions={<StatusBadge status={insight.status} />}
      className='text-xs text-gray-300'
    >
      <div className='text-xs text-gray-400'>{insight.name}</div>
      <div className='text-sm text-white'>{insight.summary}</div>
      {runtimeRiskLevel !== '' ? (
        <div className={`mt-1 text-xs uppercase tracking-wide ${runtimeRiskTone}`}>
          Kernel parity risk: {runtimeRiskLevel}
        </div>
      ) : null}
      <DocumentationList
        title='Kernel Parity Signals'
        items={runtimeSignals}
        variant='warning'
        size='sm'
      />
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
