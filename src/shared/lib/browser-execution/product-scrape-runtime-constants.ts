export const PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY =
  'product_scrape_battlestock' as const;

export const PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_NAME =
  'BattleStock Product Scrape' as const;

export const PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS = {
  browserPreparation: 'browser_preparation',
  browserOpen: 'browser_open',
  inputValidate: 'product_scrape_input_validate',
  openSource: 'product_scrape_open_source',
  collectProductLinks: 'product_scrape_collect_product_links',
  probeProductPages: 'product_scrape_probe_product_pages',
  extractProducts: 'product_scrape_extract_products',
  mapDrafts: 'product_scrape_map_drafts',
  finalize: 'product_scrape_finalize',
  browserClose: 'browser_close',
} as const;

export const PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEP_IDS = [
  PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.browserPreparation,
  PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.browserOpen,
  PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.inputValidate,
  PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.openSource,
  PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.collectProductLinks,
  PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.probeProductPages,
  PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.extractProducts,
  PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.mapDrafts,
  PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.finalize,
  PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.browserClose,
] as const;

export type ProductScrapeBattlestockRuntimeStepId =
  (typeof PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEP_IDS)[number];
