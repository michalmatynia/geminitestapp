export const JOB_BOARD_SCRAPE_RUNTIME_KEY = 'job_board_scrape' as const;

export const JOB_BOARD_SCRAPE_RUNTIME_NAME = 'Job Board Offer Scrape' as const;

export const JOB_BOARD_SCRAPE_RUNTIME_STEPS = {
  browserPreparation: 'browser_preparation',
  browserOpen: 'browser_open',
  inputValidate: 'job_board_input_validate',
  openSource: 'job_board_open_source',
  acceptCookies: 'job_board_accept_cookies',
  collectOfferLinks: 'job_board_collect_offer_links',
  waitOfferContent: 'job_board_wait_offer_content',
  extractOfferSnapshot: 'job_board_extract_offer_snapshot',
  finalize: 'job_board_finalize',
  browserClose: 'browser_close',
} as const;

export const JOB_BOARD_SCRAPE_RUNTIME_STEP_IDS = [
  JOB_BOARD_SCRAPE_RUNTIME_STEPS.browserPreparation,
  JOB_BOARD_SCRAPE_RUNTIME_STEPS.browserOpen,
  JOB_BOARD_SCRAPE_RUNTIME_STEPS.inputValidate,
  JOB_BOARD_SCRAPE_RUNTIME_STEPS.openSource,
  JOB_BOARD_SCRAPE_RUNTIME_STEPS.acceptCookies,
  JOB_BOARD_SCRAPE_RUNTIME_STEPS.collectOfferLinks,
  JOB_BOARD_SCRAPE_RUNTIME_STEPS.waitOfferContent,
  JOB_BOARD_SCRAPE_RUNTIME_STEPS.extractOfferSnapshot,
  JOB_BOARD_SCRAPE_RUNTIME_STEPS.finalize,
  JOB_BOARD_SCRAPE_RUNTIME_STEPS.browserClose,
] as const;

export type JobBoardScrapeRuntimeStepId =
  (typeof JOB_BOARD_SCRAPE_RUNTIME_STEP_IDS)[number];
