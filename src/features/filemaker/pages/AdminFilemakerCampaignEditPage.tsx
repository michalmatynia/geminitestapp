'use client';

import React from 'react';
import {
  AdminFilemakerBreadcrumbs,
  Badge,
  Button,
  FormActions,
  SectionHeader,
} from '@/shared/ui';

import {
  getFilemakerEmailCampaignDeliveriesForRun,
  summarizeFilemakerEmailCampaignRunDeliveries,
} from '../settings';
import { formatTimestamp } from './filemaker-page-utils';
import { useAdminFilemakerCampaignEditState } from './AdminFilemakerCampaignEditPage.hooks';
import {
  CampaignDetailsSection,
  ContentSection,
  AudienceSection,
  LaunchSection,
  DeliveryGovernanceSection,
  AudiencePreviewSection,
  CampaignAnalyticsSection,
  RecentRunsSection,
} from './AdminFilemakerCampaignEditPage.sections';

export function AdminFilemakerCampaignEditPage(): React.JSX.Element {
  const {
    isCreateMode,
    existingCampaign,
    draft,
    setDraft,
    launchingMode,
    suppressionEmailDraft,
    setSuppressionEmailDraft,
    suppressionReasonDraft,
    setSuppressionReasonDraft,
    suppressionNotesDraft,
    setSuppressionNotesDraft,
    organizationOptions,
    eventOptions,
    partyOptions,
    preview,
    launchEvaluation,
    recentRuns,
    suppressionEntries,
    analytics,
    saveCampaign,
    handleLaunch,
    handleRunStatusChange,
    handleAddSuppressionEntry,
    handleRemoveSuppressionEntry,
    isLoading,
    isUpdatePending,
    router,
    deliveryRegistry,
  } = useAdminFilemakerCampaignEditState();

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
              disabled={isUpdatePending || launchingMode !== null}
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
      </div>

      <CampaignDetailsSection draft={draft} setDraft={setDraft} />
      <ContentSection draft={draft} setDraft={setDraft} />
      <AudienceSection
        draft={draft}
        setDraft={setDraft}
        eventOptions={eventOptions}
        organizationOptions={organizationOptions}
        partyOptions={partyOptions}
      />
      <LaunchSection draft={draft} setDraft={setDraft} />
      <DeliveryGovernanceSection
        suppressionEntries={suppressionEntries}
        suppressionEmailDraft={suppressionEmailDraft}
        setSuppressionEmailDraft={setSuppressionEmailDraft}
        suppressionReasonDraft={suppressionReasonDraft}
        setSuppressionReasonDraft={setSuppressionReasonDraft}
        suppressionNotesDraft={suppressionNotesDraft}
        setSuppressionNotesDraft={setSuppressionNotesDraft}
        handleAddSuppressionEntry={() => { void handleAddSuppressionEntry(); }}
        handleRemoveSuppressionEntry={(email: string) => { void handleRemoveSuppressionEntry(email); }}
        isUpdatePending={isUpdatePending}
        unsubscribeLinkTemplate='{{unsubscribe_url}}'
        preferencesLinkTemplate='{{preferences_url}}'
        manageAllPreferencesLinkTemplate='{{manage_all_preferences_url}}'
      />
      <AudiencePreviewSection preview={preview} launchEvaluation={launchEvaluation} />
      <CampaignAnalyticsSection analytics={analytics} />
      <RecentRunsSection
        recentRuns={recentRuns}
        deliveryRegistry={deliveryRegistry}
        getFilemakerEmailCampaignDeliveriesForRun={getFilemakerEmailCampaignDeliveriesForRun}
        summarizeFilemakerEmailCampaignRunDeliveries={summarizeFilemakerEmailCampaignRunDeliveries}
        handleRunStatusChange={handleRunStatusChange}
        isUpdatePending={isUpdatePending}
        router={router}
      />
    </div>
  );
}
