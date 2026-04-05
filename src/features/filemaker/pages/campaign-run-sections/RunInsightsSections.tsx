import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { formatTimestamp } from '../filemaker-page-utils';
import type {
  FilemakerEmailCampaignDelivery,
} from '@/shared/contracts/filemaker';
import type { FilemakerEmailCampaignRunMetrics } from '../../types/campaigns';

interface RunMetricsSectionProps {
  metrics: FilemakerEmailCampaignRunMetrics;
  deliveries: FilemakerEmailCampaignDelivery[];
  queuedDeliveryCount: number;
}

export const RunMetricsSection = ({
  metrics,
  deliveries,
  queuedDeliveryCount,
}: RunMetricsSectionProps) => {
  const progressBase = metrics.recipientCount || 1;
  const progressPercent = Math.round(
    ((metrics.deliveredCount + metrics.failedCount + metrics.skippedCount) / progressBase) * 100
  );

  return (
    <FormSection title='Run Progress & Metrics' className='space-y-4 p-4'>
      <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Recipients</div>
          <div className='mt-1 text-lg font-semibold text-white'>{metrics.recipientCount}</div>
          <div className='text-[11px] text-gray-500'>{deliveries.length} tracked deliveries</div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Successfully Sent</div>
          <div className='mt-1 text-lg font-semibold text-emerald-400'>{metrics.deliveredCount}</div>
          <div className='text-[11px] text-gray-500'>
            Success rate: {Math.round((metrics.deliveredCount / progressBase) * 100)}%
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Failures</div>
          <div className='mt-1 text-lg font-semibold text-rose-400'>{metrics.failedCount}</div>
          <div className='text-[11px] text-gray-500'>
            Failure rate: {Math.round((metrics.failedCount / progressBase) * 100)}%
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Currently Queued</div>
          <div className='mt-1 text-lg font-semibold text-sky-400'>{queuedDeliveryCount}</div>
          <div className='text-[11px] text-gray-500'>Pending processing</div>
        </div>
      </div>
      <div className='space-y-1.5'>
        <div className='flex items-center justify-between text-[11px] text-gray-500'>
          <div className='uppercase tracking-widest'>Overall Progress</div>
          <div>{progressPercent}%</div>
        </div>
        <div className='h-2 w-full overflow-hidden rounded-full bg-slate-800'>
          <div
            className='h-full bg-sky-500 transition-all duration-500'
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </FormSection>
  );
};

interface RunAnalyticsOverviewSectionProps {
  unsubscribeEventCount: number;
  openedEventCount: number;
  clickedEventCount: number;
  resubscribedEventCount: number;
  latestOpenedAt: string | null;
  latestClickedAt: string | null;
  latestUnsubscribedAt: string | null;
  latestResubscribedAt: string | null;
  uniqueOpenCount: number;
  uniqueClickCount: number;
  sentCount: number;
}

export const RunAnalyticsOverviewSection = ({
  unsubscribeEventCount,
  openedEventCount,
  clickedEventCount,
  resubscribedEventCount,
  latestOpenedAt,
  latestClickedAt,
  latestUnsubscribedAt,
  latestResubscribedAt,
  uniqueOpenCount,
  uniqueClickCount,
  sentCount,
}: RunAnalyticsOverviewSectionProps) => {
  const openRate = sentCount > 0 ? Math.round((openedEventCount / sentCount) * 100) : 0;
  const uniqueOpenRate = sentCount > 0 ? Math.round((uniqueOpenCount / sentCount) * 100) : 0;
  const clickRate = sentCount > 0 ? Math.round((clickedEventCount / sentCount) * 100) : 0;
  const uniqueClickRate = sentCount > 0 ? Math.round((uniqueClickCount / sentCount) * 100) : 0;

  return (
    <FormSection title='Engagement & Activity' className='space-y-4 p-4'>
      <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Total Opens</div>
          <div className='mt-1 text-lg font-semibold text-white'>{openedEventCount}</div>
          <div className='text-[11px] text-gray-500'>
            Rate: {openRate}% • Unique: {uniqueOpenCount} ({uniqueOpenRate}%)
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Total Clicks</div>
          <div className='mt-1 text-lg font-semibold text-white'>{clickedEventCount}</div>
          <div className='text-[11px] text-gray-500'>
            Rate: {clickRate}% • Unique: {uniqueClickCount} ({uniqueClickRate}%)
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Unsubscribes</div>
          <div className='mt-1 text-lg font-semibold text-rose-400'>{unsubscribeEventCount}</div>
          <div className='text-[11px] text-gray-500'>
            Rate: {sentCount > 0 ? ((unsubscribeEventCount / sentCount) * 100).toFixed(1) : 0}%
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3'>
          <div className='text-[11px] text-gray-500'>Resubscribed</div>
          <div className='mt-1 text-lg font-semibold text-emerald-400'>{resubscribedEventCount}</div>
          <div className='text-[11px] text-gray-500'>Restored subscriptions</div>
        </div>
      </div>
      <div className='grid gap-3 text-[11px] text-gray-500 md:grid-cols-2'>
        <div>
          Latest open: {latestOpenedAt ? formatTimestamp(latestOpenedAt) : 'No opens tracked yet'}
        </div>
        <div>
          Latest click: {latestClickedAt ? formatTimestamp(latestClickedAt) : 'No clicks tracked yet'}
        </div>
        <div>
          Latest opt-out:{' '}
          {latestUnsubscribedAt ? formatTimestamp(latestUnsubscribedAt) : 'No opt-outs yet'}
        </div>
        <div>
          Latest restore:{' '}
          {latestResubscribedAt ? formatTimestamp(latestResubscribedAt) : 'No restores yet'}
        </div>
      </div>
    </FormSection>
  );
};
