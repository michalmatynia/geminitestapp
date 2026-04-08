'use client';

import React, { useMemo, startTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';

import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  getFilemakerEmailCampaignDeliveriesForRun,
  parseFilemakerEmailCampaignDeliveryAttemptRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
} from '../settings';
import { getRunActions } from './AdminFilemakerCampaignEditPage.utils';
import { formatTimestamp } from './filemaker-page-utils';
import { useFilemakerCampaignRunActions } from './useFilemakerCampaignRunActions';

export function AdminFilemakerCampaignRunPage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams<{ runId?: string | string[] }>();
  const settingsStore = useSettingsStore();
  const { handleRunAction, isRunActionPending } = useFilemakerCampaignRunActions();
  const runIdParam = params?.runId;
  const runId = Array.isArray(runIdParam) ? (runIdParam[0] ?? '') : (runIdParam ?? '');

  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawRuns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY);
  const rawDeliveries = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY);
  const rawAttempts = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY);
  const rawEvents = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY);

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
  const attemptRegistry = useMemo(
    () => parseFilemakerEmailCampaignDeliveryAttemptRegistry(rawAttempts),
    [rawAttempts]
  );
  const eventRegistry = useMemo(
    () => parseFilemakerEmailCampaignEventRegistry(rawEvents),
    [rawEvents]
  );

  const run = runRegistry.runs.find((entry) => entry.id === runId) ?? null;
  const campaign =
    campaignRegistry.campaigns.find((entry) => entry.id === run?.campaignId) ?? null;
  const deliveries = run ? getFilemakerEmailCampaignDeliveriesForRun(deliveryRegistry, run.id) : [];
  const attempts = useMemo(
    () => attemptRegistry.attempts.filter((entry) => entry.runId === runId),
    [attemptRegistry.attempts, runId]
  );
  const events = useMemo(
    () =>
      eventRegistry.events.filter(
        (entry) => entry.runId === runId || entry.campaignId === campaign?.id
      ),
    [campaign, eventRegistry.events, runId]
  );
  const runActions = useMemo(
    () =>
      run
        ? getRunActions({
            run,
            deliveries,
            attemptRegistry,
          })
        : [],
    [attemptRegistry, deliveries, run]
  );

  if (!run || !campaign) {
    return (
      <div className='page-section-compact space-y-6'>
        <SectionHeader
          title='Campaign Run'
          description='The requested Filemaker campaign run could not be found.'
          eyebrow={
            <AdminFilemakerBreadcrumbs
              parent={{ label: 'Campaigns', href: '/admin/filemaker/campaigns' }}
              current='Run'
              className='mb-2'
            />
          }
          actions={
            <Button
              type='button'
              variant='outline'
              onClick={(): void => {
                startTransition(() => { router.push('/admin/filemaker/campaigns'); });
              }}
            >
              Back to Campaigns
            </Button>
          }
        />
      </div>
    );
  }

  const sentCount = deliveries.filter((entry) => entry.status === 'sent').length;
  const failedCount = deliveries.filter((entry) => entry.status === 'failed').length;
  const bouncedCount = deliveries.filter((entry) => entry.status === 'bounced').length;
  const queuedCount = deliveries.filter((entry) => entry.status === 'queued').length;
  const nextRetryAt =
    deliveries
      .map((entry) => entry.nextRetryAt)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => Date.parse(left) - Date.parse(right))[0] ?? null;

  return (
    <div className='page-section-compact space-y-6'>
      <SectionHeader
        title='Campaign Run'
        description='Monitor one Filemaker campaign run, including deliveries, retry state, and timeline events.'
        eyebrow={
          <AdminFilemakerBreadcrumbs
            parent={{ label: 'Campaigns', href: '/admin/filemaker/campaigns' }}
            current={campaign.name}
            className='mb-2'
          />
        }
        actions={
          <Button
            type='button'
            variant='outline'
            onClick={(): void => {
              startTransition(() => { router.push(`/admin/filemaker/campaigns/${encodeURIComponent(campaign.id)}`); });
            }}
          >
            Back to Campaign
          </Button>
        }
      />

      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          Run ID: {run.id}
        </Badge>
        <Badge variant='outline' className='text-[10px] capitalize'>
          Status: {run.status}
        </Badge>
        <Badge variant='outline' className='text-[10px] capitalize'>
          Mode: {run.mode}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Deliveries: {deliveries.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Attempts: {attempts.length}
        </Badge>
      </div>

      {runActions.length > 0 ? (
        <div className='flex flex-wrap gap-2'>
          {runActions.map((action) => (
            <Button
              key={`${run.id}-${action.action}`}
              type='button'
              size='sm'
              variant='outline'
              disabled={isRunActionPending(run.id, action.action)}
              onClick={(): void => {
                void handleRunAction(run.id, action.action);
              }}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}

      <section className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm'>
        <h2 className='text-sm font-semibold text-gray-900'>Run Summary</h2>
        <div className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          <div className='rounded-lg border border-gray-200 p-3'>
            <div className='text-xs text-gray-500'>Sent</div>
            <div className='mt-1 text-lg font-semibold text-gray-900'>{sentCount}</div>
          </div>
          <div className='rounded-lg border border-gray-200 p-3'>
            <div className='text-xs text-gray-500'>Failed</div>
            <div className='mt-1 text-lg font-semibold text-gray-900'>{failedCount}</div>
          </div>
          <div className='rounded-lg border border-gray-200 p-3'>
            <div className='text-xs text-gray-500'>Bounced</div>
            <div className='mt-1 text-lg font-semibold text-gray-900'>{bouncedCount}</div>
          </div>
          <div className='rounded-lg border border-gray-200 p-3'>
            <div className='text-xs text-gray-500'>Queued</div>
            <div className='mt-1 text-lg font-semibold text-gray-900'>{queuedCount}</div>
          </div>
        </div>
        <dl className='mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2'>
          <div>
            <dt className='font-medium text-gray-900'>Started</dt>
            <dd>{formatTimestamp(run.startedAt)}</dd>
          </div>
          <div>
            <dt className='font-medium text-gray-900'>Completed</dt>
            <dd>{formatTimestamp(run.completedAt)}</dd>
          </div>
          <div>
            <dt className='font-medium text-gray-900'>Next scheduled retry</dt>
            <dd>{formatTimestamp(nextRetryAt)}</dd>
          </div>
          <div>
            <dt className='font-medium text-gray-900'>Updated</dt>
            <dd>{formatTimestamp(run.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <section className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm'>
        <h2 className='text-sm font-semibold text-gray-900'>Deliveries</h2>
        <div className='mt-4 space-y-3'>
          {deliveries.length === 0 ? (
            <p className='text-sm text-gray-500'>No deliveries were created for this run.</p>
          ) : (
            deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className='rounded-lg border border-gray-200 p-3 text-sm text-gray-700'
              >
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-medium text-gray-900'>{delivery.emailAddress}</span>
                  <Badge variant='outline' className='text-[10px] capitalize'>
                    {delivery.status}
                  </Badge>
                  {delivery.failureCategory ? (
                    <Badge variant='outline' className='text-[10px] capitalize'>
                      {delivery.failureCategory}
                    </Badge>
                  ) : null}
                </div>
                <div className='mt-2 grid gap-1 text-xs text-gray-500 sm:grid-cols-2'>
                  <span>Provider: {delivery.provider ?? 'n/a'}</span>
                  <span>Sent: {formatTimestamp(delivery.sentAt)}</span>
                  <span>Next retry: {formatTimestamp(delivery.nextRetryAt)}</span>
                  <span>Updated: {formatTimestamp(delivery.updatedAt)}</span>
                </div>
                {delivery.lastError ? (
                  <p className='mt-2 text-xs text-rose-600'>{delivery.lastError}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm'>
        <h2 className='text-sm font-semibold text-gray-900'>Event Timeline</h2>
        <div className='mt-4 space-y-3'>
          {events.length === 0 ? (
            <p className='text-sm text-gray-500'>No events recorded yet.</p>
          ) : (
            events.slice(0, 24).map((event) => (
              <div
                key={event.id}
                className='rounded-lg border border-gray-200 p-3 text-sm text-gray-700'
              >
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant='outline' className='text-[10px] capitalize'>
                    {event.type}
                  </Badge>
                  <span className='text-xs text-gray-500'>{formatTimestamp(event.createdAt)}</span>
                </div>
                <p className='mt-2 text-sm text-gray-700'>{event.message}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
