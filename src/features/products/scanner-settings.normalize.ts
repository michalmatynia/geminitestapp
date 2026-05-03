import type { PlaywrightSettings } from '@/shared/contracts/playwright';
import type {
  ProductScanner1688Settings,
  ProductScannerAmazonCandidateEvaluator,
  ProductScannerAmazonImageSearchFallbackProvider,
  ProductScannerAmazonImageSearchProvider,
  ProductScannerCaptchaBehavior,
  ProductScannerSettings,
} from '@/shared/contracts/products/scanner-settings';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import {
  normalizeIntegrationConnectionPlaywrightPersonaId,
  type IntegrationConnectionPlaywrightBrowser,
} from '@/features/playwright/utils/playwright-settings-baseline';

import {
  BOOLEAN_PLAYWRIGHT_SETTING_KEYS,
  DEFAULT_PRODUCT_SCANNER_1688_CANDIDATE_RESULT_LIMIT,
  DEFAULT_PRODUCT_SCANNER_1688_MAX_EXTRACTED_IMAGES,
  DEFAULT_PRODUCT_SCANNER_1688_MINIMUM_CANDIDATE_SCORE,
  DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_FALLBACK_PROVIDER,
  DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PAGE_URL,
  DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PROVIDER,
  DEFAULT_PRODUCT_SCANNER_CAPTCHA_BEHAVIOR,
  DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS,
  NUMBER_PLAYWRIGHT_SETTING_KEYS,
  STRING_PLAYWRIGHT_SETTING_KEYS,
  createDefaultProductScanner1688Settings,
  createDefaultProductScannerAmazonCandidateEvaluator,
  createDefaultProductScannerSettings,
} from './scanner-settings.defaults';
import {
  normalizeProductScanner1688CandidateEvaluator,
  normalizeProductScannerAmazonCandidateEvaluator,
} from './scanner-settings.normalize.evaluators';

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const normalizeProductScannerBrowser = (
  value: unknown
): IntegrationConnectionPlaywrightBrowser => {
  return value === 'auto' ||
    value === 'brave' ||
    value === 'chrome' ||
    value === 'chromium'
    ? value
    : 'auto';
};

export const normalizeProductScannerCaptchaBehavior = (
  value: unknown
): ProductScannerCaptchaBehavior =>
  value === 'fail' ? 'fail' : DEFAULT_PRODUCT_SCANNER_CAPTCHA_BEHAVIOR;

export const normalizeProductScannerAmazonImageSearchProvider = (
  value: unknown
): ProductScannerAmazonImageSearchProvider =>
  value === 'google_images_url' || value === 'google_lens_upload'
    ? value
    : DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PROVIDER;

export const normalizeProductScannerAmazonImageSearchFallbackProvider = (
  value: unknown
): ProductScannerAmazonImageSearchFallbackProvider =>
  value === 'google_images_upload' ||
  value === 'google_images_url' ||
  value === 'google_lens_upload'
    ? value
    : DEFAULT_PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_FALLBACK_PROVIDER;

export const normalizeProductScannerAmazonImageSearchPageUrl = (
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

export const normalizeProductScannerManualVerificationTimeoutMs = (
  value: unknown
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS;
  }

  const normalized = Math.trunc(value);
  if (normalized <= 0) {
    return DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS;
  }

  return Math.min(normalized, 900_000);
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

export const normalizeProductScanner1688Settings = (
  value: unknown
): ProductScanner1688Settings => {
  if (!isRecordObject(value)) {
    return createDefaultProductScanner1688Settings();
  }

  return {
    candidateResultLimit: normalizeIntegerInRange(
      value['candidateResultLimit'],
      DEFAULT_PRODUCT_SCANNER_1688_CANDIDATE_RESULT_LIMIT,
      1,
      20
    ),
    minimumCandidateScore: normalizeIntegerInRange(
      value['minimumCandidateScore'],
      DEFAULT_PRODUCT_SCANNER_1688_MINIMUM_CANDIDATE_SCORE,
      1,
      20
    ),
    maxExtractedImages: normalizeIntegerInRange(
      value['maxExtractedImages'],
      DEFAULT_PRODUCT_SCANNER_1688_MAX_EXTRACTED_IMAGES,
      1,
      20
    ),
    allowUrlImageSearchFallback: value['allowUrlImageSearchFallback'] !== false,
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

const normalizeBooleanPlaywrightSettings = (
  record: Record<string, unknown>
): Partial<PlaywrightSettings> => {
  const normalized: Partial<PlaywrightSettings> = {};

  for (const key of BOOLEAN_PLAYWRIGHT_SETTING_KEYS) {
    const value = record[key];
    if (typeof value === 'boolean') {
      normalized[key] = value;
    }
  }

  return normalized;
};

const normalizeNumberPlaywrightSettings = (
  record: Record<string, unknown>
): Partial<PlaywrightSettings> => {
  const normalized: Partial<PlaywrightSettings> = {};

  for (const key of NUMBER_PLAYWRIGHT_SETTING_KEYS) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      normalized[key] = value;
    }
  }

  return normalized;
};

const normalizeStringPlaywrightSettings = (
  record: Record<string, unknown>
): Partial<PlaywrightSettings> => {
  const normalized: Partial<PlaywrightSettings> = {};

  for (const key of STRING_PLAYWRIGHT_SETTING_KEYS) {
    const value = record[key];
    if (typeof value === 'string') {
      normalized[key] = value;
    }
  }

  return normalized;
};

const normalizeProductScannerSettingsOverrides = (
  value: unknown
): Partial<PlaywrightSettings> => {
  if (!isRecordObject(value)) {
    return {};
  }

  return {
    ...normalizeBooleanPlaywrightSettings(value),
    ...normalizeNumberPlaywrightSettings(value),
    ...normalizeStringPlaywrightSettings(value),
  };
};

const normalizePlaywrightPersonaId = (value: unknown): string | null =>
  normalizeIntegrationConnectionPlaywrightPersonaId(
    typeof value === 'string' ? value : null
  );

export const normalizeProductScannerSettings = (
  value: unknown
): ProductScannerSettings => {
  if (!isRecordObject(value)) {
    return createDefaultProductScannerSettings();
  }

  const normalizedOverrides = normalizeProductScannerSettingsOverrides(
    value['playwrightSettingsOverrides']
  );
  const normalizedLegacySettings = normalizeProductScannerSettingsOverrides(
    value['playwrightSettings']
  );
  const legacyEvaluator = normalizeProductScannerAmazonCandidateEvaluator(
    value['amazonCandidateEvaluator']
  );

  return {
    playwrightPersonaId: normalizePlaywrightPersonaId(value['playwrightPersonaId']),
    playwrightBrowser: normalizeProductScannerBrowser(value['playwrightBrowser']),
    captchaBehavior: normalizeProductScannerCaptchaBehavior(value['captchaBehavior']),
    manualVerificationTimeoutMs: normalizeProductScannerManualVerificationTimeoutMs(
      value['manualVerificationTimeoutMs']
    ),
    amazonImageSearchProvider: normalizeProductScannerAmazonImageSearchProvider(
      value['amazonImageSearchProvider']
    ),
    amazonImageSearchFallbackProvider:
      normalizeProductScannerAmazonImageSearchFallbackProvider(
        value['amazonImageSearchFallbackProvider']
      ),
    amazonImageSearchPageUrl: normalizeProductScannerAmazonImageSearchPageUrl(
      value['amazonImageSearchPageUrl']
    ),
    playwrightSettingsOverrides:
      Object.keys(normalizedOverrides).length > 0
        ? normalizedOverrides
        : normalizedLegacySettings,
    amazonCandidateEvaluator: legacyEvaluator,
    amazonCandidateEvaluatorTriage: resolveProductScannerAmazonCandidateEvaluator(
      value['amazonCandidateEvaluatorTriage'],
      createDefaultProductScannerAmazonCandidateEvaluator()
    ),
    amazonCandidateEvaluatorProbe: resolveProductScannerAmazonCandidateEvaluator(
      value['amazonCandidateEvaluatorProbe'],
      legacyEvaluator
    ),
    amazonCandidateEvaluatorExtraction: resolveProductScannerAmazonCandidateEvaluator(
      value['amazonCandidateEvaluatorExtraction'],
      legacyEvaluator
    ),
    scanner1688: normalizeProductScanner1688Settings(value['scanner1688']),
    scanner1688CandidateEvaluator: normalizeProductScanner1688CandidateEvaluator(
      value['scanner1688CandidateEvaluator']
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
