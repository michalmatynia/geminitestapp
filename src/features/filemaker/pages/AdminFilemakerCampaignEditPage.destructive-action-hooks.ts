import { useCallback } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { FilemakerEmailCampaign } from '../types';
import type {
  CampaignEditActionContext,
  CampaignEditActions,
} from './AdminFilemakerCampaignEditPage.model-types';

const deleteCampaign = async (
  context: CampaignEditActionContext,
  existingCampaign: FilemakerEmailCampaign
): Promise<void> => {
  const nextCampaigns = context.registries.campaignRegistry.campaigns.filter(
    (campaign) => campaign.id !== existingCampaign.id
  );
  try {
    await context.persistence.persistCampaignDeletion({
      nextCampaigns,
      campaignId: existingCampaign.id,
    });
    context.toast('Campaign deleted.', { variant: 'success' });
    context.router.push('/admin/filemaker/campaigns');
    context.settingsStore.refetch();
  } catch (error: unknown) {
    logClientError(error);
    context.toast(error instanceof Error ? error.message : 'Failed to delete campaign.', {
      variant: 'error',
    });
  }
};

export function useCampaignDeleteAction(
  context: CampaignEditActionContext
): CampaignEditActions['handleDeleteCampaign'] {
  return useCallback((): void => {
    if (context.route.isCreateMode || context.draftState.existingCampaign === null) return;
    const existingCampaign = context.draftState.existingCampaign;
    context.confirm({
      title: 'Delete campaign?',
      message:
        'This will remove the campaign and its run history, delivery records, attempt history, events, and scheduler traces.',
      confirmText: 'Delete campaign',
      isDangerous: true,
      onConfirm: async (): Promise<void> => {
        await deleteCampaign(context, existingCampaign);
      },
    });
  }, [context]);
}
