/**
 * Filemaker Job Board Scrape Service
 * 
 * Orchestrates job board scraping, URL collection, and data transformation 
 * for the Filemaker integration pipeline.
 */

import 'server-only';
import { randomUUID } from 'crypto';
import type { JobBoardProvider } from '@/shared/lib/job-board/job-board-providers';
import {
  collectJobBoardOfferUrls,
  collectJobBoardOfferUrlsDeterministically,
} from '@/features/job-board/server/providers/job-board-sync';

/**
 * Orchestrates the collection of job board offer URLs.
 */
export const collectOfferUrls = async (
  provider: JobBoardProvider,
  config: {
    origin: string;
    deterministic?: boolean;
    concurrency?: number;
  }
): Promise<string[]> => {
  if (config.deterministic) {
    return await collectJobBoardOfferUrlsDeterministically(provider, config.origin);
  }
  return await collectJobBoardOfferUrls(provider, config.origin, config.concurrency);
};
