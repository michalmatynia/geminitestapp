'use client';

import { ActionMenu } from '@/shared/ui/forms-and-actions.public';
import { Badge, DropdownMenuItem } from '@/shared/ui/primitives.public';
import React from 'react';

import {
  getFilemakerEmailCampaignDeliveriesForRun,
  summarizeFilemakerEmailCampaignRunDeliveries,
} from '../settings';
import { formatTimestamp } from './filemaker-page-utils';

import type { CampaignRow } from './AdminFilemakerCampaignsPage.types';
import type { FilemakerEmailCampaign, FilemakerEmailCampaignDeliveryRegistry } from '../types';
import type { CellContext, ColumnDef } from '@tanstack/react-table';

type CampaignCellContext = CellContext<CampaignRow, unknown>;

type CampaignColumnActions = {
  onOpenCampaign: (campaignId: string) => void;
  onOpenRun: (runId: string) => void;
  onDuplicateCampaign: (campaign: FilemakerEmailCampaign) => void;
  onToggleArchiveCampaign: (campaign: FilemakerEmailCampaign) => void;
  onToggleCampaignRunState: (campaign: FilemakerEmailCampaign) => void;
  onDeleteCampaign: (campaign: FilemakerEmailCampaign) => void;
};

type BuildCampaignColumnsOptions = CampaignColumnActions & {
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
};

export const formatCampaignSenderAccountLabel = (mailAccountId: string | null | undefined): string => {
  const normalized = mailAccountId?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'Not assigned';
};

const resolveBounceRateClassName = (bounceRatePercent: number): string => {
  if (bounceRatePercent > 5) return 'text-[11px] font-medium text-red-300';
  if (bounceRatePercent > 1) return 'text-[11px] text-amber-300';
  return 'text-[11px] text-gray-500';
};

const CampaignNameCell = ({ row }: CampaignCellContext): React.JSX.Element => {
  const subject = row.original.campaign.subject;
  return (
    <div className='min-w-0 flex-1 space-y-1'>
      <div className='text-sm font-semibold text-white'>{row.original.campaign.name}</div>
      <div className='text-[11px] text-gray-500'>{subject.length > 0 ? subject : 'No subject yet'}</div>
    </div>
  );
};

const CampaignApprovalBadge = ({ campaign }: { campaign: FilemakerEmailCampaign }): React.JSX.Element | null => {
  if (!campaign.launch.requireApproval) return null;
  const isApproved = (campaign.approvalGrantedAt ?? '').length > 0;
  return (
    <Badge
      variant='outline'
      className={isApproved ? 'text-[10px] border-emerald-500/50 text-emerald-300' : 'text-[10px] border-amber-500/50 text-amber-300'}
    >
      {isApproved
        ? `Approved${campaign.approvedBy != null ? ` — ${campaign.approvedBy}` : ''}`
        : 'Needs Approval'}
    </Badge>
  );
};

const CampaignStatusCell = ({ row }: CampaignCellContext): React.JSX.Element => {
  const failureMessage = row.original.schedulerFailureMessage;
  return (
    <div className='space-y-1'>
      <Badge variant='outline' className='text-[10px] capitalize'>
        {row.original.campaign.status}
      </Badge>
      <CampaignApprovalBadge campaign={row.original.campaign} />
      <div className='text-[11px] text-gray-500'>
        {row.original.isLaunchReady ? 'Ready to launch' : 'Blocked by launch conditions'}
      </div>
      <div className='text-[11px] text-gray-500'>
        Sender: {formatCampaignSenderAccountLabel(row.original.campaign.mailAccountId)}
      </div>
      <div className='text-[11px] text-gray-500 capitalize'>
        Automation: {row.original.campaign.launch.mode}
      </div>
      <div className='text-[11px] text-gray-500'>
        Next due: {row.original.nextAutomationAt !== null ? formatTimestamp(row.original.nextAutomationAt) : 'Manual only'}
      </div>
      <div className='text-[11px] text-gray-500'>
        Last checked: {formatTimestamp(row.original.campaign.lastEvaluatedAt)}
      </div>
      {failureMessage !== null ? <div className='text-[11px] text-rose-400'>Scheduler failure: {failureMessage}</div> : null}
    </div>
  );
};

const CampaignAudienceCell = ({ row }: CampaignCellContext): React.JSX.Element => (
  <div className='space-y-0.5'>
    <div className='text-[11px] text-gray-500'>Preview recipients: {row.original.previewCount}</div>
    <div className='text-[11px] text-gray-500'>Min audience: {row.original.campaign.launch.minAudienceSize}</div>
    <div className='text-[11px] text-gray-500'>Suppressed in preview: {row.original.analytics.suppressionImpactCount}</div>
  </div>
);

const PerformanceCell = ({ row }: CampaignCellContext): React.JSX.Element => (
  <div className='space-y-0.5'>
    <div className='text-[11px] text-gray-300'>Delivery rate: {row.original.analytics.deliveryRatePercent}%</div>
    <div className='text-[11px] text-gray-500'>
      Open rate: {row.original.analytics.openRatePercent}% • unique {row.original.analytics.uniqueOpenRatePercent}%
    </div>
    <div className='text-[11px] text-gray-500'>
      Click rate: {row.original.analytics.clickRatePercent}% • unique {row.original.analytics.uniqueClickRatePercent}%
    </div>
    <div className='text-[11px] text-gray-500'>
      Replies: {row.original.analytics.replyCount} ({row.original.analytics.replyRatePercent}%)
    </div>
    {row.original.analytics.topClickedLinks[0] !== undefined ? (
      <div className='text-[11px] text-gray-500 break-all'>
        Top link: {row.original.analytics.topClickedLinks[0].clickCount} clicks
      </div>
    ) : null}
    <div className={resolveBounceRateClassName(row.original.analytics.bounceRatePercent)}>
      Bounce rate: {row.original.analytics.bounceRatePercent}%
      {row.original.analytics.bounceRatePercent > 5 ? ' (deliverability risk)' : ''}
    </div>
    {row.original.deliverabilityDecisionCount > 0 ? (
      <div className='text-[11px] text-amber-300'>
        Deliverability decisions: {row.original.deliverabilityDecisionCount} (defers, throttles, circuit breaker)
      </div>
    ) : null}
    {row.original.coldSuppressionCount > 0 ? (
      <div className='text-[11px] text-gray-400'>Auto-suppressed (cold): {row.original.coldSuppressionCount}</div>
    ) : null}
    <div className='text-[11px] text-gray-500'>
      Opt-outs: {row.original.analytics.unsubscribeCount} ({row.original.analytics.unsubscribeRatePercent}%)
    </div>
    <div className='text-[11px] text-gray-500'>
      Restored: {row.original.analytics.resubscribeCount} ({row.original.analytics.resubscribeRatePercent}%)
    </div>
    <div className='text-[11px] text-gray-500'>
      Net opt-outs: {row.original.analytics.netUnsubscribeCount} ({row.original.analytics.netUnsubscribeRatePercent}%)
    </div>
    <div className='text-[11px] text-gray-500'>Runs: {row.original.analytics.totalRuns}</div>
  </div>
);

const createLatestRunColumn = (
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry
): ColumnDef<CampaignRow> => ({
  id: 'latest-run',
  header: 'Latest Run',
  cell: ({ row }: CampaignCellContext): React.JSX.Element => {
    const latestRun = row.original.latestRun;
    if (latestRun === null) return <span className='text-[11px] text-gray-500'>No runs yet</span>;
    const deliveries = getFilemakerEmailCampaignDeliveriesForRun(deliveryRegistry, latestRun.id);
    const metrics = deliveries.length > 0
      ? summarizeFilemakerEmailCampaignRunDeliveries(deliveries)
      : {
          recipientCount: latestRun.recipientCount,
          deliveredCount: latestRun.deliveredCount,
          failedCount: latestRun.failedCount,
          skippedCount: latestRun.skippedCount,
        };
    return (
      <div className='space-y-0.5'>
        <div className='text-[11px] capitalize text-gray-300'>{latestRun.status}</div>
        <div className='text-[11px] text-gray-500'>
          {metrics.deliveredCount + metrics.failedCount + metrics.skippedCount}/{metrics.recipientCount} processed
        </div>
      </div>
    );
  },
});

const resolveRunStateToggleLabel = (status: FilemakerEmailCampaign['status']): string | null => {
  if (status === 'active') return 'Pause Campaign';
  if (status === 'draft' || status === 'paused') return 'Activate Campaign';
  return null;
};

const createActionsColumn = (actions: CampaignColumnActions): ColumnDef<CampaignRow> => ({
  id: 'actions',
  header: (): React.JSX.Element => <div className='text-right'>Actions</div>,
  cell: ({ row }: CampaignCellContext): React.JSX.Element => {
    const latestRun = row.original.latestRun;
    return (
      <div className='flex justify-end'>
        <ActionMenu ariaLabel={`Actions for campaign ${row.original.campaign.name}`}>
          {latestRun !== null ? (
            <DropdownMenuItem onSelect={(event: Event): void => { event.preventDefault(); actions.onOpenRun(latestRun.id); }}>
              Open Run Monitor
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={(event: Event): void => { event.preventDefault(); actions.onOpenCampaign(row.original.campaign.id); }}>
            Edit Campaign
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(event: Event): void => { event.preventDefault(); actions.onDuplicateCampaign(row.original.campaign); }}>
            Duplicate Campaign
          </DropdownMenuItem>
          {resolveRunStateToggleLabel(row.original.campaign.status) !== null ? (
            <DropdownMenuItem onSelect={(event: Event): void => { event.preventDefault(); actions.onToggleCampaignRunState(row.original.campaign); }}>
              {resolveRunStateToggleLabel(row.original.campaign.status)}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={(event: Event): void => { event.preventDefault(); actions.onToggleArchiveCampaign(row.original.campaign); }}>
            {row.original.campaign.status === 'archived' ? 'Restore Draft' : 'Archive Campaign'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(event: Event): void => { event.preventDefault(); actions.onDeleteCampaign(row.original.campaign); }}>
            Delete Campaign
          </DropdownMenuItem>
        </ActionMenu>
      </div>
    );
  },
});

export const buildCampaignColumns = (options: BuildCampaignColumnsOptions): ColumnDef<CampaignRow>[] => [
  { id: 'campaign', header: 'Campaign', cell: CampaignNameCell },
  { id: 'status', header: 'Status', cell: CampaignStatusCell },
  { id: 'audience', header: 'Audience', cell: CampaignAudienceCell },
  { id: 'performance', header: 'Performance', cell: PerformanceCell },
  createLatestRunColumn(options.deliveryRegistry),
  {
    accessorFn: (row: CampaignRow): string => row.campaign.updatedAt ?? row.campaign.createdAt ?? '',
    id: 'updated',
    header: 'Updated',
    cell: ({ row }: CampaignCellContext): React.JSX.Element => (
      <span className='text-[10px] text-gray-600'>
        {formatTimestamp(row.original.campaign.updatedAt ?? row.original.campaign.createdAt)}
      </span>
    ),
  },
  createActionsColumn(options),
];
