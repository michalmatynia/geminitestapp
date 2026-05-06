import { useCallback } from 'react';

import { createFilemakerEmailCampaign } from '../settings';
import type { FilemakerEmailCampaign } from '../types';
import { buildCampaignIdFromName } from './AdminFilemakerCampaignEditPage.utils';
import type { PersistedCampaignBuilder } from './AdminFilemakerCampaignEditPage.model-types';

type CampaignBuilderInput = {
  draft: FilemakerEmailCampaign;
  existingCampaign: FilemakerEmailCampaign | null;
};

const createDefaultRecurringRule = (): NonNullable<
  FilemakerEmailCampaign['launch']['recurring']
> => ({
  frequency: 'weekly',
  interval: 1,
  weekdays: [1, 2, 3, 4, 5],
  hourStart: null,
  hourEnd: null,
});

const resolveCampaignNameSeed = (
  draft: FilemakerEmailCampaign,
  overrides: Partial<FilemakerEmailCampaign> | undefined
): string => {
  const overrideName = overrides?.name ?? draft.name;
  if (overrideName.length > 0) return overrideName;
  if (draft.subject.length > 0) return draft.subject;
  return 'draft';
};

const resolvePersistedCampaignId = (
  existingCampaign: FilemakerEmailCampaign | null,
  campaignNameSeed: string
): string => {
  if (existingCampaign !== null) return existingCampaign.id;
  return buildCampaignIdFromName(campaignNameSeed);
};

const resolvePersistedLaunch = (
  draft: FilemakerEmailCampaign,
  overrides: Partial<FilemakerEmailCampaign> | undefined
): FilemakerEmailCampaign['launch'] => {
  const launch = overrides?.launch ?? draft.launch;
  if (launch.mode !== 'recurring') return { ...launch, recurring: null };
  return { ...launch, recurring: launch.recurring ?? createDefaultRecurringRule() };
};

export function usePersistedCampaignBuilder(input: CampaignBuilderInput): PersistedCampaignBuilder {
  const { draft, existingCampaign } = input;
  return useCallback(
    (overrides?: Partial<FilemakerEmailCampaign>): FilemakerEmailCampaign => {
      const now = new Date().toISOString();
      const campaignNameSeed = resolveCampaignNameSeed(draft, overrides);
      return createFilemakerEmailCampaign({
        ...draft,
        ...overrides,
        id: resolvePersistedCampaignId(existingCampaign, campaignNameSeed),
        launch: resolvePersistedLaunch(draft, overrides),
        createdAt: existingCampaign?.createdAt ?? draft.createdAt,
        updatedAt: now,
      });
    },
    [draft, existingCampaign]
  );
}
