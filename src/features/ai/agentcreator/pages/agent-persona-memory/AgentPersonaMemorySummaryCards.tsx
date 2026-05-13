'use client';

import type React from 'react';

import type { PersonaMemorySummary } from '@/shared/contracts/persona-memory';
import { Card } from '@/shared/ui/primitives.public';
import { Hint } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

type SummaryMetric = {
  hint: string;
  resolve: (summary: PersonaMemorySummary | null) => string | number;
};

const SUMMARY_METRICS: SummaryMetric[] = [
  { hint: 'Records', resolve: (s) => s?.totalRecords ?? 0 },
  { hint: 'Memory entries', resolve: (s) => s?.memoryEntryCount ?? 0 },
  { hint: 'Chat messages', resolve: (s) => s?.conversationMessageCount ?? 0 },
  { hint: 'Suggested mood', resolve: (s) => s?.suggestedMoodId ?? '-' },
];

type AgentPersonaMemorySummaryCardsProps = {
  summary: PersonaMemorySummary | null;
};

export function AgentPersonaMemorySummaryCards({
  summary,
}: AgentPersonaMemorySummaryCardsProps): React.JSX.Element {
  return (
    <div className={`${UI_GRID_RELAXED_CLASSNAME} mb-6 md:grid-cols-4`}>
      {SUMMARY_METRICS.map((metric) => (
        <Card
          key={metric.hint}
          variant='subtle-compact'
          padding='sm'
          className='border-border/60 bg-black/30'
        >
          <Hint size='xxs' uppercase>
            {metric.hint}
          </Hint>
          <div className='mt-2 text-2xl font-semibold text-white'>{metric.resolve(summary)}</div>
        </Card>
      ))}
    </div>
  );
}
