export const SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY = 'supplier_1688_probe_scan' as const;

export const SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE = '1688' as const;

export const SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS = {
  browserPreparation: 'browser_preparation',
  browserOpen: 'browser_open',
  inputValidate: 'supplier_1688_input_validate',
  openSearch: 'supplier_1688_open_search',
  accessCheck: 'supplier_1688_access_check',
  uploadImage: 'supplier_1688_upload_image',
  submitSearch: 'supplier_1688_submit_search',
  collectCandidates: 'supplier_1688_collect_candidates',
  probeCandidate: 'supplier_1688_probe_candidate',
  waitSupplier: 'supplier_1688_wait_supplier',
  extractDetails: 'supplier_1688_extract_details',
  scoreCandidate: 'supplier_1688_score_candidate',
  evaluateMatch: 'supplier_1688_evaluate_match',
  finalize: 'supplier_1688_finalize',
  browserClose: 'browser_close',
} as const;

export const SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEP_IDS = [
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.browserPreparation,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.browserOpen,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.inputValidate,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.openSearch,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.accessCheck,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.uploadImage,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.submitSearch,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.collectCandidates,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.probeCandidate,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.waitSupplier,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.extractDetails,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.scoreCandidate,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.evaluateMatch,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.finalize,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.browserClose,
] as const;

export type Supplier1688ProbeScanRuntimeStepId =
  (typeof SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEP_IDS)[number];
