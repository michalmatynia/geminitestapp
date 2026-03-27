'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useMemo } from 'react';

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
  createDefaultFilemakerEmailCampaignDeliveryRegistry,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  getFilemakerEmailCampaignDeliveriesForRun,
  getFilemakerOrganizationById,
  getFilemakerPersonById,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  resolveFilemakerEmailCampaignRunStatusFromDeliveries,
  summarizeFilemakerEmailCampaignRunDeliveries,
  syncFilemakerEmailCampaignRunWithDeliveries,
  toPersistedFilemakerEmailCampaignDeliveryRegistry,
  toPersistedFilemakerEmailCampaignRunRegistry,
} from '../settings';
import { decodeRouteParam, formatTimestamp } from './filemaker-page-utils';

import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryRegistry,
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

  const runId = useMemo(() => decodeRouteParam(params['runId']), [params]);

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawRuns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY);
  const rawDeliveries = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY);

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

  const handleDeliveryStatusChange = useCallback(
    async (
      deliveryId: string,
      nextStatus: FilemakerEmailCampaignDeliveryStatus
    ): Promise<void> => {
      if (!run) return;
      const now = new Date().toISOString();
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

      try {
        await persistDeliveryRegistry(nextDeliveryRegistry);
        await persistRuns(nextRuns);
        toast('Delivery status updated.', { variant: 'success' });
      } catch (error: unknown) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to update delivery status.', {
          variant: 'error',
        });
      }
    },
    [deliveries, deliveryRegistry.deliveries, persistDeliveryRegistry, persistRuns, run, runRegistry.runs, toast]
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
      try {
        await persistRuns(nextRuns);
        toast('Run status updated.', { variant: 'success' });
      } catch (error: unknown) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to update run status.', {
          variant: 'error',
        });
      }
    },
    [deliveries, persistRuns, run, runRegistry.runs, toast]
  );

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
        description='Inspect recipient-level delivery state and update progress manually while the delivery engine is still simulated.'
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
            {resolveRunActionOptions(run.status).map((action) => (
              <Button
                key={action.nextStatus}
                type='button'
                size='sm'
                variant='outline'
                disabled={updateSetting.isPending}
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
                      disabled={updateSetting.isPending || delivery.status === status}
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
