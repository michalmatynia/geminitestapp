import React from 'react';
import type { ComponentType } from 'react';
import { StatusBadge } from '@/shared/ui/data-display.public';
import type { BrainOperationsDomainOverview } from '@/shared/contracts/ai-brain';
import { formatFreshness } from './operations-tab-utils';

export function DomainCardHeader({
  domain,
  Icon,
}: {
  domain: BrainOperationsDomainOverview;
  Icon: ComponentType<{ className?: string }>;
}): React.JSX.Element {
  return (
    <div className='flex items-start justify-between gap-3'>
      <div className='space-y-1'>
        <div className='flex items-center gap-2'>
          <Icon className='size-4 text-emerald-300' />
          <div className='text-sm font-semibold text-white'>{domain.label}</div>
        </div>
        <div className='text-[11px] text-gray-500'>
          Updated {formatFreshness(domain.updatedAt)} · sample {domain.sampleSize}
        </div>
      </div>
      <StatusBadge
        status={domain.state}
        label={domain.state.toUpperCase()}
        size='sm'
        className='font-bold'
      />
    </div>
  );
}
