import type { PlaywrightPersona, PlaywrightSettings } from '@/shared/contracts/playwright';
import type {
  ProductScannerAmazonImageSearchFallbackProvider,
  ProductScannerAmazonImageSearchProvider,
  ProductScannerAmazonCandidateEvaluatorAllowedContentLanguage,
  ProductScannerAmazonCandidateEvaluatorLanguageDetectionMode,
  ProductScannerAmazonCandidateEvaluatorSimilarityMode,
  ProductScannerAmazonCandidateEvaluator,
  ProductScannerAmazonCandidateEvaluatorMode,
  ProductScanner1688CandidateEvaluator,
  ProductScannerCaptchaBehavior,
  ProductScanner1688Settings,
  ProductScannerPlaywrightBrowser,
  ProductScannerSettings,
} from '@/shared/contracts/products/scanner-settings';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import {
  DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER,
  buildIntegrationConnectionPlaywrightSettings,
  normalizeIntegrationConnectionPlaywrightPersonaId,
  resolveIntegrationPlaywrightPersonaSettings,
  type IntegrationConnectionPlaywrightBrowser,
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

export const createDefaultProductScannerAmazonCandidateEvaluator = (): ProductScannerAmazonCandidateEvaluator => ({
  mode: DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_MODE,
  modelId: null,
  threshold: DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_THRESHOLD,
  onlyForAmbiguousCandidates: false,
  candidateSimilarityMode: DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_SIMILARITY_MODE,
  allowedContentLanguage: DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_ALLOWED_CONTENT_LANGUAGE,
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

type PersonaSettingsSource = ReadonlyArray<Pick<PlaywrightPersona, 'id' | 'settings'>>;

const BOOLEAN_PLAYWRIGHT_SETTING_KEYS = [
  'headless',
  'humanizeMouse',
  'proxyEnabled',
  'emulateDevice',
] as const satisfies ReadonlyArray<keyof PlaywrightSettings>;

const NUMBER_PLAYWRIGHT_SETTING_KEYS = [
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

const STRING_PLAYWRIGHT_SETTING_KEYS = [
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

const normalizeProductScannerBrowser = (
  value: unknown
): IntegrationConnectionPlaywrightBrowser => {
  return value === 'auto' ||
    value === 'brave' ||
    value === 'chrome' ||
    value === 'chromium'
    ? value
    : DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER;
};

const normalizeProductScannerCaptchaBehavior = (
  value: unknown
): ProductScannerCaptchaBehavior =>
  value === 'fail' ? 'fail' : DEFAULT_PRODUCT_SCANNER_CAPTCHA_BEHAVIOR;

const normalizeProductScannerAmazonImageSearchProvider = (
  value: unknown
): ProductScannerAmazonImageSearchProvider =>
  value === 'google_images_url' || value === 'google_lens_upload'
    ? value
    : DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PROVIDER;

const normalizeProductScannerAmazonImageSearchFallbackProvider = (
  value: unknown
): ProductScannerAmazonImageSearchFallbackProvider =>
  value === 'google_images_upload' ||
  value === 'google_images_url' ||
  value === 'google_lens_upload'
    ? value
    : DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_FALLBACK_PROVIDER;

const normalizeProductScannerAmazonImageSearchPageUrl = (
  value: unknown
): string | null => {
  if (typeof value !== 'string') {
    return DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PAGE_URL;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PAGE_URL;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PAGE_URL;
    }
    return parsed.toString().slice(0, 2048);
  } catch {
    return DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PAGE_URL;
  }
};

const normalizeProductScannerManualVerificationTimeoutMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS;
  }

  const normalized = Math.trunc(value);
  if (normalized <= 0) {
    return DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS;
  }

  return Math.min(normalized, 900_000);
};

const normalizeNullableTrimmedString = (
  value: unknown,
  maxLength: number
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, maxLength);
};

const normalizeProductScannerAmazonCandidateEvaluatorMode = (
  value: unknown
): ProductScannerAmazonCandidateEvaluatorMode =>
  value === 'brain_default' || value === 'model_override'
    ? value
    : DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_MODE;

const normalizeProductScannerAmazonCandidateEvaluatorAllowedContentLanguage = (
  value: unknown
): ProductScannerAmazonCandidateEvaluatorAllowedContentLanguage =>
  value === 'en'
    ? value
    : DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_ALLOWED_CONTENT_LANGUAGE;

const normalizeProductScannerAmazonCandidateEvaluatorLanguageDetectionMode = (
  value: unknown
): ProductScannerAmazonCandidateEvaluatorLanguageDetectionMode =>
  value === 'deterministic_then_ai' || value === 'ai_only'
    ? value
    : DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_LANGUAGE_DETECTION_MODE;

const normalizeProductScannerAmazonCandidateEvaluatorSimilarityMode = (
  value: unknown
): ProductScannerAmazonCandidateEvaluatorSimilarityMode =>
  value === 'deterministic_then_ai'
    ? value
    : DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_SIMILARITY_MODE;

const normalizeProductScannerAmazonCandidateEvaluatorThreshold = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_THRESHOLD;
  }

  return Math.min(1, Math.max(0, value));
};

const normalizeProductScannerAmazonCandidateEvaluator = (
  value: unknown
): ProductScannerAmazonCandidateEvaluator => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createDefaultProductScannerAmazonCandidateEvaluator();
  }

  const record = value as Record<string, unknown>;
  const candidateSimilarityMode = normalizeProductScannerAmazonCandidateEvaluatorSimilarityMode(
    record['candidateSimilarityMode']
  );

  return {
    mode: normalizeProductScannerAmazonCandidateEvaluatorMode(record['mode']),
    modelId: normalizeNullableTrimmedString(record['modelId'], 200),
    threshold: normalizeProductScannerAmazonCandidateEvaluatorThreshold(record['threshold']),
    onlyForAmbiguousCandidates:
      candidateSimilarityMode === 'ai_only'
        ? false
        : record['onlyForAmbiguousCandidates'] !== false,
    candidateSimilarityMode,
    allowedContentLanguage: normalizeProductScannerAmazonCandidateEvaluatorAllowedContentLanguage(
      record['allowedContentLanguage']
    ),
    rejectNonEnglishContent: record['rejectNonEnglishContent'] !== false,
    languageDetectionMode: normalizeProductScannerAmazonCandidateEvaluatorLanguageDetectionMode(
      record['languageDetectionMode']
    ),
    systemPrompt: normalizeNullableTrimmedString(record['systemPrompt'], 4000),
  };
};

const normalizeProductScanner1688CandidateEvaluator = (
  value: unknown
): ProductScanner1688CandidateEvaluator => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createDefaultProductScanner1688CandidateEvaluator();
  }

  const record = value as Record<string, unknown>;

  return {
    mode: normalizeProductScannerAmazonCandidateEvaluatorMode(record['mode']),
    modelId: normalizeNullableTrimmedString(record['modelId'], 200),
    threshold: normalizeProductScannerAmazonCandidateEvaluatorThreshold(record['threshold']),
    onlyForAmbiguousCandidates: record['onlyForAmbiguousCandidates'] !== false,
    systemPrompt: normalizeNullableTrimmedString(record['systemPrompt'], 4000),
  };
};

const normalizeIntegerInRange = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
};

const normalizeProductScanner1688Settings = (
  value: unknown
): ProductScanner1688Settings => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createDefaultProductScanner1688Settings();
  }

  const record = value as Record<string, unknown>;

  return {
    candidateResultLimit: normalizeIntegerInRange(
      record['candidateResultLimit'],
      DEFAULT_PRODUCT_SCANNER_1688_CANDIDATE_RESULT_LIMIT,
      1,
      20
    ),
    minimumCandidateScore: normalizeIntegerInRange(
      record['minimumCandidateScore'],
      DEFAULT_PRODUCT_SCANNER_1688_MINIMUM_CANDIDATE_SCORE,
      1,
      20
    ),
    maxExtractedImages: normalizeIntegerInRange(
      record['maxExtractedImages'],
      DEFAULT_PRODUCT_SCANNER_1688_MAX_EXTRACTED_IMAGES,
      1,
      20
    ),
    allowUrlImageSearchFallback: record['allowUrlImageSearchFallback'] !== false,
  };
};

const resolveProductScannerAmazonCandidateEvaluator = (
  value: unknown,
  fallback: ProductScannerAmazonCandidateEvaluator
): ProductScannerAmazonCandidateEvaluator => {
  if (typeof value === 'undefined') {
    return fallback;
  }

  return normalizeProductScannerAmazonCandidateEvaluator(value);
};

const normalizeProductScannerSettingsOverrides = (
  value: unknown
): Partial<PlaywrightSettings> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const normalized: Partial<PlaywrightSettings> = {};

  for (const key of BOOLEAN_PLAYWRIGHT_SETTING_KEYS) {
    if (typeof record[key] === 'boolean') {
      normalized[key] = record[key];
    }
  }

  for (const key of NUMBER_PLAYWRIGHT_SETTING_KEYS) {
    if (typeof record[key] === 'number' && Number.isFinite(record[key])) {
      normalized[key] = record[key];
    }
  }

  for (const key of STRING_PLAYWRIGHT_SETTING_KEYS) {
    if (typeof record[key] === 'string') {
      normalized[key] = record[key];
    }
  }

  return normalized;
};

export const normalizeProductScannerSettings = (
  value: unknown
): ProductScannerSettings => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createDefaultProductScannerSettings();
  }

  const record = value as Record<string, unknown>;
  const normalizedOverrides = normalizeProductScannerSettingsOverrides(
    record['playwrightSettingsOverrides']
  );
  const normalizedLegacySettings = normalizeProductScannerSettingsOverrides(
    record['playwrightSettings']
  );
  const legacyEvaluator = normalizeProductScannerAmazonCandidateEvaluator(
    record['amazonCandidateEvaluator']
  );

  return {
    playwrightPersonaId: normalizeIntegrationConnectionPlaywrightPersonaId(
      record['playwrightPersonaId'] as string | null | undefined
    ),
    playwrightBrowser: normalizeProductScannerBrowser(record['playwrightBrowser']),
    captchaBehavior: normalizeProductScannerCaptchaBehavior(record['captchaBehavior']),
    manualVerificationTimeoutMs: normalizeProductScannerManualVerificationTimeoutMs(
      record['manualVerificationTimeoutMs']
    ),
    amazonImageSearchProvider: normalizeProductScannerAmazonImageSearchProvider(
      record['amazonImageSearchProvider']
    ),
    amazonImageSearchFallbackProvider:
      normalizeProductScannerAmazonImageSearchFallbackProvider(
        record['amazonImageSearchFallbackProvider']
      ),
    amazonImageSearchPageUrl: normalizeProductScannerAmazonImageSearchPageUrl(
      record['amazonImageSearchPageUrl']
    ),
    playwrightSettingsOverrides:
      Object.keys(normalizedOverrides).length > 0
        ? normalizedOverrides
        : normalizedLegacySettings,
    amazonCandidateEvaluator: legacyEvaluator,
    amazonCandidateEvaluatorTriage: resolveProductScannerAmazonCandidateEvaluator(
      record['amazonCandidateEvaluatorTriage'],
      createDefaultProductScannerAmazonCandidateEvaluator()
    ),
    amazonCandidateEvaluatorProbe: resolveProductScannerAmazonCandidateEvaluator(
      record['amazonCandidateEvaluatorProbe'],
      legacyEvaluator
    ),
    amazonCandidateEvaluatorExtraction: resolveProductScannerAmazonCandidateEvaluator(
      record['amazonCandidateEvaluatorExtraction'],
      legacyEvaluator
    ),
    scanner1688: normalizeProductScanner1688Settings(record['scanner1688']),
    scanner1688CandidateEvaluator: normalizeProductScanner1688CandidateEvaluator(
      record['scanner1688CandidateEvaluator']
    ),
  };
};

export const parseProductScannerSettings = (
  raw: string | null | undefined
): ProductScannerSettings =>
  normalizeProductScannerSettings(parseJsonSetting<unknown>(raw, null));

export const serializeProductScannerSettings = (
  settings: ProductScannerSettings
): string => serializeSetting(normalizeProductScannerSettings(settings));

export const resolveProductScannerSettingsBaseline = (
  personas: PersonaSettingsSource | null | undefined,
  personaId: string | null | undefined
): PlaywrightSettings =>
  personaId
    ? buildIntegrationConnectionPlaywrightSettings(
        resolveIntegrationPlaywrightPersonaSettings(personas, personaId)
      )
    : defaultProductScannerPlaywrightSettings;

export const buildProductScannerSettingsDraft = (
  settings: ProductScannerSettings,
  personas: PersonaSettingsSource | null | undefined
): ProductScannerSettingsDraft => {
  const baseline = resolveProductScannerSettingsBaseline(
    personas,
    settings.playwrightPersonaId
  );

  return {
    playwrightPersonaId: settings.playwrightPersonaId,
    playwrightBrowser: settings.playwrightBrowser,
    captchaBehavior: settings.captchaBehavior,
    manualVerificationTimeoutMs: settings.manualVerificationTimeoutMs,
    amazonImageSearchProvider: settings.amazonImageSearchProvider,
    amazonImageSearchFallbackProvider: settings.amazonImageSearchFallbackProvider ?? null,
    amazonImageSearchPageUrl: settings.amazonImageSearchPageUrl ?? '',
    amazonCandidateEvaluator:
      settings.amazonCandidateEvaluator ?? createDefaultProductScannerAmazonCandidateEvaluator(),
    amazonCandidateEvaluatorTriage:
      settings.amazonCandidateEvaluatorTriage ??
      createDefaultProductScannerAmazonCandidateEvaluator(),
    amazonCandidateEvaluatorProbe:
      settings.amazonCandidateEvaluatorProbe ??
      createDefaultProductScannerAmazonCandidateEvaluator(),
    amazonCandidateEvaluatorExtraction:
      settings.amazonCandidateEvaluatorExtraction ??
      createDefaultProductScannerAmazonCandidateEvaluator(),
    scanner1688: settings.scanner1688 ?? createDefaultProductScanner1688Settings(),
    scanner1688CandidateEvaluator:
      settings.scanner1688CandidateEvaluator ??
      createDefaultProductScanner1688CandidateEvaluator(),
    playwrightSettings: {
      ...baseline,
      ...settings.playwrightSettingsOverrides,
    },
  };
};

const buildPlaywrightSettingsOverrides = (
  baseline: PlaywrightSettings,
  next: PlaywrightSettings
): Partial<PlaywrightSettings> => {
  const overrides: Partial<PlaywrightSettings> = {};

  for (const key of BOOLEAN_PLAYWRIGHT_SETTING_KEYS) {
    if (next[key] !== baseline[key]) {
      overrides[key] = next[key];
    }
  }

  for (const key of NUMBER_PLAYWRIGHT_SETTING_KEYS) {
    if (next[key] !== baseline[key]) {
      overrides[key] = next[key];
    }
  }

  for (const key of STRING_PLAYWRIGHT_SETTING_KEYS) {
    if (next[key] !== baseline[key]) {
      overrides[key] = next[key];
    }
  }

  return overrides;
};

export const buildPersistedProductScannerSettings = (
  draft: ProductScannerSettingsDraft,
  personas: PersonaSettingsSource | null | undefined
): ProductScannerSettings => {
  const baseline = resolveProductScannerSettingsBaseline(personas, draft.playwrightPersonaId);

  return {
    playwrightPersonaId: normalizeIntegrationConnectionPlaywrightPersonaId(
      draft.playwrightPersonaId
    ),
    playwrightBrowser: normalizeProductScannerBrowser(draft.playwrightBrowser),
    captchaBehavior: normalizeProductScannerCaptchaBehavior(draft.captchaBehavior),
    manualVerificationTimeoutMs: normalizeProductScannerManualVerificationTimeoutMs(
      draft.manualVerificationTimeoutMs
    ),
    amazonImageSearchProvider: normalizeProductScannerAmazonImageSearchProvider(
      draft.amazonImageSearchProvider
    ),
    amazonImageSearchFallbackProvider:
      normalizeProductScannerAmazonImageSearchFallbackProvider(
        draft.amazonImageSearchFallbackProvider
      ),
    amazonImageSearchPageUrl: normalizeProductScannerAmazonImageSearchPageUrl(
      draft.amazonImageSearchPageUrl
    ),
    playwrightSettingsOverrides: buildPlaywrightSettingsOverrides(
      baseline,
      buildIntegrationConnectionPlaywrightSettings(draft.playwrightSettings)
    ),
    amazonCandidateEvaluator: normalizeProductScannerAmazonCandidateEvaluator(
      draft.amazonCandidateEvaluator
    ),
    amazonCandidateEvaluatorTriage: normalizeProductScannerAmazonCandidateEvaluator(
      draft.amazonCandidateEvaluatorTriage
    ),
    amazonCandidateEvaluatorProbe: normalizeProductScannerAmazonCandidateEvaluator(
      draft.amazonCandidateEvaluatorProbe
    ),
    amazonCandidateEvaluatorExtraction: normalizeProductScannerAmazonCandidateEvaluator(
      draft.amazonCandidateEvaluatorExtraction
    ),
    scanner1688: normalizeProductScanner1688Settings(draft.scanner1688),
    scanner1688CandidateEvaluator: normalizeProductScanner1688CandidateEvaluator(
      draft.scanner1688CandidateEvaluator
    ),
  };
};
