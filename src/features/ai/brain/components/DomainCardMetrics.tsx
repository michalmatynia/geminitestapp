import React from 'react';
import type {
  BrainOperationsDomainKey,
  BrainOperationsMetric,
} from '@/shared/contracts/ai-brain';
import {
  formatMetricValue,
  metricCellToneClass,
  metricValueToneClass,
} from './operations-tab-utils';

export function DomainCardMetrics({
  domainKey,
  metrics,
}: {
  domainKey: BrainOperationsDomainKey;
  metrics: BrainOperationsMetric[];
}): React.JSX.Element {
  return (
    <div className='grid grid-cols-2 gap-2'>
      {metrics.map((metric) => (
        <div
          key={`${domainKey}:${metric.key}`}
          className={`rounded-md border px-2 py-1.5 ${metricCellToneClass(domainKey, metric)}`}
        >
          <div className='text-[10px] uppercase text-gray-500'>{metric.label}</div>
          <div className={`text-xs ${metricValueToneClass(domainKey, metric)}`}>
            {formatMetricValue(metric.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
