import 'server-only';

import type { PlaywrightEngineRunRequest } from '@/features/playwright/server';
import { buildPlaywrightConnectionEngineLaunchOptions } from '@/features/playwright/server';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/playwright';
import type { ProductScannerAmazonCandidateEvaluator, ProductScannerSettings } from '@/shared/contracts/products/scanner-settings';
import { buildIntegrationConnectionPlaywrightSettings } from '@/features/integrations/server';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { normalizePlaywrightPersonas } from '@/shared/lib/playwright/personas';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import {
  PRODUCT_SCANNER_SETTINGS_KEY,
  createDefaultProductScannerAmazonCandidateEvaluator,
  parseProductScannerSettings,
  resolveProductScannerSettingsBaseline,
} from '../scanner-settings';

const DEFAULT_AMAZON_CANDIDATE_EVALUATOR_SYSTEM_PROMPT =
  'Evaluate whether the Amazon page represents the same product as the source product. Compare the visible product image, title, description, and key attributes. Return a conservative judgment and reject mismatches.';

export type ProductScannerAmazonCandidateEvaluatorResolvedConfig =
  | {
      enabled: false;
      mode: ProductScannerAmazonCandidateEvaluator['mode'];
      threshold: number;
      onlyForAmbiguousCandidates: boolean;
      modelId: null;
      systemPrompt: null;
      brainApplied: null;
    }
  | {
      enabled: true;
      mode: ProductScannerAmazonCandidateEvaluator['mode'];
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
  const evaluator =
    settings.amazonCandidateEvaluator ?? createDefaultProductScannerAmazonCandidateEvaluator();

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
    evaluator.systemPrompt?.trim() || DEFAULT_AMAZON_CANDIDATE_EVALUATOR_SYSTEM_PROMPT;

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
