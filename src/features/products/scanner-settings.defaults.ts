import type { PlaywrightPersona, PlaywrightSettings } from '@/shared/contracts/playwright';
import type {
  ProductScanner1688CandidateEvaluator,
  ProductScanner1688Settings,
  ProductScannerAmazonCandidateEvaluator,
  ProductScannerAmazonCandidateEvaluatorLanguageDetectionMode,
  ProductScannerAmazonCandidateEvaluatorMode,
  ProductScannerAmazonCandidateEvaluatorSimilarityMode,
  ProductScannerAmazonImageSearchFallbackProvider,
  ProductScannerAmazonImageSearchProvider,
  ProductScannerCaptchaBehavior,
  ProductScannerPlaywrightBrowser,
  ProductScannerSettings,
} from '@/shared/contracts/products/scanner-settings';

import {
  DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER,
  buildIntegrationConnectionPlaywrightSettings,
} from '@/features/playwright/utils/playwright-settings-baseline';

export const PRODUCT_SCANNER_SETTINGS_KEY = 'product_scanner_settings_v1';
export const PRODUCT_SCANNER_SETTINGS_HREF = '/admin/settings/scanner';
export const DEFAULT_PRODUCT_SCANNER_CAPTCHA_BEHAVIOR = 'auto_show_browser' as const;
export const DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS = 240_000;
export const DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PROVIDER =
  'google_images_upload' as const;
export const DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_FALLBACK_PROVIDER = null;
export const DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PAGE_URL = null;
export const DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_MODE = 'disabled' as const;
export const DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_THRESHOLD = 0.7;
export const DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_ALLOWED_CONTENT_LANGUAGE =
  'en' as const;
export const DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_LANGUAGE_DETECTION_MODE =
  'ai_only' as const;
export const DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_SIMILARITY_MODE =
  'ai_only' as const;
export const DEFAULT_PRODUCT_SCANNER_1688_CANDIDATE_EVALUATOR_MODE = 'disabled' as const;
export const DEFAULT_PRODUCT_SCANNER_1688_CANDIDATE_EVALUATOR_THRESHOLD = 0.75;
export const DEFAULT_PRODUCT_SCANNER_1688_CANDIDATE_RESULT_LIMIT = 8;
export const DEFAULT_PRODUCT_SCANNER_1688_MINIMUM_CANDIDATE_SCORE = 4;
export const DEFAULT_PRODUCT_SCANNER_1688_MAX_EXTRACTED_IMAGES = 12;

export const defaultProductScannerPlaywrightSettings: PlaywrightSettings = {
  ...buildIntegrationConnectionPlaywrightSettings(),
  headless: false,
};

export const createDefaultProductScannerAmazonCandidateEvaluator =
  (): ProductScannerAmazonCandidateEvaluator => ({
    mode: DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_MODE,
    modelId: null,
    threshold: DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_THRESHOLD,
    onlyForAmbiguousCandidates: false,
    candidateSimilarityMode:
      DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_SIMILARITY_MODE,
    allowedContentLanguage:
      DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_ALLOWED_CONTENT_LANGUAGE,
    rejectNonEnglishContent: true,
    languageDetectionMode:
      DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_LANGUAGE_DETECTION_MODE,
    systemPrompt: null,
  });

export const createDefaultProductScanner1688Settings = (): ProductScanner1688Settings => ({
  candidateResultLimit: DEFAULT_PRODUCT_SCANNER_1688_CANDIDATE_RESULT_LIMIT,
  minimumCandidateScore: DEFAULT_PRODUCT_SCANNER_1688_MINIMUM_CANDIDATE_SCORE,
  maxExtractedImages: DEFAULT_PRODUCT_SCANNER_1688_MAX_EXTRACTED_IMAGES,
  allowUrlImageSearchFallback: true,
});

export const createDefaultProductScanner1688CandidateEvaluator =
  (): ProductScanner1688CandidateEvaluator => ({
    mode: DEFAULT_PRODUCT_SCANNER_1688_CANDIDATE_EVALUATOR_MODE,
    modelId: null,
    threshold: DEFAULT_PRODUCT_SCANNER_1688_CANDIDATE_EVALUATOR_THRESHOLD,
    onlyForAmbiguousCandidates: true,
    systemPrompt: null,
  });

export type ProductScannerSettingsDraft = {
  playwrightPersonaId: string | null;
  playwrightBrowser: ProductScannerPlaywrightBrowser;
  captchaBehavior: ProductScannerCaptchaBehavior;
  manualVerificationTimeoutMs: number;
  amazonImageSearchProvider: ProductScannerAmazonImageSearchProvider;
  amazonImageSearchFallbackProvider: ProductScannerAmazonImageSearchFallbackProvider;
  amazonImageSearchPageUrl: string;
  amazonCandidateEvaluator: ProductScannerAmazonCandidateEvaluator;
  amazonCandidateEvaluatorTriage: ProductScannerAmazonCandidateEvaluator;
  amazonCandidateEvaluatorProbe: ProductScannerAmazonCandidateEvaluator;
  amazonCandidateEvaluatorExtraction: ProductScannerAmazonCandidateEvaluator;
  scanner1688: ProductScanner1688Settings;
  scanner1688CandidateEvaluator: ProductScanner1688CandidateEvaluator;
  playwrightSettings: PlaywrightSettings;
};

export type PersonaSettingsSource = ReadonlyArray<
  Pick<PlaywrightPersona, 'id' | 'settings'>
>;

export const BOOLEAN_PLAYWRIGHT_SETTING_KEYS = [
  'headless',
  'humanizeMouse',
  'proxyEnabled',
  'emulateDevice',
] as const satisfies ReadonlyArray<keyof PlaywrightSettings>;

export const NUMBER_PLAYWRIGHT_SETTING_KEYS = [
  'slowMo',
  'timeout',
  'navigationTimeout',
  'mouseJitter',
  'clickDelayMin',
  'clickDelayMax',
  'inputDelayMin',
  'inputDelayMax',
  'actionDelayMin',
  'actionDelayMax',
] as const satisfies ReadonlyArray<keyof PlaywrightSettings>;

export const STRING_PLAYWRIGHT_SETTING_KEYS = [
  'proxyServer',
  'proxyUsername',
  'proxyPassword',
  'deviceName',
] as const satisfies ReadonlyArray<keyof PlaywrightSettings>;

export const PRODUCT_SCANNER_BROWSER_OPTIONS: ReadonlyArray<{
  value: ProductScannerPlaywrightBrowser;
  label: string;
}> = [
  { value: 'auto', label: 'Auto (Brave -> Chrome -> Chromium)' },
  { value: 'brave', label: 'Brave' },
  { value: 'chrome', label: 'Chrome' },
  { value: 'chromium', label: 'Chromium (bundled)' },
];

export const PRODUCT_SCANNER_CAPTCHA_BEHAVIOR_OPTIONS: ReadonlyArray<{
  value: ProductScannerCaptchaBehavior;
  label: string;
}> = [
  { value: 'auto_show_browser', label: 'Show browser and continue' },
  { value: 'fail', label: 'Fail scan on captcha' },
];

export const PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PROVIDER_OPTIONS: ReadonlyArray<{
  value: ProductScannerAmazonImageSearchProvider;
  label: string;
}> = [
  { value: 'google_images_upload', label: 'Google Images Upload' },
  { value: 'google_images_url', label: 'Google Images URL' },
  { value: 'google_lens_upload', label: 'Google Lens Upload' },
];

export const PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_MODE_OPTIONS: ReadonlyArray<{
  value: ProductScannerAmazonCandidateEvaluatorMode;
  label: string;
}> = [
  { value: 'disabled', label: 'Disabled' },
  { value: 'brain_default', label: 'AI Brain default model' },
  { value: 'model_override', label: 'Override with scanner model' },
];

export const PRODUCT_SCANNER_1688_CANDIDATE_EVALUATOR_MODE_OPTIONS =
  PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_MODE_OPTIONS;

export const PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_LANGUAGE_DETECTION_MODE_OPTIONS: ReadonlyArray<{
  value: ProductScannerAmazonCandidateEvaluatorLanguageDetectionMode;
  label: string;
}> = [
  { value: 'deterministic_then_ai', label: 'Deterministic probe hints, then AI' },
  { value: 'ai_only', label: 'AI only' },
];

export const PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_SIMILARITY_MODE_OPTIONS: ReadonlyArray<{
  value: ProductScannerAmazonCandidateEvaluatorSimilarityMode;
  label: string;
}> = [
  { value: 'deterministic_then_ai', label: 'Deterministic hints, then AI' },
  { value: 'ai_only', label: 'AI only' },
];

export const createDefaultProductScannerSettings = (): ProductScannerSettings => ({
  playwrightPersonaId: null,
  playwrightBrowser: DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER,
  captchaBehavior: DEFAULT_PRODUCT_SCANNER_CAPTCHA_BEHAVIOR,
  manualVerificationTimeoutMs: DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS,
  amazonImageSearchProvider: DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PROVIDER,
  amazonImageSearchFallbackProvider:
    DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_FALLBACK_PROVIDER,
  amazonImageSearchPageUrl: DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PAGE_URL,
  playwrightSettingsOverrides: {},
  amazonCandidateEvaluator: createDefaultProductScannerAmazonCandidateEvaluator(),
  amazonCandidateEvaluatorTriage: createDefaultProductScannerAmazonCandidateEvaluator(),
  amazonCandidateEvaluatorProbe: createDefaultProductScannerAmazonCandidateEvaluator(),
  amazonCandidateEvaluatorExtraction: createDefaultProductScannerAmazonCandidateEvaluator(),
  scanner1688: createDefaultProductScanner1688Settings(),
  scanner1688CandidateEvaluator: createDefaultProductScanner1688CandidateEvaluator(),
});
