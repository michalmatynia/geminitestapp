export const SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY =
  'social_article_aggregator_scrape' as const;

export const SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_NAME =
  'Social Article Aggregator Scrape' as const;

export const SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS = {
  browserPreparation: 'browser_preparation',
  browserOpen: 'browser_open',
  inputValidate: 'social_article_aggregator_input_validate',
  discoverArticles: 'social_article_aggregator_discover_articles',
  extractArticles: 'social_article_aggregator_extract_articles',
  finalize: 'social_article_aggregator_finalize',
  browserClose: 'browser_close',
} as const;

export const SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEP_IDS = [
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.browserPreparation,
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.browserOpen,
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.inputValidate,
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.discoverArticles,
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.extractArticles,
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.finalize,
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.browserClose,
] as const;

export type SocialArticleAggregatorScrapeRuntimeStepId =
  (typeof SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEP_IDS)[number];
