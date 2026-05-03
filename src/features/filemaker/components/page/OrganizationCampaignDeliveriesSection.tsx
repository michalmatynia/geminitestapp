'use client';

import { Megaphone } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

import { useOrganizationCampaignDeliveriesModel } from './OrganizationCampaignDeliveriesSection.model';
import { DeliveryGroupRow } from './OrganizationCampaignDeliveriesSection.row';

import type {
  OrganizationCampaignDeliveriesModel,
} from './OrganizationCampaignDeliveriesSection.model';
import type {
  OrganizationCampaignDeliveryActiveGroup,
  OrganizationCampaignDeliveryViewMode,
} from './OrganizationCampaignDeliveriesSection.types';

const resolveDeliverySummary = (model: OrganizationCampaignDeliveriesModel): string => {
  if (model.orgDeliveries.length === 0) {
    return 'No campaign deliveries recorded for emails linked to this organization.';
  }
  const deliveryLabel = model.orgDeliveries.length === 1 ? 'record' : 'records';
  const emailLabel = model.emails.length === 1 ? 'address' : 'addresses';
  return `${model.orgDeliveries.length} delivery ${deliveryLabel} for ${model.emails.length} linked email ${emailLabel}.`;
};

const resolveEmptyMessage = (mode: OrganizationCampaignDeliveryViewMode): string =>
  mode === 'by_email'
    ? 'No campaigns have been sent to any email linked to this organization yet.'
    : 'No campaigns have reached this organization yet.';

const ViewModeTabs = ({ model }: { model: OrganizationCampaignDeliveriesModel }): React.JSX.Element => {
  const selectMode = (mode: OrganizationCampaignDeliveryViewMode): void => {
    model.setMode(mode);
    model.setExpandedKey(null);
  };
  return (
    <div className='flex items-center gap-1' role='tablist' aria-label='View mode'>
      <Button type='button' variant={model.mode === 'by_email' ? 'default' : 'outline'} size='sm' className='h-7 text-[11px]' role='tab' aria-selected={model.mode === 'by_email'} onClick={(): void => { selectMode('by_email'); }}>
        By email
      </Button>
      <Button type='button' variant={model.mode === 'by_campaign' ? 'default' : 'outline'} size='sm' className='h-7 text-[11px]' role='tab' aria-selected={model.mode === 'by_campaign'} onClick={(): void => { selectMode('by_campaign'); }}>
        By campaign
      </Button>
    </div>
  );
};

const DeliveryGroupsList = ({ model }: { model: OrganizationCampaignDeliveriesModel }): React.JSX.Element => {
  if (model.activeGroups.length === 0) {
    return (
      <div className='rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-gray-500'>
        {resolveEmptyMessage(model.mode)}
      </div>
    );
  }
  return (
    <ul className='divide-y divide-border/40 rounded-md border border-border/60 bg-card/20'>
      {model.activeGroups.map((group: OrganizationCampaignDeliveryActiveGroup) => (
        <DeliveryGroupRow
          key={group.key}
          mode={model.mode}
          group={group}
          campaignsById={model.campaignsById}
          expanded={model.expandedKey === group.key}
          onToggle={(): void => {
            model.setExpandedKey(model.expandedKey === group.key ? null : group.key);
          }}
          onNavigateToRun={model.navigateToRun}
          onNavigateToCampaign={model.navigateToCampaign}
          onNavigateToEmail={model.navigateToEmail}
        />
      ))}
    </ul>
  );
};

export function OrganizationCampaignDeliveriesSection(): React.JSX.Element | null {
  const model = useOrganizationCampaignDeliveriesModel();
  if (model.organization === null) return null;
  return (
    <FormSection
      title={<span className='flex items-center gap-2'><Megaphone className='h-3.5 w-3.5 text-gray-400' aria-hidden='true' />Campaign delivery log</span>}
      className='space-y-4 p-4'
    >
      <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400'>
        <div>{resolveDeliverySummary(model)}</div>
        <ViewModeTabs model={model} />
      </div>
      <DeliveryGroupsList model={model} />
    </FormSection>
  );
}
