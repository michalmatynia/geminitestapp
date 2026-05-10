import 'server-only';

import { createHash } from 'crypto';

import {
  type FilemakerJobBoardScrapeDraftSaveRequest,
  type FilemakerJobBoardScrapeRequest,
  type FilemakerJobBoardScrapeRuntimeRun,
  type FilemakerJobBoardScrapeRuntimeStatus,
} from '@/features/filemaker/filemaker-job-board-scrape-contracts';

export type JobBoardScrapeRuntimeRequest =
  | FilemakerJobBoardScrapeDraftSaveRequest
  | FilemakerJobBoardScrapeRequest;

export type JobBoardScrapeRuntimeJob = {
  fingerprint: string;
  request: JobBoardScrapeRuntimeRequest;
  runId: string;
};

export const RUN_KEY_PREFIX = 'filemaker:job-board-scrape:run';
export const ACTIVE_RUN_KEY_PREFIX = 'filemaker:job-board-scrape:active';
export const RUN_FINGERPRINT_KEY_PREFIX = 'filemaker:job-board-scrape:run-fingerprint';
export const LATEST_RUN_KEY = 'filemaker:job-board-scrape:latest-run';
export const RUN_TTL_SECONDS = 60 * 60 * 24 * 7;
export const EVENT_LIMIT = 500;
export const MEMORY_RUN_LIMIT = 100;
export const ACTIVE_RUN_CLAIM_WAIT_MS = 50;
export const ACTIVE_RUN_CLAIM_WAIT_ATTEMPTS = 10;
export const SCRAPE_ABORT_MESSAGE = 'Job-board scrape stopped.';

const TERMINAL_STATUSES = new Set<FilemakerJobBoardScrapeRuntimeStatus>([
  'canceled',
  'completed',
  'failed',
]);

export const runKey = (runId: string): string => `${RUN_KEY_PREFIX}:${runId}`;
export const activeRunKey = (fingerprint: string): string =>
  `${ACTIVE_RUN_KEY_PREFIX}:${fingerprint}`;
export const eventsKey = (runId: string): string => `${runKey(runId)}:events`;
export const runFingerprintKey = (runId: string): string =>
  `${RUN_FINGERPRINT_KEY_PREFIX}:${runId}`;
export const channelKey = (runId: string): string => `${runKey(runId)}:stream`;

export const nowIso = (): string => new Date().toISOString();

export const isTerminalStatus = (status: FilemakerJobBoardScrapeRuntimeStatus): boolean =>
  TERMINAL_STATUSES.has(status);

export const createAbortError = (): Error => {
  const error = new Error(SCRAPE_ABORT_MESSAGE);
  error.name = 'AbortError';
  return error;
};

export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

export const isDraftSaveRequest = (
  request: JobBoardScrapeRuntimeRequest
): request is FilemakerJobBoardScrapeDraftSaveRequest => 'action' in request;

const requestMode = (
  request: JobBoardScrapeRuntimeRequest
): FilemakerJobBoardScrapeRequest['mode'] => (isDraftSaveRequest(request) ? 'import' : request.mode);

export const buildRequestFingerprint = (request: JobBoardScrapeRuntimeRequest): string => {
  const payload = {
    ...request,
    importStrategy: 'create_unmatched',
    minimumMatchConfidence: 85,
    organizationScope: 'all',
    selectedOrganizationIds: [],
    sourceUrl: request.sourceUrl.trim().toLowerCase(),
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
};

export const buildQueuedRun = (
  runId: string,
  request: JobBoardScrapeRuntimeRequest
): FilemakerJobBoardScrapeRuntimeRun => {
  const timestamp = nowIso();
  return {
    completedAt: null,
    createdAt: timestamp,
    error: null,
    id: runId,
    mode: requestMode(request),
    result: null,
    sourceUrl: request.sourceUrl,
    startedAt: null,
    status: 'queued',
    updatedAt: timestamp,
  };
};

export const sleep = async (delayMs: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
};
