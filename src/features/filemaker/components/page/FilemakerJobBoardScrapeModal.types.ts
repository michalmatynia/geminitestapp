import type { 
  FilemakerJobBoardScrapeProvider,
  FilemakerJobBoardDuplicateStrategy,
  FilemakerJobBoardScrapeExtractionPath,
  FilemakerJobBoardScrapeMode,
  FilemakerJobBoardScrapeOfferResult,
  FilemakerJobBoardScrapeWriteResult,
} from '@/features/filemaker/filemaker-job-board-scrape-contracts';
import type { FilemakerJobListingStatus } from '@/features/filemaker/types';
import type { OfferProgressTracker } from './job-board-scrape-progress';

export type FilemakerJobBoardScrapeModalProps = {
  onClose: () => void;
  onCompleted: () => void;
  open: boolean;
};

export type ScrapeDraft = {
  delayMs: string;
  duplicateStrategy: FilemakerJobBoardDuplicateStrategy;
  extractDescriptions: boolean;
  extractSalaries: boolean;
  extractionPath: FilemakerJobBoardScrapeExtractionPath;
  humanizeMouse: boolean;
  maxOffers: string;
  maxPages: string;
  personaId: string;
  provider: FilemakerJobBoardScrapeProvider;
  sourceUrl: string;
  status: FilemakerJobListingStatus;
  timeoutMs: string;
};

export type ActiveScrapeRequest = {
  controller: AbortController;
  id: number;
  mode: FilemakerJobBoardScrapeMode;
};

export type LivePreviewState = {
  discoveredUrls: string[];
  final: boolean;
  messages: string[];
  offers: FilemakerJobBoardScrapeOfferResult[];
  progress: OfferProgressTracker;
  warnings: string[];
  writes: FilemakerJobBoardScrapeWriteResult[];
};
