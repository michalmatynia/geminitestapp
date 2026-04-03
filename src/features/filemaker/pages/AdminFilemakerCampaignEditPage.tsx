'use client';

import React from 'react';
import {
  AdminFilemakerBreadcrumbs,
  Badge,
  Button,
  FormActions,
  SectionHeader,
} from '@/shared/ui';

import { formatTimestamp } from './filemaker-page-utils';
import {
  CampaignEditProvider,
  useCampaignEditContext,
} from './AdminFilemakerCampaignEditPage.context';
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

function AdminFilemakerCampaignEditPageContent(): React.JSX.Element {
  const {
    isCreateMode,
    existingCampaign,
    draft,
    launchingMode,
    ConfirmationModal,
    isTestSendPending,
    selectedMailAccount,
    preview,
    recentRuns,
    nextAutomationAt,
    schedulerFailureMessage,
    saveCampaign,
    handleLaunch,
    handleDuplicateCampaign,
    handleToggleArchiveCampaign,
    handleDeleteCampaign,
    isLoading,
    isUpdatePending,
    router,
  } = useCampaignEditContext();

  if (!isCreateMode && !existingCampaign && !isLoading) {
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
        title={isCreateMode ? 'Create Campaign' : 'Edit Campaign'}
        description='Configure campaign content, audience rules, launch conditions, and recent run monitoring.'
        eyebrow={
          <AdminFilemakerBreadcrumbs
            parent={{ label: 'Campaigns', href: '/admin/filemaker/campaigns' }}
            current={isCreateMode ? 'New Campaign' : draft.name || 'Edit'}
            className='mb-2'
          />
        }
        actions={
          <FormActions
            onCancel={(): void => {
              router.push('/admin/filemaker/campaigns');
            }}
            cancelText='Back to Campaigns'
            onSave={(): void => {
              void saveCampaign();
            }}
            saveText='Save Campaign'
            isSaving={isUpdatePending || launchingMode !== null}
          >
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={isUpdatePending || launchingMode !== null || isTestSendPending}
              onClick={(): void => {
                void handleDuplicateCampaign();
              }}
            >
              Duplicate Campaign
            </Button>
            {!isCreateMode ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={isUpdatePending || launchingMode !== null || isTestSendPending}
                onClick={(): void => {
                  void handleToggleArchiveCampaign();
                }}
              >
                {draft.status === 'archived' ? 'Restore Draft' : 'Archive Campaign'}
              </Button>
            ) : null}
            {!isCreateMode ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={isUpdatePending || launchingMode !== null || isTestSendPending}
                onClick={(): void => {
                  handleDeleteCampaign();
                }}
              >
                Delete Campaign
              </Button>
            ) : null}
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={isUpdatePending || launchingMode !== null || isTestSendPending}
              onClick={(): void => {
                void handleLaunch('dry_run');
              }}
            >
              Create Dry Run
            </Button>
            <Button
              type='button'
              size='sm'
              disabled={isUpdatePending || launchingMode !== null}
              onClick={(): void => {
                void handleLaunch('live');
              }}
            >
              Launch Campaign
            </Button>
          </FormActions>
        }
      />

      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          ID: {draft.id || 'will be generated on first save'}
        </Badge>
        <Badge variant='outline' className='text-[10px] capitalize'>
          Status: {draft.status}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Preview Recipients: {preview.recipients.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Runs: {recentRuns.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Last Launch: {formatTimestamp(draft.lastLaunchedAt)}
        </Badge>
        <Badge variant='outline' className='text-[10px] capitalize'>
          Automation: {draft.launch.mode}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Delivery Route:{' '}
          {selectedMailAccount
            ? `${selectedMailAccount.name}${selectedMailAccount.status === 'active' ? '' : ' (paused)'}`
            : draft.mailAccountId
              ? `Missing account (${draft.mailAccountId})`
              : 'Shared provider'}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Next Due: {nextAutomationAt ? formatTimestamp(nextAutomationAt) : 'Manual only'}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Last Evaluated: {formatTimestamp(draft.lastEvaluatedAt)}
        </Badge>
      </div>

      {schedulerFailureMessage ? (
        <div className='rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200'>
          Latest scheduler launch failure: {schedulerFailureMessage}
        </div>
      ) : null}

      <CampaignDetailsSection />
      <ContentSection />
      <CampaignTestSendSection />
      <AudienceSection />
      <LaunchSection />
      <DeliveryGovernanceSection />
      <AudiencePreviewSection />
      <CampaignAnalyticsSection />
      <RecentRunsSection />
      <ConfirmationModal />
    </div>
  );
}

export function AdminFilemakerCampaignEditPage(): React.JSX.Element {
  return (
    <CampaignEditProvider>
      <AdminFilemakerCampaignEditPageContent />
    </CampaignEditProvider>
  );
}
