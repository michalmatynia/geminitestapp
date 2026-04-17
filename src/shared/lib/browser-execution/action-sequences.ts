import type { StepId } from './step-registry';
import { BROWSER_AND_AUTH, STEP_GROUPS } from './step-groups';
import { SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY } from './supplier-1688-runtime-constants';

export type ActionSequenceKey =
  | 'playwright_programmable_listing'
  | 'playwright_programmable_import'
  | 'tradera_auth'
  | 'tradera_standard_list'
  | 'tradera_quicklist_list'
  | 'tradera_quicklist_relist'
  | 'tradera_quicklist_sync'
  | 'tradera_check_status'
  | 'tradera_fetch_categories'
  | typeof SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY
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
    'search_unsold',
    'inspect_unsold',
    'search_sold',
    'inspect_sold',
    'resolve_status',
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

  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY]: [
    'browser_preparation',
    'browser_open',
    'supplier_1688_input_validate',
    'supplier_1688_open_search',
    'supplier_1688_access_check',
    'supplier_1688_upload_image',
    'supplier_1688_submit_search',
    'supplier_1688_collect_candidates',
    'supplier_1688_probe_candidate',
    'supplier_1688_wait_supplier',
    'supplier_1688_extract_details',
    'supplier_1688_score_candidate',
    'supplier_1688_evaluate_match',
    'supplier_1688_finalize',
    'browser_close',
  ],

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
