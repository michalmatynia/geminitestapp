import type { PlaywrightSettings } from '@/shared/contracts/playwright';
import type {
  ProductScanner1688CandidateEvaluator,
  ProductScanner1688Settings,
  ProductScannerAmazonCandidateEvaluator,
  ProductScannerSettings,
} from '@/shared/contracts/products/scanner-settings';

import {
  buildIntegrationConnectionPlaywrightSettings,
  normalizeIntegrationConnectionPlaywrightPersonaId,
  resolveIntegrationPlaywrightPersonaSettings,
} from '@/features/playwright/utils/playwright-settings-baseline';

import {
  BOOLEAN_PLAYWRIGHT_SETTING_KEYS,
  NUMBER_PLAYWRIGHT_SETTING_KEYS,
  STRING_PLAYWRIGHT_SETTING_KEYS,
  createDefaultProductScanner1688CandidateEvaluator,
  createDefaultProductScanner1688Settings,
  createDefaultProductScannerAmazonCandidateEvaluator,
  defaultProductScannerPlaywrightSettings,
  type PersonaSettingsSource,
  type ProductScannerSettingsDraft,
} from './scanner-settings.defaults';
import {
  normalizeProductScanner1688CandidateEvaluator,
  normalizeProductScannerAmazonCandidateEvaluator,
} from './scanner-settings.normalize.evaluators';
import {
  normalizeProductScanner1688Settings,
  normalizeProductScannerAmazonImageSearchFallbackProvider,
  normalizeProductScannerAmazonImageSearchPageUrl,
  normalizeProductScannerAmazonImageSearchProvider,
  normalizeProductScannerBrowser,
  normalizeProductScannerCaptchaBehavior,
  normalizeProductScannerManualVerificationTimeoutMs,
} from './scanner-settings.normalize';

export const resolveProductScannerSettingsBaseline = (
  personas: PersonaSettingsSource | null | undefined,
  personaId: string | null | undefined
): PlaywrightSettings => {
  const hasPersonaId = typeof personaId === 'string' && personaId.length > 0;
  if (!hasPersonaId) {
    return defaultProductScannerPlaywrightSettings;
  }

  return buildIntegrationConnectionPlaywrightSettings(
    resolveIntegrationPlaywrightPersonaSettings(personas, personaId)
  );
};

const resolveAmazonDraftEvaluator = (
  evaluator: ProductScannerAmazonCandidateEvaluator | null | undefined
): ProductScannerAmazonCandidateEvaluator =>
  evaluator ?? createDefaultProductScannerAmazonCandidateEvaluator();

const resolve1688DraftSettings = (
  settings: ProductScanner1688Settings | null | undefined
): ProductScanner1688Settings => settings ?? createDefaultProductScanner1688Settings();

const resolve1688DraftEvaluator = (
  evaluator: ProductScanner1688CandidateEvaluator | null | undefined
): ProductScanner1688CandidateEvaluator =>
  evaluator ?? createDefaultProductScanner1688CandidateEvaluator();

const buildAmazonDraftEvaluatorSettings = (
  settings: ProductScannerSettings
): Pick<
  ProductScannerSettingsDraft,
  | 'amazonCandidateEvaluator'
  | 'amazonCandidateEvaluatorTriage'
  | 'amazonCandidateEvaluatorProbe'
  | 'amazonCandidateEvaluatorExtraction'
> => ({
  amazonCandidateEvaluator: resolveAmazonDraftEvaluator(settings.amazonCandidateEvaluator),
  amazonCandidateEvaluatorTriage: resolveAmazonDraftEvaluator(
    settings.amazonCandidateEvaluatorTriage
  ),
  amazonCandidateEvaluatorProbe: resolveAmazonDraftEvaluator(
    settings.amazonCandidateEvaluatorProbe
  ),
  amazonCandidateEvaluatorExtraction: resolveAmazonDraftEvaluator(
    settings.amazonCandidateEvaluatorExtraction
  ),
});

const build1688DraftSettings = (
  settings: ProductScannerSettings
): Pick<ProductScannerSettingsDraft, 'scanner1688' | 'scanner1688CandidateEvaluator'> => ({
  scanner1688: resolve1688DraftSettings(settings.scanner1688),
  scanner1688CandidateEvaluator: resolve1688DraftEvaluator(
    settings.scanner1688CandidateEvaluator
  ),
});

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
    ...buildAmazonDraftEvaluatorSettings(settings),
    ...build1688DraftSettings(settings),
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
