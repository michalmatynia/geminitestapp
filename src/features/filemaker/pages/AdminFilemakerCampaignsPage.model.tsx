'use client';

import { Megaphone } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { startTransition, useDeferredValue, useMemo, useState } from 'react';

import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { api } from '@/shared/lib/api-client';
import { useSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import {
  evaluateFilemakerEmailCampaignLaunch,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  isFilemakerEmailCampaignDeliverabilityDecisionEvent,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignDeliveryAttemptRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSchedulerStatus,
  parseFilemakerEmailCampaignSuppressionRegistry,
  resolveFilemakerEmailCampaignAudiencePreview,
  resolveFilemakerEmailCampaignNextAutomationAt,
  summarizeFilemakerEmailCampaignAnalytics,
} from '../settings';
import {
  buildCampaignActionHandlers,
  openCampaign,
  openCampaignRun,
} from './AdminFilemakerCampaignsPage.actions';
import { buildCampaignColumns } from './AdminFilemakerCampaignsPage.columns';
import { buildCampaignDeliverabilitySummary, shouldShowCampaignDeliverabilityBanner } from './AdminFilemakerCampaignsPage.deliverability-banner';
import { includeQuery } from './filemaker-page-utils';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import type { CampaignActionHandlers } from './AdminFilemakerCampaignsPage.actions';
import type { CampaignDeliverabilitySummary } from './AdminFilemakerCampaignsPage.deliverability-banner';
import type { CampaignRow, ParsedCampaignSettings } from './AdminFilemakerCampaignsPage.types';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignSuppressionRegistry,
  FilemakerMailAccount,
} from '../types';
import type { ColumnDef } from '@tanstack/react-table';

type SettingsStore = ReturnType<typeof useSettingsStore>;
type Router = ReturnType<typeof useRouter>;
type ConfirmationModalComponent = () => React.JSX.Element | null;

type CampaignLookupMaps = {
  latestSchedulerFailureByCampaignId: Map<string, string>;
  latestRunByCampaignId: Map<string, FilemakerEmailCampaignRun>;
  decisionCountByCampaignId: Map<string, number>;
  coldCountByCampaignId: Map<string, number>;
};

export type AdminFilemakerCampaignsPageModel = {
  actions: PanelAction[];
  columns: ColumnDef<CampaignRow, unknown>[];
  rows: CampaignRow[];
  query: string;
  onQueryChange: (value: string) => void;
  isLoading: boolean;
  runCount: number;
  launchReadyCount: number;
  emptyTitle: string;
  emptyDescription: string;
  deliverabilitySummary: CampaignDeliverabilitySummary;
  showDeliverabilityBanner: boolean;
  onOpenCampaign: (campaignId: string) => void;
  ConfirmationModal: ConfirmationModalComponent;
};

type FilemakerMailAccountsResponse = { accounts: FilemakerMailAccount[] };

const useMailAccountById = (): Map<string, FilemakerMailAccount> => {
  const query = useSingleQueryV2<
    FilemakerMailAccountsResponse,
    FilemakerMailAccountsResponse,
    readonly ['filemaker', 'mail', 'accounts', 'campaigns-list']
  >({
    queryKey: ['filemaker', 'mail', 'accounts', 'campaigns-list'] as const,
    queryFn: async ({ signal }) =>
      api.get<FilemakerMailAccountsResponse>('/api/filemaker/mail/accounts', { signal }),
    meta: {
      source: 'features.filemaker.pages.AdminFilemakerCampaignsPage.model.useMailAccountById',
      operation: 'list',
      resource: 'filemaker.mail-accounts',
      domain: 'files',
      description: 'Load Filemaker mail accounts for sender name display in campaign list.',
      errorPresentation: 'none',
    },
  });
  return useMemo(() => {
    const map = new Map<string, FilemakerMailAccount>();
    (query.data?.accounts ?? []).forEach((account) => { map.set(account.id, account); });
    return map;
  }, [query.data]);
};

const useParsedCampaignSettings = (settingsStore: SettingsStore): ParsedCampaignSettings => {
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawRuns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY);
  const rawDeliveries = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY);
  const rawAttempts = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY);
  const rawEvents = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY);
  const rawSchedulerStatus = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY);
  const rawSuppressions = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY);
  return {
    database: useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]),
    campaignRegistry: useMemo(() => parseFilemakerEmailCampaignRegistry(rawCampaigns), [rawCampaigns]),
    runRegistry: useMemo(() => parseFilemakerEmailCampaignRunRegistry(rawRuns), [rawRuns]),
    deliveryRegistry: useMemo(() => parseFilemakerEmailCampaignDeliveryRegistry(rawDeliveries), [rawDeliveries]),
    attemptRegistry: useMemo(() => parseFilemakerEmailCampaignDeliveryAttemptRegistry(rawAttempts), [rawAttempts]),
    eventRegistry: useMemo(() => parseFilemakerEmailCampaignEventRegistry(rawEvents), [rawEvents]),
    suppressionRegistry: useMemo(() => parseFilemakerEmailCampaignSuppressionRegistry(rawSuppressions), [rawSuppressions]),
    schedulerStatus: useMemo(() => parseFilemakerEmailCampaignSchedulerStatus(rawSchedulerStatus), [rawSchedulerStatus]),
  };
};

const buildLatestRunMap = (runs: FilemakerEmailCampaignRun[]): Map<string, FilemakerEmailCampaignRun> => {
  const map = new Map<string, FilemakerEmailCampaignRun>();
  runs.forEach((run: FilemakerEmailCampaignRun): void => {
    const current = map.get(run.campaignId);
    if (current === undefined || resolveRunCreatedAt(current) < resolveRunCreatedAt(run)) {
      map.set(run.campaignId, run);
    }
  });
  return map;
};

const resolveRunCreatedAt = (run: FilemakerEmailCampaignRun): number => {
  const parsed = Date.parse(run.createdAt ?? '');
  return Number.isNaN(parsed) ? 0 : parsed;
};

const useCampaignLookupMaps = (settings: ParsedCampaignSettings): CampaignLookupMaps => ({
  latestSchedulerFailureByCampaignId: useMemo(() => {
    const map = new Map<string, string>();
    settings.schedulerStatus.launchFailures.forEach((failure): void => {
      if (!map.has(failure.campaignId)) map.set(failure.campaignId, failure.message);
    });
    return map;
  }, [settings.schedulerStatus.launchFailures]),
  latestRunByCampaignId: useMemo(() => buildLatestRunMap(settings.runRegistry.runs), [settings.runRegistry.runs]),
  decisionCountByCampaignId: useMemo(() => buildDecisionCountMap(settings.eventRegistry), [settings.eventRegistry]),
  coldCountByCampaignId: useMemo(() => buildColdSuppressionCountMap(settings.suppressionRegistry), [settings.suppressionRegistry]),
});

const buildDecisionCountMap = (eventRegistry: FilemakerEmailCampaignEventRegistry): Map<string, number> => {
  const map = new Map<string, number>();
  eventRegistry.events.forEach((event): void => {
    if (isFilemakerEmailCampaignDeliverabilityDecisionEvent(event)) {
      map.set(event.campaignId, (map.get(event.campaignId) ?? 0) + 1);
    }
  });
  return map;
};

const buildColdSuppressionCountMap = (suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry): Map<string, number> => {
  const map = new Map<string, number>();
  suppressionRegistry.entries.forEach((entry): void => {
    if (entry.reason === 'cold' && typeof entry.campaignId === 'string') {
      map.set(entry.campaignId, (map.get(entry.campaignId) ?? 0) + 1);
    }
  });
  return map;
};

const createCampaignRow = (
  campaign: FilemakerEmailCampaign,
  settings: ParsedCampaignSettings,
  maps: CampaignLookupMaps
): CampaignRow => {
  const preview = resolveFilemakerEmailCampaignAudiencePreview(settings.database, campaign.audience, settings.suppressionRegistry);
  const launch = evaluateFilemakerEmailCampaignLaunch(campaign, preview, { senderAssignment: { requireAssignedMailAccount: true } });
  return {
    campaign,
    previewCount: preview.recipients.length,
    isLaunchReady: launch.isEligible,
    latestRun: maps.latestRunByCampaignId.get(campaign.id) ?? null,
    analytics: summarizeFilemakerEmailCampaignAnalytics({ campaign, ...settings }),
    nextAutomationAt: resolveFilemakerEmailCampaignNextAutomationAt(campaign),
    schedulerFailureMessage: maps.latestSchedulerFailureByCampaignId.get(campaign.id) ?? null,
    deliverabilityDecisionCount: maps.decisionCountByCampaignId.get(campaign.id) ?? 0,
    coldSuppressionCount: maps.coldCountByCampaignId.get(campaign.id) ?? 0,
  };
};

const useCampaignRows = (settings: ParsedCampaignSettings, maps: CampaignLookupMaps, deferredQuery: string): CampaignRow[] =>
  useMemo(
    () =>
      settings.campaignRegistry.campaigns
        .map((campaign: FilemakerEmailCampaign): CampaignRow => createCampaignRow(campaign, settings, maps))
        .filter((row: CampaignRow): boolean => includeCampaignRow(row, deferredQuery))
        .sort((left: CampaignRow, right: CampaignRow): number => left.campaign.name.localeCompare(right.campaign.name)),
    [deferredQuery, maps, settings]
  );

const includeCampaignRow = (row: CampaignRow, query: string): boolean =>
  includeQuery(
    [
      row.campaign.name,
      row.campaign.subject,
      row.campaign.status,
      row.latestRun?.status ?? '',
      row.campaign.launch.mode,
      row.nextAutomationAt ?? '',
      row.schedulerFailureMessage ?? '',
    ],
    query
  );

const useCampaignColumns = (
  settings: ParsedCampaignSettings,
  router: Router,
  actions: CampaignActionHandlers,
  mailAccountById: Map<string, FilemakerMailAccount>
): ColumnDef<CampaignRow, unknown>[] =>
  useMemo(
    () =>
      buildCampaignColumns({
        deliveryRegistry: settings.deliveryRegistry,
        mailAccountById,
        onOpenCampaign: (campaignId: string): void => { openCampaign(router, campaignId); },
        onOpenRun: (runId: string): void => { openCampaignRun(router, runId); },
        onDuplicateCampaign: (campaign: FilemakerEmailCampaign): void => { void actions.duplicateCampaign(campaign); },
        onToggleArchiveCampaign: (campaign: FilemakerEmailCampaign): void => { void actions.toggleArchiveCampaign(campaign); },
        onToggleCampaignRunState: (campaign: FilemakerEmailCampaign): void => { void actions.toggleCampaignRunState(campaign); },
        onDeleteCampaign: actions.deleteCampaign,
      }),
    [actions, mailAccountById, router, settings.deliveryRegistry]
  );

const CAMPAIGN_EXPORT_HEADERS = [
  'name', 'status', 'subject', 'mailAccountId', 'launchMode', 'isLaunchReady',
  'previewCount', 'nextAutomationAt', 'totalRuns', 'deliveryRatePercent',
  'openRatePercent', 'clickRatePercent', 'bounceRatePercent', 'unsubscribeCount',
  'coldSuppressed', 'lastLaunchedAt', 'lastEvaluatedAt', 'updatedAt',
];

const escapeCampaignCsvCell = (value: string): string => {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
};

const buildCampaignsCsv = (rows: CampaignRow[]): string => {
  const dataRows = rows.map((row) =>
    [
      row.campaign.name,
      row.campaign.status,
      row.campaign.subject,
      row.campaign.mailAccountId ?? '',
      row.campaign.launch.mode,
      row.isLaunchReady ? 'yes' : 'no',
      String(row.previewCount),
      row.nextAutomationAt ?? '',
      String(row.analytics.totalRuns),
      String(row.analytics.deliveryRatePercent),
      String(row.analytics.openRatePercent),
      String(row.analytics.clickRatePercent),
      String(row.analytics.bounceRatePercent),
      String(row.analytics.unsubscribeCount),
      String(row.coldSuppressionCount),
      row.campaign.lastLaunchedAt ?? '',
      row.campaign.lastEvaluatedAt ?? '',
      row.campaign.updatedAt ?? '',
    ]
      .map((v) => escapeCampaignCsvCell(String(v)))
      .join(',')
  );
  return [CAMPAIGN_EXPORT_HEADERS.join(','), ...dataRows].join('\n');
};

const downloadCampaignsCsv = (rows: CampaignRow[]): void => {
  const csv = buildCampaignsCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filemaker-campaigns.csv';
  a.click();
  URL.revokeObjectURL(url);
};

const usePageActions = (router: Router, rows: CampaignRow[]): PanelAction[] =>
  useMemo(
    () => [
      {
        key: 'create',
        label: 'Email Creator',
        icon: <Megaphone className='size-4' />,
        onClick: (): void => { startTransition(() => { router.push('/admin/filemaker/campaigns/create'); }); },
        variant: 'default' as const,
      },
      {
        key: 'export-csv',
        label: `Export CSV${rows.length > 0 ? ` (${rows.length})` : ''}`,
        variant: 'outline' as const,
        disabled: rows.length === 0,
        onClick: (): void => { downloadCampaignsCsv(rows); },
      },
      ...buildFilemakerNavActions(router, 'campaigns'),
    ],
    [router, rows]
  );

export const useAdminFilemakerCampaignsPageModel = (): AdminFilemakerCampaignsPageModel => {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const settings = useParsedCampaignSettings(settingsStore);
  const maps = useCampaignLookupMaps(settings);
  const rows = useCampaignRows(settings, maps, deferredQuery);
  const mailAccountById = useMailAccountById();
  const campaignActions = buildCampaignActionHandlers({
    settings,
    updateSetting,
    settingsStore,
    router,
    toast,
    confirm,
  });
  const columns = useCampaignColumns(settings, router, campaignActions, mailAccountById);
  const deliverabilitySummary = useMemo(() => buildCampaignDeliverabilitySummary(rows), [rows]);
  const pageActions = usePageActions(router, rows);
  return {
    actions: pageActions,
    columns,
    rows,
    query,
    onQueryChange: setQuery,
    isLoading: settingsStore.isLoading,
    runCount: settings.runRegistry.runs.length,
    launchReadyCount: rows.filter((row: CampaignRow): boolean => row.isLaunchReady).length,
    emptyTitle: query.length > 0 ? 'No campaigns found' : 'No campaigns yet',
    emptyDescription: resolveEmptyDescription(query),
    deliverabilitySummary,
    showDeliverabilityBanner: shouldShowCampaignDeliverabilityBanner(deliverabilitySummary),
    onOpenCampaign: (campaignId: string): void => { openCampaign(router, campaignId); },
    ConfirmationModal,
  };
};

const resolveEmptyDescription = (query: string): string => {
  if (query.length > 0) return 'Try adjusting your search terms.';
  return 'Create your first Filemaker email campaign to start previewing audiences and monitoring runs.';
};
