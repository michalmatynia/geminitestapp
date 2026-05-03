'use client';

import Link from 'next/link';
import React from 'react';

import { Button } from '@/shared/ui/primitives.public';

import type { FilemakerMailCampaignContext } from '../types';

export const buildFilemakerCampaignHref = (campaignId: string): string =>
  `/admin/filemaker/campaigns/${encodeURIComponent(campaignId)}`;

export const buildFilemakerCampaignRunHref = (runId: string): string =>
  `/admin/filemaker/campaigns/runs/${encodeURIComponent(runId)}`;

function FilemakerCampaignRunLink({ runId }: { runId?: string | null }): React.JSX.Element | null {
  if (typeof runId !== 'string' || runId.length === 0) return null;

  return (
    <Button asChild variant='outline' size='xs' className='border-cyan-400/60 text-cyan-200'>
      <Link href={buildFilemakerCampaignRunHref(runId)}>Run</Link>
    </Button>
  );
}

function FilemakerCampaignDeliveryBadge({
  deliveryId,
}: {
  deliveryId?: string | null;
}): React.JSX.Element | null {
  if (typeof deliveryId !== 'string' || deliveryId.length === 0) return null;

  return (
    <span className='inline-flex items-center rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-semibold text-gray-400'>
      Delivery: {deliveryId}
    </span>
  );
}

export function FilemakerCampaignContextLinks({
  campaignName,
  className,
  context,
}: {
  campaignName?: string | null;
  className?: string;
  context: FilemakerMailCampaignContext;
}): React.JSX.Element {
  const trimmedCampaignName = campaignName?.trim() ?? '';
  const campaignLabel = trimmedCampaignName.length > 0 ? trimmedCampaignName : context.campaignId;

  return (
    <div className={className ?? 'flex flex-wrap gap-2'}>
      <Button asChild variant='outline' size='xs' className='border-amber-400/60 text-amber-200'>
        <Link href={buildFilemakerCampaignHref(context.campaignId)}>
          Campaign: {campaignLabel}
        </Link>
      </Button>
      <FilemakerCampaignRunLink runId={context.runId} />
      <FilemakerCampaignDeliveryBadge deliveryId={context.deliveryId} />
    </div>
  );
}
