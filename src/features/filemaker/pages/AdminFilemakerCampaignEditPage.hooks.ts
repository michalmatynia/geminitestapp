'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  buildFilemakerPartyOptions,
  createFilemakerEmailCampaign,
  createFilemakerEmailCampaignSuppressionEntry,
  evaluateFilemakerEmailCampaignLaunch,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  getFilemakerEmailCampaignDeliveriesForRun,
  normalizeFilemakerEmailCampaignSuppressionRegistry,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  removeFilemakerEmailCampaignSuppressionEntryByAddress,
  resolveFilemakerEmailCampaignAudiencePreview,
  summarizeFilemakerEmailCampaignAnalytics,
  syncFilemakerEmailCampaignRunWithDeliveries,
  toPersistedFilemakerEmailCampaignDeliveryRegistry,
  toPersistedFilemakerEmailCampaignRegistry,
  toPersistedFilemakerEmailCampaignRunRegistry,
  toPersistedFilemakerEmailCampaignSuppressionRegistry,
  upsertFilemakerEmailCampaignSuppressionEntry,
  applyFilemakerEmailCampaignRunStatusToDeliveries,
} from '../settings';
import { decodeRouteParam } from './filemaker-page-utils';
import { buildCampaignIdFromName, createBlankCampaignDraft } from './AdminFilemakerCampaignEditPage.utils';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
  FilemakerEmailCampaignRunMode,
  FilemakerEmailCampaignLaunchRunResponse,
  FilemakerEmailCampaignRunStatus,
  FilemakerEmailCampaignSuppressionReason,
} from '../types';

export function useAdminFilemakerCampaignEditState() {
  const params = useParams();
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const campaignId = useMemo(() => decodeRouteParam(params['campaignId']), [params]);
  const isCreateMode = campaignId === 'new' || !campaignId;

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawRuns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY);
  const rawDeliveries = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY);
  const rawEvents = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY);
  const rawSuppressions = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY);

  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const campaignRegistry = useMemo(
    () => parseFilemakerEmailCampaignRegistry(rawCampaigns),
    [rawCampaigns]
  );
  const runRegistry = useMemo(() => parseFilemakerEmailCampaignRunRegistry(rawRuns), [rawRuns]);
  const deliveryRegistry = useMemo(
    () => parseFilemakerEmailCampaignDeliveryRegistry(rawDeliveries),
    [rawDeliveries]
  );
  const eventRegistry = useMemo(() => parseFilemakerEmailCampaignEventRegistry(rawEvents), [rawEvents]);
  const suppressionRegistry = useMemo(
    () => parseFilemakerEmailCampaignSuppressionRegistry(rawSuppressions),
    [rawSuppressions]
  );

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
  const [suppressionEmailDraft, setSuppressionEmailDraft] = useState('');
  const [suppressionReasonDraft, setSuppressionReasonDraft] =
    useState<FilemakerEmailCampaignSuppressionReason>('manual_block');
  const [suppressionNotesDraft, setSuppressionNotesDraft] = useState('');

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

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

  const preview = useMemo(
    () => resolveFilemakerEmailCampaignAudiencePreview(database, draft.audience, suppressionRegistry),
    [database, draft.audience, suppressionRegistry]
  );
  const launchEvaluation = useMemo(
    () => evaluateFilemakerEmailCampaignLaunch(draft, preview),
    [draft, preview]
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

  const persistRunRegistry = useCallback(
    async (nextRunRegistry: FilemakerEmailCampaignRunRegistry): Promise<void> => {
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
        value: JSON.stringify(toPersistedFilemakerEmailCampaignRunRegistry(nextRunRegistry)),
      });
    },
    [updateSetting]
  );

  const persistDeliveryRegistry = useCallback(
    async (nextDeliveryRegistry: FilemakerEmailCampaignDeliveryRegistry): Promise<void> => {
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
        value: JSON.stringify(toPersistedFilemakerEmailCampaignDeliveryRegistry(nextDeliveryRegistry)),
      });
    },
    [updateSetting]
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

  const handleRunStatusChange = useCallback(
    async (runId: string, nextStatus: FilemakerEmailCampaignRunStatus): Promise<void> => {
      const run = runRegistry.runs.find((entry: FilemakerEmailCampaignRun) => entry.id === runId);
      if (!run) {
        toast('Run was not found.', { variant: 'error' });
        return;
      }
      const currentDeliveries = getFilemakerEmailCampaignDeliveriesForRun(deliveryRegistry, runId);
      const updatedDeliveries = applyFilemakerEmailCampaignRunStatusToDeliveries({
        deliveries: currentDeliveries,
        runStatus: nextStatus,
      });
      const nextRuns = runRegistry.runs.map((entry: FilemakerEmailCampaignRun): FilemakerEmailCampaignRun => {
        if (entry.id !== runId) return entry;
        return syncFilemakerEmailCampaignRunWithDeliveries({
          run: entry,
          deliveries: updatedDeliveries,
          status: nextStatus,
        });
      });
      const nextDeliveryRegistry = {
        version: deliveryRegistry.version,
        deliveries: deliveryRegistry.deliveries.map((delivery) => {
          const replacement = updatedDeliveries.find((entry) => entry.id === delivery.id);
          return replacement ?? delivery;
        }),
      };

      try {
        await persistDeliveryRegistry(nextDeliveryRegistry);
        await persistRunRegistry({
          version: runRegistry.version,
          runs: nextRuns,
        });
        toast('Run status updated.', { variant: 'success' });
      } catch (error: unknown) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to update run status.', {
          variant: 'error',
        });
      }
    },
    [deliveryRegistry, persistDeliveryRegistry, persistRunRegistry, runRegistry.runs, runRegistry.version, toast]
  );

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
    existingCampaign,
    draft,
    setDraft,
    launchingMode,
    suppressionEmailDraft,
    setSuppressionEmailDraft,
    suppressionReasonDraft,
    setSuppressionReasonDraft,
    suppressionNotesDraft,
    setSuppressionNotesDraft,
    organizationOptions,
    eventOptions,
    partyOptions,
    preview,
    launchEvaluation,
    recentRuns,
    suppressionEntries,
    analytics,
    deliveryRegistry,
    saveCampaign,
    handleLaunch,
    handleRunStatusChange,
    handleAddSuppressionEntry,
    handleRemoveSuppressionEntry,
    isLoading: settingsStore.isLoading,
    isUpdatePending: updateSetting.isPending,
    router,
  };
}
