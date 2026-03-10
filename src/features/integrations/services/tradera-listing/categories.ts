import { chromium, devices, type BrowserContextOptions } from 'playwright';

import {
  parsePersistedStorageState,
  resolveConnectionPlaywrightSettings,
} from '@/features/integrations/services/tradera-playwright-settings';
import { loadTraderaSystemSettings } from '@/features/integrations/services/tradera-system-settings';
import {
  IntegrationConnectionRecord,
  TraderaCategoryRecord,
} from '@/shared/contracts/integrations';
import { internalError } from '@/shared/errors/app-error';

import { ensureLoggedIn } from './browser';
import { findVisibleLocator } from './utils';


export const fetchTraderaCategoriesForConnection = async (
  connection: IntegrationConnectionRecord
): Promise<TraderaCategoryRecord[]> => {
  const systemSettings = await loadTraderaSystemSettings();
  const listingFormUrl = systemSettings.listingFormUrl;

  const storageState = parsePersistedStorageState(connection.playwrightStorageState);
  const playwrightSettings = await resolveConnectionPlaywrightSettings(connection);
  const emulateDevice = playwrightSettings.emulateDevice;
  const deviceName = playwrightSettings.deviceName;
  const deviceProfile =
    emulateDevice && deviceName && devices[deviceName] ? devices[deviceName] : null;

  const browser = await chromium.launch({
    headless: playwrightSettings.headless,
    slowMo: playwrightSettings.slowMo,
    ...(playwrightSettings.proxyEnabled && playwrightSettings.proxyServer
      ? {
        proxy: {
          server: playwrightSettings.proxyServer,
          ...(playwrightSettings.proxyUsername
            ? { username: playwrightSettings.proxyUsername }
            : {}),
          ...(playwrightSettings.proxyPassword
            ? { password: playwrightSettings.proxyPassword }
            : {}),
        },
      }
      : {}),
  });
  const deviceContextOptions: BrowserContextOptions = deviceProfile
    ? (({ defaultBrowserType: _ignore, ...rest }) => rest)(deviceProfile)
    : {};
  const context = await browser.newContext({
    ...deviceContextOptions,
    ...(storageState ? { storageState } : {}),
  });
  context.setDefaultTimeout(playwrightSettings.timeout);
  context.setDefaultNavigationTimeout(playwrightSettings.navigationTimeout);
  const page = await context.newPage();

  try {
    await ensureLoggedIn(page, connection, listingFormUrl);

    const categorySelect = await findVisibleLocator(page, [
      'select[name*="category"]',
      '#category',
      '[data-testid*="category"] select',
    ]);
    if (!categorySelect) {
      throw internalError('Could not locate category selector on Tradera listing form.');
    }

    const options = await categorySelect.locator('option').evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: (node as HTMLOptionElement).value ?? '',
        name: node.textContent?.trim() ?? '',
      }))
    );

    return options
      .filter((option) => option.id && option.name)
      .map((option) => ({
        id: option.id,
        name: option.name,
        parentId: '0',
      }));
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
};
