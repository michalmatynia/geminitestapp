import 'server-only';

import type { PlaywrightEngineRunRequest } from '@/features/playwright/server';
import { buildPlaywrightConnectionEngineLaunchOptions } from '@/features/playwright/server';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/playwright';
import type {
  ProductScanner1688CandidateEvaluator,
  ProductScannerAmazonCandidateEvaluator,
  ProductScannerSettings,
} from '@/shared/contracts/products/scanner-settings';
import { buildIntegrationConnectionPlaywrightSettings } from '@/features/integrations/server';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { normalizePlaywrightPersonas } from '@/shared/lib/playwright/personas';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import {
  PRODUCT_SCANNER_SETTINGS_KEY,
  createDefaultProductScanner1688CandidateEvaluator,
  createDefaultProductScannerAmazonCandidateEvaluator,
  parseProductScannerSettings,
  resolveProductScannerSettingsBaseline,
} from '../scanner-settings';

const DEFAULT_AMAZON_CANDIDATE_EVALUATOR_SYSTEM_PROMPT =
  'Evaluate whether the Amazon page represents the same product as the source product. Compare the visible product image, title, description, and key attributes. Also judge whether the visible Amazon page content is English enough to trust scraping into English product fields. Return a conservative judgment and reject mismatches or non-English pages when required.';

const DEFAULT_AMAZON_CANDIDATE_TRIAGE_SYSTEM_PROMPT =
  'Review lightweight Amazon candidate search results before any Amazon page is opened. Rank likely matches first, discard obvious wrong products, and prefer marketplaces that fit the allowed content language. Stay conservative and keep this decision cheap.';

const DEFAULT_1688_CANDIDATE_EVALUATOR_SYSTEM_PROMPT =
  'Evaluate whether the 1688 supplier product page represents the same product as the source product. Compare the source product image, the supplier page title, extracted supplier images, pricing, and supplier screenshot. Approve only when the supplier page clearly matches the same product or close variant intended for sourcing.';

export type ProductScannerAmazonCandidateEvaluatorResolvedConfig =
    | {
      enabled: false;
      mode: ProductScannerAmazonCandidateEvaluator['mode'];
      threshold: number;
      onlyForAmbiguousCandidates: boolean;
      candidateSimilarityMode: ProductScannerAmazonCandidateEvaluator['candidateSimilarityMode'];
      allowedContentLanguage: ProductScannerAmazonCandidateEvaluator['allowedContentLanguage'];
      rejectNonEnglishContent: boolean;
      languageDetectionMode: ProductScannerAmazonCandidateEvaluator['languageDetectionMode'];
      modelId: null;
      systemPrompt: null;
      brainApplied: null;
    }
  | {
      enabled: true;
      mode: ProductScannerAmazonCandidateEvaluator['mode'];
      threshold: number;
      onlyForAmbiguousCandidates: boolean;
      candidateSimilarityMode: ProductScannerAmazonCandidateEvaluator['candidateSimilarityMode'];
      allowedContentLanguage: ProductScannerAmazonCandidateEvaluator['allowedContentLanguage'];
      rejectNonEnglishContent: boolean;
      languageDetectionMode: ProductScannerAmazonCandidateEvaluator['languageDetectionMode'];
      modelId: string;
      systemPrompt: string;
      brainApplied: Record<string, unknown> | null;
    };

export type ProductScanner1688CandidateEvaluatorResolvedConfig =
  | {
      enabled: false;
      mode: ProductScanner1688CandidateEvaluator['mode'];
      threshold: number;
      onlyForAmbiguousCandidates: boolean;
      modelId: null;
      systemPrompt: null;
      brainApplied: null;
    }
  | {
      enabled: true;
      mode: ProductScanner1688CandidateEvaluator['mode'];
      threshold: number;
      onlyForAmbiguousCandidates: boolean;
      modelId: string;
      systemPrompt: string;
      brainApplied: Record<string, unknown> | null;
    };

export const getProductScannerSettings = async (): Promise<ProductScannerSettings> => {
  const raw = await getSettingValue(PRODUCT_SCANNER_SETTINGS_KEY);
  return parseProductScannerSettings(raw);
};

const getStoredPlaywrightPersonas = async () => {
  const raw = await getSettingValue(PLAYWRIGHT_PERSONA_SETTINGS_KEY);
  return normalizePlaywrightPersonas(parseJsonSetting(raw, []));
};

export const resolveProductScannerEffectiveSettings = async (
  settings: ProductScannerSettings
) => {
  const personas = settings.playwrightPersonaId ? await getStoredPlaywrightPersonas() : [];
  return buildIntegrationConnectionPlaywrightSettings({
    ...resolveProductScannerSettingsBaseline(personas, settings.playwrightPersonaId),
    ...settings.playwrightSettingsOverrides,
  });
};

export const resolveProductScannerHeadless = async (
  settings: ProductScannerSettings
): Promise<boolean> => (await resolveProductScannerEffectiveSettings(settings)).headless;

export const buildProductScannerEngineRequestOptions = (
  settings: ProductScannerSettings
): Pick<PlaywrightEngineRunRequest, 'personaId' | 'settingsOverrides' | 'launchOptions'> => {
  const launchOptions =
    settings.playwrightBrowser === 'chromium'
      ? {}
      : buildPlaywrightConnectionEngineLaunchOptions({
          browserPreference: settings.playwrightBrowser,
        });
  const settingsOverrides = settings.playwrightPersonaId
    ? {
        ...settings.playwrightSettingsOverrides,
      }
    : {
        ...resolveProductScannerSettingsBaseline([], null),
        ...settings.playwrightSettingsOverrides,
      };

  return {
    ...(settings.playwrightPersonaId
      ? { personaId: settings.playwrightPersonaId }
      : {}),
    settingsOverrides,
    ...(Object.keys(launchOptions).length > 0 ? { launchOptions } : {}),
  };
};

export const resolveProductScannerAmazonCandidateEvaluatorConfig = async (
  settings: ProductScannerSettings
): Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig> => {
  return await resolveProductScannerAmazonCandidateEvaluatorConfigFromSettings(
    settings.amazonCandidateEvaluator
  );
};

export const resolveProductScannerAmazonCandidateEvaluatorTriageConfig = async (
  settings: ProductScannerSettings
): Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig> => {
  return await resolveProductScannerAmazonCandidateEvaluatorConfigFromSettings(
    settings.amazonCandidateEvaluatorTriage,
    {
      defaultSystemPrompt: DEFAULT_AMAZON_CANDIDATE_TRIAGE_SYSTEM_PROMPT,
      runtimeKind: 'chat',
    }
  );
};

export const resolveProductScannerAmazonCandidateEvaluatorProbeConfig = async (
  settings: ProductScannerSettings
): Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig> => {
  return await resolveProductScannerAmazonCandidateEvaluatorConfigFromSettings(
    settings.amazonCandidateEvaluatorProbe ?? settings.amazonCandidateEvaluator,
    {
      defaultSystemPrompt: DEFAULT_AMAZON_CANDIDATE_EVALUATOR_SYSTEM_PROMPT,
      runtimeKind: 'vision',
    }
  );
};

export const resolveProductScannerAmazonCandidateEvaluatorExtractionConfig = async (
  settings: ProductScannerSettings
): Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig> => {
  return await resolveProductScannerAmazonCandidateEvaluatorConfigFromSettings(
    settings.amazonCandidateEvaluatorExtraction ?? settings.amazonCandidateEvaluator,
    {
      defaultSystemPrompt: DEFAULT_AMAZON_CANDIDATE_EVALUATOR_SYSTEM_PROMPT,
      runtimeKind: 'vision',
    }
  );
};

export const resolveProductScanner1688CandidateEvaluatorConfig = async (
  settings: ProductScannerSettings
): Promise<ProductScanner1688CandidateEvaluatorResolvedConfig> => {
  return await resolveProductScanner1688CandidateEvaluatorConfigFromSettings(
    settings.scanner1688CandidateEvaluator
  );
};

const resolveProductScannerAmazonCandidateEvaluatorConfigFromSettings = async (
  evaluatorCandidate?: ProductScannerSettings['amazonCandidateEvaluatorProbe']
    | ProductScannerSettings['amazonCandidateEvaluatorTriage']
    | ProductScannerSettings['amazonCandidateEvaluatorExtraction']
    | ProductScannerSettings['amazonCandidateEvaluator'],
  options: {
    defaultSystemPrompt: string;
    runtimeKind: 'chat' | 'vision';
  } = {
    defaultSystemPrompt: DEFAULT_AMAZON_CANDIDATE_EVALUATOR_SYSTEM_PROMPT,
    runtimeKind: 'vision',
  }
): Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig> => {
  const evaluator =
    evaluatorCandidate ?? createDefaultProductScannerAmazonCandidateEvaluator();

  if (evaluator.mode === 'disabled') {
    return {
      enabled: false,
      mode: evaluator.mode,
      threshold: evaluator.threshold,
      onlyForAmbiguousCandidates: evaluator.onlyForAmbiguousCandidates,
      candidateSimilarityMode: evaluator.candidateSimilarityMode,
      allowedContentLanguage: evaluator.allowedContentLanguage,
      rejectNonEnglishContent: evaluator.rejectNonEnglishContent,
      languageDetectionMode: evaluator.languageDetectionMode,
      modelId: null,
      systemPrompt: null,
      brainApplied: null,
    };
  }

  const systemPrompt =
    evaluator.systemPrompt?.trim() || options.defaultSystemPrompt;

  if (evaluator.mode === 'model_override') {
    const modelId = evaluator.modelId?.trim() || '';
    if (!modelId) {
      throw new Error(
        'Amazon candidate evaluator is set to model override, but no model id is configured.'
      );
    }

    return {
      enabled: true,
      mode: evaluator.mode,
      threshold: evaluator.threshold,
      onlyForAmbiguousCandidates: evaluator.onlyForAmbiguousCandidates,
      candidateSimilarityMode: evaluator.candidateSimilarityMode,
      allowedContentLanguage: evaluator.allowedContentLanguage,
      rejectNonEnglishContent: evaluator.rejectNonEnglishContent,
      languageDetectionMode: evaluator.languageDetectionMode,
      modelId,
      systemPrompt,
      brainApplied: null,
    };
  }

  const brainConfig = await resolveBrainExecutionConfigForCapability(
    'product.scan.amazon_candidate_match',
    {
      defaultTemperature: 0.1,
      defaultMaxTokens: 600,
      defaultSystemPrompt: systemPrompt,
      runtimeKind: options.runtimeKind,
    }
  );

  return {
    enabled: true,
    mode: evaluator.mode,
    threshold: evaluator.threshold,
    onlyForAmbiguousCandidates: evaluator.onlyForAmbiguousCandidates,
    candidateSimilarityMode: evaluator.candidateSimilarityMode,
    allowedContentLanguage: evaluator.allowedContentLanguage,
    rejectNonEnglishContent: evaluator.rejectNonEnglishContent,
    languageDetectionMode: evaluator.languageDetectionMode,
    modelId: brainConfig.modelId,
    systemPrompt: brainConfig.systemPrompt,
    brainApplied: brainConfig.brainApplied as Record<string, unknown>,
  };
};

const resolveProductScanner1688CandidateEvaluatorConfigFromSettings = async (
  evaluatorCandidate?: ProductScannerSettings['scanner1688CandidateEvaluator']
): Promise<ProductScanner1688CandidateEvaluatorResolvedConfig> => {
  const evaluator =
    evaluatorCandidate ?? createDefaultProductScanner1688CandidateEvaluator();

  if (evaluator.mode === 'disabled') {
    return {
      enabled: false,
      mode: evaluator.mode,
      threshold: evaluator.threshold,
      onlyForAmbiguousCandidates: evaluator.onlyForAmbiguousCandidates,
      modelId: null,
      systemPrompt: null,
      brainApplied: null,
    };
  }

  const systemPrompt =
    evaluator.systemPrompt?.trim() || DEFAULT_1688_CANDIDATE_EVALUATOR_SYSTEM_PROMPT;

  if (evaluator.mode === 'model_override') {
    const modelId = evaluator.modelId?.trim() || '';
    if (!modelId) {
      throw new Error(
        '1688 candidate evaluator is set to model override, but no model id is configured.'
      );
    }

    return {
      enabled: true,
      mode: evaluator.mode,
      threshold: evaluator.threshold,
      onlyForAmbiguousCandidates: evaluator.onlyForAmbiguousCandidates,
      modelId,
      systemPrompt,
      brainApplied: null,
    };
  }

  const brainConfig = await resolveBrainExecutionConfigForCapability(
    'product.scan.1688_supplier_match',
    {
      defaultTemperature: 0.1,
      defaultMaxTokens: 500,
      defaultSystemPrompt: systemPrompt,
      runtimeKind: 'vision',
    }
  );

  return {
    enabled: true,
    mode: evaluator.mode,
    threshold: evaluator.threshold,
    onlyForAmbiguousCandidates: evaluator.onlyForAmbiguousCandidates,
    modelId: brainConfig.modelId,
    systemPrompt: brainConfig.systemPrompt,
    brainApplied: brainConfig.brainApplied as Record<string, unknown>,
  };
};
