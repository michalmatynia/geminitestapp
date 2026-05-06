import { useMemo } from 'react';

import {
  buildFilemakerPartyOptions,
  evaluateFilemakerEmailCampaignLaunch,
  resolveFilemakerEmailCampaignAudiencePreview,
  resolveFilemakerEmailCampaignNextAutomationAt,
  summarizeFilemakerEmailCampaignAnalytics,
} from '../settings';
import type { FilemakerDatabase, FilemakerEmailCampaign, FilemakerMailAccount } from '../types';
import type {
  CampaignEditDerivedState,
  CampaignEditRegistries,
  CampaignOption,
} from './AdminFilemakerCampaignEditPage.model-types';

type CampaignEditDerivedInput = Pick<
  CampaignEditRegistries,
  | 'database'
  | 'contentGroupRegistry'
  | 'runRegistry'
  | 'deliveryRegistry'
  | 'eventRegistry'
  | 'suppressionRegistry'
  | 'schedulerStatus'
> & {
  draft: FilemakerEmailCampaign;
  existingCampaign: FilemakerEmailCampaign | null;
  mailAccounts: FilemakerMailAccount[];
};

type CampaignEditOptionState = Pick<
  CampaignEditDerivedState,
  | 'organizationOptions'
  | 'eventOptions'
  | 'partyOptions'
  | 'mailAccountOptions'
  | 'selectedMailAccount'
>;

type CampaignEditAnalysisState = Omit<
  CampaignEditDerivedState,
  keyof CampaignEditOptionState
>;

const resolveLabel = (label: string, fallback: string): string => {
  if (label.length > 0) return label;
  return fallback;
};

const buildOrganizationOptions = (database: FilemakerDatabase): CampaignOption[] =>
  database.organizations
    .map((organization) => ({
      value: organization.id,
      label: resolveLabel(organization.name, organization.id),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

const buildEventOptions = (database: FilemakerDatabase): CampaignOption[] =>
  database.events
    .map((event) => ({
      value: event.id,
      label: resolveLabel(event.eventName, event.id),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

const buildPartySelectOptions = (database: FilemakerDatabase): CampaignOption[] =>
  buildFilemakerPartyOptions(database).map((option) => ({
    value: option.value,
    label: option.label,
  }));

const buildMailAccountLabel = (account: FilemakerMailAccount): string =>
  `${account.name} <${account.emailAddress}>${account.status === 'active' ? '' : ' (paused)'}`;

const buildMailAccountOptions = (
  mailAccounts: FilemakerMailAccount[],
  selectedMailAccountId: string | null | undefined
): CampaignOption[] => {
  const selectedId = selectedMailAccountId ?? '';
  const options = mailAccounts.map((account) => ({
    value: account.id,
    label: buildMailAccountLabel(account),
  }));
  if (selectedId.length > 0 && !options.some((option) => option.value === selectedId)) {
    options.unshift({
      value: selectedId,
      label: `Missing mail account (${selectedId})`,
    });
  }
  return [{ value: '__shared__', label: 'Select an email account (required)' }, ...options];
};

function useCampaignEditOptionState(input: CampaignEditDerivedInput): CampaignEditOptionState {
  const organizationOptions = useMemo(() => buildOrganizationOptions(input.database), [input.database]);
  const eventOptions = useMemo(() => buildEventOptions(input.database), [input.database]);
  const partyOptions = useMemo(() => buildPartySelectOptions(input.database), [input.database]);
  const selectedMailAccount = useMemo(
    () => input.mailAccounts.find((account) => account.id === input.draft.mailAccountId) ?? null,
    [input.draft.mailAccountId, input.mailAccounts]
  );
  const mailAccountOptions = useMemo(
    () => buildMailAccountOptions(input.mailAccounts, input.draft.mailAccountId),
    [input.draft.mailAccountId, input.mailAccounts]
  );
  return {
    organizationOptions,
    eventOptions,
    partyOptions,
    mailAccountOptions,
    selectedMailAccount,
  };
}

function useCampaignEditAnalysisState(input: CampaignEditDerivedInput): CampaignEditAnalysisState {
  const preview = useMemo(
    () => resolveFilemakerEmailCampaignAudiencePreview(
      input.database,
      input.draft.audience,
      input.suppressionRegistry
    ),
    [input.database, input.draft.audience, input.suppressionRegistry]
  );
  const launchEvaluation = useMemo(
    () =>
      evaluateFilemakerEmailCampaignLaunch(input.draft, preview, {
        now: new Date(),
        contentGroupRegistry: input.contentGroupRegistry,
        senderAssignment: { mailAccounts: input.mailAccounts, requireAssignedMailAccount: true },
      }),
    [input.contentGroupRegistry, input.draft, input.mailAccounts, preview]
  );
  const recentRuns = useMemo(
    () =>
      input.runRegistry.runs.filter((run) => run.campaignId === input.existingCampaign?.id),
    [input.existingCampaign?.id, input.runRegistry.runs]
  );
  const analytics = useMemo(
    () =>
      summarizeFilemakerEmailCampaignAnalytics({
        campaign: input.draft,
        database: input.database,
        runRegistry: input.runRegistry,
        deliveryRegistry: input.deliveryRegistry,
        eventRegistry: input.eventRegistry,
        suppressionRegistry: input.suppressionRegistry,
      }),
    [input.database, input.deliveryRegistry, input.draft, input.eventRegistry, input.runRegistry, input.suppressionRegistry]
  );
  const nextAutomationAt = useMemo(
    () => resolveFilemakerEmailCampaignNextAutomationAt(input.draft),
    [input.draft]
  );
  const schedulerFailureMessage =
    input.schedulerStatus.launchFailures.find((failure) => failure.campaignId === input.draft.id)?.message ?? null;
  return {
    preview,
    launchEvaluation,
    recentRuns,
    suppressionEntries: input.suppressionRegistry.entries,
    analytics,
    nextAutomationAt,
    schedulerFailureMessage,
  };
}

export function useCampaignEditDerivedState(
  input: CampaignEditDerivedInput
): CampaignEditDerivedState {
  const optionState = useCampaignEditOptionState(input);
  const analysisState = useCampaignEditAnalysisState(input);
  return { ...optionState, ...analysisState };
}
