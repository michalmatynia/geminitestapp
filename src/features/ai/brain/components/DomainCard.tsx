import React from 'react';
import { Minus } from 'lucide-react';
import type { ComponentType } from 'react';

import { Card } from '@/shared/ui/primitives.public';
import type {
  BrainOperationsDomainKey,
  BrainOperationsDomainOverview,
} from '@/shared/contracts/ai-brain';

import {
  formatTrendValue,
  TREND_ICON,
  trendToneClass,
} from './operations-tab-utils';
import { DomainCardEvents } from './DomainCardEvents';
import { DomainCardMetrics } from './DomainCardMetrics';
import { DomainCardRiskSummary } from './DomainCardRiskSummary';
import { DomainCardHeader } from './DomainCardHeader';
import { DomainCardLinks } from './DomainCardLinks';

export function DomainCard({
  domainKey,
  domain,
  Icon,
  isExpanded,
  onToggleExpand,
  selectedRangeLabel,
}: {
  domainKey: BrainOperationsDomainKey;
  domain: BrainOperationsDomainOverview;
  Icon: ComponentType<{ className?: string }>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  selectedRangeLabel: string;
}): React.JSX.Element {
  const trend = domain.trend;
  const TrendIcon = trend !== undefined ? TREND_ICON[trend.direction] : Minus;

  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-card/35 space-y-3'>
      <DomainCardHeader domain={domain} Icon={Icon} />

      {domain.message !== undefined && domain.message !== '' && (
        <div className='text-xs text-gray-300'>{domain.message}</div>
      )}

      <DomainCardRiskSummary domainKey={domainKey} metrics={domain.metrics} />

      {trend !== undefined && (
        <div className='flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-2 py-1.5 text-[11px]'>
          <div className='text-gray-400'>{trend.label}</div>
          <div className={`inline-flex items-center gap-1 ${trendToneClass(trend)}`}>
            <TrendIcon className='size-3' />
            {formatTrendValue(trend)}
          </div>
        </div>
      )}

      <DomainCardMetrics domainKey={domainKey} metrics={domain.metrics} />

      <DomainCardLinks
        domainKey={domainKey}
        links={domain.links}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />

      {isExpanded && (
        <DomainCardEvents
          domainKey={domainKey}
          recentEvents={domain.recentEvents}
          selectedRangeLabel={selectedRangeLabel}
        />
      )}
    </Card>
  );
}
