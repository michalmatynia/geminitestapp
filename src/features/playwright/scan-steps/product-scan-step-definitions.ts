import type { ProductScanStepGroup } from '@/shared/contracts/product-scans';
import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';

export type ProductScanStepDefinition = {
  key: string;
  label: string;
  group: ProductScanStepGroup;
};

export const PRODUCT_SCAN_STEP_REGISTRY = {
  validate: { key: 'validate', label: 'Validate scan input', group: 'input' },
  prepare_scan: { key: 'prepare_scan', label: 'Prepare scan input', group: 'input' },
  queue_scan: { key: 'queue_scan', label: 'Queue follow-up scan', group: 'input' },
  product_asin_update: {
    key: 'product_asin_update',
    label: 'Update product ASIN',
    group: 'product',
  },

  google_lens_open: {
    key: 'google_lens_open',
    label: 'Open Google Lens search',
    group: 'google_lens',
  },
  google_upload: {
    key: 'google_upload',
    label: 'Upload product image to Google',
    group: 'google_lens',
  },
  google_verification_review: {
    key: 'google_verification_review',
    label: 'Inspect Google verification barrier',
    group: 'google_lens',
  },
  google_captcha: {
    key: 'google_captcha',
    label: 'Resolve Google captcha',
    group: 'google_lens',
  },
  google_candidates: {
    key: 'google_candidates',
    label: 'Collect Amazon candidates from Google',
    group: 'google_lens',
  },

  amazon_open: { key: 'amazon_open', label: 'Open Amazon candidate', group: 'amazon' },
  amazon_overlays: {
    key: 'amazon_overlays',
    label: 'Dismiss Amazon overlays',
    group: 'amazon',
  },
  amazon_content_ready: {
    key: 'amazon_content_ready',
    label: 'Wait for Amazon product content',
    group: 'amazon',
  },
  amazon_probe: {
    key: 'amazon_probe',
    label: 'Probe Amazon product page',
    group: 'amazon',
  },
  amazon_extract: {
    key: 'amazon_extract',
    label: 'Extract Amazon details',
    group: 'amazon',
  },
  amazon_ai_triage: {
    key: 'amazon_ai_triage',
    label: 'Triage Amazon candidates',
    group: 'amazon',
  },
  amazon_ai_evaluate: {
    key: 'amazon_ai_evaluate',
    label: 'Evaluate Amazon candidate match',
    group: 'amazon',
  },

  '1688_open': {
    key: '1688_open',
    label: 'Open 1688 image search',
    group: 'supplier',
  },
  '1688_upload': {
    key: '1688_upload',
    label: 'Upload image to 1688 search',
    group: 'supplier',
  },
  '1688_collect_candidates': {
    key: '1688_collect_candidates',
    label: 'Collect 1688 supplier candidates',
    group: 'supplier',
  },
  supplier_verification_review: {
    key: 'supplier_verification_review',
    label: 'Inspect supplier verification barrier',
    group: 'supplier',
  },
  supplier_open: {
    key: 'supplier_open',
    label: 'Open supplier product page',
    group: 'supplier',
  },
  supplier_overlays: {
    key: 'supplier_overlays',
    label: 'Resolve supplier barriers',
    group: 'supplier',
  },
  supplier_content_ready: {
    key: 'supplier_content_ready',
    label: 'Wait for supplier product content',
    group: 'supplier',
  },
  supplier_probe: {
    key: 'supplier_probe',
    label: 'Probe supplier product page',
    group: 'supplier',
  },
  supplier_extract: {
    key: 'supplier_extract',
    label: 'Extract supplier details',
    group: 'supplier',
  },
  supplier_evaluate: {
    key: 'supplier_evaluate',
    label: 'Evaluate supplier candidate',
    group: 'supplier',
  },
  supplier_ai_evaluate: {
    key: 'supplier_ai_evaluate',
    label: 'Evaluate supplier candidate match',
    group: 'supplier',
  },
} as const satisfies Record<string, ProductScanStepDefinition>;

export type ProductScanStepKey = keyof typeof PRODUCT_SCAN_STEP_REGISTRY;

export type ProductScanSequenceEntry =
  | ProductScanStepKey
  | {
      key: string;
      label?: string | null;
      group?: ProductScanStepGroup | null;
    };

export const PRODUCT_SCAN_STEP_GROUP_LABELS: Record<ProductScanStepGroup, string> = {
  input: 'Input',
  google_lens: 'Google Lens',
  amazon: 'Amazon',
  supplier: 'Supplier',
  product: 'Product Update',
};

export const PRODUCT_SCAN_STEP_GROUP_ORDER: Record<ProductScanStepGroup, number> = {
  input: 0,
  google_lens: 1,
  amazon: 2,
  supplier: 3,
  product: 4,
};

export const PRODUCT_SCAN_GOOGLE_LENS_SEQUENCE = [
  'google_lens_open',
  'google_upload',
  'google_verification_review',
  'google_captcha',
  'google_candidates',
] as const satisfies readonly ProductScanSequenceEntry[];

export const PRODUCT_SCAN_STEP_SEQUENCES = {
  [AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY]: [
    'validate',
    ...PRODUCT_SCAN_GOOGLE_LENS_SEQUENCE,
    'amazon_open',
    'amazon_overlays',
    'amazon_content_ready',
    'amazon_probe',
  ],
  [AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY]: [
    'validate',
    ...PRODUCT_SCAN_GOOGLE_LENS_SEQUENCE,
    'amazon_open',
    'amazon_overlays',
    'amazon_content_ready',
    'amazon_probe',
    'amazon_extract',
  ],
  [AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY]: [
    'validate',
    'amazon_open',
    'amazon_overlays',
    'amazon_content_ready',
    'amazon_probe',
    'amazon_extract',
    'amazon_ai_evaluate',
    'queue_scan',
    'product_asin_update',
  ],
  supplier_reverse_image_scan_browser: [
    'validate',
    '1688_open',
    '1688_upload',
    '1688_collect_candidates',
    'supplier_open',
    'supplier_overlays',
    'supplier_content_ready',
    'supplier_probe',
    'supplier_evaluate',
    'supplier_extract',
  ],
  supplier_direct_candidate_followup: [
    'validate',
    'supplier_open',
    'supplier_overlays',
    'supplier_content_ready',
    'supplier_probe',
    'supplier_evaluate',
    'supplier_extract',
  ],
  supplier_reverse_image_scan_full: [
    'validate',
    '1688_open',
    '1688_upload',
    '1688_collect_candidates',
    'supplier_open',
    'supplier_overlays',
    'supplier_content_ready',
    'supplier_probe',
    'supplier_evaluate',
    'supplier_extract',
    'supplier_ai_evaluate',
    'queue_scan',
    'product_asin_update',
  ],
} as const satisfies Record<string, readonly ProductScanSequenceEntry[]>;

export type ProductScanSequenceKey = keyof typeof PRODUCT_SCAN_STEP_SEQUENCES;

export type ProductScanStepExtension = {
  key: string;
  label: string;
  group: ProductScanStepGroup;
};
