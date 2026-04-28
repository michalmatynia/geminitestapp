'use client';
/* eslint-disable max-lines, max-lines-per-function, complexity */

import { Play, Save, Search, Square } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  FILEMAKER_JOB_BOARD_SCRAPE_ENDPOINT,
  type FilemakerJobBoardScrapeProvider,
  type FilemakerJobBoardDuplicateStrategy,
  type FilemakerJobBoardImportStrategy,
  type FilemakerJobBoardOrganizationScope,
  type FilemakerJobBoardScrapeMode,
  type FilemakerJobBoardScrapeRequest,
  type FilemakerJobBoardScrapeResponse,
} from '@/features/filemaker/filemaker-job-board-scrape-contracts';
import type { FilemakerJobListingStatus } from '@/features/filemaker/types';
import { extractMutationErrorMessage } from '@/shared/lib/mutation-error-handler';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { FormField, FormModal, SelectSimple, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { Badge, Button, Input, useToast } from '@/shared/ui/primitives.public';
import { isAbortLikeError } from '@/shared/utils/observability/is-abort-like-error';

import { useJobBoardScrapeBrowserModeSetting } from './useJobBoardScrapeBrowserModeSetting';

type FilemakerJobBoardScrapeModalProps = {
  onClose: () => void;
  onCompleted: () => void;
  open: boolean;
  selectedOrganizationCount: number;
  selectedOrganizationIds: string[];
};

type ScrapeDraft = {
  delayMs: string;
  duplicateStrategy: FilemakerJobBoardDuplicateStrategy;
  extractDescriptions: boolean;
  extractSalaries: boolean;
  humanizeMouse: boolean;
  importStrategy: FilemakerJobBoardImportStrategy;
  maxOffers: string;
  maxPages: string;
  minimumMatchConfidence: string;
  organizationScope: FilemakerJobBoardOrganizationScope;
  personaId: string;
  provider: FilemakerJobBoardScrapeProvider;
  sourceUrl: string;
  status: FilemakerJobListingStatus;
  timeoutMs: string;
};

type ScrapeModalInitialState = {
  draft: ScrapeDraft;
  organizationScopeTouched: boolean;
};

type ActiveScrapeRequest = {
  controller: AbortController;
  id: number;
};

const SCRAPE_DRAFT_SETTINGS_KEYS = [
  'delayMs',
  'duplicateStrategy',
  'extractDescriptions',
  'extractSalaries',
  'humanizeMouse',
  'importStrategy',
  'maxOffers',
  'maxPages',
  'minimumMatchConfidence',
  'organizationScope',
  'personaId',
  'provider',
  'sourceUrl',
  'status',
  'timeoutMs',
] as const satisfies readonly (keyof ScrapeDraft)[];

const SCRAPER_SETTINGS_STORAGE_KEY = 'filemaker.job-board-scraper.settings.v1';
const SCRAPER_SETTINGS_VERSION = 2;

const PROVIDER_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'pracuj_pl', label: 'Pracuj.pl' },
  { value: 'justjoin_it', label: 'Just Join IT' },
  { value: 'nofluffjobs', label: 'No Fluff Jobs' },
] as const;

const IMPORT_STRATEGY_OPTIONS = [
  { value: 'matched_only', label: 'Skip unmatched' },
  { value: 'create_unmatched', label: 'Create organisations' },
] as const;

const DUPLICATE_STRATEGY_OPTIONS = [
  { value: 'skip', label: 'Skip existing' },
  { value: 'update', label: 'Update existing' },
  { value: 'add', label: 'Always add' },
] as const;

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
] as const;

const toNumber = (value: string, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readStoredString = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const readStoredBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const readStoredChoice = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T => (typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback);

const areDraftSettingsEqual = (left: ScrapeDraft, right: ScrapeDraft): boolean =>
  SCRAPE_DRAFT_SETTINGS_KEYS.every((key) => left[key] === right[key]);

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: unknown; error?: unknown };
    const message = typeof body.message === 'string' ? body.message : body.error;
    return typeof message === 'string' && message.trim().length > 0
      ? message
      : `Job-board scrape failed (${response.status}).`;
  } catch {
    return `Job-board scrape failed (${response.status}).`;
  }
};

const buildRequest = (
  draft: ScrapeDraft,
  mode: FilemakerJobBoardScrapeMode,
  selectedOrganizationIds: string[]
): FilemakerJobBoardScrapeRequest => ({
  delayMs: toNumber(draft.delayMs, 750),
  duplicateStrategy: draft.duplicateStrategy,
  extractDescriptions: draft.extractDescriptions,
  extractSalaries: draft.extractSalaries,
  headless: null,
  humanizeMouse: draft.humanizeMouse,
  importStrategy: draft.importStrategy,
  maxOffers: toNumber(draft.maxOffers, 25),
  maxPages: toNumber(draft.maxPages, 2),
  minimumMatchConfidence: toNumber(draft.minimumMatchConfidence, 85),
  mode,
  organizationScope: draft.organizationScope,
  personaId: draft.personaId.trim().length > 0 ? draft.personaId.trim() : null,
  provider: draft.provider,
  selectedOrganizationIds: draft.organizationScope === 'selected' ? selectedOrganizationIds : [],
  sourceUrl: draft.sourceUrl.trim(),
  status: draft.status,
  timeoutMs: toNumber(draft.timeoutMs, 180_000),
});

const postScrapeRequest = async (
  draft: ScrapeDraft,
  mode: FilemakerJobBoardScrapeMode,
  selectedOrganizationIds: string[],
  signal: AbortSignal
): Promise<FilemakerJobBoardScrapeResponse> => {
  const response = await fetch(FILEMAKER_JOB_BOARD_SCRAPE_ENDPOINT, {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(buildRequest(draft, mode, selectedOrganizationIds)),
    signal,
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return (await response.json()) as FilemakerJobBoardScrapeResponse;
};

const resultMessage = (result: FilemakerJobBoardScrapeResponse): string => {
  if (result.mode === 'preview') {
    return `Preview found ${result.summary.scrapedOffers} offer${result.summary.scrapedOffers === 1 ? '' : 's'} and ${result.summary.matchedOffers} match${result.summary.matchedOffers === 1 ? '' : 'es'}.`;
  }
  return `Imported ${result.summary.createdListings} created, ${result.summary.updatedListings} updated, ${result.summary.skippedOffers} skipped.`;
};

const formatActionUpdatedAt = (value: string): string | null => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
};

const defaultDraft = (selectedOrganizationCount: number): ScrapeDraft => ({
  delayMs: '750',
  duplicateStrategy: 'skip',
  extractDescriptions: true,
  extractSalaries: true,
  humanizeMouse: true,
  importStrategy: 'create_unmatched',
  maxOffers: '25',
  maxPages: '2',
  minimumMatchConfidence: '85',
  organizationScope: selectedOrganizationCount > 0 ? 'selected' : 'all',
  personaId: '',
  provider: 'auto',
  sourceUrl: '',
  status: 'open',
  timeoutMs: '180000',
});

const normalizeSavedDraft = (
  value: unknown,
  selectedOrganizationCount: number
): ScrapeDraft | null => {
  if (!isRecord(value) || value['version'] !== SCRAPER_SETTINGS_VERSION || !isRecord(value['draft'])) {
    return null;
  }
  const saved = value['draft'];
  const fallback = defaultDraft(selectedOrganizationCount);
  const organizationScope = readStoredChoice(
    saved['organizationScope'],
    ['selected', 'all'] as const,
    fallback.organizationScope
  );

  return {
    delayMs: readStoredString(saved['delayMs'], fallback.delayMs),
    duplicateStrategy: readStoredChoice(
      saved['duplicateStrategy'],
      DUPLICATE_STRATEGY_OPTIONS.map((option) => option.value),
      fallback.duplicateStrategy
    ),
    extractDescriptions: readStoredBoolean(saved['extractDescriptions'], fallback.extractDescriptions),
    extractSalaries: readStoredBoolean(saved['extractSalaries'], fallback.extractSalaries),
    humanizeMouse: readStoredBoolean(saved['humanizeMouse'], fallback.humanizeMouse),
    importStrategy: readStoredChoice(
      saved['importStrategy'],
      IMPORT_STRATEGY_OPTIONS.map((option) => option.value),
      fallback.importStrategy
    ),
    maxOffers: readStoredString(saved['maxOffers'], fallback.maxOffers),
    maxPages: readStoredString(saved['maxPages'], fallback.maxPages),
    minimumMatchConfidence: readStoredString(
      saved['minimumMatchConfidence'],
      fallback.minimumMatchConfidence
    ),
    organizationScope:
      selectedOrganizationCount === 0 && organizationScope === 'selected' ? 'all' : organizationScope,
    personaId: readStoredString(saved['personaId'], fallback.personaId),
    provider: readStoredChoice(
      saved['provider'],
      PROVIDER_OPTIONS.map((option) => option.value),
      fallback.provider
    ),
    sourceUrl: readStoredString(saved['sourceUrl'], fallback.sourceUrl),
    status: readStoredChoice(
      saved['status'],
      STATUS_OPTIONS.map((option) => option.value),
      fallback.status
    ),
    timeoutMs: readStoredString(saved['timeoutMs'], fallback.timeoutMs),
  };
};

const readSavedDraft = (selectedOrganizationCount: number): ScrapeDraft | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SCRAPER_SETTINGS_STORAGE_KEY);
    return raw !== null ? normalizeSavedDraft(JSON.parse(raw), selectedOrganizationCount) : null;
  } catch {
    return null;
  }
};

const writeSavedDraft = (draft: ScrapeDraft): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(
      SCRAPER_SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: SCRAPER_SETTINGS_VERSION, draft })
    );
    return true;
  } catch {
    return false;
  }
};

const createInitialState = (selectedOrganizationCount: number): ScrapeModalInitialState => {
  const savedDraft = readSavedDraft(selectedOrganizationCount);
  return savedDraft
    ? { draft: savedDraft, organizationScopeTouched: true }
    : { draft: defaultDraft(selectedOrganizationCount), organizationScopeTouched: false };
};

export function FilemakerJobBoardScrapeModal(
  props: FilemakerJobBoardScrapeModalProps
): React.JSX.Element | null {
  const { toast } = useToast();
  const browserMode = useJobBoardScrapeBrowserModeSetting(props.open);
  const [initialState] = useState(() => createInitialState(props.selectedOrganizationCount));
  const [draft, setDraft] = useState<ScrapeDraft>(initialState.draft);
  const [savedDraftBaseline, setSavedDraftBaseline] = useState<ScrapeDraft>(initialState.draft);
  const [organizationScopeTouched, setOrganizationScopeTouched] = useState(
    initialState.organizationScopeTouched
  );
  const [modeInFlight, setModeInFlight] = useState<FilemakerJobBoardScrapeMode | null>(null);
  const [result, setResult] = useState<FilemakerJobBoardScrapeResponse | null>(null);
  const activeRequestRef = useRef<ActiveScrapeRequest | null>(null);
  const requestIdRef = useRef(0);
  const selectedScopeDisabled = props.selectedOrganizationCount === 0;
  const isRunning = modeInFlight !== null;
  const isSavingRuntimeSettings = browserMode.isSaving;
  const sourceUrlMissing = draft.sourceUrl.trim().length === 0;
  const hasDraftUnsavedChanges = useMemo(
    () => !areDraftSettingsEqual(draft, savedDraftBaseline),
    [draft, savedDraftBaseline]
  );
  const hasSettingsUnsavedChanges = hasDraftUnsavedChanges || browserMode.hasUnsavedChanges;
  const actionUpdatedAt =
    browserMode.action !== null ? formatActionUpdatedAt(browserMode.action.updatedAt) : null;

  useEffect(() => {
    if (!props.open) return;
    setDraft((current) => {
      if (props.selectedOrganizationCount === 0 && current.organizationScope === 'selected') {
        return { ...current, organizationScope: 'all' };
      }
      if (
        !organizationScopeTouched &&
        props.selectedOrganizationCount > 0 &&
        current.organizationScope === 'all'
      ) {
        return { ...current, organizationScope: 'selected' };
      }
      return current;
    });
  }, [organizationScopeTouched, props.open, props.selectedOrganizationCount]);

  useEffect(
    () => () => {
      activeRequestRef.current?.controller.abort();
      activeRequestRef.current = null;
    },
    []
  );

  const organizationScopeOptions = useMemo(
    () => [
      {
        value: 'selected',
        label: `Selected (${props.selectedOrganizationCount})`,
        disabled: selectedScopeDisabled,
      },
      { value: 'all', label: 'All organisations' },
    ],
    [props.selectedOrganizationCount, selectedScopeDisabled]
  );

  const updateDraft = <K extends keyof ScrapeDraft>(key: K, value: ScrapeDraft[K]): void => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveSettings = async (): Promise<void> => {
    if (!hasSettingsUnsavedChanges) return;
    try {
      const saved = hasDraftUnsavedChanges ? writeSavedDraft(draft) : true;
      if (saved) {
        setSavedDraftBaseline(draft);
      }
      await browserMode.persist();
      toast(saved ? 'Scraper settings saved.' : 'Failed to save scraper settings.', {
        variant: saved ? 'success' : 'error',
      });
    } catch (error) {
      toast(extractMutationErrorMessage(error, 'Failed to save scraper settings.'), {
        variant: 'error',
      });
    }
  };

  const stopScrape = (): void => {
    const activeRequest = activeRequestRef.current;
    if (activeRequest === null) return;
    activeRequest.controller.abort();
    activeRequestRef.current = null;
    setModeInFlight(null);
    toast('Job-board scrape stopped.', { variant: 'default' });
  };

  const startScrapeRequest = (): ActiveScrapeRequest | null => {
    if (activeRequestRef.current !== null) return null;
    const request: ActiveScrapeRequest = {
      controller: new AbortController(),
      id: requestIdRef.current + 1,
    };
    requestIdRef.current = request.id;
    activeRequestRef.current = request;
    return request;
  };

  const isActiveScrapeRequest = (request: ActiveScrapeRequest): boolean =>
    activeRequestRef.current !== null &&
    activeRequestRef.current.id === request.id &&
    !request.controller.signal.aborted;

  const finishScrapeRequest = (request: ActiveScrapeRequest): void => {
    if (activeRequestRef.current?.id !== request.id) return;
    activeRequestRef.current = null;
    setModeInFlight(null);
  };

  const handleScrapeSuccess = (
    nextResult: FilemakerJobBoardScrapeResponse,
    mode: FilemakerJobBoardScrapeMode
  ): void => {
    setResult(nextResult);
    toast(resultMessage(nextResult), {
      variant: mode === 'import' ? 'success' : 'default',
    });
    if (mode === 'import') {
      props.onCompleted();
    }
  };

  const runScrape = async (mode: FilemakerJobBoardScrapeMode): Promise<void> => {
    if (sourceUrlMissing) {
      toast('Provide a supported job-board category or offer link.', { variant: 'error' });
      return;
    }
    const request = startScrapeRequest();
    if (request === null) return;
    setModeInFlight(mode);
    try {
      await browserMode.persist();
      const nextResult = await postScrapeRequest(draft, mode, props.selectedOrganizationIds, request.controller.signal);
      if (isActiveScrapeRequest(request)) handleScrapeSuccess(nextResult, mode);
    } catch (error) {
      if (isAbortLikeError(error, request.controller.signal)) return;
      toast(error instanceof Error ? error.message : 'Job-board scrape failed.', {
        variant: 'error',
      });
    } finally {
      finishScrapeRequest(request);
    }
  };

  const closeModal = (): void => {
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;
    setModeInFlight(null);
    props.onClose();
  };

  return (
    <FormModal
      open={props.open}
      onClose={closeModal}
      title='Job Board Scraper'
      subtitle='Centralized through the Job Board Playwright sequencer.'
      onSave={() => {
        void runScrape('preview');
      }}
      saveText='Preview'
      saveIcon={<Search className='h-4 w-4' />}
      isSaving={isRunning || isSavingRuntimeSettings}
      isSaveDisabled={sourceUrlMissing || isRunning || isSavingRuntimeSettings}
      size='xl'
      actions={
        <div className='flex flex-wrap items-center gap-2'>
          {isRunning ? (
            <Button
              type='button'
              variant='warning'
              size='sm'
              onClick={stopScrape}
            >
              <Square className='h-4 w-4' />
              Stop
            </Button>
          ) : null}
          <Button
            type='button'
            size='sm'
            onClick={() => {
              void saveSettings();
            }}
            disabled={!hasSettingsUnsavedChanges || isRunning || isSavingRuntimeSettings}
            variant={hasSettingsUnsavedChanges ? 'success' : 'outline'}
          >
            <Save className='h-4 w-4' />
            {isSavingRuntimeSettings ? 'Saving...' : 'Save settings'}
          </Button>
          <Button
            type='button'
            variant='success'
            size='sm'
            onClick={() => {
              void runScrape('import');
            }}
            disabled={sourceUrlMissing || isRunning || isSavingRuntimeSettings}
          >
            <Play className='h-4 w-4' />
            {modeInFlight === 'import' ? 'Importing...' : 'Import'}
          </Button>
        </div>
      }
    >
      <div className='space-y-5'>
        <FormField label='Job board link' required>
          <Input
            value={draft.sourceUrl}
            onChange={(event) => updateDraft('sourceUrl', event.target.value)}
            placeholder='https://www.pracuj.pl/praca/... or https://justjoin.it/...'
          />
        </FormField>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <FormField label='Provider'>
            <SelectSimple
              ariaLabel='Provider'
              value={draft.provider}
              options={PROVIDER_OPTIONS}
              onValueChange={(value) => updateDraft('provider', value as FilemakerJobBoardScrapeProvider)}
            />
          </FormField>
          <FormField label='Organisation scope'>
            <SelectSimple
              ariaLabel='Organisation scope'
              value={draft.organizationScope}
              options={organizationScopeOptions}
              onValueChange={(value) => {
                setOrganizationScopeTouched(true);
                updateDraft('organizationScope', value as FilemakerJobBoardOrganizationScope);
              }}
            />
          </FormField>
          <FormField label='Unmatched employers'>
            <SelectSimple
              ariaLabel='Unmatched employers'
              value={draft.importStrategy}
              options={IMPORT_STRATEGY_OPTIONS}
              onValueChange={(value) => updateDraft('importStrategy', value as FilemakerJobBoardImportStrategy)}
            />
          </FormField>
          <FormField label='Duplicates'>
            <SelectSimple
              ariaLabel='Duplicates'
              value={draft.duplicateStrategy}
              options={DUPLICATE_STRATEGY_OPTIONS}
              onValueChange={(value) =>
                updateDraft('duplicateStrategy', value as FilemakerJobBoardDuplicateStrategy)
              }
            />
          </FormField>
        </div>

        {browserMode.action !== null ? (
          <div className='rounded-md border border-border/60 bg-muted/10 p-3'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='min-w-0 space-y-1'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
                  Connected scraping action
                </p>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='text-sm font-medium'>{browserMode.action.name}</span>
                  <Badge variant='secondary'>{browserMode.action.runtimeKey}</Badge>
                  {browserMode.action.isSeedFallback ? (
                    <Badge variant='outline'>Seed default</Badge>
                  ) : (
                    <Badge variant='success'>Saved action</Badge>
                  )}
                </div>
                {browserMode.action.description !== null ? (
                  <p className='max-w-3xl text-xs text-muted-foreground'>
                    {browserMode.action.description}
                  </p>
                ) : null}
              </div>
              <Badge variant='secondary'>{browserMode.action.browserModeLabel}</Badge>
            </div>
            <div className='mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
              <span>Action ID: {browserMode.action.id}</span>
              <span>
                Steps: {browserMode.action.enabledStepCount}/{browserMode.action.totalStepCount}
              </span>
              {actionUpdatedAt !== null ? <span>Updated: {actionUpdatedAt}</span> : null}
            </div>
          </div>
        ) : null}

        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <FormField label='Max pages'>
            <Input
              type='number'
              min={1}
              max={20}
              value={draft.maxPages}
              onChange={(event) => updateDraft('maxPages', event.target.value)}
            />
          </FormField>
          <FormField label='Max offers'>
            <Input
              type='number'
              min={1}
              max={250}
              value={draft.maxOffers}
              onChange={(event) => updateDraft('maxOffers', event.target.value)}
            />
          </FormField>
          <FormField label='Match confidence'>
            <Input
              type='number'
              min={50}
              max={100}
              value={draft.minimumMatchConfidence}
              onChange={(event) => updateDraft('minimumMatchConfidence', event.target.value)}
            />
          </FormField>
          <FormField label='Status'>
            <SelectSimple
              ariaLabel='Status'
              value={draft.status}
              options={STATUS_OPTIONS}
              onValueChange={(value) => updateDraft('status', value as FilemakerJobListingStatus)}
            />
          </FormField>
        </div>

        <div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
          <ToggleRow
            label={browserMode.headless ? 'Headless browser' : 'Headed browser'}
            description='Backed by Job Board Offer Scrape action settings.'
            checked={browserMode.headless}
            onCheckedChange={browserMode.setHeadless}
            disabled={isRunning}
            loading={browserMode.isLoading || isSavingRuntimeSettings}
            variant='switch'
            toggleOnRowClick
          />
          <ToggleRow
            label='Humanized input'
            description='Use persona pacing and mouse movement.'
            checked={draft.humanizeMouse}
            onCheckedChange={(checked) => updateDraft('humanizeMouse', checked)}
            variant='switch'
            toggleOnRowClick
          />
          <ToggleRow
            label='Descriptions'
            description='Store extracted offer descriptions.'
            checked={draft.extractDescriptions}
            onCheckedChange={(checked) => updateDraft('extractDescriptions', checked)}
            variant='switch'
            toggleOnRowClick
          />
          <ToggleRow
            label='Salaries'
            description='Store extracted salary ranges.'
            checked={draft.extractSalaries}
            onCheckedChange={(checked) => updateDraft('extractSalaries', checked)}
            variant='switch'
            toggleOnRowClick
          />
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <FormField label='Persona ID'>
            <Input
              value={draft.personaId}
              onChange={(event) => updateDraft('personaId', event.target.value)}
              placeholder='default persona'
            />
          </FormField>
          <FormField label='Delay ms'>
            <Input
              type='number'
              min={0}
              max={10000}
              value={draft.delayMs}
              onChange={(event) => updateDraft('delayMs', event.target.value)}
            />
          </FormField>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <FormField label='Timeout ms'>
            <Input
              type='number'
              min={30000}
              max={600000}
              value={draft.timeoutMs}
              onChange={(event) => updateDraft('timeoutMs', event.target.value)}
            />
          </FormField>
        </div>

        {result ? (
          <div className='space-y-3 rounded-md border border-border/60 p-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='secondary'>{result.browserMode}</Badge>
              <Badge variant='secondary'>{result.sourceSite}</Badge>
              <Badge variant='secondary'>{result.mode}</Badge>
              <Badge variant='secondary'>{result.summary.scrapedOffers} offers</Badge>
              <Badge variant='secondary'>{result.summary.matchedOffers} matched</Badge>
              <Badge variant='secondary'>{result.summary.createdListings} created</Badge>
              <Badge variant='secondary'>{result.summary.updatedListings} updated</Badge>
            </div>
            <div className='max-h-56 space-y-2 overflow-auto pr-1'>
              {result.offers.slice(0, 12).map((item) => (
                <div
                  key={`${item.offer.sourceUrl}-${item.status}`}
                  className='rounded border border-border/40 px-3 py-2'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <span className='font-medium'>{item.offer.title}</span>
                    <Badge variant={item.match ? 'success' : 'secondary'}>{item.status}</Badge>
                  </div>
                  <div className='mt-1 text-xs text-muted-foreground'>
                    {item.offer.companyName}
                    {item.match ? ` -> ${item.match.organizationName}` : ''}
                    {item.offer.sourceSite.length > 0 ? ` · ${item.offer.sourceSite}` : ''}
                  </div>
                </div>
              ))}
            </div>
            {result.warnings.length > 0 ? (
              <div className='space-y-1 text-xs text-amber-300'>
                {result.warnings.slice(0, 3).map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </FormModal>
  );
}
