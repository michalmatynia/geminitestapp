import 'server-only';

import {
  type FilemakerJobBoardScrapeLiveEvent,
  type FilemakerJobBoardScrapeRuntimeSnapshot,
} from '@/features/filemaker/filemaker-job-board-scrape-contracts';
import { notFoundError } from '@/shared/errors/app-error';

import {
  createAbortError,
  isTerminalStatus,
  nowIso,
  SCRAPE_ABORT_MESSAGE,
} from './filemaker-job-board-scrape-runtime.common';
import {
  appendRunEvent,
  clearActiveRunFingerprint,
  readFilemakerJobBoardScrapeRun,
  readRunFingerprint,
  updateRun,
} from './filemaker-job-board-scrape-runtime.state';

export const activeRunControllers = new Map<string, AbortController>();

const readExistingRunSnapshot = async (
  runId: string
): Promise<FilemakerJobBoardScrapeRuntimeSnapshot> => {
  const snapshot = await readFilemakerJobBoardScrapeRun(runId);
  if (snapshot.run === null) {
    throw notFoundError('Job-board scrape run not found.', { runId });
  }
  return snapshot;
};

export const cancelFilemakerJobBoardScrapeRun = async (
  runId: string
): Promise<FilemakerJobBoardScrapeRuntimeSnapshot> => {
  const snapshot = await readExistingRunSnapshot(runId);
  const run = snapshot.run;
  if (run === null || isTerminalStatus(run.status)) {
    return snapshot;
  }
  activeRunControllers.get(run.id)?.abort(createAbortError());
  const fingerprint = await readRunFingerprint(run.id);
  const canceledRun = await updateRun(run, {
    completedAt: nowIso(),
    error: SCRAPE_ABORT_MESSAGE,
    status: 'canceled',
  });
  await clearActiveRunFingerprint(fingerprint, run.id);
  const stoppedEvent: FilemakerJobBoardScrapeLiveEvent = {
    at: nowIso(),
    message: SCRAPE_ABORT_MESSAGE,
    type: 'error',
  };
  await appendRunEvent(run.id, stoppedEvent);
  return {
    events: [...snapshot.events, stoppedEvent],
    run: canceledRun,
  };
};

export const pauseFilemakerJobBoardScrapeRun = async (
  runId: string
): Promise<FilemakerJobBoardScrapeRuntimeSnapshot> => {
  const snapshot = await readExistingRunSnapshot(runId);
  const run = snapshot.run;
  if (run === null || isTerminalStatus(run.status) || run.status === 'paused') {
    return snapshot;
  }
  const pausedRun = await updateRun(run, { status: 'paused' });
  const pausedEvent: FilemakerJobBoardScrapeLiveEvent = {
    at: nowIso(),
    message: 'Job-board scrape paused.',
    type: 'status',
  };
  await appendRunEvent(run.id, pausedEvent);
  return {
    events: [...snapshot.events, pausedEvent],
    run: pausedRun,
  };
};

export const resumeFilemakerJobBoardScrapeRun = async (
  runId: string
): Promise<FilemakerJobBoardScrapeRuntimeSnapshot> => {
  const snapshot = await readExistingRunSnapshot(runId);
  const run = snapshot.run;
  if (run?.status !== 'paused') {
    return snapshot;
  }
  const resumedRun = await updateRun(run, { status: 'running' });
  const resumedEvent: FilemakerJobBoardScrapeLiveEvent = {
    at: nowIso(),
    message: 'Job-board scrape resumed.',
    type: 'status',
  };
  await appendRunEvent(run.id, resumedEvent);
  return {
    events: [...snapshot.events, resumedEvent],
    run: resumedRun,
  };
};
