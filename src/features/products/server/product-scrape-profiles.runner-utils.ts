import 'server-only';

import { throwIfProductScrapeAborted } from './product-scrape-profile-abort';
import type {
  ProductScrapeProfileProgressReporter,
  ProductScrapeProfileRunOptions,
} from './product-scrape-profiles.runner-types';

export const reportScrapeProgress = async (
  reporter: ProductScrapeProfileProgressReporter | undefined,
  progress: {
    current?: number | null;
    message: string;
    stage: string;
    total?: number | null;
  }
): Promise<void> => {
  await reporter?.({
    current: progress.current ?? null,
    message: progress.message,
    stage: progress.stage,
    total: progress.total ?? null,
  });
};

export const pauseAndThrowIfAborted = async (
  options: ProductScrapeProfileRunOptions
): Promise<void> => {
  throwIfProductScrapeAborted(options.signal);
  await options.waitWhilePaused?.();
  throwIfProductScrapeAborted(options.signal);
};

export const resolveProductServiceOptions = (
  userId: string | null | undefined
): { userId?: string } | undefined => {
  if (typeof userId !== 'string' || userId.trim().length === 0) return undefined;
  return { userId };
};

export const shouldInvalidateProductCache = (
  dryRun: boolean,
  counts: { createdCount: number; updatedCount: number }
): boolean => !dryRun && (counts.createdCount > 0 || counts.updatedCount > 0);
