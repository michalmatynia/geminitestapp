import { Alert, Badge, Button, LoadingState, StatusBadge } from '@/features/kangur/shared/ui';
import { KangurAdminStatusCard } from '../components/KangurAdminStatusCard';
import { SummaryContent } from '../components/observability/SummaryContent';
import { formatDateTime, formatNumber } from '../components/observability/utils';
import { ObservabilitySummaryContext } from '../AdminKangurObservabilityPage';

export function SummarySection({ range, summary }: any) {
  return (
    <ObservabilitySummaryContext.Provider value={{ range, summary }}>
        <div className='grid xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-8'>
            <SummaryContent />
            <KangurAdminStatusCard
              title='Status'
              statusBadge={<StatusBadge status={summary.overallStatus} size='sm' />}
              items={[
                { label: 'Range', value: <Badge variant='outline'>{range}</Badge> },
                { label: 'Generated', value: <span className='font-semibold'>{formatDateTime(summary.generatedAt)}</span> },
                { label: 'Events', value: <span className='font-semibold'>{formatNumber(summary.analytics.totals.events)}</span> },
              ]}
            />
        </div>
    </ObservabilitySummaryContext.Provider>
  );
}
