import { usePersistedCampaignBuilder } from './AdminFilemakerCampaignEditPage.campaign-builder';
import { useCampaignDeleteAction } from './AdminFilemakerCampaignEditPage.destructive-action-hooks';
import type {
  CampaignEditActionContext,
  CampaignEditActions,
} from './AdminFilemakerCampaignEditPage.model-types';
import {
  useCampaignArchiveAction,
  useCampaignDuplicateAction,
  useCampaignLaunchAction,
  useCampaignSaveAction,
  useCampaignTestEmailAction,
} from './AdminFilemakerCampaignEditPage.primary-action-hooks';
import { useCampaignSuppressionActions } from './AdminFilemakerCampaignEditPage.suppression-action-hooks';

export function useCampaignEditActions(context: CampaignEditActionContext): CampaignEditActions {
  const buildPersistedCampaign = usePersistedCampaignBuilder({
    draft: context.draftState.draft,
    existingCampaign: context.draftState.existingCampaign,
  });
  const campaignActionInput = { context, buildPersistedCampaign };
  const saveCampaign = useCampaignSaveAction(campaignActionInput);
  const handleLaunch = useCampaignLaunchAction({
    ...campaignActionInput,
    saveCampaign,
  });
  const handleSendTestEmail = useCampaignTestEmailAction(campaignActionInput);
  const handleDuplicateCampaign = useCampaignDuplicateAction(campaignActionInput);
  const handleToggleArchiveCampaign = useCampaignArchiveAction(campaignActionInput);
  const handleDeleteCampaign = useCampaignDeleteAction(context);
  const suppressionActions = useCampaignSuppressionActions(context);
  return {
    saveCampaign,
    handleLaunch,
    handleSendTestEmail,
    handleDuplicateCampaign,
    handleToggleArchiveCampaign,
    handleDeleteCampaign,
    ...suppressionActions,
  };
}
