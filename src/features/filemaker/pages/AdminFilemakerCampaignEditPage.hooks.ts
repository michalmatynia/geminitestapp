'use client';

import { useRouter } from 'nextjs-toploader/app';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useCountries } from '@/shared/hooks/use-i18n-queries';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  buildFilemakerPartyOptions,
  createFilemakerEmailCampaign,
  createFilemakerEmailCampaignSuppressionEntry,
  evaluateFilemakerEmailCampaignLaunch,
  buildFilemakerCountryList,
  buildFilemakerCountryOptions,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_CONTENT_GROUPS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  normalizeFilemakerEmailCampaignSuppressionRegistry,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignContentGroupRegistry,
  parseFilemakerEmailCampaignDeliveryAttemptRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSchedulerStatus,
  parseFilemakerEmailCampaignSuppressionRegistry,
  removeFilemakerEmailCampaignSuppressionEntryByAddress,
  resolveFilemakerEmailCampaignNextAutomationAt,
  resolveFilemakerEmailCampaignAudiencePreview,
  summarizeFilemakerEmailCampaignAnalytics,
  toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry,
  toPersistedFilemakerEmailCampaignDeliveryRegistry,
  toPersistedFilemakerEmailCampaignEventRegistry,
  toPersistedFilemakerEmailCampaignContentGroupRegistry,
  toPersistedFilemakerEmailCampaignRegistry,
  toPersistedFilemakerEmailCampaignRunRegistry,
  toPersistedFilemakerEmailCampaignSchedulerStatus,
  toPersistedFilemakerEmailCampaignSuppressionRegistry,
  upsertFilemakerEmailCampaignSuppressionEntry,
} from '../settings';
import { decodeRouteParam } from './filemaker-page-utils';
import {
  buildCampaignIdFromName,
  createBlankCampaignDraft,
  createDuplicatedCampaignDraft,
  removeCampaignArtifacts,
} from './AdminFilemakerCampaignEditPage.utils';
import { useFilemakerCampaignRunActions } from './useFilemakerCampaignRunActions';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignContentGroupRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignSuppressionRegistry,
  FilemakerEmailCampaignRunMode,
  FilemakerEmailCampaignLaunchRunResponse,
  FilemakerEmailCampaignTestSendResponse,
  FilemakerEmailCampaignSuppressionReason,
  FilemakerMailAccount,
} from '../types';

type FilemakerMailAccountsResponse = {
  accounts: FilemakerMailAccount[];
};

export function useAdminFilemakerCampaignEditState() {
  const params = useParams();
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const { handleRunAction, isRunActionPending } = useFilemakerCampaignRunActions();
  const countriesQuery = useCountries();

  const campaignId = useMemo(() => decodeRouteParam(params['campaignId']), [params]);
  const isCreateMode = campaignId === 'new' || !campaignId;

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawContentGroups = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_CONTENT_GROUPS_KEY);
  const rawRuns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY);
  const rawDeliveries = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY);
  const rawAttempts = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY);
  const rawEvents = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY);
  const rawSchedulerStatus = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY);
  const rawSuppressions = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY);

  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const campaignRegistry = useMemo(
    () => parseFilemakerEmailCampaignRegistry(rawCampaigns),
    [rawCampaigns]
  );
  const contentGroupRegistry = useMemo(
    () => parseFilemakerEmailCampaignContentGroupRegistry(rawContentGroups),
    [rawContentGroups]
  );
  const runRegistry = useMemo(() => parseFilemakerEmailCampaignRunRegistry(rawRuns), [rawRuns]);
  const deliveryRegistry = useMemo(
    () => parseFilemakerEmailCampaignDeliveryRegistry(rawDeliveries),
    [rawDeliveries]
  );
  const attemptRegistry = useMemo(
    () => parseFilemakerEmailCampaignDeliveryAttemptRegistry(rawAttempts),
    [rawAttempts]
  );
  const eventRegistry = useMemo(() => parseFilemakerEmailCampaignEventRegistry(rawEvents), [rawEvents]);
  const suppressionRegistry = useMemo(
    () => parseFilemakerEmailCampaignSuppressionRegistry(rawSuppressions),
    [rawSuppressions]
  );
  const schedulerStatus = useMemo(
    () => parseFilemakerEmailCampaignSchedulerStatus(rawSchedulerStatus),
    [rawSchedulerStatus]
  );
  const countries = useMemo(
    () => buildFilemakerCountryList(countriesQuery.data ?? []),
    [countriesQuery.data]
  );
  const countryOptions = useMemo(() => buildFilemakerCountryOptions(countries), [countries]);

  const existingCampaign = useMemo(
    () =>
      isCreateMode
        ? null
        : campaignRegistry.campaigns.find((campaign) => campaign.id === campaignId) ?? null,
    [campaignId, campaignRegistry.campaigns, isCreateMode]
  );

  const initialDraft = useMemo(
    () => (existingCampaign ? createFilemakerEmailCampaign(existingCampaign) : createBlankCampaignDraft()),
    [existingCampaign]
  );
  const [draft, setDraft] = useState<FilemakerEmailCampaign>(initialDraft);
  const [launchingMode, setLaunchingMode] = useState<FilemakerEmailCampaignRunMode | null>(null);
  const [mailAccounts, setMailAccounts] = useState<FilemakerMailAccount[]>([]);
  const [testRecipientEmailDraft, setTestRecipientEmailDraft] = useState('');
  const [isTestSendPending, setIsTestSendPending] = useState(false);
  const [suppressionEmailDraft, setSuppressionEmailDraft] = useState('');
  const [suppressionReasonDraft, setSuppressionReasonDraft] =
    useState<FilemakerEmailCampaignSuppressionReason>('manual_block');
  const [suppressionNotesDraft, setSuppressionNotesDraft] = useState('');

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  useEffect(() => {
    let isActive = true;

    const loadMailAccounts = async (): Promise<void> => {
      try {
        const result = await api.get<FilemakerMailAccountsResponse>('/api/filemaker/mail/accounts');
        if (!isActive) return;
        setMailAccounts(result.accounts);
      } catch (error: unknown) {
        if (!isActive) return;
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to load Filemaker mail accounts.', {
          variant: 'error',
        });
      }
    };

    void loadMailAccounts();

    return () => {
      isActive = false;
    };
  }, [toast]);

  const organizationOptions = useMemo(
    () =>
      database.organizations
        .map((organization) => ({
          value: organization.id,
          label: organization.name || organization.id,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [database.organizations]
  );
  const eventOptions = useMemo(
    () =>
      database.events
        .map((event) => ({
          value: event.id,
          label: event.eventName || event.id,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [database.events]
  );
  const partyOptions = useMemo(
    () =>
      buildFilemakerPartyOptions(database).map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [database]
  );
  const selectedMailAccount = useMemo(
    () => mailAccounts.find((account) => account.id === draft.mailAccountId) ?? null,
    [draft.mailAccountId, mailAccounts]
  );
  const mailAccountOptions = useMemo(() => {
    const options = mailAccounts.map((account) => ({
      value: account.id,
      label: `${account.name} <${account.emailAddress}>${account.status === 'active' ? '' : ' (paused)'}`,
    }));
    if (
      draft.mailAccountId &&
      !options.some((option) => option.value === draft.mailAccountId)
    ) {
      options.unshift({
        value: draft.mailAccountId,
        label: `Missing mail account (${draft.mailAccountId})`,
      });
    }
    return [
      {
        value: '__shared__',
        label: 'Shared Filemaker campaign delivery provider',
      },
      ...options,
    ];
  }, [draft.mailAccountId, mailAccounts]);

  const preview = useMemo(
    () => resolveFilemakerEmailCampaignAudiencePreview(database, draft.audience, suppressionRegistry),
    [database, draft.audience, suppressionRegistry]
  );
  const launchEvaluation = useMemo(
    () => evaluateFilemakerEmailCampaignLaunch(draft, preview, new Date(), contentGroupRegistry),
    [contentGroupRegistry, draft, preview]
  );
  const recentRuns = useMemo(
    () =>
      runRegistry.runs.filter(
        (run: FilemakerEmailCampaignRun) => run.campaignId === existingCampaign?.id
      ),
    [existingCampaign?.id, runRegistry.runs]
  );
  const suppressionEntries = useMemo(() => suppressionRegistry.entries, [suppressionRegistry.entries]);
  const analytics = useMemo(
    () =>
      summarizeFilemakerEmailCampaignAnalytics({
        campaign: draft,
        database,
        runRegistry,
        deliveryRegistry,
        eventRegistry,
        suppressionRegistry,
      }),
    [database, deliveryRegistry, draft, eventRegistry, runRegistry, suppressionRegistry]
  );
  const nextAutomationAt = useMemo(
    () => resolveFilemakerEmailCampaignNextAutomationAt(draft),
    [draft]
  );
  const schedulerFailureMessage = useMemo(
    () =>
      schedulerStatus.launchFailures.find((failure) => failure.campaignId === draft.id)?.message ?? null,
    [draft.id, schedulerStatus.launchFailures]
  );

  const persistCampaignRegistry = useCallback(
    async (nextCampaigns: FilemakerEmailCampaign[]): Promise<void> => {
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGNS_KEY,
        value: JSON.stringify(
          toPersistedFilemakerEmailCampaignRegistry({
            version: 1,
            campaigns: nextCampaigns,
          })
        ),
      });
    },
    [updateSetting]
  );

  const persistContentGroupRegistry = useCallback(
    async (nextRegistry: FilemakerEmailCampaignContentGroupRegistry): Promise<void> => {
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_CONTENT_GROUPS_KEY,
        value: JSON.stringify(toPersistedFilemakerEmailCampaignContentGroupRegistry(nextRegistry)),
      });
    },
    [updateSetting]
  );

  const persistCampaignDeletion = useCallback(
    async (input: {
      nextCampaigns: FilemakerEmailCampaign[];
      campaignId: string;
    }): Promise<void> => {
      const cleaned = removeCampaignArtifacts({
        campaignId: input.campaignId,
        runRegistry,
        deliveryRegistry,
        attemptRegistry,
        eventRegistry,
        schedulerStatus,
      });

      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGNS_KEY,
        value: JSON.stringify(
          toPersistedFilemakerEmailCampaignRegistry({
            version: 1,
            campaigns: input.nextCampaigns,
          })
        ),
      });
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
        value: JSON.stringify(toPersistedFilemakerEmailCampaignRunRegistry(cleaned.runRegistry)),
      });
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
        value: JSON.stringify(
          toPersistedFilemakerEmailCampaignDeliveryRegistry(cleaned.deliveryRegistry)
        ),
      });
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
        value: JSON.stringify(
          toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry(cleaned.attemptRegistry)
        ),
      });
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
        value: JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(cleaned.eventRegistry)),
      });
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY,
        value: JSON.stringify(
          toPersistedFilemakerEmailCampaignSchedulerStatus(cleaned.schedulerStatus)
        ),
      });
    },
    [
      attemptRegistry,
      deliveryRegistry,
      eventRegistry,
      runRegistry,
      schedulerStatus,
      updateSetting,
    ]
  );

  const persistSuppressionRegistry = useCallback(
    async (nextSuppressionRegistry: FilemakerEmailCampaignSuppressionRegistry): Promise<void> => {
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
        value: JSON.stringify(toPersistedFilemakerEmailCampaignSuppressionRegistry(nextSuppressionRegistry)),
      });
    },
    [updateSetting]
  );

  const buildPersistedCampaign = useCallback(
    (overrides?: Partial<FilemakerEmailCampaign>): FilemakerEmailCampaign => {
      const now = new Date().toISOString();
      const resolvedId =
        existingCampaign?.id ||
        buildCampaignIdFromName((overrides?.name ?? draft.name) || draft.subject || 'draft');

      const nextLaunch =
        (overrides?.launch?.mode ?? draft.launch.mode) === 'recurring'
          ? {
            ...(overrides?.launch ?? draft.launch),
            recurring: (overrides?.launch?.recurring ?? draft.launch.recurring) ?? {
              frequency: 'weekly',
              interval: 1,
              weekdays: [1, 2, 3, 4, 5],
              hourStart: null,
              hourEnd: null,
            },
          }
          : {
            ...(overrides?.launch ?? draft.launch),
            recurring: null,
          };

      return createFilemakerEmailCampaign({
        ...draft,
        ...overrides,
        id: resolvedId,
        launch: nextLaunch,
        createdAt: existingCampaign?.createdAt ?? draft.createdAt ?? now,
        updatedAt: now,
      });
    },
    [draft, existingCampaign]
  );

  const saveCampaign = useCallback(
    async (successMessage = 'Campaign saved.'): Promise<FilemakerEmailCampaign | null> => {
      const nextCampaign = buildPersistedCampaign();
      const nextCampaigns = campaignRegistry.campaigns
        .filter((campaign) => campaign.id !== nextCampaign.id)
        .concat(nextCampaign)
        .sort((left, right) => left.name.localeCompare(right.name));

      try {
        await persistCampaignRegistry(nextCampaigns);
        setDraft(nextCampaign);
        if (successMessage) {
          toast(successMessage, { variant: 'success' });
        }
        if (isCreateMode) {
          router.replace(`/admin/filemaker/campaigns/${encodeURIComponent(nextCampaign.id)}`);
        }
        return nextCampaign;
      } catch (error: unknown) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to save campaign.', {
          variant: 'error',
        });
        return null;
      }
    },
    [buildPersistedCampaign, campaignRegistry.campaigns, isCreateMode, persistCampaignRegistry, router, toast]
  );

  const handleLaunch = useCallback(
    async (mode: FilemakerEmailCampaignRunMode): Promise<void> => {
      const savedCampaign = await saveCampaign('');
      if (!savedCampaign) return;
      setLaunchingMode(mode);

      try {
        const response = await api.post<FilemakerEmailCampaignLaunchRunResponse>(
          '/api/filemaker/campaigns/runs',
          {
            campaignId: savedCampaign.id,
            mode,
            launchReason:
              mode === 'dry_run'
                ? 'Dry run created from the Filemaker campaign editor.'
                : 'Manual launch created from the Filemaker campaign editor.',
          }
        );
        if (mode === 'live') {
          const now = new Date().toISOString();
          const launchedCampaign = buildPersistedCampaign({
            id: savedCampaign.id,
            lastLaunchedAt: now,
            lastEvaluatedAt: now,
            updatedAt: now,
          });
          setDraft(launchedCampaign);
        }
        settingsStore.refetch();
        router.refresh();
        toast(
          mode === 'dry_run'
            ? 'Dry run created.'
            : response.dispatchMode === 'inline'
              ? 'Campaign started in inline processing mode.'
              : 'Campaign queued for delivery.',
          { variant: 'success' }
        );
      } catch (error: unknown) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to create campaign run.', {
          variant: 'error',
        });
      } finally {
        setLaunchingMode(null);
      }
    },
    [buildPersistedCampaign, router, saveCampaign, settingsStore, toast]
  );

  const handleSendTestEmail = useCallback(async (): Promise<void> => {
    const recipientEmail = testRecipientEmailDraft.trim().toLowerCase();
    if (!recipientEmail) {
      toast('Recipient email is required before sending a test delivery.', {
        variant: 'error',
      });
      return;
    }

    setIsTestSendPending(true);
    try {
      const response = await api.post<FilemakerEmailCampaignTestSendResponse>(
        '/api/filemaker/campaigns/test-send',
        {
          campaign: buildPersistedCampaign(),
          contentGroupRegistry,
          recipientEmail,
        }
      );
      setTestRecipientEmailDraft(recipientEmail);
      toast(
        `Test email sent to ${response.recipientEmail}. ${response.providerMessage}`,
        { variant: 'success' }
      );
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to send campaign test email.', {
        variant: 'error',
      });
    } finally {
      setIsTestSendPending(false);
    }
  }, [buildPersistedCampaign, contentGroupRegistry, testRecipientEmailDraft, toast]);

  const handleDuplicateCampaign = useCallback(async (): Promise<void> => {
    if (isCreateMode) return;

    const duplicatedCampaign = createDuplicatedCampaignDraft({
      campaign: buildPersistedCampaign(),
      existingCampaigns: campaignRegistry.campaigns,
    });

    try {
      await persistCampaignRegistry(
        campaignRegistry.campaigns
          .concat(duplicatedCampaign)
          .sort((left, right) => left.name.localeCompare(right.name))
      );
      toast(`Campaign duplicated as ${duplicatedCampaign.name}.`, { variant: 'success' });
      router.push(`/admin/filemaker/campaigns/${encodeURIComponent(duplicatedCampaign.id)}`);
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to duplicate campaign.', {
        variant: 'error',
      });
    }
  }, [buildPersistedCampaign, campaignRegistry.campaigns, isCreateMode, persistCampaignRegistry, router, toast]);

  const handleToggleArchiveCampaign = useCallback(async (): Promise<void> => {
    if (isCreateMode) return;

    const isArchived = draft.status === 'archived';
    const nextCampaign = buildPersistedCampaign({
      status: isArchived ? 'draft' : 'archived',
      approvalGrantedAt: isArchived ? draft.approvalGrantedAt : null,
      approvedBy: isArchived ? draft.approvedBy : null,
    });
    const nextCampaigns = campaignRegistry.campaigns
      .filter((campaign) => campaign.id !== nextCampaign.id)
      .concat(nextCampaign)
      .sort((left, right) => left.name.localeCompare(right.name));

    try {
      await persistCampaignRegistry(nextCampaigns);
      setDraft(nextCampaign);
      toast(isArchived ? 'Campaign restored to draft.' : 'Campaign archived.', {
        variant: 'success',
      });
      settingsStore.refetch();
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to update campaign status.', {
        variant: 'error',
      });
    }
  }, [
    buildPersistedCampaign,
    campaignRegistry.campaigns,
    draft.approvalGrantedAt,
    draft.approvedBy,
    draft.status,
    isCreateMode,
    persistCampaignRegistry,
    settingsStore,
    toast,
  ]);

  const handleDeleteCampaign = useCallback((): void => {
    if (isCreateMode || !existingCampaign) return;

    confirm({
      title: 'Delete campaign?',
      message:
        'This will remove the campaign and its run history, delivery records, attempt history, events, and scheduler traces.',
      confirmText: 'Delete campaign',
      isDangerous: true,
      onConfirm: async () => {
        const nextCampaigns = campaignRegistry.campaigns.filter(
          (campaign) => campaign.id !== existingCampaign.id
        );
        try {
          await persistCampaignDeletion({
            nextCampaigns,
            campaignId: existingCampaign.id,
          });
          toast('Campaign deleted.', { variant: 'success' });
          router.push('/admin/filemaker/campaigns');
          settingsStore.refetch();
        } catch (error: unknown) {
          logClientError(error);
          toast(error instanceof Error ? error.message : 'Failed to delete campaign.', {
            variant: 'error',
          });
        }
      },
    });
  }, [
    campaignRegistry.campaigns,
    confirm,
    existingCampaign,
    isCreateMode,
    persistCampaignDeletion,
    router,
    settingsStore,
    toast,
  ]);

  const handleAddSuppressionEntry = useCallback(async (): Promise<void> => {
    const normalizedEmail = suppressionEmailDraft.trim().toLowerCase();
    if (!normalizedEmail) {
      toast('Suppression email is required.', { variant: 'error' });
      return;
    }

    const nextSuppressionRegistry = upsertFilemakerEmailCampaignSuppressionEntry({
      registry: normalizeFilemakerEmailCampaignSuppressionRegistry(suppressionRegistry),
      entry: createFilemakerEmailCampaignSuppressionEntry({
        emailAddress: normalizedEmail,
        reason: suppressionReasonDraft,
        actor: 'admin',
        notes: suppressionNotesDraft.trim() || null,
        campaignId: (existingCampaign?.id ?? draft.id) || null,
      }),
    });

    try {
      await persistSuppressionRegistry(nextSuppressionRegistry);
      setSuppressionEmailDraft('');
      setSuppressionReasonDraft('manual_block');
      setSuppressionNotesDraft('');
      toast('Suppression entry saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save suppression entry.', {
        variant: 'error',
      });
    }
  }, [
    draft.id,
    existingCampaign?.id,
    persistSuppressionRegistry,
    suppressionEmailDraft,
    suppressionNotesDraft,
    suppressionReasonDraft,
    suppressionRegistry,
    toast,
  ]);

  const handleRemoveSuppressionEntry = useCallback(
    async (emailAddress: string): Promise<void> => {
      const nextSuppressionRegistry = removeFilemakerEmailCampaignSuppressionEntryByAddress({
        registry: suppressionRegistry,
        emailAddress,
      });
      try {
        await persistSuppressionRegistry(nextSuppressionRegistry);
        toast('Suppression entry removed.', { variant: 'success' });
      } catch (error: unknown) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to remove suppression entry.', {
          variant: 'error',
        });
      }
    },
    [persistSuppressionRegistry, suppressionRegistry, toast]
  );

  return {
    campaignId,
    isCreateMode,
    database,
    contentGroupRegistry,
    persistContentGroupRegistry,
    countries,
    countryOptions,
    existingCampaign,
    draft,
    setDraft,
    launchingMode,
    suppressionEmailDraft,
    setSuppressionEmailDraft,
    testRecipientEmailDraft,
    setTestRecipientEmailDraft,
    isTestSendPending,
    ConfirmationModal,
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
    schedulerStatus,
    nextAutomationAt,
    schedulerFailureMessage,
    deliveryRegistry,
    attemptRegistry,
    saveCampaign,
    handleLaunch,
    handleSendTestEmail,
    handleDuplicateCampaign,
    handleToggleArchiveCampaign,
    handleDeleteCampaign,
    handleRunAction,
    isRunActionPending,
    handleAddSuppressionEntry,
    handleRemoveSuppressionEntry,
    isLoading: settingsStore.isLoading,
    isUpdatePending: updateSetting.isPending,
    router,
  };
}
