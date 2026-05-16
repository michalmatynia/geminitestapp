/**
 * Filemaker Job Board Scrape Service
 * 
 * Orchestrates job board scraping, URL collection, and data transformation 
 * for the Filemaker integration pipeline.
 */

import 'server-only';
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
  const options = {
    provider,
    sourceUrl: config.origin,
  };
  if (config.deterministic) {
    const result = await collectJobBoardOfferUrlsDeterministically(options);
    return result.links.map((link) => link.url);
  }
  const result = await collectJobBoardOfferUrls(options);
  return result.links.map((link) => link.url);
};
