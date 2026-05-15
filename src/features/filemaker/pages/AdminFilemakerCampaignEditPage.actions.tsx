'use client';

import React, { startTransition } from 'react';

import { FormActions } from '@/shared/ui/forms-and-actions.public';
import { Button } from '@/shared/ui/primitives.public';

import type { useCampaignEditContext } from './AdminFilemakerCampaignEditPage.context';

export type CampaignEditContextValue = ReturnType<typeof useCampaignEditContext>;

type CampaignEditRouter = CampaignEditContextValue['router'];
type LaunchMode = CampaignEditContextValue['launchingMode'];
type LaunchEvaluation = CampaignEditContextValue['launchEvaluation'];

type CampaignEditPendingState = {
  isTestSendPending: boolean;
  isUpdatePending: boolean;
  launchingMode: LaunchMode;
};

type CampaignEditActionHandlers = {
  handleDeleteCampaign: CampaignEditContextValue['handleDeleteCampaign'];
  handleDuplicateCampaign: CampaignEditContextValue['handleDuplicateCampaign'];
  handleGrantApproval: CampaignEditContextValue['handleGrantApproval'];
  handleRevokeApproval: CampaignEditContextValue['handleRevokeApproval'];
  handleLaunch: CampaignEditContextValue['handleLaunch'];
  handleToggleArchiveCampaign: CampaignEditContextValue['handleToggleArchiveCampaign'];
  saveCampaign: CampaignEditContextValue['saveCampaign'];
};

type CampaignEditActionsProps = CampaignEditActionHandlers &
  CampaignEditPendingState & {
    draft: CampaignEditContextValue['draft'];
    isCreateMode: boolean;
    launchEvaluation: LaunchEvaluation;
    router: CampaignEditRouter;
  };

const returnToCampaigns = (router: CampaignEditRouter): void => {
  startTransition(() => {
    router.push('/admin/filemaker/campaigns');
  });
};

const isCampaignActionDisabled = ({
  isTestSendPending,
  isUpdatePending,
  launchingMode,
}: CampaignEditPendingState): boolean =>
  isUpdatePending || launchingMode !== null || isTestSendPending;

const getArchiveActionLabel = (status: CampaignEditContextValue['draft']['status']): string =>
  status === 'archived' ? 'Restore Draft' : 'Archive Campaign';

function CampaignEditDuplicateButton({
  disabled,
  handleDuplicateCampaign,
}: {
  disabled: boolean;
  handleDuplicateCampaign: CampaignEditContextValue['handleDuplicateCampaign'];
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={disabled}
      onClick={(): void => {
        void handleDuplicateCampaign();
      }}
    >
      Duplicate Campaign
    </Button>
  );
}

function CampaignEditArchiveButton({
  disabled,
  draft,
  handleToggleArchiveCampaign,
  isCreateMode,
}: Pick<CampaignEditActionsProps, 'draft' | 'handleToggleArchiveCampaign' | 'isCreateMode'> & {
  disabled: boolean;
}): React.JSX.Element | null {
  if (isCreateMode) return null;
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={disabled}
      onClick={(): void => {
        void handleToggleArchiveCampaign();
      }}
    >
      {getArchiveActionLabel(draft.status)}
    </Button>
  );
}

function CampaignEditDeleteButton({
  disabled,
  handleDeleteCampaign,
  isCreateMode,
}: Pick<CampaignEditActionsProps, 'handleDeleteCampaign' | 'isCreateMode'> & {
  disabled: boolean;
}): React.JSX.Element | null {
  if (isCreateMode) return null;
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={disabled}
      onClick={(): void => {
        handleDeleteCampaign();
      }}
    >
      Delete Campaign
    </Button>
  );
}

function CampaignEditApprovalButton({
  disabled,
  draft,
  handleGrantApproval,
  handleRevokeApproval,
  isCreateMode,
}: Pick<CampaignEditActionsProps, 'draft' | 'handleGrantApproval' | 'handleRevokeApproval' | 'isCreateMode'> & {
  disabled: boolean;
}): React.JSX.Element | null {
  if (isCreateMode || !draft.launch.requireApproval) return null;
  const isApproved = (draft.approvalGrantedAt ?? '').length > 0;
  return (
    <Button
      type='button'
      variant={isApproved ? 'outline' : 'default'}
      size='sm'
      disabled={disabled}
      onClick={(): void => {
        if (isApproved) {
          void handleRevokeApproval();
        } else {
          void handleGrantApproval();
        }
      }}
    >
      {isApproved ? 'Revoke Approval' : 'Approve Campaign'}
    </Button>
  );
}

function CampaignEditDryRunButton({
  disabled,
  handleLaunch,
}: Pick<CampaignEditActionsProps, 'handleLaunch'> & {
  disabled: boolean;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={disabled}
      onClick={(): void => {
        void handleLaunch('dry_run');
      }}
    >
      Create Dry Run
    </Button>
  );
}

function CampaignEditLaunchButton({
  disabled,
  handleLaunch,
  launchEvaluation,
}: Pick<CampaignEditActionsProps, 'handleLaunch' | 'launchEvaluation'> & {
  disabled: boolean;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      size='sm'
      disabled={disabled || !launchEvaluation.isEligible}
      onClick={(): void => {
        void handleLaunch('live');
      }}
    >
      Launch Campaign
    </Button>
  );
}

export function CampaignBackActions({
  router,
}: {
  router: CampaignEditRouter;
}): React.JSX.Element {
  return (
    <FormActions
      onCancel={(): void => {
        returnToCampaigns(router);
      }}
      cancelText='Back to Campaigns'
    />
  );
}

export function CampaignEditActions({
  draft,
  handleDeleteCampaign,
  handleDuplicateCampaign,
  handleGrantApproval,
  handleRevokeApproval,
  handleLaunch,
  handleToggleArchiveCampaign,
  isCreateMode,
  isTestSendPending,
  isUpdatePending,
  launchEvaluation,
  launchingMode,
  router,
  saveCampaign,
}: CampaignEditActionsProps): React.JSX.Element {
  const disabled = isCampaignActionDisabled({ isTestSendPending, isUpdatePending, launchingMode });
  return (
    <FormActions
      onCancel={(): void => {
        returnToCampaigns(router);
      }}
      cancelText='Back to Campaigns'
      onSave={(): void => {
        void saveCampaign();
      }}
      saveText='Save Campaign'
      isSaving={isUpdatePending || launchingMode !== null}
    >
      <CampaignEditDuplicateButton disabled={disabled} handleDuplicateCampaign={handleDuplicateCampaign} />
      <CampaignEditArchiveButton
        disabled={disabled}
        draft={draft}
        handleToggleArchiveCampaign={handleToggleArchiveCampaign}
        isCreateMode={isCreateMode}
      />
      <CampaignEditDeleteButton
        disabled={disabled}
        handleDeleteCampaign={handleDeleteCampaign}
        isCreateMode={isCreateMode}
      />
      <CampaignEditApprovalButton
        disabled={disabled}
        draft={draft}
        handleGrantApproval={handleGrantApproval}
        handleRevokeApproval={handleRevokeApproval}
        isCreateMode={isCreateMode}
      />
      <CampaignEditDryRunButton disabled={disabled} handleLaunch={handleLaunch} />
      <CampaignEditLaunchButton
        disabled={disabled}
        handleLaunch={handleLaunch}
        launchEvaluation={launchEvaluation}
      />
    </FormActions>
  );
}
