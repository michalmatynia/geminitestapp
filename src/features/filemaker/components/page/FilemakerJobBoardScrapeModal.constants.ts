export const SCRAPE_DRAFT_SETTINGS_KEYS = [
  'delayMs',
  'duplicateStrategy',
  'extractDescriptions',
  'extractSalaries',
  'extractionPath',
  'humanizeMouse',
  'maxOffers',
  'maxPages',
  'personaId',
  'provider',
  'sourceUrl',
  'status',
  'timeoutMs',
] as const;

export const SCRAPER_SETTINGS_STORAGE_KEY = 'filemaker.job-board-scraper.settings.v1';
export const SCRAPER_SETTINGS_VERSION = 3;
export const SCRAPER_ACTIVE_RUN_STORAGE_KEY = 'filemaker.job-board-scraper.active-run-id.v1';
export const RUNTIME_RUN_POLL_INTERVAL_MS = 1000;
export const RUNTIME_RUN_POLL_MAX_INTERVAL_MS = 4000;
export const RUNTIME_RUN_POLL_IDLE_BACKOFF_AFTER_MS = 10_000;

export const JOB_BOARD_SCRAPE_LATEST_RUN_ENDPOINT_PATH = '/runs/latest';
export const JOB_BOARD_SCRAPE_CLASSIFICATIONS_ENDPOINT_PATH = '/classifications';
export const JOB_BOARD_LEXICON_CLASSIFICATION_RESULT_NODE_ID =
  'node-regex-job-board-lexicon-classification';
export const JOB_BOARD_LEXICON_CONTEXT_ENGINE_VERSION = 'filemaker-job-board-lexicon:v4';

export const PROVIDER_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'pracuj_pl', label: 'Pracuj.pl' },
  { value: 'justjoin_it', label: 'Just Join IT' },
  { value: 'nofluffjobs', label: 'No Fluff Jobs' },
] as const;

export const DUPLICATE_STRATEGY_OPTIONS = [
  { value: 'skip', label: 'Skip duplicates' },
  { value: 'overwrite', label: 'Overwrite' },
];

export const EXTRACTION_PATH_OPTIONS = [
  { value: 'playwright_ai', label: 'Playwright screenshot + AI' },
  { value: 'deterministic', label: 'Deterministic path' },
  {
    value: 'deterministic_then_playwright',
    label: 'Both: deterministic first, Playwright fallback',
  },
] as const;

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
] as const;
