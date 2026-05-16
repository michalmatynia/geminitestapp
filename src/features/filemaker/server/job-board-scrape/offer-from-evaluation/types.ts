import type { FilemakerJobBoardScrapedOffer } from '../../../filemaker-job-board-scrape-contracts';

export type ScrapedOfferPill = FilemakerJobBoardScrapedOffer['pills'][number];

export type LabeledProfileLine = {
  label: string;
  value: string;
};
