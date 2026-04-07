import { chromium } from 'playwright';
import {
  VINTED_LISTING_FORM_URL,
  VINTED_TITLE_SELECTORS,
  VINTED_DESCRIPTION_SELECTORS,
  VINTED_PRICE_SELECTORS,
  VINTED_SUBMIT_SELECTORS,
  VINTED_IMAGE_UPLOAD_SELECTORS,
  VINTED_CATEGORY_SELECTORS,
  VINTED_BRAND_INPUT_SELECTORS,
  VINTED_BRAND_AUTOCOMPLETE_OPTION_SELECTORS,
  VINTED_SIZE_SELECTORS,
  VINTED_CONDITION_SELECTORS,
  VINTED_DROPDOWN_OPTION_SELECTORS,
  VINTED_ITEM_URL_PATTERN,
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
import { readVintedAuthState } from './vinted-browser-auth';

/** Extract Vinted numeric item ID from a URL, e.g. /items/1234567890-item-name → "1234567890" */
const extractVintedItemId = (url: string): string | null => {
  const match = VINTED_ITEM_URL_PATTERN.exec(url);
  return match?.[1] ?? null;
};

/** Try each selector in order, return the first visible locator. Returns null if none found. */
const findFirstVisible = async (
  page: import('playwright').Page,
  selectors: string[]
): Promise<import('playwright').Locator | null> => {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
        return locator;
      }
    } catch {
      // continue
    }
  }
  return null;
};

/** Fill a field by trying selectors in order. Throws if required and not found. */
const fillField = async (
  page: import('playwright').Page,
  selectors: string[],
  value: string,
  fieldName: string,
  required = true
): Promise<boolean> => {
  const locator = await findFirstVisible(page, selectors);
  if (!locator) {
    if (required) throw internalError(`Field ${fieldName} not found on Vinted listing form.`);
    console.warn(`[VintedListing] Optional field "${fieldName}" not found — skipping.`);
    return false;
  }
  await locator.fill(value);
  await page.waitForTimeout(300);
  return true;
};

/**
 * Try to select a dropdown option by clicking the trigger then the first available option.
 * Fully optional — logs a warning and returns false if the field cannot be interacted with.
 */
const selectDropdownFirstOption = async (
  page: import('playwright').Page,
  triggerSelectors: string[],
  optionSelectors: string[],
  fieldName: string
): Promise<boolean> => {
  try {
    const trigger = await findFirstVisible(page, triggerSelectors);
    if (!trigger) {
      console.warn(`[VintedListing] Optional dropdown "${fieldName}" trigger not found — skipping.`);
      return false;
    }
    await trigger.click();
    await page.waitForTimeout(600);

    const option = await findFirstVisible(page, optionSelectors);
    if (!option) {
      console.warn(`[VintedListing] No options found for "${fieldName}" dropdown — skipping.`);
      // Press Escape to close any opened dropdown
      await page.keyboard.press('Escape').catch(() => undefined);
      return false;
    }
    await option.click();
    await page.waitForTimeout(400);
    return true;
  } catch (error) {
    void ErrorSystem.captureException(error);
    console.warn(`[VintedListing] Optional dropdown "${fieldName}" interaction failed — skipping.`);
    return false;
  }
};

/**
 * Try to fill a brand using Vinted's autocomplete text input.
 * Types the brand name, waits for suggestions, clicks the first one.
 */
const fillBrandAutocomplete = async (
  page: import('playwright').Page,
  brandName: string
): Promise<boolean> => {
  try {
    const input = await findFirstVisible(page, VINTED_BRAND_INPUT_SELECTORS);
    if (!input) {
      console.warn('[VintedListing] Brand autocomplete input not found — skipping.');
      return false;
    }
    await input.fill(brandName.slice(0, 30)); // Limit to avoid overly long queries
    await page.waitForTimeout(800); // Wait for autocomplete suggestions

    const option = await findFirstVisible(page, VINTED_BRAND_AUTOCOMPLETE_OPTION_SELECTORS);
    if (!option) {
      // Clear the field and skip — better than leaving garbage input
      await input.fill('');
      console.warn(`[VintedListing] No brand autocomplete suggestions for "${brandName}" — skipping.`);
      return false;
    }
    await option.click();
    await page.waitForTimeout(400);
    return true;
  } catch (error) {
    void ErrorSystem.captureException(error);
    console.warn('[VintedListing] Brand autocomplete interaction failed — skipping.');
    return false;
  }
};

export const runVintedBrowserListing = async ({
  listing,
  connection,
  source: _source,
}: {
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
  source: 'manual' | 'scheduler' | 'api';
  action: 'list' | 'relist' | 'sync';
}): Promise<BrowserListingResultDto> => {

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
    safeIsVisible,
  } = createVintedBrowserTestUtils({
    page,
    connectionId: connection.id,
    fail: async (step, detail) => { throw internalError(`${step}: ${detail}`); },
  });

  try {
    // 2. Navigate to listing form and verify auth
    await safeGoto(VINTED_LISTING_FORM_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }, 'Open Vinted Sell Form');
    await acceptCookieConsent();

    const authState = await readVintedAuthState(page);
    if (!authState.loggedIn) {
      throw internalError('AUTH_REQUIRED: Vinted session expired. Please refresh the session.');
    }

    // 3. Load product data
    const productRepository = await getProductRepository();
    const product = await productRepository.getProductById(listing.productId);
    if (!product) {
      throw notFoundError('Product not found', { productId: listing.productId });
    }

    // 4. Upload images
    const imageUploadPlan = await resolveVintedProductImageUploadPlan(product);
    if (imageUploadPlan.localImagePaths.length > 0) {
      const fileInput = page.locator(VINTED_IMAGE_UPLOAD_SELECTORS[0]!).first();
      if (await safeIsVisible(fileInput)) {
        await fileInput.setInputFiles(imageUploadPlan.localImagePaths);
        await page.waitForTimeout(3000); // Wait for uploads to begin
      }
    }

    const title = product.name_pl || product.name_en || product.sku || `Listing ${listing.productId}`;
    const description = product.description_pl || product.description_en || title;
    const price = product.price ? String(Math.floor(product.price)) : '10';

    // 5. Fill required fields
    await fillField(page, VINTED_TITLE_SELECTORS, title, 'Title', true);
    await fillField(page, VINTED_DESCRIPTION_SELECTORS, description, 'Description', true);

    // 6. Fill optional fields (category, brand, size, condition)
    // Category: click to open the category picker, select first available leaf
    await selectDropdownFirstOption(
      page,
      VINTED_CATEGORY_SELECTORS,
      [
        '[data-testid="category-item"]',
        '.c-category-select__item',
        '[class*="category"] li',
        '[role="option"]',
      ],
      'Category'
    );

    // Brand: use autocomplete if a brand name can be derived from product data
    const brandName = (product as Record<string, unknown>)['brand'] as string | undefined
      ?? (product as Record<string, unknown>)['producer'] as string | undefined;
    if (brandName && typeof brandName === 'string' && brandName.trim().length > 0) {
      await fillBrandAutocomplete(page, brandName.trim());
    } else {
      // Try clicking the brand selector as a dropdown fallback
      await selectDropdownFirstOption(
        page,
        VINTED_BRAND_INPUT_SELECTORS,
        VINTED_BRAND_AUTOCOMPLETE_OPTION_SELECTORS,
        'Brand (fallback)'
      );
    }

    await page.waitForTimeout(500);

    // Condition: select first available option (required on Vinted)
    await selectDropdownFirstOption(
      page,
      VINTED_CONDITION_SELECTORS,
      VINTED_DROPDOWN_OPTION_SELECTORS,
      'Condition'
    );

    // Size: select first available option (optional for some categories)
    await selectDropdownFirstOption(
      page,
      VINTED_SIZE_SELECTORS,
      VINTED_DROPDOWN_OPTION_SELECTORS,
      'Size'
    );

    // 7. Fill price (after optional fields to avoid Vinted re-rendering clearing it)
    await fillField(page, VINTED_PRICE_SELECTORS, price, 'Price', true);

    // 8. Submit the listing
    const submitButton = await findFirstVisible(page, VINTED_SUBMIT_SELECTORS);
    if (!submitButton) {
      throw internalError('Submit button not found on Vinted listing form.');
    }

    // Wait for submit button to become enabled (images uploaded, required fields filled)
    for (const selector of VINTED_SUBMIT_SELECTORS) {
      try {
        await page.waitForFunction(
          (sel) => {
            const btn = document.querySelector(sel) as HTMLButtonElement | null;
            return btn !== null && !btn.disabled;
          },
          selector,
          { timeout: 20000 }
        );
        break;
      } catch {
        // try next selector
      }
    }

    await submitButton.click();

    // 9. Wait for navigation to the created listing page
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => undefined);

    const finalUrl = page.url();
    const itemId = extractVintedItemId(finalUrl);
    const completedAt = new Date().toISOString();
    const externalListingId = itemId ?? `vinted-${Date.now()}`;
    const listingUrl = itemId
      ? finalUrl
      : `https://www.vinted.pl/items/${externalListingId}`;

    // 10. Save refreshed session
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
        itemIdExtracted: Boolean(itemId),
      },
    };

  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
};
