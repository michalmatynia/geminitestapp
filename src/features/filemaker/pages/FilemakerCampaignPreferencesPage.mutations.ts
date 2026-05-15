'use client';

import {
  filemakerEmailCampaignPreferencesResponseSchema,
} from '@/shared/contracts/filemaker';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { useMutationV2 } from '@/shared/lib/query-factories-v2';

import type {
  FilemakerEmailCampaignPreferencesAction,
  FilemakerEmailCampaignPreferencesResponse,
} from '../types';

export type SubmitPreferencesActionVariables = {
  action: FilemakerEmailCampaignPreferencesAction;
  token: string;
};

export type PreferencesActionMutation = MutationResult<
  FilemakerEmailCampaignPreferencesResponse,
  SubmitPreferencesActionVariables
>;

const submitPreferencesAction = async (
  token: string,
  action: FilemakerEmailCampaignPreferencesAction
): Promise<FilemakerEmailCampaignPreferencesResponse> => {
  const response = await api.post<FilemakerEmailCampaignPreferencesResponse>(
    '/api/filemaker/campaigns/preferences',
    { token, action, source: 'public-preferences-page' },
    { logError: false }
  );
  const parsed = filemakerEmailCampaignPreferencesResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error('Invalid preferences response.');
  return parsed.data;
};

export const usePreferencesActionMutation = (): PreferencesActionMutation =>
  useMutationV2({
    mutationKey: ['filemaker', 'campaigns', 'preferences', 'submit'],
    mutationFn: async ({ action, token }) => submitPreferencesAction(token, action),
    meta: {
      source: 'features.filemaker.campaignPreferences.submitAction',
      operation: 'action',
      resource: 'filemaker.campaign-preferences',
      domain: 'filemaker',
      description: 'Submits Filemaker campaign recipient preference changes.',
      errorPresentation: 'toast',
      tags: ['filemaker', 'campaigns', 'preferences'],
    },
  });
