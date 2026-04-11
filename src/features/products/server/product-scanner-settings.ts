import 'server-only';

import type { PlaywrightEngineRunRequest } from '@/features/playwright/server';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/playwright';
import {
  buildPlaywrightConnectionEngineLaunchOptions,
} from '@/features/playwright/server';
import { buildIntegrationConnectionPlaywrightSettings } from '@/features/integrations/server';
import type { ProductScannerSettings } from '@/shared/contracts/products/scanner-settings';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { normalizePlaywrightPersonas } from '@/shared/lib/playwright/personas';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import {
  PRODUCT_SCANNER_SETTINGS_KEY,
  parseProductScannerSettings,
  resolveProductScannerSettingsBaseline,
} from '../scanner-settings';

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
