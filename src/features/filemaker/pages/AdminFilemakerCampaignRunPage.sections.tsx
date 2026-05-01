'use client';

import React from 'react';

import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button } from '@/shared/ui/primitives.public';

import { CampaignRunDeliverabilityLogPanel } from './campaign-run-sections/CampaignRunDeliverabilityLogPanel';
import {
  DeliveriesSection,
  EventTimelineSection,
} from './AdminFilemakerCampaignRunPage.delivery-sections';
import type { LoadedCampaignRunPageState } from './AdminFilemakerCampaignRunPage.state';
import type { CampaignRunDeliveryCounts } from './AdminFilemakerCampaignRunPage.state-helpers';
import { formatTimestamp } from './filemaker-page-utils';

export function CampaignRunMissingState({
  onBackToCampaigns,
}: {
  onBackToCampaigns: () => void;
}): React.JSX.Element {
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
          <Button type='button' variant='outline' onClick={onBackToCampaigns}>
            Back to Campaigns
          </Button>
        }
      />
    </div>
  );
}

function CampaignRunHeader({
  campaignName,
  onBackToCampaign,
}: {
  campaignName: string;
  onBackToCampaign: () => void;
}): React.JSX.Element {
  return (
    <SectionHeader
      title='Campaign Run'
      description='Monitor one Filemaker campaign run, including deliveries, retry state, and timeline events.'
      eyebrow={
        <AdminFilemakerBreadcrumbs
          parent={{ label: 'Campaigns', href: '/admin/filemaker/campaigns' }}
          current={campaignName}
          className='mb-2'
        />
      }
      actions={
        <Button type='button' variant='outline' onClick={onBackToCampaign}>
          Back to Campaign
        </Button>
      }
    />
  );
}

function CampaignRunBadges({
  state,
}: {
  state: LoadedCampaignRunPageState;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        Run ID: {state.run.id}
      </Badge>
      <Badge variant='outline' className='text-[10px] capitalize'>
        Status: {state.run.status}
      </Badge>
      <Badge variant='outline' className='text-[10px] capitalize'>
        Mode: {state.run.mode}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Deliveries: {state.deliveries.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Attempts: {state.attempts.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Linked mail threads: {state.linkedMailThreads.length}
      </Badge>
    </div>
  );
}

function MailLinkageWarning({
  message,
}: {
  message: string | null;
}): React.JSX.Element | null {
  if (message === null) return null;
  return (
    <div className='rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800'>
      Mail linkage unavailable: {message}
    </div>
  );
}

function RunActionsBar({
  state,
}: {
  state: LoadedCampaignRunPageState;
}): React.JSX.Element | null {
  if (state.runActions.length === 0) return null;
  return (
    <div className='flex flex-wrap gap-2'>
      {state.runActions.map((action) => (
        <Button
          key={`${state.run.id}-${action.action}`}
          type='button'
          size='sm'
          variant='outline'
          disabled={state.isRunActionPending(state.run.id, action.action)}
          onClick={(): void => {
            void state.handleRunAction(state.run.id, action.action);
          }}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

function PendingMailFilingRepairBanner({
  state,
}: {
  state: LoadedCampaignRunPageState;
}): React.JSX.Element | null {
  if (state.pendingMailFilingCount === 0) return null;
  return (
    <div className='flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900'>
      <span>
        {state.pendingMailFilingCount} sent delivery
        {state.pendingMailFilingCount === 1 ? '' : 'ies'} need mail filing repair.
      </span>
      <Button
        type='button'
        size='sm'
        variant='outline'
        disabled={state.isRepairingMailFiling}
        onClick={(): void => {
          void state.handleRepairMailFiling();
        }}
      >
        {state.isRepairingMailFiling ? 'Repairing...' : 'Repair Mail Filing'}
      </Button>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}): React.JSX.Element {
  return (
    <div className='rounded-lg border border-gray-200 p-3'>
      <div className='text-xs text-gray-500'>{label}</div>
      <div className='mt-1 text-lg font-semibold text-gray-900'>{value}</div>
    </div>
  );
}

function RunSummarySection({
  counts,
  state,
}: {
  counts: CampaignRunDeliveryCounts;
  state: LoadedCampaignRunPageState;
}): React.JSX.Element {
  return (
    <section className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm'>
      <h2 className='text-sm font-semibold text-gray-900'>Run Summary</h2>
      <div className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        <SummaryCard label='Sent' value={counts.sentCount} />
        <SummaryCard label='Failed' value={counts.failedCount} />
        <SummaryCard label='Bounced' value={counts.bouncedCount} />
        <SummaryCard label='Queued' value={counts.queuedCount} />
      </div>
      <dl className='mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2'>
        <div>
          <dt className='font-medium text-gray-900'>Started</dt>
          <dd>{formatTimestamp(state.run.startedAt)}</dd>
        </div>
        <div>
          <dt className='font-medium text-gray-900'>Completed</dt>
          <dd>{formatTimestamp(state.run.completedAt)}</dd>
        </div>
        <div>
          <dt className='font-medium text-gray-900'>Next scheduled retry</dt>
          <dd>{formatTimestamp(counts.nextRetryAt)}</dd>
        </div>
        <div>
          <dt className='font-medium text-gray-900'>Updated</dt>
          <dd>{formatTimestamp(state.run.updatedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}

export function CampaignRunLoadedView({
  state,
}: {
  state: LoadedCampaignRunPageState;
}): React.JSX.Element {
  return (
    <div className='page-section-compact space-y-6'>
      <CampaignRunHeader campaignName={state.campaign.name} onBackToCampaign={state.handleBackToCampaign} />
      <CampaignRunBadges state={state} />
      <MailLinkageWarning message={state.linkedMailThreadsError} />
      <RunActionsBar state={state} />
      <PendingMailFilingRepairBanner state={state} />
      <RunSummarySection counts={state.deliveryCounts} state={state} />
      <DeliveriesSection
        campaign={state.campaign}
        deliveries={state.deliveries}
        linkedMailThreadByDeliveryId={state.linkedMailThreadByDeliveryId}
      />
      <CampaignRunDeliverabilityLogPanel events={state.events} />
      <EventTimelineSection events={state.events} />
    </div>
  );
}
