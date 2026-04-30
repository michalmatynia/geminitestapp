import 'server-only';

import type { PlaywrightEngineRunRequest } from '@/features/playwright/server';
import { buildPlaywrightConnectionEngineLaunchOptions } from '@/features/playwright/server';
import {
  PLAYWRIGHT_PERSONA_SETTINGS_KEY,
  type PlaywrightPersona,
  type PlaywrightSettings,
} from '@/shared/contracts/playwright';
import type { ProductScannerSettings } from '@/shared/contracts/products/scanner-settings';
import { buildIntegrationConnectionPlaywrightSettings } from '@/features/playwright/utils/playwright-settings-baseline';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { normalizePlaywrightPersonas } from '@/shared/lib/playwright/personas';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import {
  PRODUCT_SCANNER_SETTINGS_KEY,
  parseProductScannerSettings,
  resolveProductScannerSettingsBaseline,
} from '../scanner-settings';
import {
  DEFAULT_AMAZON_CANDIDATE_EVALUATOR_SYSTEM_PROMPT,
  DEFAULT_AMAZON_CANDIDATE_TRIAGE_SYSTEM_PROMPT,
  resolveProductScanner1688CandidateEvaluatorConfigFromSettings,
  resolveProductScannerAmazonCandidateEvaluatorConfigFromSettings,
  type ProductScanner1688CandidateEvaluatorResolvedConfig,
  type ProductScannerAmazonCandidateEvaluatorResolvedConfig,
} from './product-scanner-settings.evaluators';

export type {
  ProductScanner1688CandidateEvaluatorResolvedConfig,
  ProductScannerAmazonCandidateEvaluatorResolvedConfig,
} from './product-scanner-settings.evaluators';

export const getProductScannerSettings = async (): Promise<ProductScannerSettings> => {
  const raw = await getSettingValue(PRODUCT_SCANNER_SETTINGS_KEY);
  return parseProductScannerSettings(raw);
};

const getStoredPlaywrightPersonas = async (): Promise<PlaywrightPersona[]> => {
  const raw = await getSettingValue(PLAYWRIGHT_PERSONA_SETTINGS_KEY);
  return normalizePlaywrightPersonas(parseJsonSetting(raw, []));
};

export const resolveProductScannerEffectiveSettings = async (
  settings: ProductScannerSettings
): Promise<PlaywrightSettings> => {
  const personaId = settings.playwrightPersonaId;
  const personas = personaId !== null ? await getStoredPlaywrightPersonas() : [];
  return buildIntegrationConnectionPlaywrightSettings({
    ...resolveProductScannerSettingsBaseline(personas, personaId),
    ...settings.playwrightSettingsOverrides,
  });
};

export const resolveProductScannerHeadless = async (
  settings: ProductScannerSettings
): Promise<boolean> => (await resolveProductScannerEffectiveSettings(settings)).headless;

export const buildProductScannerEngineRequestOptions = (
  settings: ProductScannerSettings
): Pick<PlaywrightEngineRunRequest, 'personaId' | 'settingsOverrides' | 'launchOptions'> => {
  const personaId = settings.playwrightPersonaId;
  const launchOptions =
    settings.playwrightBrowser === 'chromium'
      ? {}
      : buildPlaywrightConnectionEngineLaunchOptions({
          browserPreference: settings.playwrightBrowser,
        });
  const settingsOverrides = personaId !== null
    ? {
        ...settings.playwrightSettingsOverrides,
      }
    : {
        ...resolveProductScannerSettingsBaseline([], null),
        ...settings.playwrightSettingsOverrides,
      };

  return {
    ...(personaId !== null ? { personaId } : {}),
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
