'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '@/shared/lib/api-client';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  AdminFilemakerBreadcrumbs,
  Badge,
  Button,
  FormActions,
  FormSection,
  SectionHeader,
  useToast,
} from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  createFilemakerEmailCampaignEvent,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  getFilemakerEmailCampaignDeliveryAttemptsForRun,
  getFilemakerEmailCampaignDeliveriesForRun,
  getFilemakerEmailCampaignEventsForRun,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignDeliveryAttemptRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  resolveFilemakerEmailCampaignRunStatusFromDeliveries,
  resolveFilemakerEmailCampaignRetryableDeliveries,
  summarizeFilemakerEmailCampaignRunDeliveries,
  syncFilemakerEmailCampaignRunWithDeliveries,
  toPersistedFilemakerEmailCampaignDeliveryRegistry,
  toPersistedFilemakerEmailCampaignEventRegistry,
  toPersistedFilemakerEmailCampaignRunRegistry,
} from '../settings';
import { decodeRouteParam, formatTimestamp } from './filemaker-page-utils';

import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttempt,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignProcessRunResponse,
  FilemakerEmailCampaignDeliveryStatus,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunStatus,
} from '../types';

import { RunMetricsSection, RunAnalyticsOverviewSection } from './campaign-run-sections/RunInsightsSections';
import { RunDeliveryLogSection } from './campaign-run-sections/RunDeliveryLogSection';

const DELIVERY_STATUS_LABELS: Record<FilemakerEmailCampaignDeliveryStatus, string> = {
  queued: 'Queued',
  sent: 'Sent',
  failed: 'Failed',
  skipped: 'Skipped',
  bounced: 'Bounced',
};

const CAMPAIGN_EVENT_LABELS: Record<FilemakerEmailCampaignEvent['type'], string> = {
  created: 'Created',
  updated: 'Updated',
  unsubscribed: 'Unsubscribed',
  resubscribed: 'Resubscribed',
  opened: 'Opened',
  clicked: 'Clicked',
  launched: 'Launched',
  processing_started: 'Processing started',
  delivery_sent: 'Delivery sent',
  delivery_failed: 'Delivery failed',
  delivery_bounced: 'Delivery bounced',
  status_changed: 'Status changed',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const resolveRunActionOptions = (
  status: FilemakerEmailCampaignRunStatus
): Array<{ label: string; nextStatus: FilemakerEmailCampaignRunStatus }> => {
  if (status === 'pending' || status === 'queued') {
    return [{ label: 'Mark Running', nextStatus: 'running' }];
  }
  if (status === 'running') {
    return [
      { label: 'Mark Completed', nextStatus: 'completed' },
      { label: 'Mark Failed', nextStatus: 'failed' },
      { label: 'Cancel Run', nextStatus: 'cancelled' },
    ];
  }
  return [];
};

export function AdminFilemakerCampaignRunPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const [isProcessingQueuedDeliveries, setIsProcessingQueuedDeliveries] = useState(false);

  const runId = useMemo(() => decodeRouteParam(params['runId']), [params]);

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawRuns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY);
  const rawDeliveries = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY);
  const rawAttempts = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY);
  const rawEvents = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY);

  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const campaignRegistry = useMemo(() => parseFilemakerEmailCampaignRegistry(rawCampaigns), [rawCampaigns]);
  const runRegistry = useMemo(() => parseFilemakerEmailCampaignRunRegistry(rawRuns), [rawRuns]);
  const deliveryRegistry = useMemo(() => parseFilemakerEmailCampaignDeliveryRegistry(rawDeliveries), [rawDeliveries]);
  const attemptRegistry = useMemo(() => parseFilemakerEmailCampaignDeliveryAttemptRegistry(rawAttempts), [rawAttempts]);
  const eventRegistry = useMemo(() => parseFilemakerEmailCampaignEventRegistry(rawEvents), [rawEvents]);

  const run = useMemo(() => runRegistry.runs.find((entry: FilemakerEmailCampaignRun) => entry.id === runId) ?? null, [runId, runRegistry.runs]);
  const campaign = useMemo(() => run ? campaignRegistry.campaigns.find((entry) => entry.id === run.campaignId) ?? null : null, [campaignRegistry.campaigns, run]);
  const deliveries = useMemo(() => getFilemakerEmailCampaignDeliveriesForRun(deliveryRegistry, runId), [deliveryRegistry, runId]);
  const deliveryAttempts = useMemo(() => getFilemakerEmailCampaignDeliveryAttemptsForRun(attemptRegistry, runId), [attemptRegistry, runId]);
  const runEvents = useMemo(() => getFilemakerEmailCampaignEventsForRun(eventRegistry, runId), [eventRegistry, runId]);
  
  const attemptsByDeliveryId = useMemo(() => {
    const map = new Map<string, FilemakerEmailCampaignDeliveryAttempt[]>();
    deliveryAttempts.forEach((attempt) => {
      const existing = map.get(attempt.deliveryId) ?? [];
      existing.push(attempt);
      map.set(attempt.deliveryId, existing);
    });
    Array.from(map.values()).forEach((attempts) => {
      attempts.sort((left, right) => Date.parse(right.attemptedAt ?? right.createdAt ?? '') - Date.parse(left.attemptedAt ?? left.createdAt ?? ''));
    });
    return map;
  }, [deliveryAttempts]);

  const metrics = useMemo(() => summarizeFilemakerEmailCampaignRunDeliveries(deliveries), [deliveries]);
  const resolvedRunStatus = useMemo(() => run ? resolveFilemakerEmailCampaignRunStatusFromDeliveries({ currentStatus: run.status, deliveries }) : null, [deliveries, run]);
  const queuedDeliveryCount = useMemo(() => deliveries.filter((delivery: FilemakerEmailCampaignDelivery) => delivery.status === 'queued').length, [deliveries]);
  
  const retrySummary = useMemo(() => resolveFilemakerEmailCampaignRetryableDeliveries({ deliveries, attemptRegistry }), [attemptRegistry, deliveries]);
  const retryableDeliveryIds = useMemo(() => new Set(retrySummary.retryableDeliveries.map((delivery) => delivery.id)), [retrySummary]);
  const exhaustedRetryDeliveryIds = useMemo(() => new Set(retrySummary.exhaustedDeliveries.map((delivery) => delivery.id)), [retrySummary]);

  const unsubscribeEventCount = useMemo(() => runEvents.filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'unsubscribed').length, [runEvents]);
  const openedEventCount = useMemo(() => runEvents.filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'opened').length, [runEvents]);
  const clickedEventCount = useMemo(() => runEvents.filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'clicked').length, [runEvents]);
  const resubscribedEventCount = useMemo(() => runEvents.filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'resubscribed').length, [runEvents]);

  const latestOpenedAt = useMemo(() => runEvents.filter((event: FilemakerEmailCampaignEvent) => event.type === 'opened').map((event) => event.createdAt ?? null).filter((value): value is string => Boolean(value)).sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null, [runEvents]);
  const latestClickedAt = useMemo(() => runEvents.filter((event: FilemakerEmailCampaignEvent) => event.type === 'clicked').map((event) => event.createdAt ?? null).filter((value): value is string => Boolean(value)).sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null, [runEvents]);
  const latestUnsubscribedAt = useMemo(() => runEvents.filter((event: FilemakerEmailCampaignEvent) => event.type === 'unsubscribed').map((event) => event.createdAt ?? null).filter((value): value is string => Boolean(value)).sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null, [runEvents]);
  const latestResubscribedAt = useMemo(() => runEvents.filter((event: FilemakerEmailCampaignEvent) => event.type === 'resubscribed').map((event) => event.createdAt ?? null).filter((value): value is string => Boolean(value)).sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null, [runEvents]);

  const uniqueOpenCount = useMemo(() => runEvents.filter(e => e.type === 'opened').reduce((acc, e) => { if (e.deliveryId) acc.add(e.deliveryId); return acc; }, new Set<string>()).size, [runEvents]);
  const uniqueClickCount = useMemo(() => runEvents.filter(e => e.type === 'clicked').reduce((acc, e) => { if (e.deliveryId) acc.add(e.deliveryId); return acc; }, new Set<string>()).size, [runEvents]);

  const handleRunStatusChange = async (nextStatus: FilemakerEmailCampaignRunStatus): Promise<void> => {
    if (!run) return;
    const nextRuns = runRegistry.runs.map((r) => r.id === run.id ? { ...r, status: nextStatus, updatedAt: new Date().toISOString() } : r);
    await updateSetting.mutateAsync({ key: FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY, value: toPersistedFilemakerEmailCampaignRunRegistry({ ...runRegistry, runs: nextRuns }) });
    toast({ title: `Run status updated to ${nextStatus}`, variant: 'success' });
  };

  const handleSyncStatus = async (): Promise<void> => {
    if (!run) return;
    const { nextRun, nextRegistry } = syncFilemakerEmailCampaignRunWithDeliveries(run, runRegistry, deliveries);
    await updateSetting.mutateAsync({ key: FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY, value: toPersistedFilemakerEmailCampaignRunRegistry(nextRegistry) });
    toast({ title: 'Run status synchronized with deliveries', variant: 'success' });
  };

  const handleRetryDelivery = async (deliveryId: string): Promise<void> => {
    try {
      await api.post<FilemakerEmailCampaignProcessRunResponse>('/api/filemaker/campaigns/process', { runId, deliveryIds: [deliveryId] });
      toast({ title: 'Retry task queued', variant: 'success' });
    } catch (error) {
      logClientError(error, { source: 'filemaker-run-retry', deliveryId });
      toast({ title: 'Failed to queue retry', variant: 'error' });
    }
  };

  const handleProcessQueued = async (): Promise<void> => {
    setIsProcessingQueuedDeliveries(true);
    try {
      await api.post<FilemakerEmailCampaignProcessRunResponse>('/api/filemaker/campaigns/process', { runId });
      toast({ title: 'Processing task queued', variant: 'success' });
    } catch (error) {
      logClientError(error, { source: 'filemaker-run-process' });
      toast({ title: 'Failed to queue processing', variant: 'error' });
    } finally {
      setIsProcessingQueuedDeliveries(false);
    }
  };

  if (!run || !campaign) {
    return (
      <div className='flex h-full flex-col items-center justify-center space-y-4 p-12 text-center'>
        <div className='text-lg font-semibold text-white'>Run not found</div>
        <div className='text-sm text-gray-400'>The campaign run you are looking for does not exist or has been removed.</div>
        <Button onClick={() => router.push('/admin/filemaker/campaigns')}>Back to Campaigns</Button>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-6xl space-y-6 p-6'>
      <div className='flex items-center justify-between gap-4'>
        <div className='space-y-1'>
          <AdminFilemakerBreadcrumbs currentPage={run.id} />
          <h1 className='text-2xl font-black tracking-tight text-white'>Run Monitor: {run.id}</h1>
          <div className='flex items-center gap-2 text-xs text-gray-400'>
            <span>Campaign: <strong>{campaign.name}</strong></span>
            <span>•</span>
            <span>Mode: <strong>{run.mode === 'dry_run' ? 'Dry Run' : 'Live Run'}</strong></span>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <Badge variant={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'error' : 'outline'} className='h-8 px-3 text-xs uppercase font-bold tracking-widest'>
            {run.status}
          </Badge>
          <Button variant='surface' onClick={() => router.push(`/admin/filemaker/campaigns/edit/${encodeURIComponent(campaign.id)}`)}>Edit Campaign</Button>
        </div>
      </div>

      <RunMetricsSection metrics={metrics} deliveries={deliveries} queuedDeliveryCount={queuedDeliveryCount} />

      <FormSection title='Run Management' className='space-y-4 p-4'>
        <div className='flex flex-wrap items-center gap-3'>
          {resolveRunActionOptions(run.status).map((option) => (
            <Button key={option.nextStatus} onClick={() => void handleRunStatusChange(option.nextStatus)} variant='surface' size='sm'>{option.label}</Button>
          ))}
          <Button onClick={handleSyncStatus} disabled={run.status === resolvedRunStatus} variant='outline' size='sm'>Sync Status with Deliveries</Button>
          <div className='flex-1' />
          <Button onClick={handleProcessQueued} disabled={queuedDeliveryCount === 0 || isProcessingQueuedDeliveries} loading={isProcessingQueuedDeliveries} variant='primary' size='sm'>Process Queued Deliveries ({queuedDeliveryCount})</Button>
        </div>
      </FormSection>

      <RunAnalyticsOverviewSection
        unsubscribeEventCount={unsubscribeEventCount}
        openedEventCount={openedEventCount}
        clickedEventCount={clickedEventCount}
        resubscribedEventCount={resubscribedEventCount}
        latestOpenedAt={latestOpenedAt}
        latestClickedAt={latestClickedAt}
        latestUnsubscribedAt={latestUnsubscribedAt}
        latestResubscribedAt={latestResubscribedAt}
        uniqueOpenCount={uniqueOpenCount}
        uniqueClickCount={uniqueClickCount}
        sentCount={metrics.deliveredCount}
      />

      <RunDeliveryLogSection
        deliveries={deliveries}
        attemptsByDeliveryId={attemptsByDeliveryId}
        database={database}
        retryableDeliveryIds={retryableDeliveryIds}
        exhaustedRetryDeliveryIds={exhaustedRetryDeliveryIds}
        handleRetryDelivery={handleRetryDelivery}
        isUpdatePending={updateSetting.isPending}
        DELIVERY_STATUS_LABELS={DELIVERY_STATUS_LABELS}
      />

      <FormSection title='Event History' className='space-y-4 p-4'>
        {runEvents.length === 0 ? (
          <div className='text-sm text-gray-500'>No events recorded for this run yet.</div>
        ) : (
          <div className='space-y-2'>
            {runEvents.map((event) => (
              <div key={event.id} className='flex items-center justify-between gap-4 rounded-md border border-border/40 bg-card/20 p-2 text-[11px]'>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className='px-1.5 py-0 text-[9px] uppercase font-bold'>{CAMPAIGN_EVENT_LABELS[event.type] ?? event.type}</Badge>
                  <span className='text-gray-300'>{event.message || 'No details'}</span>
                </div>
                <div className='text-gray-500'>{formatTimestamp(event.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </FormSection>
    </div>
  );
}

export default AdminFilemakerCampaignRunPage;
