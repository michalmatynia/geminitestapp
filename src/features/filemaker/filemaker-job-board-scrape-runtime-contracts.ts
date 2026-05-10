import type {
  FilemakerJobBoardScrapeMode,
  FilemakerJobBoardScrapeOfferResult,
  FilemakerJobBoardScrapeProvider,
  FilemakerJobBoardScrapeResponse,
} from './filemaker-job-board-scrape-contracts';

export type FilemakerJobBoardScrapeRuntimeStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'canceled';

export type FilemakerJobBoardScrapeRuntimeRun = {
  completedAt: string | null;
  createdAt: string;
  error: string | null;
  id: string;
  mode: FilemakerJobBoardScrapeMode;
  result: FilemakerJobBoardScrapeResponse | null;
  sourceUrl: string;
  startedAt: string | null;
  status: FilemakerJobBoardScrapeRuntimeStatus;
  updatedAt: string;
};

export type FilemakerJobBoardScrapeRuntimeSnapshot = {
  events: FilemakerJobBoardScrapeLiveEvent[];
  run: FilemakerJobBoardScrapeRuntimeRun | null;
};

export type FilemakerJobBoardScrapeRuntimeStartResponse = {
  run: FilemakerJobBoardScrapeRuntimeRun;
};

export type FilemakerJobBoardScrapeWriteAction =
  | 'organization_created'
  | 'organization_linked'
  | 'organization_profile_updated'
  | 'listing_address_updated'
  | 'listing_lexicon_linked'
  | 'listing_created'
  | 'listing_updated'
  | 'listing_skipped'
  | 'offer_unmatched';

export type FilemakerJobBoardScrapeWriteResult = {
  action: FilemakerJobBoardScrapeWriteAction;
  message: string;
  profileUpdated: boolean;
  result: FilemakerJobBoardScrapeOfferResult;
};

export type FilemakerJobBoardScrapeLiveEvent =
  | {
      at: string;
      run: FilemakerJobBoardScrapeRuntimeRun;
      type: 'run';
    }
  | {
      at: string;
      message: string;
      type: 'status';
    }
  | {
      at: string;
      provider: Exclude<FilemakerJobBoardScrapeProvider, 'auto'>;
      runId: string | null;
      sourceSite: string;
      type: 'links';
      urls: string[];
    }
  | {
      at: string;
      index: number;
      result: FilemakerJobBoardScrapeOfferResult;
      total: number;
      type: 'offer';
    }
  | {
      at: string;
      type: 'write';
      write: FilemakerJobBoardScrapeWriteResult;
    }
  | {
      at: string;
      type: 'warning';
      warning: string;
    }
  | {
      at: string;
      result: FilemakerJobBoardScrapeResponse;
      type: 'done';
    }
  | {
      at: string;
      message: string;
      type: 'error';
    };
