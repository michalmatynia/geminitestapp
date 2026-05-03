'use client';

import { Badge } from '@/shared/ui/primitives.public';
import { Megaphone } from 'lucide-react';
import React from 'react';

import { FilemakerEntityTablePage } from '../components/shared/FilemakerEntityTablePage';
import { CampaignDeliverabilityBanner } from './AdminFilemakerCampaignsPage.deliverability-banner';

import type { AdminFilemakerCampaignsPageModel } from './AdminFilemakerCampaignsPage.model';

const CampaignBadges = ({
  campaignCount,
  runCount,
  launchReadyCount,
}: {
  campaignCount: number;
  runCount: number;
  launchReadyCount: number;
}): React.JSX.Element => (
  <>
    <Badge variant='outline' className='text-[10px]'>
      Campaigns: {campaignCount}
    </Badge>
    <Badge variant='outline' className='text-[10px]'>
      Runs: {runCount}
    </Badge>
    <Badge variant='outline' className='text-[10px]'>
      Ready: {launchReadyCount}
    </Badge>
  </>
);

const CampaignDeliverabilityHeaderSlot = ({
  model,
}: {
  model: AdminFilemakerCampaignsPageModel;
}): React.JSX.Element | null => {
  if (!model.showDeliverabilityBanner) return null;
  return (
    <CampaignDeliverabilityBanner
      summary={model.deliverabilitySummary}
      onOpenCampaign={model.onOpenCampaign}
    />
  );
};

export const AdminFilemakerCampaignsPageView = (
  model: AdminFilemakerCampaignsPageModel
): React.JSX.Element => {
  const { ConfirmationModal } = model;
  return (
    <>
      <FilemakerEntityTablePage
        title='Filemaker Campaigns'
        description='Build campaign content, configure launch conditions, preview the audience, and monitor delivery runs.'
        icon={<Megaphone className='size-4' />}
        actions={model.actions}
        badges={
          <CampaignBadges
            campaignCount={model.rows.length}
            runCount={model.runCount}
            launchReadyCount={model.launchReadyCount}
          />
        }
        query={model.query}
        onQueryChange={model.onQueryChange}
        queryPlaceholder='Search campaign name, subject, or status...'
        columns={model.columns}
        data={model.rows}
        isLoading={model.isLoading}
        emptyTitle={model.emptyTitle}
        emptyDescription={model.emptyDescription}
        headerSlot={<CampaignDeliverabilityHeaderSlot model={model} />}
      />
      <ConfirmationModal />
    </>
  );
};
