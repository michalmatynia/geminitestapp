'use client';

import { useMemo, useState } from 'react';

import {
  filemakerEmailCampaignPreferencesResponseSchema,
  type FilemakerEmailCampaignPreferenceStatus,
} from '@/shared/contracts/filemaker';
import { api, ApiError } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui/primitives.public';

import type {
  FilemakerCampaignPreferencesPageModel,
  FilemakerCampaignPreferencesPageProps,
  FilemakerCampaignPreferencesScope,
  FilemakerCampaignPreferencesStatusCopy,
} from './FilemakerCampaignPreferencesPage.types';
import type {
  FilemakerEmailCampaignPreferencesAction,
  FilemakerEmailCampaignPreferencesResponse,
  FilemakerEmailCampaignSuppressionReason,
} from '../types';
import type {
  FilemakerEmailCampaignRecipientActivityItem,
  FilemakerEmailCampaignRecipientActivitySummary,
} from '../settings';

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

const prependRecipientActivity = (
  summary: FilemakerEmailCampaignRecipientActivitySummary,
  item: FilemakerEmailCampaignRecipientActivityItem
): FilemakerEmailCampaignRecipientActivitySummary => ({
  ...summary,
  recentActivity: [item].concat(summary.recentActivity).slice(0, 8),
});

const buildStatusCopy = (
  scope: FilemakerCampaignPreferencesScope,
  status: FilemakerEmailCampaignPreferenceStatus,
  reason: FilemakerEmailCampaignSuppressionReason | null
): FilemakerCampaignPreferencesStatusCopy => {
  const isGlobalScope = scope === 'all_campaigns';
  if (status === 'subscribed') return buildSubscribedCopy(isGlobalScope);
  if (status === 'unsubscribed') return buildUnsubscribedCopy(isGlobalScope);
  return buildBlockedCopy(isGlobalScope, reason);
};

const buildSubscribedCopy = (isGlobalScope: boolean): FilemakerCampaignPreferencesStatusCopy => ({
  title: isGlobalScope
    ? 'This address is currently subscribed across all campaigns'
    : 'This address is currently subscribed',
  body: isGlobalScope
    ? 'Campaign emails are currently allowed for this address across all Filemaker campaigns. You can unsubscribe below if you no longer want Filemaker campaign updates.'
    : 'Campaign emails are currently allowed for this address. You can unsubscribe below if you no longer want Filemaker campaign updates.',
});

const buildUnsubscribedCopy = (isGlobalScope: boolean): FilemakerCampaignPreferencesStatusCopy => ({
  title: isGlobalScope
    ? 'This address is currently unsubscribed across all campaigns'
    : 'This address is currently unsubscribed',
  body: isGlobalScope
    ? 'This address is on the campaign suppression list because the recipient opted out of Filemaker campaign delivery. You can restore delivery below if you want to receive future campaigns again.'
    : 'This address is on the campaign suppression list because the recipient opted out. You can restore delivery below if you want to receive future campaigns again.',
});

const buildBlockedCopy = (
  isGlobalScope: boolean,
  reason: FilemakerEmailCampaignSuppressionReason | null
): FilemakerCampaignPreferencesStatusCopy => ({
  title: isGlobalScope
    ? 'This address is currently blocked across all campaigns'
    : 'This address is currently blocked',
  body: reason === 'bounced'
    ? 'This address is blocked because recent campaign delivery bounced. It cannot be restored from the self-service preferences page.'
    : 'This address is blocked by an administrator and cannot be restored from the self-service preferences page.',
});

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

const resolveErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Failed to update campaign preferences.';
};

const createActivityItem = (
  current: FilemakerEmailCampaignRecipientActivitySummary,
  response: FilemakerEmailCampaignPreferencesResponse,
  action: FilemakerEmailCampaignPreferencesAction,
  eventAt: string,
  isGlobalScope: boolean
): FilemakerEmailCampaignRecipientActivityItem | null => {
  if (action === 'unsubscribe' && response.status === 'unsubscribed') {
    return {
      id: `recipient-activity-local-unsubscribe-${eventAt}`,
      type: 'unsubscribed',
      campaignId: current.campaignId,
      campaignName: current.campaignName,
      runId: null,
      deliveryId: null,
      timestamp: eventAt,
      details: isGlobalScope
        ? `${response.emailAddress} unsubscribed across all Filemaker campaigns from the preferences center.`
        : `${response.emailAddress} unsubscribed from the preferences center.`,
    };
  }
  if (action === 'resubscribe' && response.status === 'subscribed') {
    return {
      id: `recipient-activity-local-resubscribe-${eventAt}`,
      type: 'resubscribed',
      campaignId: current.campaignId,
      campaignName: current.campaignName,
      runId: null,
      deliveryId: null,
      timestamp: eventAt,
      details: isGlobalScope
        ? `${response.emailAddress} restored delivery across all Filemaker campaigns from the preferences center.`
        : `${response.emailAddress} restored campaign delivery from the preferences center.`,
    };
  }
  return null;
};

const updateRecipientSummary = (
  current: FilemakerEmailCampaignRecipientActivitySummary | null,
  response: FilemakerEmailCampaignPreferencesResponse,
  action: FilemakerEmailCampaignPreferencesAction,
  eventAt: string,
  isGlobalScope: boolean
): FilemakerEmailCampaignRecipientActivitySummary | null => {
  if (current === null) return current;
  const activity = createActivityItem(current, response, action, eventAt, isGlobalScope);
  if (activity === null) return current;
  const next = prependRecipientActivity(current, activity);
  if (activity.type === 'unsubscribed') {
    return { ...next, unsubscribeCount: current.unsubscribeCount + 1, latestUnsubscribeAt: eventAt };
  }
  return { ...next, resubscribeCount: current.resubscribeCount + 1, latestResubscribeAt: eventAt };
};

const resolveSuccessToast = (
  action: FilemakerEmailCampaignPreferencesAction,
  response: FilemakerEmailCampaignPreferencesResponse,
  isGlobalScope: boolean
): string => {
  if (action === 'unsubscribe') return resolveUnsubscribeToast(response.status, isGlobalScope);
  return resolveResubscribeToast(response.status, isGlobalScope);
};

const resolveUnsubscribeToast = (
  status: FilemakerEmailCampaignPreferenceStatus,
  isGlobalScope: boolean
): string => {
  if (status !== 'unsubscribed') return 'This address remains blocked.';
  return isGlobalScope
    ? 'This address has been unsubscribed across all Filemaker campaigns.'
    : 'This address has been unsubscribed.';
};

const resolveResubscribeToast = (
  status: FilemakerEmailCampaignPreferenceStatus,
  isGlobalScope: boolean
): string => {
  if (status !== 'subscribed') return 'This address cannot be restored from this page.';
  return isGlobalScope
    ? 'Campaign delivery has been restored across all Filemaker campaigns for this address.'
    : 'Campaign delivery has been restored for this address.';
};

export const useFilemakerCampaignPreferencesPageModel = ({
  initialEmailAddress,
  initialCampaignId,
  initialScope = 'campaign',
  initialToken,
  hasValidSignedToken = false,
  initialStatus = 'subscribed',
  initialReason = null,
  canResubscribe = false,
  initialRecipientSummary = null,
}: FilemakerCampaignPreferencesPageProps): FilemakerCampaignPreferencesPageModel => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FilemakerEmailCampaignPreferenceStatus>(initialStatus);
  const [reason, setReason] = useState<FilemakerEmailCampaignSuppressionReason | null>(initialReason);
  const [canRestore, setCanRestore] = useState<boolean>(canResubscribe);
  const [lastResult, setLastResult] = useState<FilemakerEmailCampaignPreferencesResponse | null>(null);
  const [recipientSummary, setRecipientSummary] = useState<FilemakerEmailCampaignRecipientActivitySummary | null>(initialRecipientSummary);
  const normalizedCampaignId = useMemo(() => normalizeOptionalString(initialCampaignId), [initialCampaignId]);
  const normalizedToken = useMemo(() => normalizeOptionalString(initialToken), [initialToken]);
  const statusCopy = useMemo(() => buildStatusCopy(initialScope, status, reason), [initialScope, reason, status]);
  const isGlobalScope = initialScope === 'all_campaigns';

  const handleAction = (action: FilemakerEmailCampaignPreferencesAction): void => {
    if (normalizedToken === null) {
      toast('This preferences link is no longer valid.', { variant: 'error' });
      return;
    }
    setIsSubmitting(true);
    submitPreferencesAction(normalizedToken, action).then(
      (response) => {
        const eventAt = new Date().toISOString();
        setLastResult(response);
        setStatus(response.status);
        setReason(response.reason ?? null);
        setCanRestore(response.canResubscribe);
        setRecipientSummary((current) => updateRecipientSummary(current, response, action, eventAt, isGlobalScope));
        toast(resolveSuccessToast(action, response, isGlobalScope), { variant: 'success' });
        setIsSubmitting(false);
      },
      (error: unknown) => {
        toast(resolveErrorMessage(error), { variant: 'error' });
        setIsSubmitting(false);
      }
    );
  };

  return {
    isSubmitting,
    status,
    reason,
    canRestore,
    lastResult,
    recipientSummary,
    normalizedCampaignId,
    initialEmailAddress: normalizeOptionalString(initialEmailAddress),
    isGlobalScope,
    hasValidSignedToken,
    statusCopy,
    unsubscribe: (): void => { handleAction('unsubscribe'); },
    resubscribe: (): void => { handleAction('resubscribe'); },
  };
};
