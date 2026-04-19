import {
  VINTED_LISTING_FORM_URL,
  VINTED_BASE_ORIGIN,
  VINTED_TITLE_SELECTORS,
  VINTED_DESCRIPTION_SELECTORS,
  VINTED_PRICE_SELECTORS,
  VINTED_SUBMIT_SELECTORS,
  VINTED_UPDATE_SUBMIT_SELECTORS,
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
import { getIntegrationRepository } from '@/features/integrations/server';
import {
  buildPlaywrightNativeTaskResult,
  createPlaywrightNativeTaskInternalError,
  createVintedBrowserListingPlaywrightInstance,
  persistPlaywrightConnectionStorageState,
  runPlaywrightConnectionNativeTask,
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
import { resolveVintedProductMapping } from './vinted-product-mapping';
import { StepTracker, type ActionSequenceKey } from '@/shared/lib/browser-execution';
import { buildResolvedActionSteps } from '@/shared/lib/browser-execution/runtime-action-resolver.server';

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
  selectors: readonly string[]
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
  selectors: readonly string[],
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
  selectors: readonly string[]
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
  selectors: readonly string[],
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
  selectors: readonly string[];
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
  triggerSelectors: readonly string[];
  optionSelectors: readonly string[];
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
  browserPreference: PlaywrightBrowserPreference | undefined;
}): Promise<BrowserListingResultDto> => {
  const actionKey: ActionSequenceKey =
    action === 'sync' ? 'vinted_sync' : action === 'relist' ? 'vinted_relist' : 'vinted_list';
  const tracker = StepTracker.fromSteps(await buildResolvedActionSteps(actionKey));

  return runPlaywrightConnectionNativeTask({
    connection,
    runtimeActionKey: actionKey,
    instance: createVintedBrowserListingPlaywrightInstance({
      connectionId: connection.id,
      integrationId: connection.integrationId,
      listingId: listing.id,
    }),
    requestedBrowserMode: browserMode,
    requestedBrowserPreference: browserPreference,
    viewport: { width: 1280, height: 720 },
    execute: async (connectionRuntime) => {
      const { context, page } = connectionRuntime;
      const {
        acceptCookieConsent,
        safeIsVisible,
      } = createVintedBrowserTestUtils({
        page,
        connectionId: connection.id,
        fail: async (step, detail) => { throw internalError(`${step}: ${detail}`); },
      });

      // browser_preparation is a Tradera-only concept; skip it for Vinted native tasks
      tracker.skip('browser_preparation', 'No separate browser preparation phase for Vinted.');
      tracker.succeed('browser_open', 'Vinted browser context was opened.');

      // 2. Navigate to listing form / edit page and verify auth
      const navigateToUrl = async (targetUrl: string, label: string): Promise<void> => {
        try {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (navError) {
          const navMessage = navError instanceof Error ? navError.message : '';
          if (navMessage.includes('net::ERR_ABORTED')) {
            // Vinted redirects during navigation (consent, locale detection) — wait for page to settle
            await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => undefined);
          } else {
            throw internalError(`${label}: Failed to navigate: ${navMessage}`);
          }
        }
      };

      tracker.start('cookie_accept');
      if (action === 'sync') {
        if (!listing.externalListingId) {
          throw internalError(
            'Vinted sync requires an existing listing ID. No externalListingId found on this listing.',
            { listingId: listing.id }
          );
        }
        await navigateToUrl(
          `${VINTED_BASE_ORIGIN}/items/${listing.externalListingId}/edit`,
          'Open Vinted Edit Form'
        );
      } else {
        await navigateToUrl(VINTED_LISTING_FORM_URL, 'Open Vinted Sell Form');
      }
      await acceptCookieConsent();
      tracker.succeed('cookie_accept', 'Cookie consent was handled.');

      tracker.start('auth_check');
      const authState = await readVintedAuthState(page);
      if (!authState.loggedIn) {
        throw internalError('AUTH_REQUIRED: Vinted session expired. Please refresh the session.');
      }
      tracker.succeed('auth_check', 'Vinted session is active.');
      // Vinted uses persistent browser sessions — there is no automated or manual login flow
      tracker.skip('auth_login', 'Vinted does not support automated login; session must be pre-authenticated.');
      tracker.skip('auth_manual', 'Vinted does not support manual login via this action.');

      // 3. Sync-check: verify the edit page loaded for the expected listing
      if (action === 'sync') {
        tracker.start('sync_check');
        const editPageUrl = page.url();
        const editPageId = extractVintedItemId(editPageUrl);
        if (!editPageId) {
          tracker.fail(
            'sync_check',
            `Vinted sync: edit page did not load for listing ${listing.externalListingId}. Current URL: ${editPageUrl}`
          );
          throw internalError(
            `Vinted sync: edit page did not load for listing ${listing.externalListingId}.`,
            { listingId: listing.id, externalListingId: listing.externalListingId, currentUrl: editPageUrl }
          );
        }
        tracker.succeed('sync_check', `Edit page loaded for listing ${editPageId}.`);
      }

      // 4. Load product data
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

      // 5. Upload images
      tracker.start('image_upload');
      const imageUploadPlan = await resolveVintedProductImageUploadPlan(product);
      if (imageUploadPlan.localImagePaths.length > 0) {
        const fileInput = page.locator(VINTED_IMAGE_UPLOAD_SELECTORS[0]).first();
        if (await safeIsVisible(fileInput)) {
          await fileInput.setInputFiles(imageUploadPlan.localImagePaths);
          await page.waitForTimeout(3000); // Wait for uploads to begin
        }
        tracker.succeed('image_upload', `${imageUploadPlan.localImagePaths.length} image(s) uploaded.`);
      } else {
        tracker.skip('image_upload', 'No images to upload for this product.');
      }

      const title = resolvedMapping.title;
      const description = resolvedMapping.description;
      const price = resolvedMapping.price;

      // 6. Fill required fields
      tracker.start('title_fill');
      await fillField(page, VINTED_TITLE_SELECTORS, title, 'Title', true);
      tracker.succeed('title_fill', 'Title was entered.');

      tracker.start('description_fill');
      await fillField(page, VINTED_DESCRIPTION_SELECTORS, description, 'Description', true);
      tracker.succeed('description_fill', 'Description was entered.');

      // 7. Fill mapped marketplace fields.
      tracker.start('category_select');
      const selectedCategoryPath = await selectCategoryPath(page, resolvedMapping.category.pathSegments);
      tracker.succeed('category_select', `Category selected: ${selectedCategoryPath.join(' > ')}.`);

      let selectedBrand: string | null = null;
      if (resolvedMapping.brand) {
        tracker.start('brand_fill');
        selectedBrand = await fillBrandAutocomplete(page, resolvedMapping.brand.label);
        tracker.succeed('brand_fill', `Brand set to "${selectedBrand}".`);
      } else {
        tracker.skip('brand_fill', 'No brand mapping configured for this product.');
      }

      await page.waitForTimeout(500);

      tracker.start('condition_set');
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
      tracker.succeed('condition_set', `Condition set to "${selectedCondition}".`);

      let selectedSize: string | null = null;
      if (resolvedMapping.size) {
        tracker.start('size_set');
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
        tracker.succeed('size_set', `Size set to "${selectedSize}".`);
      } else {
        tracker.skip('size_set', 'No size mapping configured for this product.');
      }

      // 8. Fill price (after optional fields to avoid Vinted re-rendering clearing it)
      tracker.start('price_set');
      await fillField(page, VINTED_PRICE_SELECTORS, price, 'Price', true);
      tracker.succeed('price_set', 'Price was set.');

      // 9. Submit the listing
      const submitSelectors = action === 'sync' ? VINTED_UPDATE_SUBMIT_SELECTORS : VINTED_SUBMIT_SELECTORS;
      tracker.start('publish');
      const submitButton = await findFirstVisible(page, submitSelectors);
      if (!submitButton) {
        throw internalError('Submit button not found on Vinted listing form.');
      }

      // Wait for submit button to become enabled (images uploaded, required fields filled)
      for (const selector of submitSelectors) {
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
      tracker.succeed('publish', 'Publish action was submitted.');

      // 10. Wait for the real listing page. Do not fabricate success from a stale draft URL.
      tracker.start('publish_verify');
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
        const currentAuthState = await readVintedAuthState(page);
        if (!currentAuthState.loggedIn) {
          throw createPlaywrightNativeTaskInternalError(
            'AUTH_REQUIRED: Vinted session expired during publish. Please refresh the session.',
            {
              session: connectionRuntime,
              additional: {
                currentUrl: finalUrl || currentAuthState.currentUrl,
                authState: currentAuthState,
                publishVerified: false,
              },
            }
          );
        }

        throw createPlaywrightNativeTaskInternalError(
          'Vinted publish verification failed: listing URL was not confirmed after submit.',
          {
            session: connectionRuntime,
            additional: {
              currentUrl: finalUrl,
              publishVerified: false,
            },
          }
        );
      }
      tracker.succeed('publish_verify', 'Listing URL confirmed after publish.');

      const completedAt = new Date().toISOString();
      const externalListingId = itemId;
      const listingUrl = finalUrl;

      // 11. Save refreshed session
      const nextStorageState = await context.storageState();
      await persistPlaywrightConnectionStorageState({
        connectionId: connection.id,
        storageState: nextStorageState,
        updatedAt: completedAt,
        repo: await getIntegrationRepository(),
      });
      tracker.succeed('browser_close', 'Browser session state was persisted.');

      return buildPlaywrightNativeTaskResult({
        session: connectionRuntime,
        externalListingId,
        listingUrl,
        completedAt,
        metadata: {
          mode: 'standard',
          listingFormUrl: VINTED_LISTING_FORM_URL,
          currentUrl: finalUrl,
          itemIdExtracted: true,
          publishVerified: true,
          executionSteps: tracker.getSteps(),
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
      });
    },
    buildErrorAdditional: async ({ session }) => ({
      mode: 'standard',
      listingFormUrl: VINTED_LISTING_FORM_URL,
      source,
      action,
      currentUrl: session.page.url().trim() || null,
      executionSteps: tracker.failActive('Unexpected error during Vinted listing.').getSteps(),
    }),
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : 'Vinted browser listing failed',
  });
};
