'use client';

import { ExternalLink } from 'lucide-react';
import React from 'react';

import { Badge, Button } from '@/shared/ui/primitives.public';

import { formatTimestamp } from '../../pages/filemaker-page-utils';

import type {
  OrganizationCampaignDeliveryActiveGroup,
  OrganizationCampaignDeliveryViewMode,
} from './OrganizationCampaignDeliveriesSection.types';
import type {
  FilemakerEmail,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
} from '../../types';

const DELIVERY_STATUS_VARIANT: Record<
  FilemakerEmailCampaignDelivery['status'],
  'default' | 'outline' | 'destructive'
> = {
  sent: 'default',
  queued: 'outline',
  skipped: 'outline',
  failed: 'destructive',
  bounced: 'destructive',
};

type DeliveryGroupRowProps = {
  mode: OrganizationCampaignDeliveryViewMode;
  group: OrganizationCampaignDeliveryActiveGroup;
  campaignsById: Map<string, FilemakerEmailCampaign>;
  expanded: boolean;
  onToggle: () => void;
  onNavigateToRun: (runId: string) => void;
  onNavigateToCampaign: (campaignId: string) => void;
  onNavigateToEmail: (emailId: string) => void;
};

const getHeaderCampaign = (
  mode: OrganizationCampaignDeliveryViewMode,
  group: OrganizationCampaignDeliveryActiveGroup
): FilemakerEmailCampaign | null =>
  mode === 'by_campaign' ? (group.entity as FilemakerEmailCampaign | null) : null;

const getHeaderEmail = (
  mode: OrganizationCampaignDeliveryViewMode,
  group: OrganizationCampaignDeliveryActiveGroup
): FilemakerEmail | null => mode === 'by_email' ? (group.entity as FilemakerEmail | null) : null;

const resolveHeaderLabel = (
  mode: OrganizationCampaignDeliveryViewMode,
  group: OrganizationCampaignDeliveryActiveGroup
): string => {
  if (mode === 'by_email') return (group.entity as FilemakerEmail | null)?.email ?? '—';
  return (group.entity as FilemakerEmailCampaign | null)?.name ?? `Deleted campaign (${group.key})`;
};

const resolveHeaderSecondary = (
  mode: OrganizationCampaignDeliveryViewMode,
  group: OrganizationCampaignDeliveryActiveGroup
): string => {
  if (mode === 'by_email') {
    return `${group.deliveries.length} delivery ${group.deliveries.length === 1 ? 'record' : 'records'}`;
  }
  return (group.entity as FilemakerEmailCampaign | null)?.subject ?? '';
};

const HeaderActionButtons = ({
  campaign,
  email,
  onNavigateToCampaign,
  onNavigateToEmail,
}: {
  campaign: FilemakerEmailCampaign | null;
  email: FilemakerEmail | null;
  onNavigateToCampaign: (campaignId: string) => void;
  onNavigateToEmail: (emailId: string) => void;
}): React.JSX.Element => (
  <>
    {campaign !== null ? (
      <Button type='button' variant='ghost' size='sm' className='h-6 px-2 text-[10px]' onClick={(event): void => { event.stopPropagation(); onNavigateToCampaign(campaign.id); }} aria-label={`Open campaign ${campaign.name}`} title='Open campaign'>
        <ExternalLink className='h-3 w-3' aria-hidden='true' />
        <span className='ml-1'>Open</span>
      </Button>
    ) : null}
    {email !== null ? (
      <Button type='button' variant='ghost' size='sm' className='h-6 px-2 text-[10px]' onClick={(event): void => { event.stopPropagation(); onNavigateToEmail(email.id); }} aria-label={`Open email ${email.email}`} title='Open email'>
        <ExternalLink className='h-3 w-3' aria-hidden='true' />
        <span className='ml-1'>Open</span>
      </Button>
    ) : null}
  </>
);

const HeaderSecondary = ({ value }: { value: string }): React.JSX.Element | null =>
  value.length > 0 ? <div className='truncate text-[11px] text-gray-500'>{value}</div> : null;

const HeaderDeliveryBadge = ({
  delivery,
}: {
  delivery: FilemakerEmailCampaignDelivery | null;
}): React.JSX.Element | null =>
  delivery !== null ? <Badge variant={DELIVERY_STATUS_VARIANT[delivery.status]} className='text-[10px]'>{delivery.status}</Badge> : null;

const ExpandedIndicator = ({ expanded }: { expanded: boolean }): React.JSX.Element => (
  <span className='text-[11px] text-gray-400'>{expanded ? '▾' : '▸'}</span>
);

const DeliveryGroupHeader = (props: DeliveryGroupRowProps): React.JSX.Element => {
  const headerCampaign = getHeaderCampaign(props.mode, props.group);
  const headerEmail = getHeaderEmail(props.mode, props.group);
  const lastDelivery = props.group.deliveries[0] ?? null;
  const headerSecondary = resolveHeaderSecondary(props.mode, props.group);
  return (
    <button type='button' onClick={props.onToggle} className='flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-card/40' aria-expanded={props.expanded}>
      <div className='min-w-0'>
        <div className='truncate text-sm text-white'>{resolveHeaderLabel(props.mode, props.group)}</div>
        <HeaderSecondary value={headerSecondary} />
      </div>
      <div className='flex shrink-0 items-center gap-2'>
        <HeaderActionButtons campaign={headerCampaign} email={headerEmail} onNavigateToCampaign={props.onNavigateToCampaign} onNavigateToEmail={props.onNavigateToEmail} />
        <HeaderDeliveryBadge delivery={lastDelivery} />
        <span className='text-[11px] text-gray-500'>{formatTimestamp(lastDelivery?.sentAt ?? lastDelivery?.updatedAt ?? null)}</span>
        <ExpandedIndicator expanded={props.expanded} />
      </div>
    </button>
  );
};

const resolveDeliveryDetail = (
  delivery: FilemakerEmailCampaignDelivery,
  campaign: FilemakerEmailCampaign | null,
  mode: OrganizationCampaignDeliveryViewMode
): { label: string; secondary: string | null } => {
  if (mode === 'by_email') {
    return {
      label: campaign?.name ?? `Deleted campaign (${delivery.campaignId})`,
      secondary: campaign?.subject ?? null,
    };
  }
  return { label: delivery.emailAddress, secondary: null };
};

const DeliveryDetailBadges = ({ delivery }: { delivery: FilemakerEmailCampaignDelivery }): React.JSX.Element => {
  const runId = delivery.runId;
  return (
    <div className='flex items-center gap-2'>
      {delivery.failureCategory !== null ? <Badge variant='outline' className='text-[10px]'>{delivery.failureCategory}</Badge> : null}
      <Badge variant={DELIVERY_STATUS_VARIANT[delivery.status]} className='text-[10px]'>{delivery.status}</Badge>
      <span className='text-gray-500'>{formatTimestamp(delivery.sentAt ?? delivery.updatedAt ?? null)}</span>
      {runId.length > 0 ? <ExternalLink className='h-3 w-3 text-gray-400' aria-hidden='true' /> : null}
    </div>
  );
};

const DeliveryDetailRow = ({
  delivery,
  mode,
  campaignsById,
  onNavigateToRun,
}: Pick<DeliveryGroupRowProps, 'mode' | 'campaignsById' | 'onNavigateToRun'> & {
  delivery: FilemakerEmailCampaignDelivery;
}): React.JSX.Element => {
  const campaign = campaignsById.get(delivery.campaignId) ?? null;
  const detail = resolveDeliveryDetail(delivery, campaign, mode);
  const runId = delivery.runId;
  const hasRun = runId.length > 0;
  return (
    <li>
      <button type='button' onClick={(): void => { if (hasRun) onNavigateToRun(runId); }} disabled={!hasRun} className='flex w-full flex-wrap items-center justify-between gap-2 rounded border border-border/30 bg-card/20 px-2 py-1.5 text-left transition-colors hover:bg-card/40 disabled:cursor-not-allowed disabled:opacity-60' aria-label={hasRun ? `Open run for ${detail.label}` : detail.label} title={hasRun ? 'Open campaign run' : 'No run linked to this delivery'}>
        <div className='min-w-0'>
          <div className='truncate text-white'>{detail.label}</div>
          {detail.secondary !== null && detail.secondary.length > 0 ? <div className='truncate text-[10px] text-gray-500'>{detail.secondary}</div> : null}
        </div>
        <DeliveryDetailBadges delivery={delivery} />
      </button>
    </li>
  );
};

const DeliveryDetailsList = (props: DeliveryGroupRowProps): React.JSX.Element | null => {
  if (!props.expanded) return null;
  return (
    <ul className='space-y-1 border-t border-border/30 bg-card/10 p-3 text-[11px]'>
      {props.group.deliveries.map((delivery: FilemakerEmailCampaignDelivery) => (
        <DeliveryDetailRow key={delivery.id} delivery={delivery} mode={props.mode} campaignsById={props.campaignsById} onNavigateToRun={props.onNavigateToRun} />
      ))}
    </ul>
  );
};

export const DeliveryGroupRow = (props: DeliveryGroupRowProps): React.JSX.Element => (
  <li className='flex flex-col'>
    <DeliveryGroupHeader {...props} />
    <DeliveryDetailsList {...props} />
  </li>
);
