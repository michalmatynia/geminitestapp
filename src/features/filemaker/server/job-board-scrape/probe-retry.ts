import 'server-only';

import { probeJobBoardOffer } from '@/features/job-board/server/job-scans-service';

import { sleep, throwIfScrapeAborted } from './live-events';

type ProbeArgs = Parameters<typeof probeJobBoardOffer>[0];
type ProbeRetryInput = {
  attempts: number;
  onWarning?: (warning: string) => Promise<void> | void;
  probeArgs: ProbeArgs;
  signal?: AbortSignal;
  url: string;
};
type ProbeRetryResult = Awaited<ReturnType<typeof probeJobBoardOffer>>;

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

const warnBeforeRetry = async (
  input: ProbeRetryInput,
  attempt: number,
  error: unknown
): Promise<void> => {
  const message = error instanceof Error ? error.message : String(error);
  await input.onWarning?.(
    `Offer probe attempt ${attempt}/${input.attempts} failed for ${input.url}: ${message}. Retrying.`
  );
  await sleep(Math.min(2 ** (attempt - 1) * 500, 4000));
};

const probeDeterministicFallback = async (
  input: ProbeRetryInput,
  lastError: unknown
): Promise<ProbeRetryResult> => {
  if (input.probeArgs.extractionPath !== 'playwright_ai') {
    throw lastError instanceof Error
      ? lastError
      : new Error(`Offer probe failed after ${input.attempts} attempts for ${input.url}.`);
  }
  throwIfScrapeAborted(input.signal);
  await input.onWarning?.(
    `Browser offer extraction failed for ${input.url}; trying deterministic fallback.`
  );
  return probeJobBoardOffer({
    ...input.probeArgs,
    extractionPath: 'deterministic',
    forcePlaywright: false,
  });
};

const probeJobBoardOfferAttempt = async (
  input: ProbeRetryInput,
  attempt: number
): Promise<ProbeRetryResult> => {
  throwIfScrapeAborted(input.signal);
  try {
    return await probeJobBoardOffer(input.probeArgs);
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (attempt >= input.attempts) return probeDeterministicFallback(input, error);
    await warnBeforeRetry(input, attempt, error);
    return probeJobBoardOfferAttempt(input, attempt + 1);
  }
};

export const probeJobBoardOfferWithRetry = async (
  input: ProbeRetryInput
): Promise<ProbeRetryResult> => probeJobBoardOfferAttempt(input, 1);
