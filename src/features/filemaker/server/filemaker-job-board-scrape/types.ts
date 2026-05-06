import type { 
  JobBoardProvider,
  FilemakerJobBoardScrapeLiveEvent,
  FilemakerJobBoardScrapeOfferResult,
  FilemakerJobBoardScrapeWriteResult,
  FilemakerJobBoardScrapedOffer,
  FilemakerJobBoardScrapeRequest,
} from '@/features/filemaker/filemaker-job-board-scrape-contracts';
import type { FilemakerDatabase, FilemakerOrganization } from '../types';

export type ScrapedCompanyCandidate = {
  organization: FilemakerOrganization;
};

export type ApplyImportInput = {
  database: FilemakerDatabase;
  onWrite?: (write: FilemakerJobBoardScrapeWriteResult) => Promise<void> | void;
  options: FilemakerJobBoardScrapeRequest;
  offers: FilemakerJobBoardScrapedOffer[];
};

export type CentralizedScrapeResult = {
  offers: FilemakerJobBoardScrapedOffer[];
  provider: JobBoardProvider;
  runId: string | null;
  skippedResults: FilemakerJobBoardScrapeOfferResult[];
  sourceSite: string;
  warnings: string[];
};

export type FilemakerJobBoardScrapeRunOptions = {
  onEvent?: (event: FilemakerJobBoardScrapeLiveEvent) => Promise<void> | void;
  signal?: AbortSignal;
  waitWhilePaused?: () => Promise<void>;
};

export type ClassificationPillBuildResult = {
  acceptedPills: FilemakerJobBoardScrapedOffer['pills'];
  rejectedCount: number;
  updatedOffer: FilemakerJobBoardScrapedOffer;
  warnings: string[];
};

export type ScrapeProgressHandlers = {
  onLinks?: (input: {
    provider: JobBoardProvider;
    runId: string | null;
    sourceSite: string;
    urls: string[];
  }) => Promise<void> | void;
  onOffer?: (input: {
    index: number;
    offer: FilemakerJobBoardScrapedOffer;
    total: number;
  }) => Promise<void> | void;
  onSkippedExisting?: (input: {
    index: number;
    result: FilemakerJobBoardScrapeOfferResult;
    total: number;
  }) => Promise<void> | void;
};
