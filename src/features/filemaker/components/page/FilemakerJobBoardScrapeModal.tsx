'use client';
/* eslint-disable max-lines, max-lines-per-function, complexity */

import { Play, Save, Search, Square } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  FILEMAKER_JOB_BOARD_SCRAPE_ENDPOINT,
  type FilemakerJobBoardScrapeProvider,
  type FilemakerJobBoardScrapeDraftSaveRequest,
  type FilemakerJobBoardDuplicateStrategy,
  type FilemakerJobBoardImportStrategy,
  type FilemakerJobBoardOrganizationScope,
  type FilemakerJobBoardScrapeExtractionPath,
  type FilemakerJobBoardScrapeLiveEvent,
  type FilemakerJobBoardScrapeMode,
  type FilemakerJobBoardScrapeOfferResult,
  type FilemakerJobBoardScrapeRequest,
  type FilemakerJobBoardScrapeResponse,
  type FilemakerJobBoardScrapeRuntimeRun,
  type FilemakerJobBoardScrapeRuntimeSnapshot,
  type FilemakerJobBoardScrapeRuntimeStatus,
  type FilemakerJobBoardScrapeWriteResult,
  type FilemakerJobBoardScrapedOffer,
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
  extractionPath: FilemakerJobBoardScrapeExtractionPath;
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

type LivePreviewState = {
  discoveredUrls: string[];
  final: boolean;
  messages: string[];
  offers: FilemakerJobBoardScrapeOfferResult[];
  warnings: string[];
  writes: FilemakerJobBoardScrapeWriteResult[];
};

const SCRAPE_DRAFT_SETTINGS_KEYS = [
  'delayMs',
  'duplicateStrategy',
  'extractDescriptions',
  'extractSalaries',
  'extractionPath',
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
const SCRAPER_SETTINGS_VERSION = 3;
const SCRAPER_ACTIVE_RUN_STORAGE_KEY = 'filemaker.job-board-scraper.active-run-id.v1';
const RUNTIME_RUN_POLL_INTERVAL_MS = 1000;

const jobBoardScrapeRunEndpoint = (runId: string): string =>
  `${FILEMAKER_JOB_BOARD_SCRAPE_ENDPOINT}/runs/${encodeURIComponent(runId)}`;

const JOB_BOARD_SCRAPE_LATEST_RUN_ENDPOINT =
  `${FILEMAKER_JOB_BOARD_SCRAPE_ENDPOINT}/runs/latest`;

const jobBoardScrapeRunCancelEndpoint = (runId: string): string =>
  `${jobBoardScrapeRunEndpoint(runId)}/cancel`;

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
  { value: 'update', label: 'Update existing' },
  { value: 'skip', label: 'Skip existing' },
  { value: 'add', label: 'Always add' },
] as const;

const EXTRACTION_PATH_OPTIONS = [
  { value: 'playwright_ai', label: 'Playwright screenshot + AI' },
  { value: 'deterministic', label: 'Deterministic path' },
  {
    value: 'deterministic_then_playwright',
    label: 'Both: deterministic first, Playwright fallback',
  },
] as const;

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
] as const;

const createEmptyLivePreviewState = (): LivePreviewState => ({
  discoveredUrls: [],
  final: false,
  messages: [],
  offers: [],
  warnings: [],
  writes: [],
});

type LivePreviewStatusLabel = 'Finished' | 'Ready' | 'Running';

type PostScrapeRequestInput = {
  draft: ScrapeDraft;
  mode: FilemakerJobBoardScrapeMode;
  onEvent: (event: FilemakerJobBoardScrapeLiveEvent) => void;
  onRunId?: (runId: string) => void;
  selectedOrganizationIds: string[];
  signal: AbortSignal;
};

type PostSaveDraftsRequestInput = {
  draft: ScrapeDraft;
  offers: FilemakerJobBoardScrapedOffer[];
  selectedOrganizationIds: string[];
};

const resolveLivePreviewStatusLabel = (
  livePreview: LivePreviewState,
  isRunning: boolean
): LivePreviewStatusLabel => {
  if (livePreview.final) return 'Finished';
  if (isRunning) return 'Running';
  return 'Ready';
};

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

const responseError = async (response: Response, fallback: string): Promise<Error> => {
  const message = await readErrorMessage(response);
  const error = new Error(message.length > 0 ? message : fallback);
  (error as Error & { status?: number }).status = response.status;
  return error;
};

const isNotFoundResponseError = (error: unknown): boolean =>
  error instanceof Error && (error as Error & { status?: number }).status === 404;

const buildRequest = (
  draft: ScrapeDraft,
  mode: FilemakerJobBoardScrapeMode,
  selectedOrganizationIds: string[]
): FilemakerJobBoardScrapeRequest => ({
  delayMs: toNumber(draft.delayMs, 750),
  duplicateStrategy: draft.duplicateStrategy,
  extractDescriptions: draft.extractDescriptions,
  extractSalaries: draft.extractSalaries,
  extractionPath: draft.extractionPath,
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

const buildDraftSaveRequest = (
  draft: ScrapeDraft,
  selectedOrganizationIds: string[],
  offers: FilemakerJobBoardScrapedOffer[]
): FilemakerJobBoardScrapeDraftSaveRequest => {
  const request = buildRequest(draft, 'import', selectedOrganizationIds);
  return {
    action: 'save_drafts',
    duplicateStrategy: request.duplicateStrategy,
    importStrategy: request.importStrategy,
    minimumMatchConfidence: request.minimumMatchConfidence,
    offers,
    organizationScope: request.organizationScope,
    provider: request.provider,
    selectedOrganizationIds: request.selectedOrganizationIds,
    sourceUrl: request.sourceUrl,
    status: request.status,
  };
};

const appendCapped = (items: string[], next: string, maxItems = 8): string[] =>
  [...items, next].slice(-maxItems);

const mergeLiveOffer = (
  offers: FilemakerJobBoardScrapeOfferResult[],
  next: FilemakerJobBoardScrapeOfferResult
): FilemakerJobBoardScrapeOfferResult[] => {
  const index = offers.findIndex((item) => item.offer.sourceUrl === next.offer.sourceUrl);
  if (index < 0) return [...offers, next];
  return offers.map((item, itemIndex) => (itemIndex === index ? next : item));
};

const mergeLiveOffers = (
  offers: FilemakerJobBoardScrapeOfferResult[],
  nextOffers: FilemakerJobBoardScrapeOfferResult[]
): FilemakerJobBoardScrapeOfferResult[] =>
  nextOffers.reduce(
    (current, nextOffer) => mergeLiveOffer(current, nextOffer),
    offers
  );

const formatOfferStatus = (status: FilemakerJobBoardScrapeOfferResult['status']): string =>
  status === 'preview' ? 'not saved' : status;

const formatWriteAction = (write: FilemakerJobBoardScrapeWriteResult): string => {
  if (write.action === 'organization_address_updated') return 'Organisation address updated';
  if (write.action === 'organization_created') return 'Organisation created';
  if (write.action === 'organization_linked') return 'Organisation linked';
  if (write.action === 'organization_profile_updated') return 'Company profile updated';
  if (write.action === 'listing_lexicon_linked') return 'Lexicon terms linked';
  if (write.action === 'listing_created') return 'Listing created';
  if (write.action === 'listing_updated') return 'Listing updated';
  if (write.action === 'listing_skipped') return 'Listing skipped';
  return 'Unmatched offer';
};

const EMPTY_SCRAPE_SUMMARY: FilemakerJobBoardScrapeResponse['summary'] = {
  addressUpdates: 0,
  createdLexiconTerms: 0,
  createdListings: 0,
  createdOrganizations: 0,
  linkedLexiconTerms: 0,
  matchedOffers: 0,
  profileUpdates: 0,
  scrapedOffers: 0,
  skippedOffers: 0,
  unmatchedOffers: 0,
  updatedListings: 0,
  updatedOrganizations: 0,
  verifiedListings: 0,
};

const readString = (value: unknown): string => (typeof value === 'string' ? value : '');

const readNullableString = (value: unknown): string | null => {
  const normalized = readString(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRuntimeStatus = (value: unknown): FilemakerJobBoardScrapeRuntimeStatus =>
  value === 'running' ||
  value === 'completed' ||
  value === 'failed' ||
  value === 'canceled'
    ? value
    : 'queued';

const isRuntimeRunActive = (run: FilemakerJobBoardScrapeRuntimeRun | null): boolean =>
  run !== null && (run.status === 'queued' || run.status === 'running');

const readNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const readStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const normalizeOfferStatus = (value: unknown): FilemakerJobBoardScrapeOfferResult['status'] =>
  value === 'created' ||
  value === 'preview' ||
  value === 'skipped' ||
  value === 'unmatched' ||
  value === 'updated'
    ? value
    : 'preview';

const normalizeSalaryPeriod = (
  value: unknown
): FilemakerJobBoardScrapeOfferResult['offer']['salaryPeriod'] =>
  value === 'fixed' || value === 'hourly' || value === 'monthly' || value === 'yearly'
    ? value
    : 'monthly';

const normalizePillCategory = (
  value: unknown
): FilemakerJobBoardScrapeOfferResult['offer']['pills'][number]['category'] =>
  (typeof value === 'string' && value.trim().length > 0
    ? value
    : 'other') as FilemakerJobBoardScrapeOfferResult['offer']['pills'][number]['category'];

const normalizeOfferPills = (
  value: unknown
): FilemakerJobBoardScrapeOfferResult['offer']['pills'] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const label = readString(item['label']).trim();
    if (label.length === 0) return [];
    const position = item['position'];
    return [
      {
        category: normalizePillCategory(item['category']),
        label,
        position: typeof position === 'number' && Number.isFinite(position) ? position : index,
        sourceSite: readString(item['sourceSite']),
        sourceUrl: readString(item['sourceUrl']),
      },
    ];
  });
};

const normalizeOfferMatch = (
  value: unknown
): FilemakerJobBoardScrapeOfferResult['match'] => {
  if (!isRecord(value)) return null;
  const organizationId = readString(value['organizationId']);
  const organizationName = readString(value['organizationName']);
  if (organizationId.length === 0 && organizationName.length === 0) return null;
  return {
    confidence: readNumber(value['confidence']),
    organizationId,
    organizationName: organizationName.length > 0 ? organizationName : organizationId,
    reason: readString(value['reason']),
  };
};

const normalizeOfferResult = (value: unknown): FilemakerJobBoardScrapeOfferResult => {
  const record = isRecord(value) ? value : {};
  const offer = isRecord(record['offer']) ? record['offer'] : {};
  return {
    listingId: readNullableString(record['listingId']),
    match: normalizeOfferMatch(record['match']),
    offer: {
      companyName: readString(offer['companyName']),
      companyProfile: readString(offer['companyProfile']),
      companyProfileUrl: readNullableString(offer['companyProfileUrl']),
      description: readString(offer['description']),
      expiresAt: readNullableString(offer['expiresAt']),
      location: readString(offer['location']),
      pills: normalizeOfferPills(offer['pills']),
      postedAt: readNullableString(offer['postedAt']),
      salaryCurrency: readNullableString(offer['salaryCurrency']),
      salaryMax: typeof offer['salaryMax'] === 'number' ? offer['salaryMax'] : null,
      salaryMin: typeof offer['salaryMin'] === 'number' ? offer['salaryMin'] : null,
      salaryPeriod: normalizeSalaryPeriod(offer['salaryPeriod']),
      salaryText: readString(offer['salaryText']),
      sourceExternalId: readNullableString(offer['sourceExternalId']),
      sourceSite: readString(offer['sourceSite']),
      sourceUrl: readString(offer['sourceUrl']),
      title: readString(offer['title']),
    },
    reason: readNullableString(record['reason']),
    status: normalizeOfferStatus(record['status']),
  };
};

const normalizeScrapeSummary = (value: unknown): FilemakerJobBoardScrapeResponse['summary'] => {
  const summary = isRecord(value) ? value : {};
  return {
    addressUpdates: readNumber(summary['addressUpdates']),
    createdLexiconTerms: readNumber(summary['createdLexiconTerms']),
    createdListings: readNumber(summary['createdListings']),
    createdOrganizations: readNumber(summary['createdOrganizations']),
    linkedLexiconTerms: readNumber(summary['linkedLexiconTerms']),
    matchedOffers: readNumber(summary['matchedOffers']),
    profileUpdates: readNumber(summary['profileUpdates']),
    scrapedOffers: readNumber(summary['scrapedOffers']),
    skippedOffers: readNumber(summary['skippedOffers']),
    unmatchedOffers: readNumber(summary['unmatchedOffers']),
    updatedListings: readNumber(summary['updatedListings']),
    updatedOrganizations: readNumber(summary['updatedOrganizations']),
    verifiedListings: readNumber(summary['verifiedListings']),
  };
};

const normalizeScrapeResponse = (value: unknown): FilemakerJobBoardScrapeResponse => {
  const record = isRecord(value) ? value : {};
  return {
    browserMode: record['browserMode'] === 'headed' ? 'headed' : 'headless',
    mode: record['mode'] === 'import' ? 'import' : 'preview',
    offers: Array.isArray(record['offers']) ? record['offers'].map(normalizeOfferResult) : [],
    provider:
      record['provider'] === 'justjoin_it' || record['provider'] === 'nofluffjobs'
        ? record['provider']
        : 'pracuj_pl',
    runId: readNullableString(record['runId']),
    sourceSite: readString(record['sourceSite']),
    sourceUrl: readString(record['sourceUrl']),
    summary: {
      ...EMPTY_SCRAPE_SUMMARY,
      ...normalizeScrapeSummary(record['summary']),
    },
    warnings: readStringArray(record['warnings']),
  };
};

const normalizeRuntimeRun = (value: unknown): FilemakerJobBoardScrapeRuntimeRun | null => {
  if (!isRecord(value)) return null;
  const id = readString(value['id']).trim();
  if (id.length === 0) return null;
  const result = value['result'];
  return {
    completedAt: readNullableString(value['completedAt']),
    createdAt: readString(value['createdAt']),
    error: readNullableString(value['error']),
    id,
    mode: value['mode'] === 'import' ? 'import' : 'preview',
    result: isRecord(result) ? normalizeScrapeResponse(result) : null,
    sourceUrl: readString(value['sourceUrl']),
    startedAt: readNullableString(value['startedAt']),
    status: normalizeRuntimeStatus(value['status']),
    updatedAt: readString(value['updatedAt']),
  };
};

const normalizeRuntimeSnapshot = (
  value: unknown
): FilemakerJobBoardScrapeRuntimeSnapshot => {
  const record = isRecord(value) ? value : {};
  return {
    events: Array.isArray(record['events'])
      ? record['events'].filter(
          (event): event is FilemakerJobBoardScrapeLiveEvent =>
            isRecord(event) && typeof event['type'] === 'string'
        )
      : [],
    run: normalizeRuntimeRun(record['run']),
  };
};

const normalizeWriteResult = (value: unknown): FilemakerJobBoardScrapeWriteResult | null => {
  if (!isRecord(value)) return null;
  const action = readString(value['action']);
  return {
    action: action as FilemakerJobBoardScrapeWriteResult['action'],
    message: readString(value['message']),
    profileUpdated: value['profileUpdated'] === true,
    result: normalizeOfferResult(value['result']),
  };
};

const parseLiveEventLine = (line: string): FilemakerJobBoardScrapeLiveEvent | null => {
  try {
    const value = JSON.parse(line) as unknown;
    return isRecord(value) && typeof value['type'] === 'string'
      ? (value as FilemakerJobBoardScrapeLiveEvent)
      : null;
  } catch {
    return null;
  }
};

const readStoredRuntimeRunId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(SCRAPER_ACTIVE_RUN_STORAGE_KEY);
    const normalized = value?.trim() ?? '';
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
};

const writeStoredRuntimeRunId = (runId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SCRAPER_ACTIVE_RUN_STORAGE_KEY, runId);
  } catch {
    // Best-effort continuity; the Redis runtime remains authoritative.
  }
};

const removeStoredRuntimeRunId = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SCRAPER_ACTIVE_RUN_STORAGE_KEY);
  } catch {
    // Best-effort cleanup only.
  }
};

const buildClientRuntimeRun = (
  runId: string,
  draft: ScrapeDraft,
  mode: FilemakerJobBoardScrapeMode
): FilemakerJobBoardScrapeRuntimeRun => {
  const timestamp = new Date().toISOString();
  return {
    completedAt: null,
    createdAt: timestamp,
    error: null,
    id: runId,
    mode,
    result: null,
    sourceUrl: draft.sourceUrl.trim(),
    startedAt: null,
    status: 'queued',
    updatedAt: timestamp,
  };
};

const reduceLivePreviewEvent = (
  current: LivePreviewState,
  event: FilemakerJobBoardScrapeLiveEvent
): LivePreviewState => {
  if (event.type === 'run') return current;
  if (event.type === 'done') {
    const normalizedResult = normalizeScrapeResponse(event.result);
    return {
      ...current,
      final: true,
      offers: normalizedResult.offers,
      warnings: normalizedResult.warnings,
    };
  }
  if (event.type === 'status') {
    return { ...current, messages: appendCapped(current.messages, readString(event.message)) };
  }
  if (event.type === 'links') {
    const urls = readStringArray(event.urls);
    return {
      ...current,
      discoveredUrls: urls,
      messages: appendCapped(
        current.messages,
        `Found ${urls.length} offer link${urls.length === 1 ? '' : 's'} on ${readString(event.sourceSite)}.`
      ),
    };
  }
  if (event.type === 'offer') {
    const offerResult = normalizeOfferResult(event.result);
    const offerTitle = offerResult.offer.title.trim();
    const offerSourceUrl = offerResult.offer.sourceUrl.trim();
    let offerLabel = 'job-board offer';
    if (offerSourceUrl.length > 0) offerLabel = offerSourceUrl;
    if (offerTitle.length > 0) offerLabel = offerTitle;
    return {
      ...current,
      offers: mergeLiveOffer(current.offers, offerResult),
      messages: appendCapped(
        current.messages,
        `Scraped ${event.index}/${event.total}: ${offerLabel}`
      ),
    };
  }
  if (event.type === 'write') {
    const write = normalizeWriteResult(event.write);
    if (write === null) return current;
    return {
      ...current,
      messages: appendCapped(current.messages, write.message),
      writes: [...current.writes, write].slice(-16),
    };
  }
  if (event.type === 'warning') {
    return { ...current, warnings: appendCapped(current.warnings, readString(event.warning), 6) };
  }
  return { ...current, warnings: appendCapped(current.warnings, readString(event.message), 6) };
};

const buildLivePreviewFromEvents = (
  events: FilemakerJobBoardScrapeLiveEvent[]
): LivePreviewState =>
  events.reduce(reduceLivePreviewEvent, createEmptyLivePreviewState());

const fetchRuntimeSnapshot = async (
  runId: string,
  signal?: AbortSignal
): Promise<FilemakerJobBoardScrapeRuntimeSnapshot> => {
  const response = await fetch(jobBoardScrapeRunEndpoint(runId), {
    method: 'GET',
    signal,
  });
  if (!response.ok) {
    throw await responseError(response, 'Failed to load job-board scrape run.');
  }
  return normalizeRuntimeSnapshot(await response.json());
};

const fetchLatestRuntimeSnapshot = async (
  signal?: AbortSignal
): Promise<FilemakerJobBoardScrapeRuntimeSnapshot> => {
  const response = await fetch(JOB_BOARD_SCRAPE_LATEST_RUN_ENDPOINT, {
    method: 'GET',
    signal,
  });
  if (!response.ok) {
    throw await responseError(response, 'Failed to load latest job-board scrape run.');
  }
  return normalizeRuntimeSnapshot(await response.json());
};

const readLiveScrapeStream = async (
  response: Response,
  onEvent: (event: FilemakerJobBoardScrapeLiveEvent) => void
): Promise<FilemakerJobBoardScrapeResponse> => {
  const reader = response.body?.getReader();
  if (!reader) {
    return normalizeScrapeResponse(await response.json());
  }
  const decoder = new TextDecoder();
  let buffer = '';

  const handleLine = (line: string): FilemakerJobBoardScrapeResponse | null => {
    const event = parseLiveEventLine(line);
    if (event === null) return null;
    onEvent(event);
    if (event.type === 'done') {
      return normalizeScrapeResponse(event.result);
    }
    if (event.type === 'error') {
      throw new Error(event.message);
    }
    return null;
  };

  const processLine = (line: string): FilemakerJobBoardScrapeResponse | null => {
    if (line.trim().length === 0) return null;
    return handleLine(line);
  };

  const processLines = (lines: string[]): FilemakerJobBoardScrapeResponse | null => {
    let nextResult: FilemakerJobBoardScrapeResponse | null = null;
    for (const line of lines) {
      const lineResult = processLine(line);
      if (lineResult !== null) {
        nextResult = lineResult;
      }
    }
    return nextResult;
  };

  const readChunks = async (
    currentResult: FilemakerJobBoardScrapeResponse | null
  ): Promise<FilemakerJobBoardScrapeResponse | null> => {
    const chunk = await reader.read();
    if (chunk.done) return currentResult;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    return readChunks(processLines(lines) ?? currentResult);
  };

  let finalResult: FilemakerJobBoardScrapeResponse | null = null;
  try {
    finalResult = await readChunks(null);
    buffer += decoder.decode();
    finalResult = processLine(buffer) ?? finalResult;
  } finally {
    reader.releaseLock();
  }

  if (finalResult === null) {
    throw new Error('Job-board scrape stream ended without a result.');
  }
  return finalResult;
};

const postScrapeRequest = async (
  input: PostScrapeRequestInput
): Promise<FilemakerJobBoardScrapeResponse> => {
  const response = await fetch(FILEMAKER_JOB_BOARD_SCRAPE_ENDPOINT, {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      ...buildRequest(input.draft, input.mode, input.selectedOrganizationIds),
      stream: true,
    }),
    signal: input.signal,
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const runId = response.headers.get('x-filemaker-job-board-scrape-run-id')?.trim() ?? '';
  if (runId.length > 0) {
    input.onRunId?.(runId);
  }
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (contentType.includes('application/x-ndjson')) {
    return readLiveScrapeStream(response, input.onEvent);
  }
  return normalizeScrapeResponse(await response.json());
};

const postSaveDraftsRequest = async (
  input: PostSaveDraftsRequestInput
): Promise<FilemakerJobBoardScrapeResponse> => {
  const response = await fetch(FILEMAKER_JOB_BOARD_SCRAPE_ENDPOINT, {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(
      buildDraftSaveRequest(input.draft, input.selectedOrganizationIds, input.offers)
    ),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return normalizeScrapeResponse(await response.json());
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
  duplicateStrategy: 'update',
  extractDescriptions: true,
  extractSalaries: true,
  extractionPath: 'playwright_ai',
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
  if (!isRecord(value) || !isRecord(value['draft'])) {
    return null;
  }
  const version = readNumber(value['version']);
  if (version !== 2 && version !== SCRAPER_SETTINGS_VERSION) return null;
  const saved = value['draft'];
  const fallback = defaultDraft(selectedOrganizationCount);
  const organizationScope = readStoredChoice(
    saved['organizationScope'],
    ['selected', 'all'] as const,
    fallback.organizationScope
  );

  const duplicateStrategy = readStoredChoice(
    saved['duplicateStrategy'],
    DUPLICATE_STRATEGY_OPTIONS.map((option) => option.value),
    fallback.duplicateStrategy
  );

  return {
    delayMs: readStoredString(saved['delayMs'], fallback.delayMs),
    duplicateStrategy: version === 2 && duplicateStrategy === 'skip' ? 'update' : duplicateStrategy,
    extractDescriptions: readStoredBoolean(saved['extractDescriptions'], fallback.extractDescriptions),
    extractSalaries: readStoredBoolean(saved['extractSalaries'], fallback.extractSalaries),
    extractionPath: readStoredChoice(
      saved['extractionPath'],
      EXTRACTION_PATH_OPTIONS.map((option) => option.value),
      fallback.extractionPath
    ),
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
  const [saveDraftsInFlight, setSaveDraftsInFlight] = useState<string | null>(null);
  const [result, setResult] = useState<FilemakerJobBoardScrapeResponse | null>(null);
  const [activeRuntimeRun, setActiveRuntimeRun] =
    useState<FilemakerJobBoardScrapeRuntimeRun | null>(null);
  const [livePreview, setLivePreview] = useState<LivePreviewState>(() =>
    createEmptyLivePreviewState()
  );
  const activeRequestRef = useRef<ActiveScrapeRequest | null>(null);
  const notifiedRuntimeRunIdsRef = useRef<Set<string>>(new Set());
  const rehydratedRunIdRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const selectedScopeDisabled = props.selectedOrganizationCount === 0;
  const activeRuntimeRunIsRunning = isRuntimeRunActive(activeRuntimeRun);
  const isRunning = modeInFlight !== null || activeRuntimeRunIsRunning;
  const isSavingPreviewDrafts = saveDraftsInFlight !== null;
  const isSavingRuntimeSettings = browserMode.isSaving;
  const sourceUrlMissing = draft.sourceUrl.trim().length === 0;
  const hasDraftUnsavedChanges = useMemo(
    () => !areDraftSettingsEqual(draft, savedDraftBaseline),
    [draft, savedDraftBaseline]
  );
  const hasSettingsUnsavedChanges = hasDraftUnsavedChanges || browserMode.hasUnsavedChanges;
  const actionUpdatedAt =
    browserMode.action !== null ? formatActionUpdatedAt(browserMode.action.updatedAt) : null;
  const hasLivePreview =
    activeRuntimeRun !== null ||
    isRunning ||
    livePreview.discoveredUrls.length > 0 ||
    livePreview.messages.length > 0 ||
    livePreview.offers.length > 0 ||
    livePreview.warnings.length > 0 ||
    livePreview.writes.length > 0;
  const livePreviewStatusLabel = resolveLivePreviewStatusLabel(livePreview, isRunning);
  const saveablePreviewOffers = livePreview.offers.filter((item) => item.status === 'preview');
  const canSavePreviewOffers =
    saveablePreviewOffers.length > 0 &&
    !sourceUrlMissing &&
    !isRunning &&
    !isSavingPreviewDrafts &&
    !isSavingRuntimeSettings;

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

  const stopScrape = async (): Promise<void> => {
    const activeRequest = activeRequestRef.current;
    const runtimeRun = activeRuntimeRun;
    if (runtimeRun !== null && isRuntimeRunActive(runtimeRun)) {
      activeRequest?.controller.abort();
      if (activeRequest === null || activeRequestRef.current?.id === activeRequest.id) {
        activeRequestRef.current = null;
      }
      try {
        const response = await fetch(jobBoardScrapeRunCancelEndpoint(runtimeRun.id), {
          method: 'POST',
          headers: withCsrfHeaders(),
        });
        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }
        applyRuntimeSnapshot(normalizeRuntimeSnapshot(await response.json()));
        toast('Job-board scrape stopped.', { variant: 'default' });
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to stop job-board scrape.', {
          variant: 'error',
        });
      }
      return;
    }

    if (activeRequest === null) return;
    activeRequest.controller.abort();
    activeRequestRef.current = null;
    setModeInFlight(null);
    setLivePreview((current) => ({
      ...current,
      final: true,
      messages: appendCapped(current.messages, 'Scrape stopped.'),
    }));
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
    const normalizedResult = normalizeScrapeResponse(nextResult);
    if (normalizedResult.runId !== null) {
      notifiedRuntimeRunIdsRef.current.add(normalizedResult.runId);
    }
    const storedRuntimeRunId = readStoredRuntimeRunId();
    if (storedRuntimeRunId !== null) {
      notifiedRuntimeRunIdsRef.current.add(storedRuntimeRunId);
    }
    setResult(normalizedResult);
    toast(resultMessage(normalizedResult), {
      variant: mode === 'import' ? 'success' : 'default',
    });
    if (mode === 'import') {
      props.onCompleted();
    }
  };

  const notifyRuntimeCompletion = useCallback((
    run: FilemakerJobBoardScrapeRuntimeRun,
    nextResult: FilemakerJobBoardScrapeResponse
  ): void => {
    if (notifiedRuntimeRunIdsRef.current.has(run.id)) return;
    notifiedRuntimeRunIdsRef.current.add(run.id);
    toast(resultMessage(nextResult), {
      variant: run.mode === 'import' ? 'success' : 'default',
    });
    if (run.mode === 'import') {
      props.onCompleted();
    }
  }, [props.onCompleted, toast]);

  const applyRuntimeSnapshot = useCallback((
    snapshot: FilemakerJobBoardScrapeRuntimeSnapshot,
    options: { notifyCompletion?: boolean } = {}
  ): void => {
    const normalizedSnapshot = normalizeRuntimeSnapshot(snapshot);
    const run = normalizedSnapshot.run;
    setActiveRuntimeRun(run);
    if (run !== null) {
      writeStoredRuntimeRunId(run.id);
      setModeInFlight(isRuntimeRunActive(run) ? run.mode : null);
    }

    const eventPreview = buildLivePreviewFromEvents(normalizedSnapshot.events);
    const runResult = run?.result ?? null;
    if (runResult !== null) {
      const normalizedResult = normalizeScrapeResponse(runResult);
      setResult(normalizedResult);
      setLivePreview({
        ...eventPreview,
        final: !isRuntimeRunActive(run),
        offers: mergeLiveOffers(eventPreview.offers, normalizedResult.offers),
        warnings: normalizedResult.warnings,
      });
      if (
        options.notifyCompletion === true &&
        run !== null &&
        run.status === 'completed'
      ) {
        notifyRuntimeCompletion(run, normalizedResult);
      }
      return;
    }

    setLivePreview({
      ...eventPreview,
      final: eventPreview.final || (run !== null && !isRuntimeRunActive(run)),
    });
  }, [notifyRuntimeCompletion]);

  const handleDraftSaveSuccess = (nextResult: FilemakerJobBoardScrapeResponse): void => {
    const normalizedResult = normalizeScrapeResponse(nextResult);
    setResult(normalizedResult);
    setLivePreview((current) => ({
      ...current,
      final: true,
      messages: appendCapped(current.messages, resultMessage(normalizedResult)),
      offers: mergeLiveOffers(current.offers, normalizedResult.offers),
      warnings: normalizedResult.warnings,
    }));
    toast(resultMessage(normalizedResult), { variant: 'success' });
    props.onCompleted();
  };

  const savePreviewDrafts = async (
    offers: FilemakerJobBoardScrapeOfferResult[],
    inFlightKey: string
  ): Promise<void> => {
    if (offers.length === 0 || isRunning || isSavingPreviewDrafts) return;
    setSaveDraftsInFlight(inFlightKey);
    try {
      const nextResult = await postSaveDraftsRequest({
        draft,
        offers: offers.map((item) => item.offer),
        selectedOrganizationIds: props.selectedOrganizationIds,
      });
      handleDraftSaveSuccess(nextResult);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save scraped job drafts.', {
        variant: 'error',
      });
    } finally {
      setSaveDraftsInFlight(null);
    }
  };

  const handleLiveEvent = (event: FilemakerJobBoardScrapeLiveEvent): void => {
    if (event.type === 'run') {
      const run = normalizeRuntimeRun(event.run);
      if (run !== null) {
        setActiveRuntimeRun(run);
        writeStoredRuntimeRunId(run.id);
        setModeInFlight(isRuntimeRunActive(run) ? run.mode : null);
        if (run.result !== null) {
          setResult(normalizeScrapeResponse(run.result));
        }
      }
      return;
    }
    if (event.type === 'done') {
      const normalizedResult = normalizeScrapeResponse(event.result);
      setResult(normalizedResult);
    }
    setLivePreview((current) => reduceLivePreviewEvent(current, event));
  };

  const runScrape = async (mode: FilemakerJobBoardScrapeMode): Promise<void> => {
    if (sourceUrlMissing) {
      toast('Provide a supported job-board category or offer link.', { variant: 'error' });
      return;
    }
    const request = startScrapeRequest();
    if (request === null) return;
    setModeInFlight(mode);
    setResult(null);
    setActiveRuntimeRun(null);
    setLivePreview({
      ...createEmptyLivePreviewState(),
      messages: [
        mode === 'preview'
          ? 'Preview run started. Records are not written in preview mode.'
          : 'Import run started. Final statuses are written after scraping completes.',
      ],
    });
    try {
      await browserMode.persist();
      const nextResult = await postScrapeRequest({
        draft,
        mode,
        onEvent: handleLiveEvent,
        onRunId: (runId) => {
          writeStoredRuntimeRunId(runId);
          setActiveRuntimeRun(buildClientRuntimeRun(runId, draft, mode));
        },
        selectedOrganizationIds: props.selectedOrganizationIds,
        signal: request.controller.signal,
      });
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
    setSaveDraftsInFlight(null);
    props.onClose();
  };

  useEffect(() => {
    if (!props.open) {
      rehydratedRunIdRef.current = null;
      return undefined;
    }
    const runId = readStoredRuntimeRunId();
    if (runId === null || rehydratedRunIdRef.current === runId) return undefined;
    rehydratedRunIdRef.current = runId;
    const controller = new AbortController();
    fetchRuntimeSnapshot(runId, controller.signal)
      .then((snapshot) => {
        applyRuntimeSnapshot(snapshot, { notifyCompletion: true });
      })
      .catch(async (error: unknown) => {
        if (isAbortLikeError(error, controller.signal)) return;
        if (isNotFoundResponseError(error)) {
          removeStoredRuntimeRunId();
          const latestSnapshot = await fetchLatestRuntimeSnapshot(controller.signal);
          applyRuntimeSnapshot(latestSnapshot, { notifyCompletion: true });
          return;
        }
        toast(error instanceof Error ? error.message : 'Failed to load job-board scrape run.', {
          variant: 'error',
        });
      })
      .catch((error: unknown) => {
        if (isAbortLikeError(error, controller.signal)) return;
        toast(error instanceof Error ? error.message : 'Failed to load latest job-board scrape run.', {
          variant: 'error',
        });
      });
    return () => {
      controller.abort();
    };
  }, [applyRuntimeSnapshot, props.open, toast]);

  useEffect(() => {
    if (!props.open || !isRuntimeRunActive(activeRuntimeRun)) return undefined;
    if (activeRequestRef.current !== null) return undefined;
    let canceled = false;
    let timeoutId: number | null = null;
    const controller = new AbortController();

    const poll = async (): Promise<void> => {
      try {
        const snapshot = await fetchRuntimeSnapshot(activeRuntimeRun.id, controller.signal);
        if (!canceled) {
          applyRuntimeSnapshot(snapshot, { notifyCompletion: true });
        }
      } catch (error) {
        if (!canceled && !isAbortLikeError(error, controller.signal)) {
          toast(error instanceof Error ? error.message : 'Failed to refresh job-board scrape run.', {
            variant: 'error',
          });
        }
      }
      if (!canceled) {
        timeoutId = window.setTimeout(() => {
          void poll();
        }, RUNTIME_RUN_POLL_INTERVAL_MS);
      }
    };

    timeoutId = window.setTimeout(() => {
      void poll();
    }, RUNTIME_RUN_POLL_INTERVAL_MS);
    return () => {
      canceled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      controller.abort();
    };
  }, [activeRuntimeRun, applyRuntimeSnapshot, modeInFlight, props.open, toast]);

  return (
    <FormModal
      open={props.open}
      onClose={closeModal}
      title='Job Board Scraper'
      subtitle='Centralized job-board offer scraping.'
      onSave={() => {
        void runScrape('preview');
      }}
      saveText='Preview'
      saveIcon={<Search className='h-4 w-4' />}
      isSaving={isRunning || isSavingRuntimeSettings || isSavingPreviewDrafts}
      isSaveDisabled={
        sourceUrlMissing || isRunning || isSavingRuntimeSettings || isSavingPreviewDrafts
      }
      size='xl'
      actions={
        <div className='flex flex-wrap items-center gap-2'>
          {isRunning ? (
            <Button
              type='button'
              variant='warning'
              size='sm'
              onClick={() => {
                void stopScrape();
              }}
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
            disabled={
              !hasSettingsUnsavedChanges ||
              isRunning ||
              isSavingRuntimeSettings ||
              isSavingPreviewDrafts
            }
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
            disabled={sourceUrlMissing || isRunning || isSavingRuntimeSettings || isSavingPreviewDrafts}
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

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5'>
          <FormField label='Provider'>
            <SelectSimple
              ariaLabel='Provider'
              value={draft.provider}
              options={PROVIDER_OPTIONS}
              onValueChange={(value) => updateDraft('provider', value as FilemakerJobBoardScrapeProvider)}
            />
          </FormField>
          <FormField label='Scraper path'>
            <SelectSimple
              ariaLabel='Scraper path'
              value={draft.extractionPath}
              options={EXTRACTION_PATH_OPTIONS}
              onValueChange={(value) =>
                updateDraft('extractionPath', value as FilemakerJobBoardScrapeExtractionPath)
              }
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
            label='Action browser mode'
            description='Mirrors Job Board Offer Scrape action settings.'
            checked={browserMode.headless}
            onCheckedChange={browserMode.setHeadless}
            disabled={isRunning}
            loading={browserMode.isLoading || isSavingRuntimeSettings}
            variant='switch'
            toggleOnRowClick
          >
            <div className='pt-1 text-[11px] font-medium text-foreground'>
              Current: {browserMode.headless ? 'Headless' : 'Headed'}
            </div>
          </ToggleRow>
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

        {hasLivePreview ? (
          <div className='space-y-3 rounded-md border border-border/60 p-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-sm font-semibold'>Live scrape preview</span>
              <Badge variant={livePreview.final ? 'success' : 'secondary'}>
                {livePreviewStatusLabel}
              </Badge>
              {activeRuntimeRun !== null ? (
                <Badge variant='secondary'>Run {activeRuntimeRun.status}</Badge>
              ) : null}
              <Badge variant='secondary'>{livePreview.discoveredUrls.length} links</Badge>
              <Badge variant='secondary'>{livePreview.offers.length} offers scraped</Badge>
              <Badge variant='secondary'>{livePreview.writes.length} writes</Badge>
              <Badge variant='secondary'>{livePreview.warnings.length} warnings</Badge>
            </div>
            {livePreview.messages.length > 0 ? (
              <div className='space-y-1 rounded border border-border/40 bg-muted/10 px-3 py-2 text-xs text-muted-foreground'>
                {livePreview.messages.slice(-4).map((message, index) => (
                  <p key={`live-message-${index}-${message}`}>{message}</p>
                ))}
              </div>
            ) : null}
            {livePreview.discoveredUrls.length > 0 ? (
              <div className='space-y-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  Discovered links
                </p>
                <div className='max-h-36 space-y-1 overflow-auto pr-1'>
                  {livePreview.discoveredUrls.slice(0, 12).map((url) => (
                    <a
                      key={url}
                      href={url}
                      target='_blank'
                      rel='noreferrer'
                      className='block break-all rounded border border-border/40 px-3 py-2 text-xs text-muted-foreground hover:text-foreground'
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            {livePreview.offers.length > 0 ? (
              <div className='space-y-2'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                    Scraped offers
                  </p>
                  <Button
                    type='button'
                    size='sm'
                    variant='success'
                    disabled={!canSavePreviewOffers}
                    onClick={() => {
                      void savePreviewDrafts(saveablePreviewOffers, 'all');
                    }}
                  >
                    <Save className='h-4 w-4' />
                    {saveDraftsInFlight === 'all' ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                <div className='max-h-72 space-y-2 overflow-auto pr-1'>
                  {livePreview.offers.slice(0, 12).map((item, index) => (
                    <div
                      key={`${item.offer.sourceUrl}-${item.status}-${index}`}
                      className='rounded border border-border/40 px-3 py-2'
                    >
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <span className='font-medium'>{item.offer.title}</span>
                        <div className='flex flex-wrap items-center gap-2'>
                          <Badge variant={item.match ? 'success' : 'secondary'}>
                            {formatOfferStatus(item.status)}
                          </Badge>
                          {item.status === 'preview' ? (
                            <Button
                              type='button'
                              size='sm'
                              variant='outline'
                              disabled={!canSavePreviewOffers}
                              onClick={() => {
                                void savePreviewDrafts([item], item.offer.sourceUrl);
                              }}
                            >
                              <Save className='h-4 w-4' />
                              {saveDraftsInFlight === item.offer.sourceUrl ? 'Saving...' : 'Save'}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className='mt-1 text-xs text-muted-foreground'>
                        {item.offer.companyName}
                        {item.match ? ` -> ${item.match.organizationName}` : ''}
                        {item.offer.sourceSite.length > 0 ? ` · ${item.offer.sourceSite}` : ''}
                      </div>
                      {item.reason !== null ? (
                        <div className='mt-1 text-xs text-muted-foreground'>{item.reason}</div>
                      ) : null}
                      {item.offer.companyProfile.trim().length > 0 ? (
                        <p className='mt-1 max-h-10 overflow-hidden text-xs text-muted-foreground'>
                          {item.offer.companyProfile}
                        </p>
                      ) : null}
                      {item.offer.pills.length > 0 ? (
                        <div className='mt-2 flex flex-wrap gap-1'>
                          {item.offer.pills.slice(0, 8).map((pill, pillIndex) => (
                            <Badge
                              key={`${pill.category}-${pill.position}-${pillIndex}-${pill.label}`}
                              variant='outline'
                            >
                              {pill.label}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {livePreview.writes.length > 0 ? (
              <div className='space-y-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  Database writes
                </p>
                <div className='max-h-48 space-y-2 overflow-auto pr-1'>
                  {livePreview.writes.map((write, index) => (
                    <div
                      key={`${write.action}-${write.result.offer.sourceUrl}-${index}`}
                      className='rounded border border-border/40 px-3 py-2'
                    >
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <span className='font-medium'>{formatWriteAction(write)}</span>
                        <Badge variant={write.result.match ? 'success' : 'secondary'}>
                          {formatOfferStatus(write.result.status)}
                        </Badge>
                      </div>
                      <div className='mt-1 text-xs text-muted-foreground'>
                        {write.message}
                        {write.result.listingId !== null ? ` · ${write.result.listingId}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {livePreview.warnings.length > 0 ? (
              <div className='space-y-1 text-xs text-amber-300'>
                {livePreview.warnings.slice(-3).map((warning, index) => (
                  <p key={`live-warning-${index}-${warning}`}>{warning}</p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

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
              <Badge variant='secondary'>
                {result.summary.createdOrganizations} organisations
              </Badge>
              <Badge variant='secondary'>{result.summary.linkedLexiconTerms} lexicon links</Badge>
              <Badge variant='secondary'>{result.summary.addressUpdates} addresses</Badge>
              <Badge variant='secondary'>{result.summary.verifiedListings} verified</Badge>
            </div>
            <div className='max-h-56 space-y-2 overflow-auto pr-1'>
              {result.offers.slice(0, 12).map((item, index) => (
                <div
                  key={`${item.offer.sourceUrl}-${item.status}-${index}`}
                  className='rounded border border-border/40 px-3 py-2'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <span className='font-medium'>{item.offer.title}</span>
                    <Badge variant={item.match ? 'success' : 'secondary'}>
                      {formatOfferStatus(item.status)}
                    </Badge>
                  </div>
                  <div className='mt-1 text-xs text-muted-foreground'>
                    {item.offer.companyName}
                    {item.match ? ` -> ${item.match.organizationName}` : ''}
                    {item.offer.sourceSite.length > 0 ? ` · ${item.offer.sourceSite}` : ''}
                  </div>
                  {item.reason !== null ? (
                    <div className='mt-1 text-xs text-muted-foreground'>{item.reason}</div>
                  ) : null}
                  {item.offer.pills.length > 0 ? (
                    <div className='mt-2 flex flex-wrap gap-1'>
                      {item.offer.pills.slice(0, 8).map((pill, pillIndex) => (
                        <Badge
                          key={`${pill.category}-${pill.position}-${pillIndex}-${pill.label}`}
                          variant='outline'
                        >
                          {pill.label}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {result.warnings.length > 0 ? (
              <div className='space-y-1 text-xs text-amber-300'>
                {result.warnings.slice(0, 3).map((warning, index) => (
                  <p key={`result-warning-${index}-${warning}`}>{warning}</p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </FormModal>
  );
}
