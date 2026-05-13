'use client';

import React from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type {
  BrainOperationsDomainKey,
  BrainOperationsRange,
  BrainOperationsOverviewResponse,
} from '@/shared/contracts/ai-brain';
import { Card } from '@/shared/ui/primitives.public';
import { CompactEmptyState, SectionHeader, UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

import { useBrain } from '../context/BrainContext';

import {
  DOMAIN_ICONS,
  DOMAIN_ORDER,
  formatFreshness,
  formatUpdatedAt,
} from './operations-tab-utils';
import { DomainCard } from './DomainCard';

const RANGE_OPTIONS: Array<LabeledOptionWithDescriptionDto<BrainOperationsRange>> = [
  { value: '15m', label: 'Last 15m', description: 'Short incident window' },
  { value: '1h', label: 'Last 1h', description: 'Fast operational drift' },
  { value: '6h', label: 'Last 6h', description: 'Shift-level trend' },
  { value: '24h', label: 'Last 24h', description: 'Daily baseline' },
];

function OperationsTabHeader({
  operationsRange,
  setOperationsRange,
}: {
  operationsRange: BrainOperationsRange;
  setOperationsRange: (value: BrainOperationsRange) => void;
}): React.JSX.Element {
  return (
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
            title='Select option'
          />
        </div>
      }
    />
  );
}

function OperationsTabGrid({
  data,
  selectedRangeLabel,
  expandedDomain,
  setExpandedDomain,
}: {
  data: BrainOperationsOverviewResponse;
  selectedRangeLabel: string;
  expandedDomain: BrainOperationsDomainKey | null;
  setExpandedDomain: (key: BrainOperationsDomainKey | null) => void;
}): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='text-[11px] text-gray-500'>
        Snapshot: {formatUpdatedAt(data.generatedAt)} ({formatFreshness(data.generatedAt)}) ·
        Range: {selectedRangeLabel}
      </div>

      <div className={`${UI_GRID_RELAXED_CLASSNAME} lg:grid-cols-2`}>
        {DOMAIN_ORDER.map((key) => (
          <DomainCard
            key={key}
            domainKey={key}
            domain={data.domains[key]}
            Icon={DOMAIN_ICONS[key]}
            isExpanded={expandedDomain === key}
            onToggleExpand={() => setExpandedDomain(expandedDomain === key ? null : key)}
            selectedRangeLabel={selectedRangeLabel}
          />
        ))}
      </div>
    </div>
  );
}

function OperationsTabStatus({
  isLoading,
  error,
}: {
  isLoading: boolean;
  error: unknown;
}): React.JSX.Element | null {
  if (isLoading) {
    return (
      <Card variant='subtle' padding='md' className='border-border/60 bg-card/35'>
        <div className='text-xs text-gray-400'>Loading operations overview...</div>
      </Card>
    );
  }

  if (error !== null && error !== undefined) {
    return (
      <CompactEmptyState
        title='Operations data unavailable'
        description={
          error instanceof Error ? error.message : 'Failed to load Brain operations overview.'
        }
      />
    );
  }

  return null;
}

export function OperationsTab(): React.JSX.Element {
  const { operationsRange, setOperationsRange, operationsOverviewQuery } = useBrain();
  const data = operationsOverviewQuery.data;
  const [expandedDomain, setExpandedDomain] = React.useState<BrainOperationsDomainKey | null>(null);

  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.value === operationsRange)?.label ?? operationsRange;

  return (
    <div className='space-y-4'>
      <OperationsTabHeader
        operationsRange={operationsRange}
        setOperationsRange={setOperationsRange}
      />

      {data === undefined ? (
        <OperationsTabStatus
          isLoading={operationsOverviewQuery.isLoading}
          error={operationsOverviewQuery.error}
        />
      ) : (
        <OperationsTabGrid
          data={data}
          selectedRangeLabel={rangeLabel}
          expandedDomain={expandedDomain}
          setExpandedDomain={setExpandedDomain}
        />
      )}
    </div>
  );
}
