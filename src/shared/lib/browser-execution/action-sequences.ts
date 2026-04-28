import type { StepId } from './step-registry';
import { BROWSER_AND_AUTH, STEP_GROUPS } from './step-groups';
import {
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEP_IDS,
} from './amazon-runtime-constants';
import {
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEP_IDS,
} from './supplier-1688-runtime-constants';
import {
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY,
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEP_IDS,
} from './filemaker-organization-presence-runtime-constants';

export type ActionSequenceKey =
  | 'playwright_programmable_listing'
  | 'playwright_programmable_import'
  | 'tradera_auth'
  | 'tradera_standard_list'
  | 'tradera_quicklist_list'
  | 'tradera_quicklist_relist'
  | 'tradera_quicklist_sync'
  | 'tradera_check_status'
  | 'tradera_move_to_unsold'
  | 'tradera_fetch_categories'
  | typeof AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY
  | typeof AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY
  | typeof AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY
  | typeof SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY
  | typeof FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY
  | 'vinted_list'
  | 'vinted_relist'
  | 'vinted_sync';

export const ACTION_SEQUENCES: Record<ActionSequenceKey, readonly StepId[]> = {
  playwright_programmable_listing: ['browser_preparation'],

  playwright_programmable_import: ['browser_preparation'],

  tradera_auth: [
    ...BROWSER_AND_AUTH,
    'sell_page_open',
    'browser_close',
  ],

  tradera_standard_list: [
    ...BROWSER_AND_AUTH,
    'sell_page_open',
    'load_product',
    'resolve_price',
    'title_fill',
    'description_fill',
    'price_set',
    'publish',
    'publish_verify',
    'browser_close',
  ],

  tradera_quicklist_list: [
    ...BROWSER_AND_AUTH,
    'duplicate_check',
    'deep_duplicate_check',
    'sell_page_open',
    'image_cleanup',
    ...STEP_GROUPS.TRADERA_FORM,
    ...STEP_GROUPS.PUBLISH,
  ],

  tradera_quicklist_relist: [
    ...BROWSER_AND_AUTH,
    'duplicate_check',
    'deep_duplicate_check',
    'sell_page_open',
    'image_cleanup',
    ...STEP_GROUPS.TRADERA_FORM,
    ...STEP_GROUPS.PUBLISH,
  ],

  tradera_quicklist_sync: [
    ...BROWSER_AND_AUTH,
    'sync_check',
    ...STEP_GROUPS.TRADERA_FORM,
    ...STEP_GROUPS.PUBLISH,
  ],

  tradera_check_status: [
    'browser_preparation',
    'browser_open',
    'cookie_accept',
    'auth_check',
    'overview_open',
    'search_active',
    'inspect_active',
    'search_sold',
    'inspect_sold',
    'search_unsold',
    'inspect_unsold',
    'resolve_status',
    'browser_close',
  ],

  tradera_move_to_unsold: [
    'browser_preparation',
    'browser_open',
    'listing_open',
    'cookie_accept',
    'auth_check',
    'end_listing_action',
    'end_listing_confirm',
    'end_listing_verify',
    'browser_close',
  ],

  tradera_fetch_categories: [
    'browser_preparation',
    'browser_open',
    'cookie_accept',
    'categories_seed_extract',
    'categories_crawl',
    'categories_finalize',
    'browser_close',
  ],

  [AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY]: [
    'browser_preparation',
    'browser_open',
    'validate',
    'google_lens_open',
    'google_upload',
    'google_verification_review',
    'google_captcha',
    'google_candidates',
    'amazon_open',
    'amazon_overlays',
    'amazon_content_ready',
    'amazon_probe',
    'browser_close',
  ],

  [AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY]: [
    'browser_preparation',
    'browser_open',
    'validate',
    'amazon_open',
    'amazon_overlays',
    'amazon_content_ready',
    'amazon_probe',
    'amazon_extract',
    'amazon_ai_evaluate',
    'queue_scan',
    'product_asin_update',
    'browser_close',
  ],

  [AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY]: AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEP_IDS,

  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY]: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEP_IDS,

  [FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY]:
    FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEP_IDS,

  vinted_list: [
    ...BROWSER_AND_AUTH,
    ...STEP_GROUPS.LISTING_FIELDS,
    ...STEP_GROUPS.VINTED_EXTRAS,
    ...STEP_GROUPS.PUBLISH,
  ],

  vinted_relist: [
    ...BROWSER_AND_AUTH,
    ...STEP_GROUPS.LISTING_FIELDS,
    ...STEP_GROUPS.VINTED_EXTRAS,
    ...STEP_GROUPS.PUBLISH,
  ],

  vinted_sync: [
    ...BROWSER_AND_AUTH,
    'sync_check',
    ...STEP_GROUPS.LISTING_FIELDS,
    ...STEP_GROUPS.VINTED_EXTRAS,
    ...STEP_GROUPS.PUBLISH,
  ],
};
