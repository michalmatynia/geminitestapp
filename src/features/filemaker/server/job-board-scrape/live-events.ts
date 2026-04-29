import 'server-only';

import { JOB_BOARD_SCRAPE_RUNTIME_KEY } from '@/shared/lib/browser-execution/job-board-runtime-constants';
import { resolveRuntimeActionExecutionSettings } from '@/shared/lib/browser-execution/runtime-action-resolver.server';

import type {
  FilemakerJobBoardScrapeLiveEvent,
} from '../../filemaker-job-board-scrape-contracts';

export type FilemakerJobBoardScrapeLiveEventEmitter = (
  event: FilemakerJobBoardScrapeLiveEvent
) => void | Promise<void>;

type FilemakerJobBoardScrapeLiveEventInput =
  FilemakerJobBoardScrapeLiveEvent extends infer Event
    ? Event extends unknown
      ? Omit<Event, 'at'>
      : never
    : never;

export const throwIfScrapeAborted = (signal: AbortSignal | undefined): void => {
  if (signal === undefined || signal.aborted === false) return;
  const error = new Error('Job-board scrape stopped.');
  error.name = 'AbortError';
  throw error;
};

export const emitLiveEvent = async (
  onEvent: FilemakerJobBoardScrapeLiveEventEmitter | undefined,
  event: FilemakerJobBoardScrapeLiveEventInput
): Promise<void> => {
  if (!onEvent) return;
  const liveEvent: FilemakerJobBoardScrapeLiveEvent = {
    ...event,
    at: new Date().toISOString(),
  };
  await onEvent(liveEvent);
};

export const resolveEffectiveHeadless = async (
  override: boolean | null | undefined
): Promise<boolean> => {
  if (typeof override === 'boolean') {
    return override;
  }
  const settings = await resolveRuntimeActionExecutionSettings(JOB_BOARD_SCRAPE_RUNTIME_KEY);
  return settings.headless ?? true;
};

export const sleep = async (delayMs: number): Promise<void> => {
  if (delayMs > 0) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }
};
