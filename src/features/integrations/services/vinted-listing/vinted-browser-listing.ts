import {
  VINTED_LISTING_FORM_URL,
  VINTED_TITLE_SELECTORS,
  VINTED_DESCRIPTION_SELECTORS,
  VINTED_PRICE_SELECTORS,
  VINTED_SUBMIT_SELECTORS,
  VINTED_IMAGE_UPLOAD_SELECTORS,
  VINTED_CATEGORY_SELECTORS,
  VINTED_CATEGORY_OPTION_SELECTORS,
  VINTED_BRAND_INPUT_SELECTORS,
  VINTED_BRAND_SELECTORS,
  VINTED_BRAND_AUTOCOMPLETE_OPTION_SELECTORS,
  VINTED_SIZE_SELECTORS,
  VINTED_CONDITION_SELECTORS,
  VINTED_DROPDOWN_OPTION_SELECTORS,
  VINTED_ITEM_URL_PATTERN,
} from './config';
import type { Locator, Page } from 'playwright';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { PlaywrightRelistBrowserMode, ProductListing } from '@/shared/contracts/integrations/listings';
import { internalError, notFoundError } from '@/shared/errors/app-error';
import { logger } from '@/shared/utils/logger';
import {
  openPlaywrightConnectionPageSession,
  persistPlaywrightConnectionStorageState,
} from '@/features/playwright/server';
import type { PlaywrightBrowserPreference } from '@/shared/lib/playwright/browser-launch';
import { getCategoryRepository } from '@/shared/lib/products/services/category-repository';
import { getCustomFieldRepository } from '@/shared/lib/products/services/custom-field-repository';
import { getParameterRepository } from '@/shared/lib/products/services/parameter-repository';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { createVintedBrowserTestUtils } from './vinted-browser-test-utils';
import { resolveVintedProductImageUploadPlan } from './vinted-browser-images';
import type { BrowserListingResultDto } from '@/shared/contracts/integrations/listings';
import { readVintedAuthState } from './vinted-browser-auth';
import {
  resolveEffectiveBrowserPreferenceFromLabel,
  resolveEffectiveVintedBrowserMode,
} from './vinted-browser-runtime';
import { resolveVintedProductMapping } from './vinted-product-mapping';

/** Extract Vinted numeric item ID from a URL, e.g. /items/1234567890-item-name → "1234567890" */
const extractVintedItemId = (url: string): string | null => {
  const match = VINTED_ITEM_URL_PATTERN.exec(url);
  return match?.[1] ?? null;
};

const normalizeLookupKey = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

/** Try each selector in order, return the first visible locator. Returns null if none found. */
const findFirstVisible = async (
  page: Page,
  selectors: string[]
): Promise<Locator | null> => {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) {
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
  page: Page,
  selectors: string[],
  value: string,
  fieldName: string,
  required = true
): Promise<boolean> => {
  const locator = await findFirstVisible(page, selectors);
  if (!locator) {
    if (required) throw internalError(`Field ${fieldName} not found on Vinted listing form.`);
    logger.warn(`[VintedListing] Optional field "${fieldName}" not found — skipping.`);
    return false;
  }
  await locator.fill(value);
  await page.waitForTimeout(300);
  return true;
};

const readLocatorLabel = async (locator: Locator): Promise<string> => {
  const textContent = (await locator.innerText().catch(() => '')).trim();
  if (textContent) {
    return textContent;
  }

  const ariaLabel = ((await locator.getAttribute('aria-label').catch(() => null)) ?? '').trim();
  if (ariaLabel) {
    return ariaLabel;
  }

  const title = ((await locator.getAttribute('title').catch(() => null)) ?? '').trim();
  if (title) {
    return title;
  }

  return ((await locator.textContent().catch(() => null)) ?? '').trim();
};

type VisibleOptionCandidate = {
  locator: Locator;
  label: string;
  normalizedLabel: string;
};

const listVisibleOptions = async (
  page: Page,
  selectors: string[]
): Promise<VisibleOptionCandidate[]> => {
  const candidates: VisibleOptionCandidate[] = [];
  const seen = new Set<string>();

  for (const selector of selectors) {
    const locator = page.locator(selector);
    const count = Math.min(await locator.count().catch(() => 0), 40);
    for (let index = 0; index < count; index += 1) {
      const candidate = locator.nth(index);
      const visible = await candidate.isVisible().catch(() => false);
      if (!visible) continue;

      const label = await readLocatorLabel(candidate);
      const normalizedLabel = normalizeLookupKey(label);
      if (!normalizedLabel || seen.has(normalizedLabel)) continue;

      seen.add(normalizedLabel);
      candidates.push({
        locator: candidate,
        label,
        normalizedLabel,
      });
    }
  }

  return candidates;
};

const resolveVisibleOption = async (
  page: Page,
  selectors: string[],
  label: string
): Promise<VisibleOptionCandidate | null> => {
  const normalizedTarget = normalizeLookupKey(label);
  if (!normalizedTarget) return null;

  const candidates = await listVisibleOptions(page, selectors);
  return (
    candidates.find((candidate: VisibleOptionCandidate) => candidate.normalizedLabel === normalizedTarget) ??
    null
  );
};

const buildMissingOptionError = async (input: {
  page: Page;
  selectors: string[];
  fieldName: string;
  requestedLabel: string;
  extraMeta?: Record<string, unknown>;
}): Promise<Error> => {
  const visibleOptions = (await listVisibleOptions(input.page, input.selectors)).map(
    (candidate: VisibleOptionCandidate): string => candidate.label
  );
  return internalError(
    `Vinted ${input.fieldName} mapping "${input.requestedLabel}" could not be selected in the listing form.`,
    {
      fieldName: input.fieldName,
      requestedLabel: input.requestedLabel,
      visibleOptions,
      ...(input.extraMeta ?? {}),
    }
  );
};

/**
 * Try to select a dropdown option by clicking the trigger then the first available option.
 * Fully optional — logs a warning and returns false if the field cannot be interacted with.
 */
const selectDropdownOptionByLabel = async (input: {
  page: Page;
  triggerSelectors: string[];
  optionSelectors: string[];
  label: string;
  fieldName: string;
  extraMeta?: Record<string, unknown>;
}): Promise<string> => {
  const trigger = await findFirstVisible(input.page, input.triggerSelectors);
  if (!trigger) {
    throw internalError(`Vinted ${input.fieldName} selector trigger not found.`, {
      fieldName: input.fieldName,
      requestedLabel: input.label,
      ...(input.extraMeta ?? {}),
    });
  }

  await trigger.click();
  await input.page.waitForTimeout(600);

  const option = await resolveVisibleOption(input.page, input.optionSelectors, input.label);
  if (!option) {
    await input.page.keyboard.press('Escape').catch(() => undefined);
    throw await buildMissingOptionError({
      page: input.page,
      selectors: input.optionSelectors,
      fieldName: input.fieldName,
      requestedLabel: input.label,
      extraMeta: input.extraMeta,
    });
  }

  await option.locator.click();
  await input.page.waitForTimeout(400);
  return option.label;
};

const selectCategoryPath = async (
  page: Page,
  pathSegments: string[]
): Promise<string[]> => {
  const normalizedSegments = pathSegments.map((segment: string) => segment.trim()).filter(Boolean);
  if (normalizedSegments.length === 0) {
    throw internalError('Vinted category mapping required before category selection can start.');
  }

  const trigger = await findFirstVisible(page, VINTED_CATEGORY_SELECTORS);
  if (!trigger) {
    throw internalError('Vinted category selector trigger not found.', {
      fieldName: 'category',
      requestedPath: normalizedSegments,
    });
  }

  await trigger.click();
  await page.waitForTimeout(600);

  const selectedPath: string[] = [];
  for (const segment of normalizedSegments) {
    const option = await resolveVisibleOption(page, VINTED_CATEGORY_OPTION_SELECTORS, segment);
    if (!option) {
      throw await buildMissingOptionError({
        page,
        selectors: VINTED_CATEGORY_OPTION_SELECTORS,
        fieldName: 'category',
        requestedLabel: normalizedSegments.join(' > '),
        extraMeta: {
          requestedPath: normalizedSegments,
          selectedPath,
        },
      });
    }

    await option.locator.click();
    selectedPath.push(option.label);
    await page.waitForTimeout(500);
  }

  return selectedPath;
};

/**
 * Try to fill a brand using Vinted's autocomplete text input.
 * Types the brand name and clicks the matching suggestion.
 */
const fillBrandAutocomplete = async (
  page: Page,
  brandName: string
): Promise<string> => {
  let input = await findFirstVisible(page, VINTED_BRAND_INPUT_SELECTORS);
  if (!input) {
    const trigger = await findFirstVisible(page, VINTED_BRAND_SELECTORS);
    if (trigger) {
      await trigger.click();
      await page.waitForTimeout(600);
      input = await findFirstVisible(page, VINTED_BRAND_INPUT_SELECTORS);
    }
  }
  if (!input) {
    throw internalError('Vinted brand selector input not found.', {
      fieldName: 'brand',
      requestedLabel: brandName,
    });
  }

  await input.fill(brandName.slice(0, 30));
  await page.waitForTimeout(800);

  const option = await resolveVisibleOption(
    page,
    VINTED_BRAND_AUTOCOMPLETE_OPTION_SELECTORS,
    brandName
  );
  if (!option) {
    await input.fill('');
    throw await buildMissingOptionError({
      page,
      selectors: VINTED_BRAND_AUTOCOMPLETE_OPTION_SELECTORS,
      fieldName: 'brand',
      requestedLabel: brandName,
    });
  }

  await option.locator.click();
  await page.waitForTimeout(400);
  return option.label;
};

export const runVintedBrowserListing = async ({
  listing,
  connection,
  source,
  action,
  browserMode,
  browserPreference,
}: {
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
  source: 'manual' | 'scheduler' | 'api';
  action: 'list' | 'relist' | 'sync';
  browserMode: PlaywrightRelistBrowserMode;
  browserPreference: PlaywrightBrowserPreference;
}): Promise<BrowserListingResultDto> => {
  const connectionRuntime = await openPlaywrightConnectionPageSession({
    connection,
    browserPreference,
    headless: browserMode === 'headless'
      ? true
      : browserMode === 'headed'
        ? false
        : undefined,
    viewport: { width: 1280, height: 720 },
  });
  const { runtime, context, page, launchLabel, fallbackMessages, close } = connectionRuntime;
  const playwrightSettings = runtime.settings;
  const effectiveBrowserMode = resolveEffectiveVintedBrowserMode({
    requestedBrowserMode: browserMode,
    connectionHeadless: playwrightSettings.headless,
  });
  const effectiveBrowserPreference = resolveEffectiveBrowserPreferenceFromLabel({
    launchLabel,
    requestedBrowserPreference: browserPreference,
  });
  const {
    acceptCookieConsent,
    safeIsVisible,
  } = createVintedBrowserTestUtils({
    page,
    connectionId: connection.id,
    fail: async (step, detail) => { throw internalError(`${step}: ${detail}`); },
  });

  try {
    // 2. Navigate to listing form and verify auth
    try {
      await page.goto(VINTED_LISTING_FORM_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (navError) {
      const navMessage = navError instanceof Error ? navError.message : '';
      if (navMessage.includes('net::ERR_ABORTED')) {
        // Vinted redirects during navigation (consent, locale detection) — wait for the page to settle
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => undefined);
      } else {
        throw internalError(`Open Vinted Sell Form: Failed to navigate: ${navMessage}`);
      }
    }
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
    const [categoryRepository, customFieldRepository, parameterRepository] = await Promise.all([
      getCategoryRepository(),
      getCustomFieldRepository(),
      getParameterRepository(),
    ]);
    const [categories, customFieldDefinitions, parameters] = await Promise.all([
      categoryRepository.listCategories({ catalogId: product.catalogId }),
      customFieldRepository.listCustomFields({}),
      parameterRepository.listParameters({ catalogId: product.catalogId }),
    ]);
    const resolvedMapping = resolveVintedProductMapping({
      product,
      integrationId: listing.integrationId,
      categories,
      customFieldDefinitions,
      parameters,
    });
    if (!resolvedMapping.category) {
      throw internalError(
        'Vinted category mapping required: set a Vinted Category custom field or parameter, or assign an internal product category.',
        {
          fieldName: 'category',
          diagnostics: resolvedMapping.diagnostics,
        }
      );
    }
    if (!resolvedMapping.condition) {
      throw internalError(
        'Vinted condition mapping required: set a Vinted Condition custom field or parameter.',
        {
          fieldName: 'condition',
          diagnostics: resolvedMapping.diagnostics,
        }
      );
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

    const title = resolvedMapping.title;
    const description = resolvedMapping.description;
    const price = resolvedMapping.price;

    // 5. Fill required fields
    await fillField(page, VINTED_TITLE_SELECTORS, title, 'Title', true);
    await fillField(page, VINTED_DESCRIPTION_SELECTORS, description, 'Description', true);

    // 6. Fill mapped marketplace fields.
    const selectedCategoryPath = await selectCategoryPath(page, resolvedMapping.category.pathSegments);

    let selectedBrand: string | null = null;
    if (resolvedMapping.brand) {
      selectedBrand = await fillBrandAutocomplete(page, resolvedMapping.brand.label);
    }

    await page.waitForTimeout(500);

    const selectedCondition = await selectDropdownOptionByLabel({
      page,
      triggerSelectors: VINTED_CONDITION_SELECTORS,
      optionSelectors: VINTED_DROPDOWN_OPTION_SELECTORS,
      label: resolvedMapping.condition.label,
      fieldName: 'condition',
      extraMeta: {
        source: resolvedMapping.condition.source,
        sourceName: resolvedMapping.condition.sourceName,
      },
    });

    let selectedSize: string | null = null;
    if (resolvedMapping.size) {
      selectedSize = await selectDropdownOptionByLabel({
        page,
        triggerSelectors: VINTED_SIZE_SELECTORS,
        optionSelectors: VINTED_DROPDOWN_OPTION_SELECTORS,
        label: resolvedMapping.size.label,
        fieldName: 'size',
        extraMeta: {
          source: resolvedMapping.size.source,
          sourceName: resolvedMapping.size.sourceName,
        },
      });
    }

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
            const btn = document.querySelector<HTMLButtonElement>(sel);
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

    // 9. Wait for the real listing page. Do not fabricate success from a stale draft URL.
    await page
      .waitForURL(
        (url) => VINTED_ITEM_URL_PATTERN.test(`${url.pathname}${url.search}${url.hash}`),
        { timeout: 45000 }
      )
      .catch(() => undefined);
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => undefined);

    const finalUrl = page.url().trim();
    const itemId = extractVintedItemId(finalUrl);
    if (!itemId) {
      const authState = await readVintedAuthState(page);
      if (!authState.loggedIn) {
        throw internalError('AUTH_REQUIRED: Vinted session expired during publish. Please refresh the session.', {
          requestedBrowserMode: browserMode,
          browserMode: effectiveBrowserMode,
          requestedBrowserPreference: browserPreference,
          browserPreference: effectiveBrowserPreference,
          browserLabel: launchLabel,
          fallbackMessages,
          currentUrl: finalUrl || authState.currentUrl,
          authState,
          publishVerified: false,
        });
      }

      throw internalError('Vinted publish verification failed: listing URL was not confirmed after submit.', {
        requestedBrowserMode: browserMode,
        browserMode: effectiveBrowserMode,
        requestedBrowserPreference: browserPreference,
        browserPreference: effectiveBrowserPreference,
        browserLabel: launchLabel,
        fallbackMessages,
        currentUrl: finalUrl,
        publishVerified: false,
      });
    }
    const completedAt = new Date().toISOString();
    const externalListingId = itemId;
    const listingUrl = finalUrl;

    // 10. Save refreshed session
    const nextStorageState = await context.storageState();
    await persistPlaywrightConnectionStorageState({
      connectionId: connection.id,
      storageState: nextStorageState,
      updatedAt: completedAt,
    });

    return {
      externalListingId,
      listingUrl,
      completedAt,
      metadata: {
        mode: 'standard',
        browserMode: effectiveBrowserMode,
        requestedBrowserMode: browserMode,
        browserPreference: effectiveBrowserPreference,
        requestedBrowserPreference: browserPreference,
        browserLabel: launchLabel,
        fallbackMessages,
        listingFormUrl: VINTED_LISTING_FORM_URL,
        currentUrl: finalUrl,
        itemIdExtracted: true,
        publishVerified: true,
        rawResult: {
          finalUrl,
          itemId,
          source,
          action,
          mapping: {
            brand: resolvedMapping.brand,
            category: resolvedMapping.category,
            condition: resolvedMapping.condition,
            size: resolvedMapping.size,
            diagnostics: resolvedMapping.diagnostics,
            selectedBrand,
            selectedCategoryPath,
            selectedCondition,
            selectedSize,
          },
        },
      },
    };
  } finally {
    await close();
  }
};
