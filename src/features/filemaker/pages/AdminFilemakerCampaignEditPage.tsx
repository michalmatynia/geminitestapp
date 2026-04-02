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
  CampaignTestSendSection,
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
    ConfirmationModal,
    suppressionEmailDraft,
    setSuppressionEmailDraft,
    testRecipientEmailDraft,
    setTestRecipientEmailDraft,
    isTestSendPending,
    suppressionReasonDraft,
    setSuppressionReasonDraft,
    suppressionNotesDraft,
    setSuppressionNotesDraft,
    organizationOptions,
    eventOptions,
    partyOptions,
    mailAccountOptions,
    selectedMailAccount,
    preview,
    launchEvaluation,
    recentRuns,
    suppressionEntries,
    analytics,
    nextAutomationAt,
    schedulerFailureMessage,
    saveCampaign,
    handleLaunch,
    handleSendTestEmail,
    handleDuplicateCampaign,
    handleToggleArchiveCampaign,
    handleDeleteCampaign,
    handleAddSuppressionEntry,
    handleRemoveSuppressionEntry,
    isLoading,
    isUpdatePending,
    router,
    deliveryRegistry,
    attemptRegistry,
    handleRunAction,
    isRunActionPending,
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

      <CampaignDetailsSection
        draft={draft}
        setDraft={setDraft}
        mailAccountOptions={mailAccountOptions}
        selectedMailAccount={selectedMailAccount}
      />
      <ContentSection draft={draft} setDraft={setDraft} />
      <CampaignTestSendSection
        testRecipientEmailDraft={testRecipientEmailDraft}
        setTestRecipientEmailDraft={setTestRecipientEmailDraft}
        handleSendTestEmail={handleSendTestEmail}
        isTestSendPending={isTestSendPending}
        selectedMailAccount={selectedMailAccount}
      />
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
        attemptRegistry={attemptRegistry}
        getFilemakerEmailCampaignDeliveriesForRun={getFilemakerEmailCampaignDeliveriesForRun}
        summarizeFilemakerEmailCampaignRunDeliveries={summarizeFilemakerEmailCampaignRunDeliveries}
        handleRunAction={handleRunAction}
        isRunActionPending={isRunActionPending}
        isUpdatePending={isUpdatePending}
        router={router}
      />
      <ConfirmationModal />
    </div>
  );
}
