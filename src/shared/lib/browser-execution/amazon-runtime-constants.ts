export const AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY = 'amazon_reverse_image_scan' as const;
export const AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY =
  'amazon_google_lens_candidate_search' as const;
export const AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY =
  'amazon_candidate_extraction' as const;

export const AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_NAME =
  'Amazon Google Lens Candidate Search Runtime' as const;
export const AMAZON_CANDIDATE_EXTRACTION_RUNTIME_NAME =
  'Amazon Candidate Extraction Runtime' as const;
export const AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_NAME =
  'Amazon Reverse Image Scan Runtime' as const;
export const AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_OPERATION_LABEL =
  'Amazon candidate search' as const;
export const AMAZON_CANDIDATE_EXTRACTION_OPERATION_LABEL =
  'Amazon candidate extraction' as const;
export const AMAZON_REVERSE_IMAGE_SCAN_OPERATION_LABEL =
  'Amazon reverse image scan' as const;

export const AMAZON_REVERSE_IMAGE_SCAN_SELECTOR_PROFILE = 'amazon' as const;

export const AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS = {
  browserPreparation: 'browser_preparation',
  browserOpen: 'browser_open',
  validate: 'validate',
  googleLensOpen: 'google_lens_open',
  googleUpload: 'google_upload',
  googleVerificationReview: 'google_verification_review',
  googleCaptcha: 'google_captcha',
  googleCandidates: 'google_candidates',
  amazonOpen: 'amazon_open',
  amazonOverlays: 'amazon_overlays',
  amazonContentReady: 'amazon_content_ready',
  amazonProbe: 'amazon_probe',
  amazonAiTriage: 'amazon_ai_triage',
  amazonAiEvaluate: 'amazon_ai_evaluate',
  amazonExtract: 'amazon_extract',
  queueScan: 'queue_scan',
  productAsinUpdate: 'product_asin_update',
  browserClose: 'browser_close',
} as const;

export const AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEP_IDS = [
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.browserPreparation,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.browserOpen,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.validate,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.googleLensOpen,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.googleUpload,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.googleVerificationReview,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.googleCaptcha,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.googleCandidates,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.amazonOpen,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.amazonOverlays,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.amazonContentReady,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.amazonProbe,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.amazonAiTriage,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.amazonAiEvaluate,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.amazonExtract,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.queueScan,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.productAsinUpdate,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.browserClose,
] as const;

export type AmazonReverseImageScanRuntimeStepId =
  (typeof AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEP_IDS)[number];

export const resolveAmazonRuntimeActionName = (
  runtimeKey: string | null | undefined
): string => {
  if (runtimeKey === AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY) {
    return AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_NAME;
  }

  if (runtimeKey === AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY) {
    return AMAZON_CANDIDATE_EXTRACTION_RUNTIME_NAME;
  }

  return AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_NAME;
};

export const resolveAmazonRuntimeOperationLabel = (
  runtimeKey: string | null | undefined
): string => {
  if (runtimeKey === AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY) {
    return AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_OPERATION_LABEL;
  }

  if (runtimeKey === AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY) {
    return AMAZON_CANDIDATE_EXTRACTION_OPERATION_LABEL;
  }

  return AMAZON_REVERSE_IMAGE_SCAN_OPERATION_LABEL;
};
