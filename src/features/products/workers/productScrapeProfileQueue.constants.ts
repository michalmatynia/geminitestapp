import type {
  ProductScrapeProfileRuntimeStatus,
  ProductScrapeProfileRunRequest,
} from '@/shared/contracts/products/scrape-profiles';

export const PRODUCT_SCRAPE_PROFILE_QUEUE_NAME = 'product-scrape-profile';

export type ProductScrapeProfileQueueJobData = {
  request: ProductScrapeProfileRunRequest;
  userId: string | null;
  requestedAt: string;
};

export const QUEUE_UNAVAILABLE_RETRY_AFTER_MS = 3_000;
export const LOG_SERVICE = 'product-scrape-profile-queue';
export const RUN_KEY_PREFIX = 'product:scrape-profile:run';
export const ACTIVE_RUN_KEY = 'product:scrape-profile:active-run';
export const LATEST_RUN_KEY = 'product:scrape-profile:latest-run';
export const RUN_TTL_SECONDS = 60 * 60 * 24 * 7;
export const MEMORY_RUN_LIMIT = 100;
export const PAUSE_POLL_INTERVAL_MS = 750;
export const STALE_QUEUED_RUN_MS = 2 * 60 * 1000;
export const STALE_RUNNING_RUN_MS = 20 * 60 * 1000;
export const TERMINAL_STATUSES = new Set<ProductScrapeProfileRuntimeStatus>([
  'canceled',
  'completed',
  'failed',
]);
export const STALE_QUEUE_JOB_STATES = new Set([
  'delayed',
  'missing',
  'unknown',
  'waiting',
  'waiting-children',
]);
