import 'server-only';

import type { PlaywrightEngineRunRequest } from '@/features/playwright/server';
import {
  buildPlaywrightConnectionEngineLaunchOptions,
  buildPlaywrightConnectionSettingsOverrides,
} from '@/features/playwright/server';
import { buildIntegrationConnectionPlaywrightSettings } from '@/features/integrations/server';
import type { ProductScannerSettings } from '@/shared/contracts/products/scanner-settings';
import { getSettingValue } from '@/shared/lib/ai/server-settings';

import {
  PRODUCT_SCANNER_SETTINGS_KEY,
  parseProductScannerSettings,
} from '../scanner-settings';

export const getProductScannerSettings = async (): Promise<ProductScannerSettings> => {
  const raw = await getSettingValue(PRODUCT_SCANNER_SETTINGS_KEY);
  return parseProductScannerSettings(raw);
};

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
    : buildPlaywrightConnectionSettingsOverrides(
        buildIntegrationConnectionPlaywrightSettings(settings.playwrightSettingsOverrides) as any
      );

  return {
    ...(settings.playwrightPersonaId
      ? { personaId: settings.playwrightPersonaId }
      : {}),
    settingsOverrides,
    ...(Object.keys(launchOptions).length > 0 ? { launchOptions } : {}),
  };
};
