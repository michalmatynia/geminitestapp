import { startTransition } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY,
  toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry,
  toPersistedFilemakerEmailCampaignDeliveryRegistry,
  toPersistedFilemakerEmailCampaignEventRegistry,
  toPersistedFilemakerEmailCampaignRegistry,
  toPersistedFilemakerEmailCampaignRunRegistry,
  toPersistedFilemakerEmailCampaignSchedulerStatus,
} from '../settings';
import { createDuplicatedCampaignDraft, removeCampaignArtifacts } from './AdminFilemakerCampaignEditPage.utils';

import type { useConfirm } from '@/shared/hooks/ui/useConfirm';
import type { useUpdateSetting } from '@/shared/hooks/use-settings';
import type { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { useToast } from '@/shared/ui/primitives.public';
import type { ParsedCampaignSettings } from './AdminFilemakerCampaignsPage.types';
import type { FilemakerEmailCampaign } from '../types';
import type { useRouter } from 'nextjs-toploader/app';

type UpdateSettingMutation = ReturnType<typeof useUpdateSetting>;
type SettingsStore = ReturnType<typeof useSettingsStore>;
type ToastFn = ReturnType<typeof useToast>['toast'];
type ConfirmFn = ReturnType<typeof useConfirm>['confirm'];
type Router = ReturnType<typeof useRouter>;

type CampaignActionContext = {
  settings: ParsedCampaignSettings;
  updateSetting: UpdateSettingMutation;
  settingsStore: SettingsStore;
  router: Router;
  toast: ToastFn;
  confirm: ConfirmFn;
};

type CampaignDeletionOptions = {
  context: CampaignActionContext;
  campaign: FilemakerEmailCampaign;
};

type PersistCampaignDeletionOptions = {
  updateSetting: UpdateSettingMutation;
  settings: ParsedCampaignSettings;
  campaignId: string;
  nextCampaigns: FilemakerEmailCampaign[];
};

export type CampaignActionHandlers = {
  duplicateCampaign: (campaign: FilemakerEmailCampaign) => Promise<void>;
  toggleArchiveCampaign: (campaign: FilemakerEmailCampaign) => Promise<void>;
  deleteCampaign: (campaign: FilemakerEmailCampaign) => void;
};

export const openCampaign = (router: Router, campaignId: string): void => {
  startTransition(() => {
    router.push(`/admin/filemaker/campaigns/${encodeURIComponent(campaignId)}`);
  });
};

export const openCampaignRun = (router: Router, runId: string): void => {
  startTransition(() => {
    router.push(`/admin/filemaker/campaigns/runs/${encodeURIComponent(runId)}`);
  });
};

export const buildCampaignActionHandlers = (context: CampaignActionContext): CampaignActionHandlers => ({
  duplicateCampaign: async (campaign: FilemakerEmailCampaign): Promise<void> => {
    await duplicateCampaign(context, campaign);
  },
  toggleArchiveCampaign: async (campaign: FilemakerEmailCampaign): Promise<void> => {
    await toggleArchiveCampaign(context, campaign);
  },
  deleteCampaign: (campaign: FilemakerEmailCampaign): void => {
    confirmCampaignDeletion({ context, campaign });
  },
});

const persistCampaignRegistry = async (
  updateSetting: UpdateSettingMutation,
  nextCampaigns: FilemakerEmailCampaign[]
): Promise<void> => {
  await updateSetting.mutateAsync({
    key: FILEMAKER_EMAIL_CAMPAIGNS_KEY,
    value: JSON.stringify(toPersistedFilemakerEmailCampaignRegistry({ version: 1, campaigns: nextCampaigns })),
  });
};

const persistCampaignDeletion = async ({
  updateSetting,
  settings,
  campaignId,
  nextCampaigns,
}: PersistCampaignDeletionOptions): Promise<void> => {
  const cleaned = removeCampaignArtifacts({ campaignId, ...settings });
  await persistCampaignRegistry(updateSetting, nextCampaigns);
  await updateSetting.mutateAsync({ key: FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY, value: JSON.stringify(toPersistedFilemakerEmailCampaignRunRegistry(cleaned.runRegistry)) });
  await updateSetting.mutateAsync({ key: FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY, value: JSON.stringify(toPersistedFilemakerEmailCampaignDeliveryRegistry(cleaned.deliveryRegistry)) });
  await updateSetting.mutateAsync({ key: FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY, value: JSON.stringify(toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry(cleaned.attemptRegistry)) });
  await updateSetting.mutateAsync({ key: FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY, value: JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(cleaned.eventRegistry)) });
  await updateSetting.mutateAsync({ key: FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY, value: JSON.stringify(toPersistedFilemakerEmailCampaignSchedulerStatus(cleaned.schedulerStatus)) });
};

const duplicateCampaign = async (context: CampaignActionContext, campaign: FilemakerEmailCampaign): Promise<void> => {
  const duplicatedCampaign = createDuplicatedCampaignDraft({
    campaign,
    existingCampaigns: context.settings.campaignRegistry.campaigns,
  });
  try {
    const nextCampaigns = context.settings.campaignRegistry.campaigns.concat(duplicatedCampaign).sort(sortCampaignsByName);
    await persistCampaignRegistry(context.updateSetting, nextCampaigns);
    context.toast(`Campaign duplicated as ${duplicatedCampaign.name}.`, { variant: 'success' });
    openCampaign(context.router, duplicatedCampaign.id);
    context.settingsStore.refetch();
  } catch (error: unknown) {
    logClientError(error);
    context.toast(error instanceof Error ? error.message : 'Failed to duplicate campaign.', { variant: 'error' });
  }
};

const toggleArchiveCampaign = async (context: CampaignActionContext, campaign: FilemakerEmailCampaign): Promise<void> => {
  const nextCampaign = createToggledArchiveCampaign(campaign);
  try {
    const nextCampaigns = context.settings.campaignRegistry.campaigns
      .filter((entry: FilemakerEmailCampaign): boolean => entry.id !== campaign.id)
      .concat(nextCampaign)
      .sort(sortCampaignsByName);
    await persistCampaignRegistry(context.updateSetting, nextCampaigns);
    context.toast(campaign.status === 'archived' ? 'Campaign restored to draft.' : 'Campaign archived.', { variant: 'success' });
    context.settingsStore.refetch();
  } catch (error: unknown) {
    logClientError(error);
    context.toast(error instanceof Error ? error.message : 'Failed to update campaign status.', { variant: 'error' });
  }
};

const createToggledArchiveCampaign = (campaign: FilemakerEmailCampaign): FilemakerEmailCampaign => ({
  ...campaign,
  status: campaign.status === 'archived' ? 'draft' : 'archived',
  approvalGrantedAt: campaign.status === 'archived' ? campaign.approvalGrantedAt : null,
  approvedBy: campaign.status === 'archived' ? campaign.approvedBy : null,
  updatedAt: new Date().toISOString(),
});

const confirmCampaignDeletion = ({ context, campaign }: CampaignDeletionOptions): void => {
  context.confirm({
    title: 'Delete campaign?',
    message: 'This will remove the campaign and its run history, delivery records, attempt history, events, and scheduler traces.',
    confirmText: 'Delete campaign',
    isDangerous: true,
    onConfirm: async (): Promise<void> => {
      await deleteCampaign({ context, campaign });
    },
  });
};

const deleteCampaign = async ({ context, campaign }: CampaignDeletionOptions): Promise<void> => {
  try {
    await persistCampaignDeletion({
      updateSetting: context.updateSetting,
      settings: context.settings,
      campaignId: campaign.id,
      nextCampaigns: context.settings.campaignRegistry.campaigns.filter((entry) => entry.id !== campaign.id),
    });
    context.toast('Campaign deleted.', { variant: 'success' });
    context.settingsStore.refetch();
  } catch (error: unknown) {
    logClientError(error);
    context.toast(error instanceof Error ? error.message : 'Failed to delete campaign.', { variant: 'error' });
  }
};

const sortCampaignsByName = (left: FilemakerEmailCampaign, right: FilemakerEmailCampaign): number =>
  left.name.localeCompare(right.name);
