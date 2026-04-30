import 'server-only';

import { probeJobBoardOffer } from '@/features/job-board/server/job-scans-service';

import { sleep, throwIfScrapeAborted } from './live-events';

type ProbeArgs = Parameters<typeof probeJobBoardOffer>[0];

export const probeJobBoardOfferWithRetry = async (input: {
  attempts: number;
  onWarning?: (warning: string) => Promise<void> | void;
  probeArgs: ProbeArgs;
  signal?: AbortSignal;
  url: string;
}): Promise<Awaited<ReturnType<typeof probeJobBoardOffer>>> => {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= input.attempts; attempt += 1) {
    throwIfScrapeAborted(input.signal);
    try {
      return await probeJobBoardOffer(input.probeArgs);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      lastError = error;
      if (attempt < input.attempts) {
        const message = error instanceof Error ? error.message : String(error);
        await input.onWarning?.(
          `Offer probe attempt ${attempt}/${input.attempts} failed for ${input.url}: ${message}. Retrying.`
        );
        const delay = Math.min(2 ** (attempt - 1) * 500, 4000);
        await sleep(delay);
        continue;
      }
    }
  }
  if (input.probeArgs.extractionPath === 'playwright_ai') {
    throwIfScrapeAborted(input.signal);
    await input.onWarning?.(
      `Browser offer extraction failed for ${input.url}; trying deterministic fallback.`
    );
    return probeJobBoardOffer({
      ...input.probeArgs,
      extractionPath: 'deterministic',
      forcePlaywright: false,
    });
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Offer probe failed after ${input.attempts} attempts for ${input.url}.`);
};
