'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  AdminFilemakerBreadcrumbs,
  Badge,
  Button,
  Checkbox,
  FormActions,
  FormField,
  FormSection,
  Input,
  MultiSelect,
  SectionHeader,
  SelectSimple,
  Textarea,
  useToast,
} from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  applyFilemakerEmailCampaignRunStatusToDeliveries,
  buildFilemakerPartyOptions,
  createFilemakerEmailCampaignSuppressionEntry,
  createFilemakerEmailCampaign,
  decodeFilemakerPartyReference,
  evaluateFilemakerEmailCampaignLaunch,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
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
  summarizeFilemakerEmailCampaignRunDeliveries,
  syncFilemakerEmailCampaignRunWithDeliveries,
  toPersistedFilemakerEmailCampaignDeliveryRegistry,
  toPersistedFilemakerEmailCampaignRegistry,
  toPersistedFilemakerEmailCampaignRunRegistry,
  toPersistedFilemakerEmailCampaignSuppressionRegistry,
  upsertFilemakerEmailCampaignSuppressionEntry,
} from '../settings';
import { decodeRouteParam, formatTimestamp } from './filemaker-page-utils';

import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignLifecycleStatus,
  FilemakerEmailCampaignLaunchMode,
  FilemakerEmailCampaignLaunchRunResponse,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignSuppressionReason,
  FilemakerEmailCampaignSuppressionRegistry,
  FilemakerEmailCampaignRunMode,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignRunStatus,
  FilemakerPartyKind,
  FilemakerPartyReference,
} from '../types';

const CAMPAIGN_STATUS_OPTIONS: Array<
  LabeledOptionWithDescriptionDto<FilemakerEmailCampaignLifecycleStatus>
> = [
  { value: 'draft', label: 'Draft', description: 'Not launchable yet.' },
  { value: 'active', label: 'Active', description: 'Eligible for launch when conditions pass.' },
  { value: 'paused', label: 'Paused', description: 'Temporarily blocked from launch.' },
  { value: 'archived', label: 'Archived', description: 'Kept for reference only.' },
];

const LAUNCH_MODE_OPTIONS: Array<LabeledOptionWithDescriptionDto<FilemakerEmailCampaignLaunchMode>> =
  [
    { value: 'manual', label: 'Manual', description: 'Launch only when triggered manually.' },
    { value: 'scheduled', label: 'Scheduled', description: 'Launch at a fixed date and time.' },
    { value: 'recurring', label: 'Recurring', description: 'Launch inside recurring windows.' },
  ];

const EMAIL_STATUS_OPTIONS: Array<LabeledOptionWithDescriptionDto<string>> = [
  { value: 'active', label: 'Active', description: 'Deliverable and in use.' },
  { value: 'inactive', label: 'Inactive', description: 'Known but not currently used.' },
  { value: 'bounced', label: 'Bounced', description: 'Delivery is failing.' },
  { value: 'unverified', label: 'Unverified', description: 'Still awaiting verification.' },
];

const PARTY_KIND_OPTIONS: Array<LabeledOptionWithDescriptionDto<FilemakerPartyKind>> = [
  { value: 'person', label: 'Persons', description: 'Campaign targets person-linked emails.' },
  {
    value: 'organization',
    label: 'Organizations',
    description: 'Campaign targets organization-linked emails.',
  },
];

const RECURRING_FREQUENCY_OPTIONS: Array<LabeledOptionWithDescriptionDto<string>> = [
  { value: 'daily', label: 'Daily', description: 'Every day in the allowed window.' },
  { value: 'weekly', label: 'Weekly', description: 'Selected weekdays each week.' },
  { value: 'monthly', label: 'Monthly', description: 'Uses the same weekday window every month.' },
];

const WEEKDAY_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
];

const SUPPRESSION_REASON_OPTIONS: Array<
  LabeledOptionWithDescriptionDto<FilemakerEmailCampaignSuppressionReason>
> = [
  {
    value: 'manual_block',
    label: 'Manual block',
    description: 'Prevent delivery until the address is explicitly removed.',
  },
  {
    value: 'unsubscribed',
    label: 'Unsubscribed',
    description: 'Use when the recipient opted out from future mailings.',
  },
  {
    value: 'bounced',
    label: 'Bounced',
    description: 'Use when the address is no longer deliverable.',
  },
];

const buildCampaignIdFromName = (name: string): string => {
  const token = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/g, '')
    .replace(/-+$/g, '');
  return `filemaker-email-campaign-${token || 'draft'}`;
};

const createBlankCampaignDraft = (): FilemakerEmailCampaign => {
  const draft = createFilemakerEmailCampaign({
    id: '',
    name: '',
    subject: '',
    status: 'draft',
  });
  return {
    ...draft,
    id: '',
    name: '',
    subject: '',
    previewText: null,
    fromName: null,
    replyToEmail: null,
    bodyText: null,
    bodyHtml: null,
    description: null,
    approvalGrantedAt: null,
    approvedBy: null,
    lastLaunchedAt: null,
    lastEvaluatedAt: null,
  };
};

const parseCommaSeparatedValues = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(',')
        .map((entry: string) => entry.trim())
        .filter(Boolean)
    )
  );

const formatCommaSeparatedValues = (values: string[]): string => values.join(', ');

const toDateTimeLocalValue = (value: string | null | undefined): string => {
  if (!value) return '';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  const date = new Date(parsed);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const getRunActions = (run: FilemakerEmailCampaignRun): Array<{
  label: string;
  nextStatus: FilemakerEmailCampaignRunStatus;
}> => {
  if (run.status === 'pending' || run.status === 'queued') {
    return [{ label: 'Mark Running', nextStatus: 'running' }];
  }
  if (run.status === 'running') {
    return [
      { label: 'Mark Completed', nextStatus: 'completed' },
      { label: 'Mark Failed', nextStatus: 'failed' },
      { label: 'Cancel Run', nextStatus: 'cancelled' },
    ];
  }
  return [];
};

export function AdminFilemakerCampaignEditPage(): React.JSX.Element {
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
  const runRegistry = useMemo(
    () => parseFilemakerEmailCampaignRunRegistry(rawRuns),
    [rawRuns]
  );
  const deliveryRegistry = useMemo(
    () => parseFilemakerEmailCampaignDeliveryRegistry(rawDeliveries),
    [rawDeliveries]
  );
  const eventRegistry = useMemo(
    () => parseFilemakerEmailCampaignEventRegistry(rawEvents),
    [rawEvents]
  );
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
    () => runRegistry.runs.filter((run: FilemakerEmailCampaignRun) => run.campaignId === existingCampaign?.id),
    [existingCampaign?.id, runRegistry.runs]
  );
  const suppressionEntries = useMemo(
    () => suppressionRegistry.entries,
    [suppressionRegistry.entries]
  );
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
  const unsubscribeLinkTemplate = useMemo(() => {
    return '{{unsubscribe_url}}';
  }, []);
  const preferencesLinkTemplate = useMemo(() => {
    return '{{preferences_url}}';
  }, []);
  const manageAllPreferencesLinkTemplate = useMemo(() => {
    return '{{manage_all_preferences_url}}';
  }, []);

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
        value: JSON.stringify(
          toPersistedFilemakerEmailCampaignDeliveryRegistry(nextDeliveryRegistry)
        ),
      });
    },
    [updateSetting]
  );

  const persistSuppressionRegistry = useCallback(
    async (nextSuppressionRegistry: FilemakerEmailCampaignSuppressionRegistry): Promise<void> => {
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
        value: JSON.stringify(
          toPersistedFilemakerEmailCampaignSuppressionRegistry(nextSuppressionRegistry)
        ),
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
    [
      buildPersistedCampaign,
      campaignRegistry.campaigns,
      isCreateMode,
      persistCampaignRegistry,
      router,
      toast,
    ]
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
    [
      buildPersistedCampaign,
      router,
      saveCampaign,
      settingsStore,
      toast,
    ]
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
    [
      deliveryRegistry,
      persistDeliveryRegistry,
      persistRunRegistry,
      runRegistry.runs,
      runRegistry.version,
      toast,
    ]
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

  if (!isCreateMode && !existingCampaign) {
    return (
      <div className='page-section-compact space-y-6'>
        <SectionHeader
          title='Edit Campaign'
          description='The requested Filemaker campaign could not be found.'
          eyebrow={
            <AdminFilemakerBreadcrumbs
              parent={{ label: 'Campaigns', href: '/admin/filemaker/campaigns' }}
              current='Edit'
              className='mb-2'
            />
          }
          actions={
            <FormActions
              onCancel={(): void => {
                router.push('/admin/filemaker/campaigns');
              }}
              cancelText='Back to Campaigns'
            />
          }
        />
      </div>
    );
  }

  return (
    <div className='page-section-compact space-y-6'>
      <SectionHeader
        title={isCreateMode ? 'Create Campaign' : 'Edit Campaign'}
        description='Configure campaign content, audience rules, launch conditions, and recent run monitoring.'
        eyebrow={
          <AdminFilemakerBreadcrumbs
            parent={{ label: 'Campaigns', href: '/admin/filemaker/campaigns' }}
            current={isCreateMode ? 'New Campaign' : draft.name || 'Edit'}
            className='mb-2'
          />
        }
        actions={
          <FormActions
            onCancel={(): void => {
              router.push('/admin/filemaker/campaigns');
            }}
            cancelText='Back to Campaigns'
            onSave={(): void => {
              void saveCampaign();
            }}
            saveText='Save Campaign'
            isSaving={updateSetting.isPending || launchingMode !== null}
          >
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={updateSetting.isPending || launchingMode !== null}
              onClick={(): void => {
                void handleLaunch('dry_run');
              }}
            >
              Create Dry Run
            </Button>
            <Button
              type='button'
              size='sm'
              disabled={updateSetting.isPending || launchingMode !== null}
              onClick={(): void => {
                void handleLaunch('live');
              }}
            >
              Launch Campaign
            </Button>
          </FormActions>
        }
      />

      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          ID: {draft.id || 'will be generated on first save'}
        </Badge>
        <Badge variant='outline' className='text-[10px] capitalize'>
          Status: {draft.status}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Preview Recipients: {preview.recipients.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Runs: {recentRuns.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Last Launch: {formatTimestamp(draft.lastLaunchedAt)}
        </Badge>
      </div>

      <FormSection title='Campaign Details' className='space-y-4 p-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='Campaign name' className='md:col-span-2'>
            <Input
              value={draft.name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setDraft((previous) => ({ ...previous, name: event.target.value }));
              }}
              placeholder='Spring outreach to exhibitors'
              aria-label='Campaign name'
              title='Campaign name'
            />
          </FormField>
          <FormField label='Status'>
            <SelectSimple
              value={draft.status}
              onValueChange={(value: string): void => {
                setDraft((previous) => ({
                  ...previous,
                  status: value as FilemakerEmailCampaignLifecycleStatus,
                }));
              }}
              options={CAMPAIGN_STATUS_OPTIONS}
              placeholder='Select campaign status'
              size='sm'
              ariaLabel='Select campaign status'
              title='Select campaign status'
            />
          </FormField>
          <FormField label='From name'>
            <Input
              value={draft.fromName ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setDraft((previous) => ({ ...previous, fromName: event.target.value || null }));
              }}
              placeholder='Case Resolver Team'
              aria-label='From name'
              title='From name'
            />
          </FormField>
          <FormField label='Reply-to email'>
            <Input
              value={draft.replyToEmail ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setDraft((previous) => ({
                  ...previous,
                  replyToEmail: event.target.value || null,
                }));
              }}
              placeholder='events@example.com'
              aria-label='Reply-to email'
              title='Reply-to email'
            />
          </FormField>
          <FormField label='Description' className='md:col-span-2'>
            <Textarea
              value={draft.description ?? ''}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                setDraft((previous) => ({
                  ...previous,
                  description: event.target.value || null,
                }));
              }}
              placeholder='Describe the purpose and timing of this campaign.'
              aria-label='Campaign description'
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title='Content' className='space-y-4 p-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='Subject' className='md:col-span-2'>
            <Input
              value={draft.subject}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setDraft((previous) => ({ ...previous, subject: event.target.value }));
              }}
              placeholder='Invitation to the next Filemaker event'
              aria-label='Campaign subject'
              title='Campaign subject'
            />
          </FormField>
          <FormField label='Preview text' className='md:col-span-2'>
            <Input
              value={draft.previewText ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setDraft((previous) => ({
                  ...previous,
                  previewText: event.target.value || null,
                }));
              }}
              placeholder='A short preview shown in inbox clients.'
              aria-label='Campaign preview text'
              title='Campaign preview text'
            />
          </FormField>
          <FormField label='Text body' className='md:col-span-2'>
            <Textarea
              value={draft.bodyText ?? ''}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                setDraft((previous) => ({ ...previous, bodyText: event.target.value || null }));
              }}
              placeholder='Write the plain text version of the campaign.'
              aria-label='Campaign text body'
            />
          </FormField>
          <FormField label='HTML body' className='md:col-span-2'>
            <Textarea
              value={draft.bodyHtml ?? ''}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                setDraft((previous) => ({ ...previous, bodyHtml: event.target.value || null }));
              }}
              placeholder='<p>Write the HTML version of the campaign.</p>'
              aria-label='Campaign HTML body'
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title='Audience Rules' className='space-y-4 p-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='Party kinds'>
            <MultiSelect
              options={PARTY_KIND_OPTIONS}
              selected={draft.audience.partyKinds}
              onChange={(values: string[]): void => {
                setDraft((previous) => ({
                  ...previous,
                  audience: {
                    ...previous.audience,
                    partyKinds: values as FilemakerPartyKind[],
                  },
                }));
              }}
              placeholder='Select party kinds'
            />
          </FormField>
          <FormField label='Email statuses'>
            <MultiSelect
              options={EMAIL_STATUS_OPTIONS}
              selected={draft.audience.emailStatuses}
              onChange={(values: string[]): void => {
                setDraft((previous) => ({
                  ...previous,
                  audience: {
                    ...previous.audience,
                    emailStatuses: values as FilemakerEmailCampaign['audience']['emailStatuses'],
                  },
                }));
              }}
              placeholder='Select email statuses'
            />
          </FormField>
          <FormField label='Event focus'>
            <MultiSelect
              options={eventOptions}
              selected={draft.audience.eventIds}
              onChange={(values: string[]): void => {
                setDraft((previous) => ({
                  ...previous,
                  audience: {
                    ...previous.audience,
                    eventIds: values,
                  },
                }));
              }}
              placeholder='Select events'
            />
          </FormField>
          <FormField label='Organization focus'>
            <MultiSelect
              options={organizationOptions}
              selected={draft.audience.organizationIds}
              onChange={(values: string[]): void => {
                setDraft((previous) => ({
                  ...previous,
                  audience: {
                    ...previous.audience,
                    organizationIds: values,
                  },
                }));
              }}
              placeholder='Select organizations'
            />
          </FormField>
          <FormField label='Include specific parties'>
            <MultiSelect
              options={partyOptions}
              selected={draft.audience.includePartyReferences.map(
                (reference) => `${reference.kind}:${reference.id}`
              )}
              onChange={(values: string[]): void => {
                setDraft((previous) => ({
                  ...previous,
                  audience: {
                    ...previous.audience,
                    includePartyReferences: values
                      .map((value: string): FilemakerPartyReference | null =>
                        decodeFilemakerPartyReference(value)
                      )
                      .filter(
                        (value: FilemakerPartyReference | null): value is FilemakerPartyReference =>
                          Boolean(value)
                      ),
                  },
                }));
              }}
              placeholder='Select included parties'
            />
          </FormField>
          <FormField label='Exclude specific parties'>
            <MultiSelect
              options={partyOptions}
              selected={draft.audience.excludePartyReferences.map(
                (reference) => `${reference.kind}:${reference.id}`
              )}
              onChange={(values: string[]): void => {
                setDraft((previous) => ({
                  ...previous,
                  audience: {
                    ...previous.audience,
                    excludePartyReferences: values
                      .map((value: string): FilemakerPartyReference | null =>
                        decodeFilemakerPartyReference(value)
                      )
                      .filter(
                        (value: FilemakerPartyReference | null): value is FilemakerPartyReference =>
                          Boolean(value)
                      ),
                  },
                }));
              }}
              placeholder='Select excluded parties'
            />
          </FormField>
          <FormField label='Countries (comma separated)'>
            <Input
              value={formatCommaSeparatedValues(draft.audience.countries)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setDraft((previous) => ({
                  ...previous,
                  audience: {
                    ...previous.audience,
                    countries: parseCommaSeparatedValues(event.target.value),
                  },
                }));
              }}
              placeholder='Poland, Germany'
              aria-label='Audience countries'
              title='Audience countries'
            />
          </FormField>
          <FormField label='Cities (comma separated)'>
            <Input
              value={formatCommaSeparatedValues(draft.audience.cities)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setDraft((previous) => ({
                  ...previous,
                  audience: {
                    ...previous.audience,
                    cities: parseCommaSeparatedValues(event.target.value),
                  },
                }));
              }}
              placeholder='Warsaw, Berlin'
              aria-label='Audience cities'
              title='Audience cities'
            />
          </FormField>
          <FormField label='Audience limit'>
            <Input
              type='number'
              value={draft.audience.limit ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                const next = Number(event.target.value);
                setDraft((previous) => ({
                  ...previous,
                  audience: {
                    ...previous.audience,
                    limit: Number.isFinite(next) && next > 0 ? Math.trunc(next) : null,
                  },
                }));
              }}
              placeholder='Leave empty for no limit'
              aria-label='Audience limit'
              title='Audience limit'
            />
          </FormField>
          <div className='flex items-center gap-3 rounded-md border border-border/60 bg-card/25 p-3 md:col-span-2'>
            <Checkbox
              id='filemaker-campaign-dedupe'
              checked={draft.audience.dedupeByEmail}
              onCheckedChange={(value): void => {
                setDraft((previous) => ({
                  ...previous,
                  audience: {
                    ...previous.audience,
                    dedupeByEmail: Boolean(value),
                  },
                }));
              }}
            />
            <label htmlFor='filemaker-campaign-dedupe' className='cursor-pointer text-sm text-white'>
              Dedupe recipients by email address before launch
            </label>
          </div>
        </div>
      </FormSection>

      <FormSection title='Launch Conditions' className='space-y-4 p-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='Launch mode'>
            <SelectSimple
              value={draft.launch.mode}
              onValueChange={(value: string): void => {
                setDraft((previous) => ({
                  ...previous,
                  launch: {
                    ...previous.launch,
                    mode: value as FilemakerEmailCampaignLaunchMode,
                    recurring:
                      value === 'recurring'
                        ? previous.launch.recurring ?? {
                            frequency: 'weekly',
                            interval: 1,
                            weekdays: [1, 2, 3, 4, 5],
                            hourStart: null,
                            hourEnd: null,
                          }
                        : null,
                  },
                }));
              }}
              options={LAUNCH_MODE_OPTIONS}
              placeholder='Select launch mode'
              size='sm'
              ariaLabel='Select launch mode'
              title='Select launch mode'
            />
          </FormField>
          <FormField label='Minimum audience size'>
            <Input
              type='number'
              value={draft.launch.minAudienceSize}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                const next = Number(event.target.value);
                setDraft((previous) => ({
                  ...previous,
                  launch: {
                    ...previous.launch,
                    minAudienceSize:
                      Number.isFinite(next) && next >= 0 ? Math.trunc(next) : 0,
                  },
                }));
              }}
              aria-label='Minimum audience size'
              title='Minimum audience size'
            />
          </FormField>
          {draft.launch.mode === 'scheduled' && (
            <FormField label='Scheduled at' className='md:col-span-2'>
              <Input
                type='datetime-local'
                value={toDateTimeLocalValue(draft.launch.scheduledAt)}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setDraft((previous) => ({
                    ...previous,
                    launch: {
                      ...previous.launch,
                      scheduledAt: event.target.value || null,
                    },
                  }));
                }}
                aria-label='Scheduled launch time'
                title='Scheduled launch time'
              />
            </FormField>
          )}
          <div className='flex items-center gap-3 rounded-md border border-border/60 bg-card/25 p-3'>
            <Checkbox
              id='filemaker-campaign-weekdays'
              checked={draft.launch.onlyWeekdays}
              onCheckedChange={(value): void => {
                setDraft((previous) => ({
                  ...previous,
                  launch: {
                    ...previous.launch,
                    onlyWeekdays: Boolean(value),
                  },
                }));
              }}
            />
            <label htmlFor='filemaker-campaign-weekdays' className='cursor-pointer text-sm text-white'>
              Restrict launches to weekdays only
            </label>
          </div>
          <div className='flex items-center gap-3 rounded-md border border-border/60 bg-card/25 p-3'>
            <Checkbox
              id='filemaker-campaign-approval'
              checked={draft.launch.requireApproval}
              onCheckedChange={(value): void => {
                setDraft((previous) => ({
                  ...previous,
                  launch: {
                    ...previous.launch,
                    requireApproval: Boolean(value),
                  },
                }));
              }}
            />
            <label htmlFor='filemaker-campaign-approval' className='cursor-pointer text-sm text-white'>
              Require manual approval before launch
            </label>
          </div>
          <FormField label='Allowed hour start'>
            <Input
              type='number'
              min={0}
              max={23}
              value={draft.launch.allowedHourStart ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                const next = Number(event.target.value);
                setDraft((previous) => ({
                  ...previous,
                  launch: {
                    ...previous.launch,
                    allowedHourStart:
                      Number.isFinite(next) && next >= 0 && next <= 23 ? Math.trunc(next) : null,
                  },
                }));
              }}
              aria-label='Allowed hour start'
              title='Allowed hour start'
            />
          </FormField>
          <FormField label='Allowed hour end'>
            <Input
              type='number'
              min={0}
              max={23}
              value={draft.launch.allowedHourEnd ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                const next = Number(event.target.value);
                setDraft((previous) => ({
                  ...previous,
                  launch: {
                    ...previous.launch,
                    allowedHourEnd:
                      Number.isFinite(next) && next >= 0 && next <= 23 ? Math.trunc(next) : null,
                  },
                }));
              }}
              aria-label='Allowed hour end'
              title='Allowed hour end'
            />
          </FormField>
          <FormField label='Pause if bounce rate exceeds (%)'>
            <Input
              type='number'
              min={0}
              max={100}
              value={draft.launch.pauseOnBounceRatePercent ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                const next = Number(event.target.value);
                setDraft((previous) => ({
                  ...previous,
                  launch: {
                    ...previous.launch,
                    pauseOnBounceRatePercent:
                      Number.isFinite(next) && next >= 0 && next <= 100 ? next : null,
                  },
                }));
              }}
              aria-label='Bounce rate pause threshold'
              title='Bounce rate pause threshold'
            />
          </FormField>
          <FormField label='Timezone'>
            <Input
              value={draft.launch.timezone ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setDraft((previous) => ({
                  ...previous,
                  launch: {
                    ...previous.launch,
                    timezone: event.target.value || null,
                  },
                }));
              }}
              placeholder='UTC'
              aria-label='Launch timezone'
              title='Launch timezone'
            />
          </FormField>
          {draft.launch.requireApproval && (
            <>
              <div className='flex items-center gap-3 rounded-md border border-border/60 bg-card/25 p-3 md:col-span-2'>
                <Checkbox
                  id='filemaker-campaign-approved'
                  checked={Boolean(draft.approvalGrantedAt)}
                  onCheckedChange={(value): void => {
                    setDraft((previous) => ({
                      ...previous,
                      approvalGrantedAt: value ? previous.approvalGrantedAt ?? new Date().toISOString() : null,
                    }));
                  }}
                />
                <label htmlFor='filemaker-campaign-approved' className='cursor-pointer text-sm text-white'>
                  Launch approved
                </label>
              </div>
              <FormField label='Approved by' className='md:col-span-2'>
                <Input
                  value={draft.approvedBy ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    setDraft((previous) => ({
                      ...previous,
                      approvedBy: event.target.value || null,
                    }));
                  }}
                  placeholder='Operations manager'
                  aria-label='Approved by'
                  title='Approved by'
                />
              </FormField>
            </>
          )}

          {draft.launch.mode === 'recurring' && draft.launch.recurring && (
            <>
              <FormField label='Recurring frequency'>
                <SelectSimple
                  value={draft.launch.recurring.frequency}
                  onValueChange={(value: string): void => {
                    setDraft((previous) => ({
                      ...previous,
                      launch: {
                        ...previous.launch,
                        recurring: {
                          ...(previous.launch.recurring ?? {
                            frequency: 'weekly',
                            interval: 1,
                            weekdays: [1, 2, 3, 4, 5],
                            hourStart: null,
                            hourEnd: null,
                          }),
                          frequency: value as 'daily' | 'weekly' | 'monthly',
                        },
                      },
                    }));
                  }}
                  options={RECURRING_FREQUENCY_OPTIONS}
                  placeholder='Select recurring frequency'
                  size='sm'
                  ariaLabel='Select recurring frequency'
                  title='Select recurring frequency'
                />
              </FormField>
              <FormField label='Recurring interval'>
                <Input
                  type='number'
                  value={draft.launch.recurring.interval}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    const next = Number(event.target.value);
                    setDraft((previous) => ({
                      ...previous,
                      launch: {
                        ...previous.launch,
                        recurring: {
                          ...(previous.launch.recurring ?? {
                            frequency: 'weekly',
                            interval: 1,
                            weekdays: [1, 2, 3, 4, 5],
                            hourStart: null,
                            hourEnd: null,
                          }),
                          interval: Number.isFinite(next) && next > 0 ? Math.trunc(next) : 1,
                        },
                      },
                    }));
                  }}
                  aria-label='Recurring interval'
                  title='Recurring interval'
                />
              </FormField>
              <FormField label='Recurring weekdays' className='md:col-span-2'>
                <MultiSelect
                  options={WEEKDAY_OPTIONS}
                  selected={draft.launch.recurring.weekdays.map(String)}
                  onChange={(values: string[]): void => {
                    setDraft((previous) => ({
                      ...previous,
                      launch: {
                        ...previous.launch,
                        recurring: {
                          ...(previous.launch.recurring ?? {
                            frequency: 'weekly',
                            interval: 1,
                            weekdays: [1, 2, 3, 4, 5],
                            hourStart: null,
                            hourEnd: null,
                          }),
                          weekdays: values
                            .map((value: string): number => Number(value))
                            .filter(
                              (value: number): boolean =>
                                Number.isInteger(value) && value >= 0 && value <= 6
                            ),
                        },
                      },
                    }));
                  }}
                  placeholder='Select recurring weekdays'
                />
              </FormField>
              <FormField label='Recurring hour start'>
                <Input
                  type='number'
                  min={0}
                  max={23}
                  value={draft.launch.recurring.hourStart ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    const next = Number(event.target.value);
                    setDraft((previous) => ({
                      ...previous,
                      launch: {
                        ...previous.launch,
                        recurring: {
                          ...(previous.launch.recurring ?? {
                            frequency: 'weekly',
                            interval: 1,
                            weekdays: [1, 2, 3, 4, 5],
                            hourStart: null,
                            hourEnd: null,
                          }),
                          hourStart:
                            Number.isFinite(next) && next >= 0 && next <= 23
                              ? Math.trunc(next)
                              : null,
                        },
                      },
                    }));
                  }}
                  aria-label='Recurring hour start'
                  title='Recurring hour start'
                />
              </FormField>
              <FormField label='Recurring hour end'>
                <Input
                  type='number'
                  min={0}
                  max={23}
                  value={draft.launch.recurring.hourEnd ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    const next = Number(event.target.value);
                    setDraft((previous) => ({
                      ...previous,
                      launch: {
                        ...previous.launch,
                        recurring: {
                          ...(previous.launch.recurring ?? {
                            frequency: 'weekly',
                            interval: 1,
                            weekdays: [1, 2, 3, 4, 5],
                            hourStart: null,
                            hourEnd: null,
                          }),
                          hourEnd:
                            Number.isFinite(next) && next >= 0 && next <= 23
                              ? Math.trunc(next)
                              : null,
                        },
                      },
                    }));
                  }}
                  aria-label='Recurring hour end'
                  title='Recurring hour end'
                />
              </FormField>
            </>
          )}
        </div>
      </FormSection>

      <FormSection title='Delivery Governance' className='space-y-4 p-4'>
        <div className='flex flex-wrap gap-2'>
          <Badge variant='outline' className='text-[10px]'>
            Suppressed Addresses: {suppressionEntries.length}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Auto-bounce Blocking: Enabled
          </Badge>
        </div>
        <div className='grid gap-4 md:grid-cols-3'>
          <FormField label='Public unsubscribe link template'>
            <Input
              readOnly
              value={unsubscribeLinkTemplate}
              aria-label='Public unsubscribe link template'
              title='Public unsubscribe link template'
            />
          </FormField>
          <FormField label='Public preferences link template'>
            <Input
              readOnly
              value={preferencesLinkTemplate}
              aria-label='Public preferences link template'
              title='Public preferences link template'
            />
          </FormField>
          <FormField label='Public all-campaign preferences link template'>
            <Input
              readOnly
              value={manageAllPreferencesLinkTemplate}
              aria-label='Public all-campaign preferences link template'
              title='Public all-campaign preferences link template'
            />
          </FormField>
        </div>
        <div className='text-xs leading-5 text-gray-400'>
          Use <code>{'{{unsubscribe_url}}'}</code> in your campaign body for a signed recipient
          unsubscribe link, <code>{'{{preferences_url}}'}</code> for the signed
          campaign-scoped preferences center, and <code>{'{{manage_all_preferences_url}}'}</code>{' '}
          for a signed address-wide preferences center across all Filemaker campaigns. Use{' '}
          <code>{'{{open_tracking_pixel}}'}</code> in HTML content for a hidden signed open
          tracking pixel, <code>{'{{open_tracking_url}}'}</code> if you need the raw tracking URL,
          <code>{'{{click_tracking_url:https://example.com}}'}</code> for signed click redirects,
          and <code>{'{{email}}'}</code> for plain-text personalization.
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          <FormField label='Suppressed email address'>
            <Input
              value={suppressionEmailDraft}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setSuppressionEmailDraft(event.target.value);
              }}
              placeholder='blocked@example.com'
              aria-label='Suppressed email address'
              title='Suppressed email address'
            />
          </FormField>
          <FormField label='Suppression reason'>
            <SelectSimple
              value={suppressionReasonDraft}
              onValueChange={(value: string): void => {
                setSuppressionReasonDraft(value as FilemakerEmailCampaignSuppressionReason);
              }}
              options={SUPPRESSION_REASON_OPTIONS}
              placeholder='Select suppression reason'
              size='sm'
              ariaLabel='Suppression reason'
              title='Suppression reason'
            />
          </FormField>
          <FormField label='Notes' className='md:col-span-2'>
            <Textarea
              value={suppressionNotesDraft}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                setSuppressionNotesDraft(event.target.value);
              }}
              rows={2}
              placeholder='Optional reason or unsubscribe source'
              aria-label='Suppression notes'
            />
          </FormField>
        </div>
        <div className='flex justify-end'>
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={updateSetting.isPending || !suppressionEmailDraft.trim()}
            onClick={(): void => {
              void handleAddSuppressionEntry();
            }}
          >
            Add Suppression
          </Button>
        </div>
        <div className='space-y-2'>
          {suppressionEntries.length === 0 ? (
            <div className='text-sm text-gray-500'>
              No suppressed addresses yet. Bounced addresses will be added automatically.
            </div>
          ) : (
            suppressionEntries.slice(0, 12).map((entry) => (
              <div
                key={entry.id}
                className='flex flex-wrap items-start justify-between gap-3 rounded-md border border-border/60 bg-card/25 p-3'
              >
                <div className='space-y-1'>
                  <div className='text-sm font-medium text-white'>{entry.emailAddress}</div>
                  <div className='flex flex-wrap gap-2'>
                    <Badge variant='outline' className='text-[10px] capitalize'>
                      {entry.reason.replace('_', ' ')}
                    </Badge>
                    {entry.actor ? (
                      <Badge variant='outline' className='text-[10px]'>
                        {entry.actor}
                      </Badge>
                    ) : null}
                  </div>
                  <div className='text-[11px] text-gray-500'>
                    Added: {formatTimestamp(entry.createdAt)}
                  </div>
                  {entry.notes ? (
                    <div className='text-[11px] text-gray-400'>{entry.notes}</div>
                  ) : null}
                </div>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={updateSetting.isPending}
                  onClick={(): void => {
                    void handleRemoveSuppressionEntry(entry.emailAddress);
                  }}
                >
                  Remove
                </Button>
              </div>
            ))
          )}
        </div>
      </FormSection>

      <FormSection title='Audience Preview' className='space-y-4 p-4'>
        <div className='flex flex-wrap gap-2'>
          <Badge variant='outline' className='text-[10px]'>
            Linked Emails: {preview.totalLinkedEmailCount}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Matched: {preview.recipients.length}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Excluded: {preview.excludedCount}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Suppressed: {preview.suppressedCount}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Deduped Away: {preview.dedupedCount}
          </Badge>
        </div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3 text-sm text-gray-300'>
          {launchEvaluation.isEligible ? (
            <span>Campaign is eligible to launch with the current audience and conditions.</span>
          ) : (
            <div className='space-y-2'>
              <div className='font-medium text-white'>Launch blockers</div>
              <ul className='list-disc space-y-1 pl-5 text-sm text-gray-300'>
                {launchEvaluation.blockers.map((blocker: string) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
              {launchEvaluation.nextEligibleAt && (
                <div className='text-[11px] text-gray-500'>
                  Next eligible at: {formatTimestamp(launchEvaluation.nextEligibleAt)}
                </div>
              )}
            </div>
          )}
        </div>
        <div className='space-y-2'>
          {preview.sampleRecipients.length === 0 ? (
            <div className='text-sm text-gray-500'>No recipients currently match this campaign.</div>
          ) : (
            preview.sampleRecipients.map((recipient) => (
              <div
                key={`${recipient.partyKind}-${recipient.partyId}-${recipient.email}`}
                className='rounded-md border border-border/60 bg-card/25 p-3'
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div>
                    <div className='text-sm font-medium text-white'>{recipient.partyName}</div>
                    <div className='text-[11px] text-gray-400'>
                      {recipient.email} • {recipient.partyKind}
                    </div>
                  </div>
                  <Badge variant='outline' className='text-[10px] capitalize'>
                    {recipient.emailStatus}
                  </Badge>
                </div>
                <div className='mt-1 text-[11px] text-gray-500'>
                  {recipient.city || 'Unknown city'}, {recipient.country || 'Unknown country'}
                </div>
              </div>
            ))
          )}
        </div>
      </FormSection>

      <FormSection title='Campaign Analytics' className='space-y-4 p-4'>
        <div className='flex flex-wrap gap-2'>
          <Badge variant='outline' className='text-[10px]'>
            Total Runs: {analytics.totalRuns}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Live Runs: {analytics.liveRunCount}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Dry Runs: {analytics.dryRunCount}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Event Count: {analytics.eventCount}
          </Badge>
        </div>
        <div className='grid gap-3 text-sm text-gray-300 md:grid-cols-2 xl:grid-cols-4'>
          <div className='rounded-md border border-border/60 bg-card/25 p-3'>
            <div className='text-[11px] text-gray-500'>Recipients Processed</div>
            <div className='mt-1 text-lg font-semibold text-white'>
              {analytics.processedCount}/{analytics.totalRecipients}
            </div>
            <div className='text-[11px] text-gray-500'>
              Completion rate: {analytics.completionRatePercent}%
            </div>
          </div>
          <div className='rounded-md border border-border/60 bg-card/25 p-3'>
            <div className='text-[11px] text-gray-500'>Delivery Outcome</div>
            <div className='mt-1 text-lg font-semibold text-white'>
              {analytics.sentCount} sent
            </div>
            <div className='text-[11px] text-gray-500'>
              Delivery rate: {analytics.deliveryRatePercent}%
            </div>
          </div>
          <div className='rounded-md border border-border/60 bg-card/25 p-3'>
            <div className='text-[11px] text-gray-500'>Failures</div>
            <div className='mt-1 text-lg font-semibold text-white'>
              {analytics.failedCount + analytics.bouncedCount}
            </div>
            <div className='text-[11px] text-gray-500'>
              Bounce rate: {analytics.bounceRatePercent}% • Failure rate: {analytics.failureRatePercent}%
            </div>
          </div>
          <div className='rounded-md border border-border/60 bg-card/25 p-3'>
            <div className='text-[11px] text-gray-500'>Suppression Impact</div>
            <div className='mt-1 text-lg font-semibold text-white'>
              {analytics.suppressionImpactCount}
            </div>
            <div className='text-[11px] text-gray-500'>Addresses currently filtered from preview</div>
          </div>
          <div className='rounded-md border border-border/60 bg-card/25 p-3'>
            <div className='text-[11px] text-gray-500'>Opens</div>
            <div className='mt-1 text-lg font-semibold text-white'>{analytics.openCount}</div>
            <div className='text-[11px] text-gray-500'>
              Open rate: {analytics.openRatePercent}% • Unique opens: {analytics.uniqueOpenCount} ({analytics.uniqueOpenRatePercent}%)
            </div>
          </div>
          <div className='rounded-md border border-border/60 bg-card/25 p-3'>
            <div className='text-[11px] text-gray-500'>Clicks</div>
            <div className='mt-1 text-lg font-semibold text-white'>{analytics.clickCount}</div>
            <div className='text-[11px] text-gray-500'>
              Click rate: {analytics.clickRatePercent}% • Unique clicks: {analytics.uniqueClickCount} ({analytics.uniqueClickRatePercent}%)
            </div>
          </div>
          <div className='rounded-md border border-border/60 bg-card/25 p-3'>
            <div className='text-[11px] text-gray-500'>Opt-outs</div>
            <div className='mt-1 text-lg font-semibold text-white'>
              {analytics.unsubscribeCount}
            </div>
            <div className='text-[11px] text-gray-500'>
              Unsubscribe rate: {analytics.unsubscribeRatePercent}%
            </div>
          </div>
          <div className='rounded-md border border-border/60 bg-card/25 p-3'>
            <div className='text-[11px] text-gray-500'>Restored</div>
            <div className='mt-1 text-lg font-semibold text-white'>
              {analytics.resubscribeCount}
            </div>
            <div className='text-[11px] text-gray-500'>
              Restore rate: {analytics.resubscribeRatePercent}% • Net opt-outs:{' '}
              {analytics.netUnsubscribeCount} ({analytics.netUnsubscribeRatePercent}%)
            </div>
          </div>
        </div>
        <div className='grid gap-3 text-[11px] text-gray-500 md:grid-cols-3'>
          <div>
            Latest run: {analytics.latestRunAt ? formatTimestamp(analytics.latestRunAt) : 'No runs yet'}
          </div>
          <div>
            Latest run status: {analytics.latestRunStatus ?? 'No runs yet'}
          </div>
          <div>
            Latest activity:{' '}
            {analytics.latestActivityAt ? formatTimestamp(analytics.latestActivityAt) : 'No campaign activity yet'}
          </div>
          <div>
            Latest open:{' '}
            {analytics.latestOpenAt
              ? formatTimestamp(analytics.latestOpenAt)
              : 'No open tracking yet'}
          </div>
          <div>
            Latest click:{' '}
            {analytics.latestClickAt
              ? formatTimestamp(analytics.latestClickAt)
              : 'No click tracking yet'}
          </div>
          <div>
            Latest opt-out:{' '}
            {analytics.latestUnsubscribeAt
              ? formatTimestamp(analytics.latestUnsubscribeAt)
              : 'No unsubscribe activity yet'}
          </div>
          <div>
            Latest restore:{' '}
            {analytics.latestResubscribeAt
              ? formatTimestamp(analytics.latestResubscribeAt)
              : 'No restore activity yet'}
          </div>
        </div>
        <div className='space-y-3'>
          <div className='text-[11px] uppercase tracking-[0.22em] text-gray-500'>
            Top clicked links
          </div>
          {analytics.topClickedLinks.length === 0 ? (
            <div className='text-sm text-gray-500'>
              No tracked click activity has been recorded for this campaign yet.
            </div>
          ) : (
            analytics.topClickedLinks.map((link) => (
              <div
                key={link.targetUrl}
                className='rounded-md border border-border/60 bg-card/25 p-3 text-sm text-gray-300'
              >
                <div className='break-all font-medium text-sky-300'>{link.targetUrl}</div>
                <div className='mt-1 text-[11px] text-gray-500'>
                  {link.clickCount} clicks • {link.uniqueDeliveryCount} unique deliveries • rate{' '}
                  {link.clickRatePercent}%
                </div>
                <div className='text-[11px] text-gray-500'>
                  Latest click: {formatTimestamp(link.latestClickAt)}
                </div>
              </div>
            ))
          )}
        </div>
      </FormSection>

      <FormSection title='Recent Runs' className='space-y-4 p-4'>
        {recentRuns.length === 0 ? (
          <div className='text-sm text-gray-500'>
            No runs yet. Create a dry run or launch the campaign to start monitoring progress.
          </div>
        ) : (
          recentRuns.map((run: FilemakerEmailCampaignRun) => {
            const runDeliveries = getFilemakerEmailCampaignDeliveriesForRun(deliveryRegistry, run.id);
            const metrics =
              runDeliveries.length > 0
                ? summarizeFilemakerEmailCampaignRunDeliveries(runDeliveries)
                : {
                    recipientCount: run.recipientCount,
                    deliveredCount: run.deliveredCount,
                    failedCount: run.failedCount,
                    skippedCount: run.skippedCount,
                  };
            const progressBase = metrics.recipientCount || 1;
            const progressPercent = Math.round(
              ((metrics.deliveredCount + metrics.failedCount + metrics.skippedCount) / progressBase) * 100
            );
            return (
              <div
                key={run.id}
                className='space-y-3 rounded-md border border-border/60 bg-card/25 p-3'
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='space-y-1'>
                    <div className='text-sm font-medium text-white'>{run.id}</div>
                    <div className='text-[11px] text-gray-400'>
                      {run.mode === 'dry_run' ? 'Dry run' : 'Live run'} • {formatTimestamp(run.createdAt)}
                    </div>
                  </div>
                  <Badge variant='outline' className='text-[10px] capitalize'>
                    {run.status}
                  </Badge>
                </div>
                <div className='grid gap-2 text-[11px] text-gray-500 md:grid-cols-4'>
                  <div>Recipients: {metrics.recipientCount}</div>
                  <div>Delivered: {metrics.deliveredCount}</div>
                  <div>Failed: {metrics.failedCount}</div>
                  <div>Skipped: {metrics.skippedCount}</div>
                </div>
                <div className='text-[11px] text-gray-500'>Progress: {progressPercent}%</div>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={(): void => {
                      router.push(
                        `/admin/filemaker/campaigns/runs/${encodeURIComponent(run.id)}`
                      );
                    }}
                  >
                    Open Run Monitor
                  </Button>
                  {getRunActions(run).map((action) => (
                    <Button
                      key={`${run.id}-${action.nextStatus}`}
                      type='button'
                      size='sm'
                      variant='outline'
                      disabled={updateSetting.isPending}
                      onClick={(): void => {
                        void handleRunStatusChange(run.id, action.nextStatus);
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </FormSection>
    </div>
  );
}
