import { useCallback } from 'react';

import { api } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignLaunchRunResponse,
  FilemakerEmailCampaignRunMode,
  FilemakerEmailCampaignTestSendResponse,
} from '../types';
import { createDuplicatedCampaignDraft } from './AdminFilemakerCampaignEditPage.utils';
import type {
  CampaignEditActionContext,
  CampaignEditActions,
  PersistedCampaignBuilder,
} from './AdminFilemakerCampaignEditPage.model-types';

type CampaignActionInput = {
  context: CampaignEditActionContext;
  buildPersistedCampaign: PersistedCampaignBuilder;
};

type CampaignLaunchActionInput = CampaignActionInput & {
  saveCampaign: CampaignEditActions['saveCampaign'];
};

const sortCampaignsByName = (
  campaigns: FilemakerEmailCampaign[]
): FilemakerEmailCampaign[] =>
  campaigns.sort((left, right) => left.name.localeCompare(right.name));

export function useCampaignSaveAction(input: CampaignActionInput): CampaignEditActions['saveCampaign'] {
  const { buildPersistedCampaign, context } = input;
  return useCallback(
    async (successMessage = 'Campaign saved.'): Promise<FilemakerEmailCampaign | null> => {
      const nextCampaign = buildPersistedCampaign();
      const nextCampaigns = sortCampaignsByName(
        context.registries.campaignRegistry.campaigns
          .filter((campaign) => campaign.id !== nextCampaign.id)
          .concat(nextCampaign)
      );
      try {
        await context.persistence.persistCampaignRegistry(nextCampaigns);
        context.draftState.setDraft(nextCampaign);
        if (successMessage.length > 0) context.toast(successMessage, { variant: 'success' });
        if (context.route.isCreateMode) {
          context.router.replace(`/admin/filemaker/campaigns/${encodeURIComponent(nextCampaign.id)}`);
        }
        return nextCampaign;
      } catch (error: unknown) {
        logClientError(error);
        context.toast(error instanceof Error ? error.message : 'Failed to save campaign.', {
          variant: 'error',
        });
        return null;
      }
    },
    [buildPersistedCampaign, context]
  );
}

const resolveLaunchReason = (mode: FilemakerEmailCampaignRunMode): string => {
  if (mode === 'dry_run') return 'Dry run created from the Filemaker campaign editor.';
  return 'Manual launch created from the Filemaker campaign editor.';
};

const resolveLaunchSuccessMessage = (
  mode: FilemakerEmailCampaignRunMode,
  response: FilemakerEmailCampaignLaunchRunResponse
): string => {
  if (mode === 'dry_run') return 'Dry run created.';
  if (response.dispatchMode === 'inline') return 'Campaign started in inline processing mode.';
  return 'Campaign queued for delivery.';
};

export function useCampaignLaunchAction(
  input: CampaignLaunchActionInput
): CampaignEditActions['handleLaunch'] {
  const { buildPersistedCampaign, context, saveCampaign } = input;
  return useCallback(
    async (mode: FilemakerEmailCampaignRunMode): Promise<void> => {
      const savedCampaign = await saveCampaign('');
      if (savedCampaign === null) return;
      context.draftState.setLaunchingMode(mode);
      try {
        const response = await api.post<FilemakerEmailCampaignLaunchRunResponse>(
          '/api/filemaker/campaigns/runs',
          { campaignId: savedCampaign.id, mode, launchReason: resolveLaunchReason(mode) }
        );
        if (mode === 'live') {
          const now = new Date().toISOString();
          context.draftState.setDraft(
            buildPersistedCampaign({ id: savedCampaign.id, lastLaunchedAt: now, lastEvaluatedAt: now })
          );
        }
        context.settingsStore.refetch();
        context.router.refresh();
        context.toast(resolveLaunchSuccessMessage(mode, response), { variant: 'success' });
      } catch (error: unknown) {
        logClientError(error);
        context.toast(error instanceof Error ? error.message : 'Failed to create campaign run.', {
          variant: 'error',
        });
      } finally {
        context.draftState.setLaunchingMode(null);
      }
    },
    [buildPersistedCampaign, context, saveCampaign]
  );
}

export function useCampaignTestEmailAction(
  input: CampaignActionInput
): CampaignEditActions['handleSendTestEmail'] {
  const { buildPersistedCampaign, context } = input;
  return useCallback(async (): Promise<void> => {
    const recipientEmail = context.draftState.testRecipientEmailDraft.trim().toLowerCase();
    if (recipientEmail.length === 0) {
      context.toast('Recipient email is required before sending a test delivery.', { variant: 'error' });
      return;
    }
    if ((context.draftState.draft.mailAccountId ?? '').trim().length === 0) {
      context.toast('Assign an email account before sending a test delivery.', { variant: 'error' });
      return;
    }
    context.draftState.setIsTestSendPending(true);
    try {
      const response = await api.post<FilemakerEmailCampaignTestSendResponse>(
        '/api/filemaker/campaigns/test-send',
        {
          campaign: buildPersistedCampaign(),
          contentGroupRegistry: context.registries.contentGroupRegistry,
          recipientEmail,
        }
      );
      context.draftState.setTestRecipientEmailDraft(recipientEmail);
      context.toast(`Test email sent to ${response.recipientEmail}. ${response.providerMessage}`, {
        variant: 'success',
      });
    } catch (error: unknown) {
      logClientError(error);
      context.toast(error instanceof Error ? error.message : 'Failed to send campaign test email.', {
        variant: 'error',
      });
    } finally {
      context.draftState.setIsTestSendPending(false);
    }
  }, [buildPersistedCampaign, context]);
}

export function useCampaignDuplicateAction(
  input: CampaignActionInput
): CampaignEditActions['handleDuplicateCampaign'] {
  const { buildPersistedCampaign, context } = input;
  return useCallback(async (): Promise<void> => {
    if (context.route.isCreateMode) return;
    const duplicatedCampaign = createDuplicatedCampaignDraft({
      campaign: buildPersistedCampaign(),
      existingCampaigns: context.registries.campaignRegistry.campaigns,
    });
    try {
      await context.persistence.persistCampaignRegistry(
        sortCampaignsByName(context.registries.campaignRegistry.campaigns.concat(duplicatedCampaign))
      );
      context.toast(`Campaign duplicated as ${duplicatedCampaign.name}.`, { variant: 'success' });
      context.router.push(`/admin/filemaker/campaigns/${encodeURIComponent(duplicatedCampaign.id)}`);
    } catch (error: unknown) {
      logClientError(error);
      context.toast(error instanceof Error ? error.message : 'Failed to duplicate campaign.', {
        variant: 'error',
      });
    }
  }, [buildPersistedCampaign, context]);
}

export function useCampaignArchiveAction(
  input: CampaignActionInput
): CampaignEditActions['handleToggleArchiveCampaign'] {
  const { buildPersistedCampaign, context } = input;
  return useCallback(async (): Promise<void> => {
    if (context.route.isCreateMode) return;
    const isArchived = context.draftState.draft.status === 'archived';
    const nextCampaign = buildPersistedCampaign({
      status: isArchived ? 'draft' : 'archived',
      approvalGrantedAt: isArchived ? context.draftState.draft.approvalGrantedAt : null,
      approvedBy: isArchived ? context.draftState.draft.approvedBy : null,
    });
    const nextCampaigns = sortCampaignsByName(
      context.registries.campaignRegistry.campaigns
        .filter((campaign) => campaign.id !== nextCampaign.id)
        .concat(nextCampaign)
    );
    try {
      await context.persistence.persistCampaignRegistry(nextCampaigns);
      context.draftState.setDraft(nextCampaign);
      context.toast(isArchived ? 'Campaign restored to draft.' : 'Campaign archived.', { variant: 'success' });
      context.settingsStore.refetch();
    } catch (error: unknown) {
      logClientError(error);
      context.toast(error instanceof Error ? error.message : 'Failed to update campaign status.', {
        variant: 'error',
      });
    }
  }, [buildPersistedCampaign, context]);
}
