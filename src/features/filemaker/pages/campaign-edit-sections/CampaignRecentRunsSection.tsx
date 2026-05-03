'use client';

import { Badge, Button } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignRun,
} from '@/shared/contracts/filemaker';
import {
  getFilemakerEmailCampaignDeliveriesForRun,
  summarizeFilemakerEmailCampaignRunDeliveries,
} from '../../settings';
import type { FilemakerEmailCampaignRunMetrics } from '../../types/campaigns';
import { useCampaignEditContext } from '../AdminFilemakerCampaignEditPage.context';
import { getRunActions } from '../AdminFilemakerCampaignEditPage.utils';
import { formatTimestamp } from '../filemaker-page-utils';
import { startTransition, type ReactElement } from 'react';

type RecentRunCardProps = {
  run: FilemakerEmailCampaignRun;
  runDeliveries: FilemakerEmailCampaignDelivery[];
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
  isUpdatePending: boolean;
  isRunActionPending: (
    runId: string,
    action: ReturnType<typeof getRunActions>[number]['action']
  ) => boolean;
  handleRunAction: (
    runId: string,
    action: ReturnType<typeof getRunActions>[number]['action']
  ) => Promise<void>;
  openRunMonitor: (runId: string) => void;
};

const resolveRunMetrics = (
  run: FilemakerEmailCampaignRun,
  runDeliveries: FilemakerEmailCampaignDelivery[]
): FilemakerEmailCampaignRunMetrics =>
  runDeliveries.length > 0
    ? summarizeFilemakerEmailCampaignRunDeliveries(runDeliveries)
    : {
        recipientCount: run.recipientCount,
        deliveredCount: run.deliveredCount,
        failedCount: run.failedCount,
        skippedCount: run.skippedCount,
      };

const resolveProgressPercent = (metrics: FilemakerEmailCampaignRunMetrics): number => {
  const progressBase = metrics.recipientCount > 0 ? metrics.recipientCount : 1;
  const processedCount = metrics.deliveredCount + metrics.failedCount + metrics.skippedCount;
  return Math.round((processedCount / progressBase) * 100);
};

const RecentRunCard = ({
  run,
  runDeliveries,
  attemptRegistry,
  isUpdatePending,
  isRunActionPending,
  handleRunAction,
  openRunMonitor,
}: RecentRunCardProps): ReactElement => {
  const metrics = resolveRunMetrics(run, runDeliveries);
  const progressPercent = resolveProgressPercent(metrics);

  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-card/25 p-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='space-y-1'>
          <div className='text-sm font-medium text-white'>{run.id}</div>
          <div className='text-[11px] text-gray-400'>
            {run.mode === 'dry_run' ? 'Dry run' : 'Live run'} • {formatTimestamp(run.createdAt)}
          </div>
        </div>
        <Badge variant='outline' className='text-[10px] capitalize'>
          {run.status}
        </Badge>
      </div>
      <div className='grid gap-2 text-[11px] text-gray-500 md:grid-cols-4'>
        <div>Recipients: {metrics.recipientCount}</div>
        <div>Delivered: {metrics.deliveredCount}</div>
        <div>Failed: {metrics.failedCount}</div>
        <div>Skipped: {metrics.skippedCount}</div>
      </div>
      <div className='text-[11px] text-gray-500'>Progress: {progressPercent}%</div>
      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={(): void => {
            openRunMonitor(run.id);
          }}
        >
          Open Run Monitor
        </Button>
        {getRunActions({ run, deliveries: runDeliveries, attemptRegistry }).map((action) => (
          <Button
            key={`${run.id}-${action.action}`}
            type='button'
            size='sm'
            variant='outline'
            disabled={isUpdatePending || isRunActionPending(run.id, action.action)}
            onClick={(): void => {
              void handleRunAction(run.id, action.action);
            }}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export const RecentRunsSection = (): ReactElement => {
  const {
    recentRuns,
    deliveryRegistry,
    attemptRegistry,
    handleRunAction,
    isRunActionPending,
    isUpdatePending,
    router,
  } = useCampaignEditContext();

  const openRunMonitor = (runId: string): void => {
    startTransition(() => {
      router.push(`/admin/filemaker/campaigns/runs/${encodeURIComponent(runId)}`);
    });
  };

  return (
    <FormSection title='Recent Runs' className='space-y-4 p-4'>
      {recentRuns.length === 0 ? (
        <div className='text-sm text-gray-500'>
          No runs yet. Create a dry run or launch the campaign to start monitoring progress.
        </div>
      ) : (
        recentRuns.map((run: FilemakerEmailCampaignRun) => (
          <RecentRunCard
            key={run.id}
            run={run}
            runDeliveries={getFilemakerEmailCampaignDeliveriesForRun(deliveryRegistry, run.id)}
            attemptRegistry={attemptRegistry}
            isUpdatePending={isUpdatePending}
            isRunActionPending={isRunActionPending}
            handleRunAction={handleRunAction}
            openRunMonitor={openRunMonitor}
          />
        ))
      )}
    </FormSection>
  );
};
