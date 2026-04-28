import 'server-only';

import {
  collectJobBoardOfferUrls,
  fetchJobBoardPage,
  reduceJobBoardHtml,
  type JobBoardCollectedOfferLink,
  type JobBoardOfferUrlCollectionOptions,
  type JobBoardOfferUrlCollectionResult,
  type JobBoardPageFetchOptions,
  type JobBoardPageFetchResult,
} from './job-board-sync';

export type PracujPageFetchResult = JobBoardPageFetchResult;
export type PracujPageFetchOptions = JobBoardPageFetchOptions;
export type PracujCollectedOfferLink = JobBoardCollectedOfferLink;
export type PracujOfferUrlCollectionResult = JobBoardOfferUrlCollectionResult;
export type PracujOfferUrlCollectionOptions = JobBoardOfferUrlCollectionOptions;

export const fetchPracujPage = async (
  sourceUrl: string,
  options: PracujPageFetchOptions = {}
): Promise<PracujPageFetchResult> =>
  await fetchJobBoardPage(sourceUrl, {
    ...options,
    provider: 'pracuj_pl',
  });

export const collectPracujOfferUrls = async (
  options: PracujOfferUrlCollectionOptions
): Promise<PracujOfferUrlCollectionResult> =>
  await collectJobBoardOfferUrls({
    ...options,
    provider: 'pracuj_pl',
  });

export const reducePracujHtml = reduceJobBoardHtml;
