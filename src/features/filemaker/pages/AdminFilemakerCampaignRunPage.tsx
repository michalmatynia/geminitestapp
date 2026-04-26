'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { useParams } from 'next/navigation';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { Badge, Button, useToast } from '@/shared/ui/primitives.public';
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
import { buildFilemakerMailThreadHref } from '../components/FilemakerMailSidebar.helpers';
import { formatTimestamp } from './filemaker-page-utils';
import { fetchFilemakerMailJson } from '../mail-ui-helpers';
import { useFilemakerCampaignRunActions } from './useFilemakerCampaignRunActions';
import { CampaignRunDeliverabilityLogPanel } from './campaign-run-sections/CampaignRunDeliverabilityLogPanel';
import type { FilemakerMailThread } from '../types';

type CampaignMailThreadsResponse = {
  threads: FilemakerMailThread[];
};

type CampaignMailFilingRepairResponse = {
  repairedCount: number;
  skippedCount: number;
  failedCount: number;
};

export function AdminFilemakerCampaignRunPage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams<{ runId?: string | string[] }>();
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  const { handleRunAction, isRunActionPending } = useFilemakerCampaignRunActions();
  const [linkedMailThreads, setLinkedMailThreads] = useState<FilemakerMailThread[]>([]);
  const [linkedMailThreadsError, setLinkedMailThreadsError] = useState<string | null>(null);
  const [isRepairingMailFiling, setIsRepairingMailFiling] = useState(false);
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
  const campaignId = campaign?.id ?? '';
  const activeRunId = run?.id ?? '';
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
  const linkedMailThreadByDeliveryId = useMemo(() => {
    const mapping = new Map<string, FilemakerMailThread>();
    linkedMailThreads.forEach((thread) => {
      const deliveryId = thread.campaignContext?.deliveryId;
      if (typeof deliveryId === 'string' && deliveryId.length > 0 && !mapping.has(deliveryId)) {
        mapping.set(deliveryId, thread);
      }
    });
    return mapping;
  }, [linkedMailThreads]);
  const pendingMailFilingCount = useMemo(
    () =>
      deliveries.filter((delivery) => {
        const expectsMailThread =
          typeof campaign?.mailAccountId === 'string' &&
          campaign.mailAccountId.length > 0 &&
          delivery.status === 'sent';
        return expectsMailThread && !linkedMailThreadByDeliveryId.has(delivery.id);
      }).length,
    [campaign?.mailAccountId, deliveries, linkedMailThreadByDeliveryId]
  );

  const reloadLinkedMailThreads = useCallback(async (): Promise<void> => {
    if (activeRunId.length === 0 || campaignId.length === 0) {
      setLinkedMailThreads([]);
      setLinkedMailThreadsError(null);
      return;
    }
    const search = new URLSearchParams({
      campaignId,
      runId: activeRunId,
    });
    setLinkedMailThreadsError(null);
    const response = await fetchFilemakerMailJson<CampaignMailThreadsResponse>(
      `/api/filemaker/mail/threads?${search.toString()}`
    );
    setLinkedMailThreads(response.threads);
  }, [activeRunId, campaignId]);

  const handleRepairMailFiling = useCallback(async (): Promise<void> => {
    if (activeRunId.length === 0) return;
    setIsRepairingMailFiling(true);
    try {
      const result = await fetchFilemakerMailJson<CampaignMailFilingRepairResponse>(
        `/api/filemaker/campaigns/runs/${encodeURIComponent(activeRunId)}/repair-mail-filing`,
        { method: 'POST' }
      );
      settingsStore.refetch();
      await reloadLinkedMailThreads();
      toast(
        `Mail filing repair finished. Repaired: ${result.repairedCount}, skipped: ${result.skippedCount}, failed: ${result.failedCount}.`,
        { variant: result.failedCount > 0 ? 'warning' : 'success' }
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Mail filing repair failed.', {
        variant: 'error',
      });
    } finally {
      setIsRepairingMailFiling(false);
    }
  }, [activeRunId, reloadLinkedMailThreads, settingsStore, toast]);

  useEffect(() => {
    if (activeRunId.length === 0 || campaignId.length === 0) {
      setLinkedMailThreads([]);
      setLinkedMailThreadsError(null);
      return undefined;
    }

    let isActive = true;
    void reloadLinkedMailThreads()
      .then(() => {
        if (isActive) {
          setLinkedMailThreadsError(null);
        }
      })
      .catch((error) => {
        if (!isActive) return;
        setLinkedMailThreads([]);
        setLinkedMailThreadsError(
          error instanceof Error ? error.message : 'Failed to load linked mail threads.'
        );
      });

    return () => {
      isActive = false;
    };
  }, [activeRunId, campaignId, reloadLinkedMailThreads]);

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
        <Badge variant='outline' className='text-[10px]'>
          Linked mail threads: {linkedMailThreads.length}
        </Badge>
      </div>

      {linkedMailThreadsError !== null ? (
        <div className='rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800'>
          Mail linkage unavailable: {linkedMailThreadsError}
        </div>
      ) : null}

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

      {pendingMailFilingCount > 0 ? (
        <div className='flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900'>
          <span>
            {pendingMailFilingCount} sent delivery
            {pendingMailFilingCount === 1 ? '' : 'ies'} need mail filing repair.
          </span>
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={isRepairingMailFiling}
            onClick={(): void => {
              void handleRepairMailFiling();
            }}
          >
            {isRepairingMailFiling ? 'Repairing...' : 'Repair Mail Filing'}
          </Button>
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
            deliveries.map((delivery) => {
              const linkedThread = linkedMailThreadByDeliveryId.get(delivery.id) ?? null;
              const expectsMailThread =
                typeof campaign.mailAccountId === 'string' &&
                campaign.mailAccountId.length > 0 &&
                delivery.status === 'sent';
              const hasFailureCategory =
                typeof delivery.failureCategory === 'string' &&
                delivery.failureCategory.length > 0;
              const hasLastError =
                typeof delivery.lastError === 'string' && delivery.lastError.length > 0;
              let mailFilingBadge: React.ReactNode = null;
              if (linkedThread !== null) {
                mailFilingBadge = (
                  <Badge variant='success' className='text-[10px]'>
                    Mail filed
                  </Badge>
                );
              } else if (expectsMailThread) {
                mailFilingBadge = (
                  <Badge variant='warning' className='text-[10px]'>
                    Mail filing pending
                  </Badge>
                );
              }

              return (
                <div
                  key={delivery.id}
                  className='rounded-lg border border-gray-200 p-3 text-sm text-gray-700'
                >
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='font-medium text-gray-900'>{delivery.emailAddress}</span>
                    <Badge variant='outline' className='text-[10px] capitalize'>
                      {delivery.status}
                    </Badge>
                    {hasFailureCategory ? (
                      <Badge variant='outline' className='text-[10px] capitalize'>
                        {delivery.failureCategory}
                      </Badge>
                    ) : null}
                    {mailFilingBadge}
                  </div>
                  <div className='mt-2 grid gap-1 text-xs text-gray-500 sm:grid-cols-2'>
                    <span>Provider: {delivery.provider ?? 'n/a'}</span>
                    <span>Sent: {formatTimestamp(delivery.sentAt)}</span>
                    <span>Next retry: {formatTimestamp(delivery.nextRetryAt)}</span>
                    <span>Updated: {formatTimestamp(delivery.updatedAt)}</span>
                  </div>
                  {linkedThread !== null ? (
                    <div className='mt-3 flex flex-wrap gap-2'>
                      <Button asChild variant='outline' size='sm'>
                        <Link
                          href={buildFilemakerMailThreadHref({
                            threadId: linkedThread.id,
                            accountId: linkedThread.accountId,
                            mailboxPath: linkedThread.mailboxPath,
                          })}
                        >
                          Open Mail Thread
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                  {hasLastError ? (
                    <p className='mt-2 text-xs text-rose-600'>{delivery.lastError}</p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      <CampaignRunDeliverabilityLogPanel events={events} />

      <section className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm'>
        <h2 className='text-sm font-semibold text-gray-900'>Event Timeline</h2>
        <div className='mt-4 space-y-3'>
          {events.length === 0 ? (
            <p className='text-sm text-gray-500'>No events recorded yet.</p>
          ) : (
            events.slice(0, 24).map((event) => {
              const mailThreadId =
                typeof event.mailThreadId === 'string' && event.mailThreadId.length > 0
                  ? event.mailThreadId
                  : null;
              const mailThreadLabel =
                event.type === 'reply_received' ? 'Open Reply Thread' : 'Open Mail Thread';

              return (
                <div
                  key={event.id}
                  className='rounded-lg border border-gray-200 p-3 text-sm text-gray-700'
                >
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant='outline' className='text-[10px] capitalize'>
                      {event.type}
                    </Badge>
                    <span className='text-xs text-gray-500'>{formatTimestamp(event.createdAt)}</span>
                    {mailThreadId !== null ? (
                      <Button asChild variant='outline' size='sm'>
                        <Link
                          href={buildFilemakerMailThreadHref({
                            threadId: mailThreadId,
                          })}
                        >
                          {mailThreadLabel}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                  <p className='mt-2 text-sm text-gray-700'>{event.message}</p>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
