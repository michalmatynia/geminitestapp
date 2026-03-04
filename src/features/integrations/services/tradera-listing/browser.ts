import { chromium, devices, type BrowserContextOptions, type Page } from 'playwright';
import { IntegrationConnectionRecord, ProductListing } from '@/shared/contracts/integrations';
import { TraderaSystemSettings } from '@/features/integrations/constants/tradera';
import { decryptSecret } from '@/features/integrations/server';
import { internalError, notFoundError } from '@/shared/errors/app-error';
import {
  LOGIN_SUCCESS_SELECTOR,
  LOGIN_FORM_SELECTOR,
  USERNAME_SELECTORS,
  PASSWORD_SELECTORS,
  LOGIN_BUTTON_SELECTORS,
  TITLE_SELECTORS,
  DESCRIPTION_SELECTORS,
  PRICE_SELECTORS,
  SUBMIT_SELECTORS,
} from './config';
import {
  findVisibleLocator,
  extractExternalListingId,
  captureTraderaListingDebugArtifacts,
} from './utils';
import {
  parsePersistedStorageState,
  resolveConnectionPlaywrightSettings,
} from '@/features/integrations/services/tradera-playwright-settings';
import { getProductRepository } from '@/features/products/server';

export const ensureLoggedIn = async (
  page: Page,
  connection: IntegrationConnectionRecord,
  listingFormUrl: string
): Promise<void> => {
  const isLoggedIn = async (): Promise<boolean> =>
    page
      .locator(LOGIN_SUCCESS_SELECTOR)
      .first()
      .isVisible()
      .catch(() => false);

  await page.goto('https://www.tradera.com/en', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  if (await isLoggedIn()) return;

  await page.goto('https://www.tradera.com/login', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.waitForSelector(LOGIN_FORM_SELECTOR, {
    state: 'attached',
    timeout: 20_000,
  });

  const usernameInput = await findVisibleLocator(page, USERNAME_SELECTORS);
  const passwordInput = await findVisibleLocator(page, PASSWORD_SELECTORS);
  if (!usernameInput || !passwordInput) {
    throw internalError('Unable to locate Tradera login inputs.');
  }

  const decryptedPassword = decryptSecret(connection.password ?? '');
  await usernameInput.fill(connection.username ?? '');
  await passwordInput.fill(decryptedPassword);

  const submitButton = await findVisibleLocator(page, LOGIN_BUTTON_SELECTORS);
  if (!submitButton) {
    throw internalError('Unable to locate Tradera login submit button.');
  }

  await Promise.allSettled([
    page.waitForNavigation({
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    }),
    submitButton.click(),
  ]);

  if (!(await isLoggedIn())) {
    throw internalError('AUTH_REQUIRED: Tradera login failed or requires manual verification.');
  }

  await page.goto(listingFormUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
};

export const runTraderaBrowserListing = async ({
  listing,
  connection,
  systemSettings,
  source,
  action,
}: {
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
  systemSettings: TraderaSystemSettings;
  source: 'manual' | 'scheduler' | 'api';
  action: 'list' | 'relist';
}): Promise<{ externalListingId: string; listingUrl?: string; simulated?: boolean }> => {
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

    const productRepository = await getProductRepository();
    const product = await productRepository.getProductById(listing.productId);
    if (!product) {
      throw notFoundError('Product not found', { productId: listing.productId });
    }

    const title =
      product.name_en ||
      product.name_pl ||
      product.name_de ||
      product.sku ||
      `Listing ${listing.productId}`;
    const description =
      product.description_en || product.description_pl || product.description_de || title;
    const priceValue =
      typeof product.price === 'number' && Number.isFinite(product.price)
        ? String(product.price)
        : '1';

    const titleInput = await findVisibleLocator(page, TITLE_SELECTORS);
    const descriptionInput = await findVisibleLocator(page, DESCRIPTION_SELECTORS);
    const priceInput = await findVisibleLocator(page, PRICE_SELECTORS);
    const submitButton = await findVisibleLocator(page, SUBMIT_SELECTORS);

    if (!titleInput || !descriptionInput || !priceInput || !submitButton) {
      throw internalError(
        'Tradera listing form selectors were not found. Update Tradera selector settings.'
      );
    }

    await titleInput.fill(title);
    await descriptionInput.fill(description);
    await priceInput.fill(priceValue);

    const previousUrl = page.url();
    await Promise.allSettled([
      page.waitForNavigation({
        waitUntil: 'domcontentloaded',
        timeout: 25_000,
      }),
      submitButton.click(),
    ]);

    const finalUrl = page.url();
    const externalListingId = extractExternalListingId(finalUrl);
    if (externalListingId) {
      return { externalListingId, listingUrl: finalUrl };
    }

    if (systemSettings.allowSimulatedSuccess) {
      const maybeListingUrl = finalUrl !== previousUrl ? finalUrl : null;
      return {
        externalListingId: `sim-${Date.now()}`,
        simulated: true,
        ...(maybeListingUrl ? { listingUrl: maybeListingUrl } : {}),
      };
    }

    throw internalError(
      `Failed to resolve Tradera listing id after ${action} (source: ${source}).`
    );
  } catch (error) {
    const debugArtifacts = await captureTraderaListingDebugArtifacts(page, listing.id, action);
    if (debugArtifacts) {
      const message = error instanceof Error ? error.message : String(error);
      throw internalError(`${message}

Debug:
${debugArtifacts}`);
    }
    throw error;
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
};
