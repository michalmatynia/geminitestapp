'use client';

import React from 'react';

import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Badge } from '@/shared/ui/primitives.public';

import {
  CampaignBackActions,
  CampaignEditActions,
  type CampaignEditContextValue,
} from './AdminFilemakerCampaignEditPage.actions';
import {
  CampaignDetailsSection,
  ContentSection,
  CampaignTestSendSection,
  AudienceSection,
  LaunchSection,
  DeliveryGovernanceSection,
  AudiencePreviewSection,
  CampaignAnalyticsSection,
  RecentRunsSection,
} from './AdminFilemakerCampaignEditPage.sections';
import { CampaignDeliverabilityCheckSection } from './campaign-edit-sections/CampaignDeliverabilityCheckSection';
import { CampaignEngagementTrendSection } from './campaign-edit-sections/CampaignEngagementTrendSection';
import { formatTimestamp } from './filemaker-page-utils';

type SelectedMailAccount = CampaignEditContextValue['selectedMailAccount'];

const getCampaignDraftIdLabel = (id: string): string =>
  id.length > 0 ? id : 'will be generated on first save';

const getCampaignBreadcrumbCurrent = (input: {
  draftName: string;
  isCreateMode: boolean;
}): string => {
  if (input.isCreateMode) return 'New Campaign';
  return input.draftName.length > 0 ? input.draftName : 'Edit';
};

const getDeliveryRouteLabel = (
  selectedMailAccount: SelectedMailAccount,
  mailAccountId: string | null
): string => {
  if (selectedMailAccount !== null) {
    const pausedSuffix = selectedMailAccount.status === 'active' ? '' : ' (paused)';
    return `${selectedMailAccount.name}${pausedSuffix}`;
  }
  if (mailAccountId !== null && mailAccountId.length > 0) return `Missing account (${mailAccountId})`;
  return 'No sender account assigned';
};

const formatNextAutomationAt = (nextAutomationAt: string | null): string =>
  nextAutomationAt !== null ? formatTimestamp(nextAutomationAt) : 'Manual only';

export function CampaignEditMissingState({
  router,
}: {
  router: CampaignEditContextValue['router'];
}): React.JSX.Element {
  return (
    <div className='page-section-compact space-y-6'>
      <SectionHeader
        title='Edit Campaign'
        description='The requested Filemaker campaign could not be found.'
        eyebrow={
          <AdminFilemakerBreadcrumbs
            parent={{ label: 'Campaigns', href: '/admin/filemaker/campaigns' }}
            current='Edit'
            className='mb-2'
          />
        }
        actions={<CampaignBackActions router={router} />}
      />
    </div>
  );
}

function CampaignEditHeader({
  context,
}: {
  context: CampaignEditContextValue;
}): React.JSX.Element {
  return (
    <SectionHeader
      title={context.isCreateMode ? 'Create Campaign' : 'Edit Campaign'}
      description='Configure sender account, campaign content, audience rules, launch conditions, and recent run monitoring.'
      eyebrow={
        <AdminFilemakerBreadcrumbs
          parent={{ label: 'Campaigns', href: '/admin/filemaker/campaigns' }}
          current={getCampaignBreadcrumbCurrent({
            draftName: context.draft.name,
            isCreateMode: context.isCreateMode,
          })}
          className='mb-2'
        />
      }
      actions={<CampaignEditActions {...context} />}
    />
  );
}

function CampaignEditBadges({
  context,
}: {
  context: CampaignEditContextValue;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        ID: {getCampaignDraftIdLabel(context.draft.id)}
      </Badge>
      <Badge variant='outline' className='text-[10px] capitalize'>
        Status: {context.draft.status}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Preview Recipients: {context.preview.recipients.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Runs: {context.recentRuns.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Last Launch: {formatTimestamp(context.draft.lastLaunchedAt)}
      </Badge>
      <Badge variant='outline' className='text-[10px] capitalize'>
        Automation: {context.draft.launch.mode}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Delivery Route: {getDeliveryRouteLabel(context.selectedMailAccount, context.draft.mailAccountId)}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Next Due: {formatNextAutomationAt(context.nextAutomationAt)}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Last Evaluated: {formatTimestamp(context.draft.lastEvaluatedAt)}
      </Badge>
    </div>
  );
}

function CampaignSchedulerFailureBanner({
  message,
}: {
  message: string | null;
}): React.JSX.Element | null {
  if (message === null || message.length === 0) return null;
  return (
    <div className='rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200'>
      Latest scheduler launch failure: {message}
    </div>
  );
}

function CampaignEditBodySections({
  ConfirmationModal,
}: {
  ConfirmationModal: CampaignEditContextValue['ConfirmationModal'];
}): React.JSX.Element {
  return (
    <>
      <CampaignDetailsSection />
      <ContentSection />
      <CampaignTestSendSection />
      <AudienceSection />
      <LaunchSection />
      <DeliveryGovernanceSection />
      <AudiencePreviewSection />
      <CampaignDeliverabilityCheckSection />
      <CampaignAnalyticsSection />
      <CampaignEngagementTrendSection />
      <RecentRunsSection />
      <ConfirmationModal />
    </>
  );
}

export function CampaignEditLayout({
  context,
}: {
  context: CampaignEditContextValue;
}): React.JSX.Element {
  return (
    <div className='page-section-compact space-y-6'>
      <CampaignEditHeader context={context} />
      <CampaignEditBadges context={context} />
      <CampaignSchedulerFailureBanner message={context.schedulerFailureMessage} />
      <CampaignEditBodySections ConfirmationModal={context.ConfirmationModal} />
    </div>
  );
}
