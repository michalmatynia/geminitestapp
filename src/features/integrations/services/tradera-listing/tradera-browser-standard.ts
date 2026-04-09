import { devices, type BrowserContextOptions } from 'playwright';
import { normalizeTraderaListingFormUrl, TraderaSystemSettings } from '@/features/integrations/constants/tradera';
import { encryptSecret } from '@/features/integrations/server';
import {
  parsePersistedStorageState,
  resolveConnectionPlaywrightSettings,
} from '@/features/integrations/services/tradera-playwright-settings';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { BrowserListingResultDto, ProductListing } from '@/shared/contracts/integrations/listings';
import { internalError, isAppError, notFoundError } from '@/shared/errors/app-error';
import { launchPlaywrightBrowser } from '@/shared/lib/playwright/browser-launch';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { resolveMarketplaceAwareProductCopy } from '@/shared/lib/products/utils/marketplace-content-overrides';
import { getIntegrationRepository } from '../integration-repository';
import {
  TITLE_SELECTORS,
  DESCRIPTION_SELECTORS,
  PRICE_SELECTORS,
  SUBMIT_SELECTORS,
} from './config';
import {
  findVisibleLocator,
  extractExternalListingId,
  captureTraderaListingDebugArtifacts,
  buildCanonicalTraderaListingUrl,
} from './utils';
import {
  ensureLoggedIn,
  readTraderaAuthState,
} from './tradera-browser-auth';
import { resolveTraderaListingPriceForProduct } from './price';
import { buildTraderaPricingMetadata } from './pricing-metadata';
import { buildTraderaListingDescription } from './description';

const STANDARD_REQUESTED_BROWSER_MODE = 'connection_default';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const runTraderaBrowserListingStandard = async ({
  listing,
  connection,
  systemSettings,
  source: _source,
  action,
}: {
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
  systemSettings: TraderaSystemSettings;
  source: 'manual' | 'scheduler' | 'api';
  action: 'list' | 'relist' | 'sync';
}): Promise<BrowserListingResultDto> => {
  const listingFormUrl = normalizeTraderaListingFormUrl(systemSettings.listingFormUrl);
  const storageState = parsePersistedStorageState(connection.playwrightStorageState);
  const playwrightSettings = await resolveConnectionPlaywrightSettings(connection);
  const effectiveHeadless = playwrightSettings.headless;
  const emulateDevice = playwrightSettings.emulateDevice;
  const deviceName = playwrightSettings.deviceName;
  const deviceProfile =
    emulateDevice && deviceName && devices[deviceName] ? devices[deviceName] : null;

  const { browser } = await launchPlaywrightBrowser(playwrightSettings.browser, {
    headless: effectiveHeadless,
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
  const effectiveBrowserMode = effectiveHeadless ? 'headless' : 'headed';
  let pricingMetadata: Record<string, unknown> | null = null;
  try {
    await ensureLoggedIn(page, connection, listingFormUrl);

    const productRepository = await getProductRepository();
    const product = await productRepository.getProductById(listing.productId);
    if (!product) {
        throw notFoundError('Product not found', { productId: listing.productId });
    }

    const priceResolution = await resolveTraderaListingPriceForProduct({
      product,
      targetCurrencyCode: 'EUR',
    });
    pricingMetadata = buildTraderaPricingMetadata(priceResolution);
    if (
      priceResolution.listingPrice === null ||
      !priceResolution.resolvedToTargetCurrency ||
      toTrimmedString(priceResolution.listingCurrencyCode).toUpperCase() !== 'EUR'
    ) {
      throw internalError(
        'FAIL_PRICE_RESOLUTION: Tradera listing price could not be resolved to EUR.',
        {
          mode: 'standard',
          browserMode: effectiveBrowserMode,
          requestedBrowserMode: STANDARD_REQUESTED_BROWSER_MODE,
          listingFormUrl,
          ...pricingMetadata,
        }
      );
    }

    const resolvedCopy = resolveMarketplaceAwareProductCopy({
      product,
      integrationId: listing.integrationId,
      preferredLocales: ['en', 'pl', 'de'],
    });
    const title = resolvedCopy.title;
    const description = buildTraderaListingDescription({
      rawDescription: resolvedCopy.description,
      fallbackTitle: title,
      baseProductId: product.baseProductId ?? product.id,
      sku: product.sku,
    });
    const priceValue = String(priceResolution.listingPrice);

    const titleInput = await findVisibleLocator(page, TITLE_SELECTORS);
    const descriptionInput = await findVisibleLocator(page, DESCRIPTION_SELECTORS);
    const priceInput = await findVisibleLocator(page, PRICE_SELECTORS);
    const submitButton = await findVisibleLocator(page, SUBMIT_SELECTORS);

    if (!titleInput || !descriptionInput || !priceInput || !submitButton) {
      throw internalError('Unable to locate one or more Tradera listing form fields.', {
        hasTitle: !!titleInput,
        hasDescription: !!descriptionInput,
        hasPrice: !!priceInput,
        hasSubmit: !!submitButton,
      });
    }

    await titleInput.fill(title);
    await descriptionInput.fill(description);
    await priceInput.fill(priceValue);

    await Promise.allSettled([
      page.waitForNavigation({
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      }),
      submitButton.click(),
    ]);

    const externalListingId = extractExternalListingId(page.url());
    if (!externalListingId) {
      throw internalError('Failed to capture external listing ID after submission.');
    }

    const nextStorageState = await context.storageState();
    const integrationRepository = await getIntegrationRepository();
    const completedAt = new Date().toISOString();
    await integrationRepository.updateConnection(connection.id, {
      playwrightStorageState: encryptSecret(JSON.stringify(nextStorageState)),
      playwrightStorageStateUpdatedAt: completedAt,
    });

    return {
      externalListingId,
      listingUrl: buildCanonicalTraderaListingUrl(externalListingId),
      completedAt,
      metadata: {
        mode: 'standard',
        browserMode: effectiveBrowserMode,
        requestedBrowserMode: STANDARD_REQUESTED_BROWSER_MODE,
        listingFormUrl,
        completedAt,
        ...pricingMetadata,
      },
    };
  } catch (error: unknown) {
    const errorId = `tradera-browser-standard-${Date.now()}`;
    const debugArtifacts = await captureTraderaListingDebugArtifacts(page, errorId, action);
    const authState = await readTraderaAuthState(page).catch(() => null);

    if (isAppError(error)) {
      error.meta = {
        ...error.meta,
        mode: 'standard',
        browserMode: effectiveBrowserMode,
        requestedBrowserMode: STANDARD_REQUESTED_BROWSER_MODE,
        listingFormUrl,
        ...(pricingMetadata ?? {}),
        debugArtifacts,
        authState,
        errorId,
      };
      throw error;
    }

    throw internalError(error instanceof Error ? error.message : 'Browser listing failed', {
      cause: error,
      mode: 'standard',
      browserMode: effectiveBrowserMode,
      requestedBrowserMode: STANDARD_REQUESTED_BROWSER_MODE,
      listingFormUrl,
      ...(pricingMetadata ?? {}),
      debugArtifacts,
      authState,
      errorId,
    });
  } finally {
    await context.close().catch(() => undefined);
    await browser.close();
  }
};
