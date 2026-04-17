import type { PlaywrightActionBlockConfig } from '@/shared/contracts/playwright-steps';
import { SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS } from './supplier-1688-runtime-constants';

export const STEP_REGISTRY = {
  // Browser lifecycle
  browser_preparation:    { id: 'browser_preparation',    label: 'Browser preparation' },
  browser_open:           { id: 'browser_open',           label: 'Open browser' },
  browser_close:          { id: 'browser_close',          label: 'Close browser' },

  // Cookie / consent
  cookie_accept:          { id: 'cookie_accept',          label: 'Accept cookies' },

  // Auth
  auth_check:             { id: 'auth_check',             label: 'Validate session' },
  auth_login:             { id: 'auth_login',             label: 'Automated login' },
  auth_manual:            { id: 'auth_manual',            label: 'Manual login' },

  // Tradera quicklist — sync path
  sync_check:             { id: 'sync_check',             label: 'Load sync target' },

  // Tradera quicklist — list/relist path
  duplicate_check:        { id: 'duplicate_check',        label: 'Duplicate check' },
  deep_duplicate_check:   { id: 'deep_duplicate_check',   label: 'Deep duplicate check' },
  sell_page_open:         { id: 'sell_page_open',         label: 'Open listing editor' },
  load_product:           { id: 'load_product',           label: 'Load product data' },
  resolve_price:          { id: 'resolve_price',          label: 'Resolve listing price' },
  image_cleanup:          { id: 'image_cleanup',          label: 'Clear draft images' },

  // Tradera check_status path
  overview_open:          { id: 'overview_open',          label: 'Open Tradera overview' },
  search_active:          { id: 'search_active',          label: 'Search active listings' },
  inspect_active:         { id: 'inspect_active',         label: 'Inspect active candidate' },
  search_unsold:          { id: 'search_unsold',          label: 'Search unsold items' },
  inspect_unsold:         { id: 'inspect_unsold',         label: 'Inspect unsold candidate' },
  search_sold:            { id: 'search_sold',            label: 'Search sold items' },
  inspect_sold:           { id: 'inspect_sold',           label: 'Inspect sold candidate' },
  resolve_status:         { id: 'resolve_status',         label: 'Resolve listing status' },
  categories_seed_extract:{ id: 'categories_seed_extract',label: 'Extract category seed page' },
  categories_crawl:       { id: 'categories_crawl',       label: 'Crawl category pages' },
  categories_finalize:    { id: 'categories_finalize',    label: 'Finalize category registry' },

  // 1688 supplier probe scan
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.inputValidate]: {
    id: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.inputValidate,
    label: 'Validate 1688 probe input',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.openSearch]: {
    id: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.openSearch,
    label: 'Open 1688 image search',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.accessCheck]: {
    id: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.accessCheck,
    label: 'Check 1688 access barriers',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.uploadImage]: {
    id: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.uploadImage,
    label: 'Upload image to 1688 search',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.submitSearch]: {
    id: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.submitSearch,
    label: 'Submit 1688 image search',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.collectCandidates]: {
    id: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.collectCandidates,
    label: 'Collect 1688 supplier candidates',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.probeCandidate]: {
    id: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.probeCandidate,
    label: 'Probe 1688 supplier candidate',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.waitSupplier]: {
    id: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.waitSupplier,
    label: 'Wait for 1688 supplier content',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.extractDetails]: {
    id: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.extractDetails,
    label: 'Extract 1688 supplier details',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.scoreCandidate]: {
    id: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.scoreCandidate,
    label: 'Score 1688 supplier candidate',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.evaluateMatch]: {
    id: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.evaluateMatch,
    label: 'Evaluate 1688 supplier match',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.finalize]: {
    id: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.finalize,
    label: 'Finalize 1688 probe result',
  },

  // Product scan shared / Amazon runtime flow
  validate:               { id: 'validate',               label: 'Validate scan input' },
  prepare_scan:           { id: 'prepare_scan',           label: 'Prepare scan input' },
  queue_scan:             { id: 'queue_scan',             label: 'Queue follow-up scan' },
  product_asin_update:    { id: 'product_asin_update',    label: 'Update product ASIN' },

  google_lens_open:       { id: 'google_lens_open',       label: 'Open Google reverse image search' },
  google_upload:          { id: 'google_upload',          label: 'Upload product image to Google' },
  google_captcha:         { id: 'google_captcha',         label: 'Resolve Google captcha' },
  google_candidates:      { id: 'google_candidates',      label: 'Collect Amazon candidates from Google' },

  amazon_open:            { id: 'amazon_open',            label: 'Open Amazon candidate' },
  amazon_overlays:        { id: 'amazon_overlays',        label: 'Dismiss Amazon overlays' },
  amazon_content_ready:   { id: 'amazon_content_ready',   label: 'Wait for Amazon product content' },
  amazon_probe:           { id: 'amazon_probe',           label: 'Probe Amazon product page' },
  amazon_extract:         { id: 'amazon_extract',         label: 'Extract Amazon details' },
  amazon_ai_triage:       { id: 'amazon_ai_triage',       label: 'Triage Amazon candidates' },
  amazon_ai_evaluate:     { id: 'amazon_ai_evaluate',     label: 'Evaluate Amazon candidate match' },

  // Listing fields — shared
  image_upload:           { id: 'image_upload',           label: 'Upload images' },
  title_fill:             { id: 'title_fill',             label: 'Enter title' },
  description_fill:       { id: 'description_fill',       label: 'Enter description' },
  price_set:              { id: 'price_set',              label: 'Set price' },

  // Tradera-specific listing fields
  category_select:        { id: 'category_select',        label: 'Select category' },
  listing_format_select:  { id: 'listing_format_select',  label: 'Select listing format' },
  attribute_select:       { id: 'attribute_select',       label: 'Set listing attributes' },
  shipping_set:           { id: 'shipping_set',           label: 'Configure delivery' },

  // Vinted-specific listing fields
  brand_fill:             { id: 'brand_fill',             label: 'Set brand' },
  condition_set:          { id: 'condition_set',          label: 'Set condition' },
  size_set:               { id: 'size_set',               label: 'Set size' },

  // Publish
  publish:                { id: 'publish',                label: 'Publish listing' },
  publish_verify:         { id: 'publish_verify',         label: 'Verify listing' },
} as const satisfies Record<string, { id: string; label: string }>;

export type StepId = keyof typeof STEP_REGISTRY;

export type BrowserExecutionStepStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'skipped';

export type BrowserExecutionStep = {
  id: string;
  label: string;
  status: BrowserExecutionStepStatus;
  config?: PlaywrightActionBlockConfig | null;
  message?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
};
