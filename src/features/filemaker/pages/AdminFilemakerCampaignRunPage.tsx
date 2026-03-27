'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '@/shared/lib/api-client';
import { safeClearInterval, safeSetInterval } from '@/shared/lib/timers';
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
  createDefaultFilemakerEmailCampaignDeliveryRegistry,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  getFilemakerEmailCampaignDeliveriesForRun,
  getFilemakerEmailCampaignEventsForRun,
  getFilemakerOrganizationById,
  getFilemakerPersonById,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  resolveFilemakerEmailCampaignRunStatusFromDeliveries,
  summarizeFilemakerEmailCampaignRunDeliveries,
  syncFilemakerEmailCampaignRunWithDeliveries,
  toPersistedFilemakerEmailCampaignDeliveryRegistry,
  toPersistedFilemakerEmailCampaignEventRegistry,
  toPersistedFilemakerEmailCampaignRunRegistry,
} from '../settings';
import { decodeRouteParam, formatTimestamp } from './filemaker-page-utils';

import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignProcessRunResponse,
  FilemakerEmailCampaignDeliveryStatus,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunStatus,
} from '../types';

const DELIVERY_STATUS_LABELS: Record<FilemakerEmailCampaignDeliveryStatus, string> = {
  queued: 'Queued',
  sent: 'Sent',
  failed: 'Failed',
  skipped: 'Skipped',
  bounced: 'Bounced',
};

const DELIVERY_STATUS_ACTIONS: FilemakerEmailCampaignDeliveryStatus[] = [
  'queued',
  'sent',
  'failed',
  'skipped',
  'bounced',
];

const CAMPAIGN_EVENT_LABELS: Record<FilemakerEmailCampaignEvent['type'], string> = {
  created: 'Created',
  updated: 'Updated',
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

const appendEventsToRegistry = (
  registry: FilemakerEmailCampaignEventRegistry,
  events: FilemakerEmailCampaignEvent[]
): FilemakerEmailCampaignEventRegistry => ({
  version: registry.version,
  events: registry.events
    .concat(events)
    .sort(
      (left: FilemakerEmailCampaignEvent, right: FilemakerEmailCampaignEvent): number =>
        Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '')
    ),
});

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
  const rawEvents = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY);

  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const campaignRegistry = useMemo(
    () => parseFilemakerEmailCampaignRegistry(rawCampaigns),
    [rawCampaigns]
  );
  const runRegistry = useMemo(
    () => parseFilemakerEmailCampaignRunRegistry(rawRuns),
    [rawRuns]
  );
  const deliveryRegistry = useMemo(
    () => parseFilemakerEmailCampaignDeliveryRegistry(rawDeliveries),
    [rawDeliveries]
  );
  const eventRegistry = useMemo(
    () => parseFilemakerEmailCampaignEventRegistry(rawEvents),
    [rawEvents]
  );

  const run = useMemo(
    () => runRegistry.runs.find((entry: FilemakerEmailCampaignRun) => entry.id === runId) ?? null,
    [runId, runRegistry.runs]
  );
  const campaign = useMemo(
    () =>
      run
        ? campaignRegistry.campaigns.find((entry) => entry.id === run.campaignId) ?? null
        : null,
    [campaignRegistry.campaigns, run]
  );
  const deliveries = useMemo(
    () => getFilemakerEmailCampaignDeliveriesForRun(deliveryRegistry, runId),
    [deliveryRegistry, runId]
  );
  const runEvents = useMemo(
    () => getFilemakerEmailCampaignEventsForRun(eventRegistry, runId),
    [eventRegistry, runId]
  );
  const metrics = useMemo(
    () => summarizeFilemakerEmailCampaignRunDeliveries(deliveries),
    [deliveries]
  );
  const resolvedRunStatus = useMemo(
    () =>
      run
        ? resolveFilemakerEmailCampaignRunStatusFromDeliveries({
            currentStatus: run.status,
            deliveries,
          })
        : null,
    [deliveries, run]
  );
  const queuedDeliveryCount = useMemo(
    () =>
      deliveries.filter((delivery: FilemakerEmailCampaignDelivery) => delivery.status === 'queued')
        .length,
    [deliveries]
  );

  useEffect(() => {
    if (!run) return;
    if (run.mode !== 'live') return;
    if (
      resolvedRunStatus !== 'pending' &&
      resolvedRunStatus !== 'queued' &&
      resolvedRunStatus !== 'running'
    ) {
      return;
    }
    const timer = safeSetInterval((): void => {
      settingsStore.refetch();
    }, 5_000);
    return () => {
      safeClearInterval(timer);
    };
  }, [resolvedRunStatus, run, settingsStore]);

  const persistDeliveryRegistry = useCallback(
    async (nextDeliveryRegistry: FilemakerEmailCampaignDeliveryRegistry): Promise<void> => {
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
        value: JSON.stringify(
          toPersistedFilemakerEmailCampaignDeliveryRegistry(nextDeliveryRegistry)
        ),
      });
    },
    [updateSetting]
  );

  const persistRuns = useCallback(
    async (nextRuns: FilemakerEmailCampaignRun[]): Promise<void> => {
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
        value: JSON.stringify(
          toPersistedFilemakerEmailCampaignRunRegistry({
            version: runRegistry.version,
            runs: nextRuns,
          })
        ),
      });
    },
    [runRegistry.version, updateSetting]
  );

  const persistEventRegistry = useCallback(
    async (nextEventRegistry: FilemakerEmailCampaignEventRegistry): Promise<void> => {
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
        value: JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(nextEventRegistry)),
      });
    },
    [updateSetting]
  );

  const handleDeliveryStatusChange = useCallback(
    async (
      deliveryId: string,
      nextStatus: FilemakerEmailCampaignDeliveryStatus
    ): Promise<void> => {
      if (!run) return;
      const now = new Date().toISOString();
      const targetDelivery =
        deliveries.find((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.id === deliveryId) ??
        null;
      const nextDeliveriesForRun = deliveries.map((delivery): FilemakerEmailCampaignDelivery => {
        if (delivery.id !== deliveryId) return delivery;
        return {
          ...delivery,
          status: nextStatus,
          sentAt: nextStatus === 'sent' ? delivery.sentAt ?? now : null,
          lastError:
            nextStatus === 'failed' || nextStatus === 'bounced'
              ? delivery.lastError || 'Updated from the Filemaker run monitor.'
              : null,
          updatedAt: now,
        };
      });

      const nextDeliveryRegistry = {
        version: createDefaultFilemakerEmailCampaignDeliveryRegistry().version,
        deliveries: deliveryRegistry.deliveries.map((delivery) => {
          const replacement = nextDeliveriesForRun.find((entry) => entry.id === delivery.id);
          return replacement ?? delivery;
        }),
      };
      const nextRun = syncFilemakerEmailCampaignRunWithDeliveries({
        run,
        deliveries: nextDeliveriesForRun,
      });
      const nextRuns = runRegistry.runs.map((entry) => (entry.id === run.id ? nextRun : entry));
      const nextEvent = createFilemakerEmailCampaignEvent({
        campaignId: run.campaignId,
        runId: run.id,
        deliveryId,
        type:
          nextStatus === 'sent'
            ? 'delivery_sent'
            : nextStatus === 'failed'
              ? 'delivery_failed'
              : nextStatus === 'bounced'
                ? 'delivery_bounced'
                : 'status_changed',
        message:
          nextStatus === 'queued'
            ? `Admin reset ${
                targetDelivery?.emailAddress || deliveryId
              } to queued.`
            : `Admin changed delivery ${
                targetDelivery?.emailAddress || deliveryId
              } to ${DELIVERY_STATUS_LABELS[nextStatus].toLowerCase()}.`,
        actor: 'admin',
        deliveryStatus: nextStatus,
        runStatus: nextRun.status,
        createdAt: now,
        updatedAt: now,
      });
      const nextEventRegistry = appendEventsToRegistry(eventRegistry, [nextEvent]);

      try {
        await Promise.all([
          persistDeliveryRegistry(nextDeliveryRegistry),
          persistRuns(nextRuns),
          persistEventRegistry(nextEventRegistry),
        ]);
        toast('Delivery status updated.', { variant: 'success' });
      } catch (error: unknown) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to update delivery status.', {
          variant: 'error',
        });
      }
    },
    [
      deliveries,
      deliveryRegistry.deliveries,
      eventRegistry,
      persistDeliveryRegistry,
      persistEventRegistry,
      persistRuns,
      run,
      runRegistry.runs,
      toast,
    ]
  );

  const handleRunStatusChange = useCallback(
    async (nextStatus: FilemakerEmailCampaignRunStatus): Promise<void> => {
      if (!run) return;
      const nextRun = syncFilemakerEmailCampaignRunWithDeliveries({
        run,
        deliveries,
        status: nextStatus,
      });
      const nextRuns = runRegistry.runs.map((entry) => (entry.id === run.id ? nextRun : entry));
      const now = new Date().toISOString();
      const nextEventRegistry = appendEventsToRegistry(eventRegistry, [
        createFilemakerEmailCampaignEvent({
          campaignId: run.campaignId,
          runId: run.id,
          type:
            nextStatus === 'completed'
              ? 'completed'
              : nextStatus === 'failed'
                ? 'failed'
                : nextStatus === 'cancelled'
                  ? 'cancelled'
                  : 'status_changed',
          message: `Admin changed run status to ${nextStatus}.`,
          actor: 'admin',
          runStatus: nextStatus,
          createdAt: now,
          updatedAt: now,
        }),
      ]);
      try {
        await Promise.all([persistRuns(nextRuns), persistEventRegistry(nextEventRegistry)]);
        toast('Run status updated.', { variant: 'success' });
      } catch (error: unknown) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to update run status.', {
          variant: 'error',
        });
      }
    },
    [deliveries, eventRegistry, persistEventRegistry, persistRuns, run, runRegistry.runs, toast]
  );

  const handleQueueProcessing = useCallback(async (): Promise<void> => {
    if (!run) return;
    setIsProcessingQueuedDeliveries(true);
    try {
      const response = await api.post<FilemakerEmailCampaignProcessRunResponse>(
        `/api/filemaker/campaigns/runs/${encodeURIComponent(run.id)}/process`,
        { reason: 'manual' }
      );
      settingsStore.refetch();
      router.refresh();
      toast(
        response.dispatchMode === 'inline'
          ? 'Queued deliveries started in inline processing mode.'
          : 'Queued deliveries were added to the campaign worker.',
        { variant: 'success' }
      );
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to process queued deliveries.', {
        variant: 'error',
      });
    } finally {
      setIsProcessingQueuedDeliveries(false);
    }
  }, [router, run, settingsStore, toast]);

  if (!run) {
    return (
      <div className='page-section-compact space-y-6'>
        <SectionHeader
          title='Campaign Run'
          description='The requested campaign run could not be found.'
          eyebrow={
            <AdminFilemakerBreadcrumbs
              parent={{ label: 'Campaigns', href: '/admin/filemaker/campaigns' }}
              current='Run'
              className='mb-2'
            />
          }
          actions={
            <FormActions
              onCancel={(): void => {
                router.push('/admin/filemaker/campaigns');
              }}
              cancelText='Back to Campaigns'
            />
          }
        />
      </div>
    );
  }

  return (
    <div className='page-section-compact space-y-6'>
      <SectionHeader
        title='Campaign Run Monitor'
        description='Inspect recipient-level delivery state, trigger queued delivery processing, and manually correct statuses when needed.'
        eyebrow={
          <AdminFilemakerBreadcrumbs
            parent={{
              label: campaign?.name || 'Campaigns',
              href: campaign
                ? `/admin/filemaker/campaigns/${encodeURIComponent(campaign.id)}`
                : '/admin/filemaker/campaigns',
            }}
            current={run.id}
            className='mb-2'
          />
        }
        actions={
          <FormActions
            onCancel={(): void => {
              if (campaign) {
                router.push(`/admin/filemaker/campaigns/${encodeURIComponent(campaign.id)}`);
                return;
              }
              router.push('/admin/filemaker/campaigns');
            }}
            cancelText='Back to Campaign'
          >
            <Button
              type='button'
              size='sm'
              variant='outline'
              disabled={updateSetting.isPending || isProcessingQueuedDeliveries}
              onClick={(): void => {
                settingsStore.refetch();
                router.refresh();
              }}
            >
              Refresh
            </Button>
            {run.mode === 'live' && queuedDeliveryCount > 0 ? (
              <Button
                type='button'
                size='sm'
                variant='outline'
                disabled={updateSetting.isPending || isProcessingQueuedDeliveries}
                onClick={(): void => {
                  void handleQueueProcessing();
                }}
              >
                {isProcessingQueuedDeliveries ? 'Starting Delivery Worker…' : 'Process Queued Deliveries'}
              </Button>
            ) : null}
            {resolveRunActionOptions(run.status).map((action) => (
              <Button
                key={action.nextStatus}
                type='button'
                size='sm'
                variant='outline'
                disabled={updateSetting.isPending || isProcessingQueuedDeliveries}
                onClick={(): void => {
                  void handleRunStatusChange(action.nextStatus);
                }}
              >
                {action.label}
              </Button>
            ))}
          </FormActions>
        }
      />

      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px] capitalize'>
          Run status: {resolvedRunStatus ?? run.status}
        </Badge>
        <Badge variant='outline' className='text-[10px] capitalize'>
          Mode: {run.mode === 'dry_run' ? 'Dry run' : 'Live'}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Recipients: {metrics.recipientCount}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Delivered: {metrics.deliveredCount}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Failed/Bounced: {metrics.failedCount}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Skipped: {metrics.skippedCount}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Queued: {queuedDeliveryCount}
        </Badge>
      </div>

      <FormSection title='Run Summary' className='space-y-3 p-4'>
        <div className='grid gap-3 text-sm text-gray-300 md:grid-cols-2'>
          <div>
            <div className='text-[11px] text-gray-500'>Campaign</div>
            <div className='font-medium text-white'>{campaign?.name || run.campaignId}</div>
          </div>
          <div>
            <div className='text-[11px] text-gray-500'>Created</div>
            <div>{formatTimestamp(run.createdAt)}</div>
          </div>
          <div>
            <div className='text-[11px] text-gray-500'>Started</div>
            <div>{formatTimestamp(run.startedAt)}</div>
          </div>
          <div>
            <div className='text-[11px] text-gray-500'>Completed</div>
            <div>{formatTimestamp(run.completedAt)}</div>
          </div>
        </div>
      </FormSection>

      <FormSection title='Event Timeline' className='space-y-3 p-4'>
        {runEvents.length === 0 ? (
          <div className='text-sm text-gray-500'>
            No campaign events have been recorded for this run yet.
          </div>
        ) : (
          runEvents.map((event: FilemakerEmailCampaignEvent) => (
            <div
              key={event.id}
              className='space-y-2 rounded-md border border-border/60 bg-card/25 p-3'
            >
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='space-y-1'>
                  <div className='text-sm font-medium text-white'>{event.message}</div>
                  <div className='text-[11px] text-gray-500'>
                    {formatTimestamp(event.createdAt)}
                    {event.actor ? ` • ${event.actor}` : ''}
                  </div>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Badge variant='outline' className='text-[10px] capitalize'>
                    {CAMPAIGN_EVENT_LABELS[event.type]}
                  </Badge>
                  {event.runStatus ? (
                    <Badge variant='outline' className='text-[10px] capitalize'>
                      Run: {event.runStatus}
                    </Badge>
                  ) : null}
                  {event.deliveryStatus ? (
                    <Badge variant='outline' className='text-[10px] capitalize'>
                      Delivery: {event.deliveryStatus}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </FormSection>

      <FormSection title='Recipient Deliveries' className='space-y-3 p-4'>
        {deliveries.length === 0 ? (
          <div className='text-sm text-gray-500'>
            This run has no delivery records yet.
          </div>
        ) : (
          deliveries.map((delivery: FilemakerEmailCampaignDelivery) => {
            const person =
              delivery.partyKind === 'person'
                ? getFilemakerPersonById(database, delivery.partyId)
                : null;
            const organization =
              delivery.partyKind === 'organization'
                ? getFilemakerOrganizationById(database, delivery.partyId)
                : null;
            const partyLabel =
              delivery.partyKind === 'person'
                ? [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim() ||
                  delivery.partyId
                : organization?.name || delivery.partyId;

            return (
              <div
                key={delivery.id}
                className='space-y-3 rounded-md border border-border/60 bg-card/25 p-3'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='space-y-1'>
                    <div className='text-sm font-medium text-white'>{partyLabel}</div>
                    <div className='text-[11px] text-gray-400'>
                      {delivery.emailAddress} • {delivery.partyKind}
                    </div>
                  </div>
                  <Badge variant='outline' className='text-[10px] capitalize'>
                    {DELIVERY_STATUS_LABELS[delivery.status]}
                  </Badge>
                </div>
                <div className='text-[11px] text-gray-500'>
                  Updated: {formatTimestamp(delivery.updatedAt)}
                </div>
                {delivery.lastError && (
                  <div className='text-[11px] text-amber-300'>{delivery.lastError}</div>
                )}
                <div className='flex flex-wrap gap-2'>
                  {DELIVERY_STATUS_ACTIONS.map((status) => (
                    <Button
                      key={`${delivery.id}-${status}`}
                      type='button'
                      size='sm'
                      variant={delivery.status === status ? 'default' : 'outline'}
                      disabled={
                        updateSetting.isPending ||
                        isProcessingQueuedDeliveries ||
                        delivery.status === status
                      }
                      onClick={(): void => {
                        void handleDeliveryStatusChange(delivery.id, status);
                      }}
                    >
                      {DELIVERY_STATUS_LABELS[status]}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </FormSection>
    </div>
  );
}
