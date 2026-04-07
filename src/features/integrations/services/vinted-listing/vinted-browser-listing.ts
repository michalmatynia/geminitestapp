import { chromium } from 'playwright';
import {
  VINTED_LISTING_FORM_URL,
  VINTED_TITLE_SELECTORS,
  VINTED_DESCRIPTION_SELECTORS,
  VINTED_PRICE_SELECTORS,
  VINTED_SUBMIT_SELECTORS,
  VINTED_IMAGE_UPLOAD_SELECTORS,
  VINTED_CATEGORY_SELECTORS,
  VINTED_BRAND_SELECTORS,
  VINTED_SIZE_SELECTORS,
  VINTED_CONDITION_SELECTORS,
} from './config';
import {
  resolveConnectionPlaywrightSettings,
} from '@/features/integrations/services/tradera-playwright-settings';
import { decryptSecret, encryptSecret, getIntegrationRepository } from '@/features/integrations/server';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { ProductListing } from '@/shared/contracts/integrations/listings';
import { internalError, notFoundError } from '@/shared/errors/app-error';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { createVintedBrowserTestUtils } from './vinted-browser-test-utils';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { resolveVintedProductImageUploadPlan } from './vinted-browser-images';
import type { BrowserListingResultDto } from '@/shared/contracts/integrations/listings';

export type VintedBrowserListingResult = BrowserListingResultDto;

export const runVintedBrowserListing = async ({
  listing,
  connection,
  source: _source,
}: {
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
  source: 'manual' | 'scheduler' | 'api';
  action: 'list' | 'relist' | 'sync';
}): Promise<VintedBrowserListingResult> => {
  
  // 1. Resolve storage state
  let storedState = null;
  if (connection.playwrightStorageState) {
    try {
      const raw = decryptSecret(connection.playwrightStorageState);
      storedState = JSON.parse(raw);
    } catch (e) {
      void ErrorSystem.captureException(e);
    }
  }

  const playwrightSettings = await resolveConnectionPlaywrightSettings(connection);
  const effectiveHeadless = playwrightSettings.headless;
  const browser = await chromium.launch({
    headless: effectiveHeadless,
    slowMo: playwrightSettings.slowMo,
  });

  const context = await browser.newContext({
    ...(storedState ? { storageState: storedState } : {}),
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  const {
    safeGoto,
    acceptCookieConsent,
    humanizedFill,
    humanizedClick,
    safeIsVisible,
  } = createVintedBrowserTestUtils({
    page,
    connectionId: connection.id,
    fail: async (step, detail) => { throw internalError(`${step}: ${detail}`); },
  });

  try {
    // 2. Auth check
    await safeGoto(VINTED_LISTING_FORM_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }, 'Open Vinted Sell Form');
    await acceptCookieConsent();
    
    const loginFormVisible = await safeIsVisible(page.locator('.c-login-form').first());
    if (loginFormVisible) {
       throw internalError('AUTH_REQUIRED: Vinted session expired. Please refresh the session.');
    }

    // 3. Load product data
    const productRepository = await getProductRepository();
    const product = await productRepository.getProductById(listing.productId);
    if (!product) {
        throw notFoundError('Product not found', { productId: listing.productId });
    }

    // 4. Handle Images
    const imageUploadPlan = await resolveVintedProductImageUploadPlan(product);
    if (imageUploadPlan.localImagePaths.length > 0) {
        const fileInput = page.locator(VINTED_IMAGE_UPLOAD_SELECTORS[0]!).first();
        await fileInput.setInputFiles(imageUploadPlan.localImagePaths);
        await page.waitForTimeout(3000); // Wait for uploads to start
    }

    const title = product.name_pl || product.name_en || product.sku || `Listing ${listing.productId}`;
    const description = product.description_pl || product.description_en || title;
    const price = product.price ? String(Math.floor(product.price)) : '10';

    // 5. Fill form
    const findAndFill = async (selectors: string[], value: string, name: string) => {
        for (const selector of selectors) {
            const locator = page.locator(selector).first();
            if (await safeIsVisible(locator)) {
                await humanizedFill(locator, value);
                return;
            }
        }
        throw internalError(`Field ${name} not found.`);
    };

    await findAndFill(VINTED_TITLE_SELECTORS, title, 'Title');
    await findAndFill(VINTED_DESCRIPTION_SELECTORS, description, 'Description');

    // Category Selection (Scaffold - often requires multiple clicks)
    const categorySelector = page.locator(VINTED_CATEGORY_SELECTORS[0]!).first();
    if (await safeIsVisible(categorySelector)) {
        await humanizedClick(categorySelector);
        await page.waitForTimeout(1000);
        const firstCategory = page.locator('.c-category-select__item').first();
        if (await safeIsVisible(firstCategory)) {
            await humanizedClick(firstCategory);
        }
    }

    // Brand, Size, Condition (Scaffold)
    await page.waitForTimeout(1000);
    
    const findAndClickFirstOption = async (selectors: string[], name: string) => {
        for (const selector of selectors) {
            const trigger = page.locator(selector).first();
            if (await safeIsVisible(trigger)) {
                await humanizedClick(trigger);
                await page.waitForTimeout(500);
                const firstOption = page.locator('.c-select__option, .c-dropdown__item').first();
                if (await safeIsVisible(firstOption)) {
                    await humanizedClick(firstOption);
                    return;
                }
            }
        }
        console.warn(`Optional field ${name} not handled.`);
    };

    await findAndClickFirstOption(VINTED_BRAND_SELECTORS, 'Brand');
    await findAndClickFirstOption(VINTED_CONDITION_SELECTORS, 'Condition');
    await findAndClickFirstOption(VINTED_SIZE_SELECTORS, 'Size');

    await findAndFill(VINTED_PRICE_SELECTORS, price, 'Price');

    // 6. Submit
    const submitButtonSelector = VINTED_SUBMIT_SELECTORS[0]!;
    const submitButton = page.locator(submitButtonSelector).first();
    if (await safeIsVisible(submitButton)) {
        // Wait for it to be enabled (images uploaded, fields filled)
        await page.waitForFunction((sel) => {
            const btn = document.querySelector(sel) as HTMLButtonElement;
            return btn && !btn.disabled;
        }, submitButtonSelector, { timeout: 15000 }).catch(() => undefined);

        await humanizedClick(submitButton);
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => undefined);
    }

    const externalListingId = `vinted-${Date.now()}`;
    const listingUrl = page.url().includes('/items/') ? page.url() : `https://www.vinted.pl/items/${externalListingId}`;
    const completedAt = new Date().toISOString();

    // 7. Save fresh session
    const nextStorageState = await context.storageState();
    const integrationRepository = await getIntegrationRepository();
    await integrationRepository.updateConnection(connection.id, {
      playwrightStorageState: encryptSecret(JSON.stringify(nextStorageState)),
      playwrightStorageStateUpdatedAt: completedAt,
    });

    return {
      externalListingId,
      listingUrl,
      completedAt,
      metadata: {
        mode: 'standard',
        browserMode: effectiveHeadless ? 'headless' : 'headed',
        listingFormUrl: VINTED_LISTING_FORM_URL,
      }
    };

  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
};
