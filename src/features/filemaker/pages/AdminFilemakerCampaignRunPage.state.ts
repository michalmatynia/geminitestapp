'use client';

import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';

import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  getFilemakerEmailCampaignDeliveriesForRun,
  parseFilemakerEmailCampaignDeliveryAttemptRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
} from '../settings';
import { fetchFilemakerMailJson } from '../mail-ui-helpers';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignRun,
  FilemakerMailThread,
} from '../types';
import { getRunActions } from './AdminFilemakerCampaignEditPage.utils';
import {
  countPendingMailFiling,
  indexLinkedMailThreads,
  summarizeDeliveries,
  type CampaignMailFilingRepairResponse,
  type CampaignMailThreadsResponse,
  type CampaignRunDeliveryCounts,
} from './AdminFilemakerCampaignRunPage.state-helpers';
import { useFilemakerCampaignRunActions } from './useFilemakerCampaignRunActions';

type SettingsStore = ReturnType<typeof useSettingsStore>;
type Toast = ReturnType<typeof useToast>['toast'];

type CampaignRunRegistries = {
  attemptRegistry: ReturnType<typeof parseFilemakerEmailCampaignDeliveryAttemptRegistry>;
  campaignRegistry: ReturnType<typeof parseFilemakerEmailCampaignRegistry>;
  deliveryRegistry: ReturnType<typeof parseFilemakerEmailCampaignDeliveryRegistry>;
  eventRegistry: ReturnType<typeof parseFilemakerEmailCampaignEventRegistry>;
  runRegistry: ReturnType<typeof parseFilemakerEmailCampaignRunRegistry>;
};

export type AdminFilemakerCampaignRunPageState = {
  activeRunId: string;
  attempts: ReturnType<typeof parseFilemakerEmailCampaignDeliveryAttemptRegistry>['attempts'];
  campaign: FilemakerEmailCampaign | null;
  campaignId: string;
  deliveries: FilemakerEmailCampaignDelivery[];
  deliveryCounts: CampaignRunDeliveryCounts;
  events: FilemakerEmailCampaignEvent[];
  handleBackToCampaign: () => void;
  handleBackToCampaigns: () => void;
  handleRepairMailFiling: () => Promise<void>;
  handleRunAction: ReturnType<typeof useFilemakerCampaignRunActions>['handleRunAction'];
  isRepairingMailFiling: boolean;
  isRunActionPending: ReturnType<typeof useFilemakerCampaignRunActions>['isRunActionPending'];
  linkedMailThreadByDeliveryId: Map<string, FilemakerMailThread>;
  linkedMailThreads: FilemakerMailThread[];
  linkedMailThreadsError: string | null;
  pendingMailFilingCount: number;
  run: FilemakerEmailCampaignRun | null;
  runActions: ReturnType<typeof getRunActions>;
};

export type LoadedCampaignRunPageState = AdminFilemakerCampaignRunPageState & {
  campaign: FilemakerEmailCampaign;
  run: FilemakerEmailCampaignRun;
};

const useCampaignRunRoute = (): string => {
  const params = useParams<{ runId?: string | string[] }>();
  const runIdParam = params.runId;
  return Array.isArray(runIdParam) ? runIdParam[0] ?? '' : runIdParam ?? '';
};

const useCampaignRunRegistries = (settingsStore: SettingsStore): CampaignRunRegistries => {
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawRuns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY);
  const rawDeliveries = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY);
  const rawAttempts = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY);
  const rawEvents = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY);
  const campaignRegistry = useMemo(
    () => parseFilemakerEmailCampaignRegistry(rawCampaigns),
    [rawCampaigns]
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
  const eventRegistry = useMemo(
    () => parseFilemakerEmailCampaignEventRegistry(rawEvents),
    [rawEvents]
  );
  return { attemptRegistry, campaignRegistry, deliveryRegistry, eventRegistry, runRegistry };
};

const useCampaignRunSelection = (
  registries: CampaignRunRegistries,
  runId: string
): Pick<
  AdminFilemakerCampaignRunPageState,
  'activeRunId' | 'attempts' | 'campaign' | 'campaignId' | 'deliveries' | 'events' | 'run' | 'runActions'
> => {
  const run = useMemo(
    () => registries.runRegistry.runs.find((entry) => entry.id === runId) ?? null,
    [registries.runRegistry.runs, runId]
  );
  const campaign = useMemo(() => {
    if (run === null) return null;
    return registries.campaignRegistry.campaigns.find((entry) => entry.id === run.campaignId) ?? null;
  }, [registries.campaignRegistry.campaigns, run]);
  const campaignId = campaign !== null ? campaign.id : '';
  const activeRunId = run !== null ? run.id : '';
  const deliveries = useMemo(
    () =>
      run !== null
        ? getFilemakerEmailCampaignDeliveriesForRun(registries.deliveryRegistry, run.id)
        : [],
    [registries.deliveryRegistry, run]
  );
  const attempts = useMemo(
    () => registries.attemptRegistry.attempts.filter((entry) => entry.runId === runId),
    [registries.attemptRegistry.attempts, runId]
  );
  const events = useMemo(
    () =>
      registries.eventRegistry.events.filter(
        (entry) => entry.runId === runId || entry.campaignId === campaignId
      ),
    [campaignId, registries.eventRegistry.events, runId]
  );
  const runActions = useMemo(
    () =>
      run !== null
        ? getRunActions({ run, deliveries, attemptRegistry: registries.attemptRegistry })
        : [],
    [deliveries, registries.attemptRegistry, run]
  );
  return { activeRunId, attempts, campaign, campaignId, deliveries, events, run, runActions };
};

const useLinkedMailThreads = ({
  activeRunId,
  campaignId,
}: {
  activeRunId: string;
  campaignId: string;
}): Pick<
  AdminFilemakerCampaignRunPageState,
  'linkedMailThreads' | 'linkedMailThreadsError'
> & {
  reloadLinkedMailThreads: () => Promise<void>;
} => {
  const [linkedMailThreads, setLinkedMailThreads] = useState<FilemakerMailThread[]>([]);
  const [linkedMailThreadsError, setLinkedMailThreadsError] = useState<string | null>(null);
  const reloadLinkedMailThreads = useCallback(async (): Promise<void> => {
    if (activeRunId.length === 0 || campaignId.length === 0) {
      setLinkedMailThreads([]);
      setLinkedMailThreadsError(null);
      return;
    }
    const search = new URLSearchParams({ campaignId, runId: activeRunId });
    setLinkedMailThreadsError(null);
    const response = await fetchFilemakerMailJson<CampaignMailThreadsResponse>(
      `/api/filemaker/mail/threads?${search.toString()}`
    );
    setLinkedMailThreads(response.threads);
  }, [activeRunId, campaignId]);

  useEffect(() => {
    if (activeRunId.length === 0 || campaignId.length === 0) {
      setLinkedMailThreads([]);
      setLinkedMailThreadsError(null);
      return undefined;
    }
    let isActive = true;
    void reloadLinkedMailThreads()
      .then(() => {
        if (isActive) setLinkedMailThreadsError(null);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setLinkedMailThreads([]);
        setLinkedMailThreadsError(
          error instanceof Error ? error.message : 'Failed to load linked mail threads.'
        );
      });
    return () => {
      isActive = false;
    };
  }, [activeRunId, campaignId, reloadLinkedMailThreads]);

  return { linkedMailThreads, linkedMailThreadsError, reloadLinkedMailThreads };
};

const useRepairMailFilingAction = ({
  activeRunId,
  reloadLinkedMailThreads,
  settingsStore,
  toast,
}: {
  activeRunId: string;
  reloadLinkedMailThreads: () => Promise<void>;
  settingsStore: SettingsStore;
  toast: Toast;
}): Pick<AdminFilemakerCampaignRunPageState, 'handleRepairMailFiling' | 'isRepairingMailFiling'> => {
  const [isRepairingMailFiling, setIsRepairingMailFiling] = useState(false);
  const handleRepairMailFiling = useCallback(async (): Promise<void> => {
    if (activeRunId.length === 0) return;
    setIsRepairingMailFiling(true);
    try {
      const result = await fetchFilemakerMailJson<CampaignMailFilingRepairResponse>(
        `/api/filemaker/campaigns/runs/${encodeURIComponent(activeRunId)}/repair-mail-filing`,
        { method: 'POST' }
      );
      settingsStore.refetch();
      await reloadLinkedMailThreads();
      toast(
        `Mail filing repair finished. Repaired: ${result.repairedCount}, skipped: ${result.skippedCount}, failed: ${result.failedCount}.`,
        { variant: result.failedCount > 0 ? 'warning' : 'success' }
      );
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Mail filing repair failed.', { variant: 'error' });
    } finally {
      setIsRepairingMailFiling(false);
    }
  }, [activeRunId, reloadLinkedMailThreads, settingsStore, toast]);
  return { handleRepairMailFiling, isRepairingMailFiling };
};

export const isLoadedCampaignRunPageState = (
  state: AdminFilemakerCampaignRunPageState
): state is LoadedCampaignRunPageState => state.run !== null && state.campaign !== null;

export function useAdminFilemakerCampaignRunPageState(): AdminFilemakerCampaignRunPageState {
  const router = useRouter();
  const runId = useCampaignRunRoute();
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  const registries = useCampaignRunRegistries(settingsStore);
  const selection = useCampaignRunSelection(registries, runId);
  const { handleRunAction, isRunActionPending } = useFilemakerCampaignRunActions();
  const mailThreads = useLinkedMailThreads(selection);
  const repairAction = useRepairMailFilingAction({
    activeRunId: selection.activeRunId,
    reloadLinkedMailThreads: mailThreads.reloadLinkedMailThreads,
    settingsStore,
    toast,
  });
  const linkedMailThreadByDeliveryId = useMemo(
    () => indexLinkedMailThreads(mailThreads.linkedMailThreads),
    [mailThreads.linkedMailThreads]
  );
  const pendingMailFilingCount = useMemo(
    () =>
      countPendingMailFiling({
        campaign: selection.campaign,
        deliveries: selection.deliveries,
        linkedMailThreadByDeliveryId,
      }),
    [linkedMailThreadByDeliveryId, selection.campaign, selection.deliveries]
  );
  const deliveryCounts = useMemo(
    () => summarizeDeliveries(selection.deliveries),
    [selection.deliveries]
  );

  return {
    ...selection,
    ...mailThreads,
    ...repairAction,
    deliveryCounts,
    handleBackToCampaign: () => {
      startTransition(() => { router.push(`/admin/filemaker/campaigns/${encodeURIComponent(selection.campaignId)}`); });
    },
    handleBackToCampaigns: () => {
      startTransition(() => { router.push('/admin/filemaker/campaigns'); });
    },
    handleRunAction,
    isRunActionPending,
    linkedMailThreadByDeliveryId,
    pendingMailFilingCount,
  };
}
