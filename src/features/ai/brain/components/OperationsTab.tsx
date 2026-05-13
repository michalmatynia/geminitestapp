'use client';

import {
  Bot,
  GitBranch,
  Image as ImageIcon,
  WandSparkles,
} from 'lucide-react';
import React from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type {
  BrainOperationsDomainKey,
  BrainOperationsRange,
} from '@/shared/contracts/ai-brain';
import { Card } from '@/shared/ui/primitives.public';
import { CompactEmptyState, SectionHeader, UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

import { useBrain } from '../context/BrainContext';

import type { ComponentType } from 'react';
import {
  DomainCard,
  formatFreshness,
  formatUpdatedAt,
} from './OperationsTabSections';

const DOMAIN_ORDER: BrainOperationsDomainKey[] = [
  'ai_paths',
  'chatbot',
  'agent_runtime',
  'image_studio',
];

const DOMAIN_ICONS: Record<BrainOperationsDomainKey, ComponentType<{ className?: string }>> = {
  ai_paths: GitBranch,
  chatbot: Bot,
  agent_runtime: WandSparkles,
  image_studio: ImageIcon,
};

const RANGE_OPTIONS: Array<LabeledOptionWithDescriptionDto<BrainOperationsRange>> = [
  { value: '15m', label: 'Last 15m', description: 'Short incident window' },
  { value: '1h', label: 'Last 1h', description: 'Fast operational drift' },
  { value: '6h', label: 'Last 6h', description: 'Shift-level trend' },
  { value: '24h', label: 'Last 24h', description: 'Daily baseline' },
];

export function OperationsTab(): React.JSX.Element {
  const { operationsRange, setOperationsRange, operationsOverviewQuery } = useBrain();
  const data = operationsOverviewQuery.data;
  const [expandedDomain, setExpandedDomain] = React.useState<BrainOperationsDomainKey | null>(null);

  const selectedRangeLabel =
    RANGE_OPTIONS.find((option) => option.value === operationsRange)?.label ?? operationsRange;

  return (
    <div className='space-y-4'>
      <SectionHeader
        title='Operations'
        description='Read-only AI operations overview across core runtime domains.'
        actions={
          <div className='w-40'>
            <SelectSimple
              size='sm'
              value={operationsRange}
              onValueChange={(value: string): void =>
                setOperationsRange(value as BrainOperationsRange)
              }
              options={RANGE_OPTIONS}
              ariaLabel='Operations range'
             title='Select option'/>
          </div>
        }
      />

      {operationsOverviewQuery.isLoading && data === undefined ? (
        <Card variant='subtle' padding='md' className='border-border/60 bg-card/35'>
          <div className='text-xs text-gray-400'>Loading operations overview...</div>
        </Card>
      ) : null}

      {operationsOverviewQuery.isLoading === false && data === undefined ? (
        <CompactEmptyState
          title='Operations data unavailable'
          description={
            operationsOverviewQuery.error instanceof Error
              ? operationsOverviewQuery.error.message
              : 'Failed to load Brain operations overview.'
          }
         />
      ) : null}

      {data !== undefined ? (
        <div className='space-y-4'>
          <div className='text-[11px] text-gray-500'>
            Snapshot: {formatUpdatedAt(data.generatedAt)} ({formatFreshness(data.generatedAt)}) ·
            Range: {selectedRangeLabel}
          </div>

          <div className={`${UI_GRID_RELAXED_CLASSNAME} lg:grid-cols-2`}>
            {DOMAIN_ORDER.map((key: BrainOperationsDomainKey) => {
              const domain = data.domains[key];
              const Icon = DOMAIN_ICONS[key];

              return (
                <DomainCard
                  key={key}
                  domainKey={key}
                  domain={domain}
                  Icon={Icon}
                  isExpanded={expandedDomain === key}
                  onToggleExpand={() => setExpandedDomain(expandedDomain === key ? null : key)}
                  selectedRangeLabel={selectedRangeLabel}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
