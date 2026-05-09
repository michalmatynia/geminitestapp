import type { Locator, Page } from 'playwright';
import { z } from 'zod';

import {
  normalizeTraderaListingFormUrl,
  resolveTraderaListingPriceCurrencyCode,
  type TraderaSystemSettings,
} from '@/features/integrations/constants/tradera';
import { getIntegrationRepository } from '@/features/integrations/server';
import {
  buildPlaywrightNativeTaskResult,
  createPlaywrightNativeTaskInternalError,
  createTraderaStandardListingPlaywrightInstance,
  persistPlaywrightConnectionStorageState,
  runPlaywrightConnectionNativeTask,
} from '@/features/playwright/server';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { BrowserListingResultDto, ProductListing } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { badRequestError, internalError, notFoundError } from '@/shared/errors/app-error';
import { buildResolvedActionSteps } from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import { TraderaSequencer } from '@/shared/lib/browser-execution/sequencers/TraderaSequencer';
import { StepTracker } from '@/shared/lib/browser-execution/step-tracker';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { resolveMarketplaceAwareProductCopy } from '@/shared/lib/products/utils/marketplace-content-overrides';
import {
  TITLE_SELECTORS,
  DESCRIPTION_SELECTORS,
  PRICE_SELECTORS,
  SUBMIT_SELECTORS,
  PAYMENT_SOLUTION_MODAL_TEXT_HINTS,
  PAYMENT_SOLUTION_TERMS_LABELS,
  PAYMENT_SOLUTION_MODAL_CONTINUE_LABELS,
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
  type TraderaEnsureLoggedInStatusUpdate,
} from './tradera-browser-auth';
import { resolveTraderaCategoryMappingResolutionForProduct } from './category-mapping';
import { assertTraderaCategoryMappingReady } from './preflight';
import {
  buildTraderaListingPriceResolutionFailureMessage,
  formatTraderaListingPriceInputValue,
  resolveTraderaListingPriceForProduct,
} from './price';
import { buildTraderaPricingMetadata } from './pricing-metadata';
import { buildTraderaListingDescription } from './description';

const STANDARD_REQUESTED_BROWSER_MODE = 'connection_default';

const trimmedStringSchema = z.string().transform((value) => value.trim());
const errorMessageSchema = z.instanceof(Error).transform((error) => error.message);
const errorMetaSchema = z.object({ meta: z.unknown().optional() }).passthrough();
const paymentSolutionLocatorPageSchema = z.object({
  getByRole: z.function(),
  locator: z.function(),
}).passthrough();
const paymentSolutionTextPageSchema = z.object({
  getByText: z.function(),
}).passthrough();
const nestedLocatorSchema = z.object({
  locator: z.function(),
}).passthrough();
const pageTimerSchema = z.object({
  waitForTimeout: z.function(),
}).passthrough();

const toTrimmedString = (value: unknown): string =>
  trimmedStringSchema.catch('').parse(value);

const normalizeText = (value: unknown): string =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const readPageText = async (page: Page): Promise<string> =>
  page.locator('body').innerText({ timeout: 750 }).catch(() => '');

const PAYMENT_SOLUTION_MODAL_CONTAINER_SELECTOR =
  '[aria-modal="true"], [data-testid*="modal" i], [data-testid*="dialog" i], [class*="modal" i], [class*="dialog" i], [class*="sheet" i], [class*="drawer" i], [class*="popover" i]';

const hasPaymentSolutionModalLocatorSupport = (page: Page): boolean => {
  return paymentSolutionLocatorPageSchema.safeParse(page).success;
};

const hasPaymentSolutionModalText = (value: unknown): boolean => {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return false;

  const matchedHints = PAYMENT_SOLUTION_MODAL_TEXT_HINTS.filter((label) =>
    normalized.includes(normalizeText(label).toLowerCase())
  );
  return (
    matchedHints.length >= 2 ||
    (normalized.includes('tradera\'s payment solution') &&
      normalized.includes('continue')) ||
    (normalized.includes('payment solution') &&
      normalized.includes('terms') &&
      normalized.includes('continue')) ||
    (normalized.includes('betalningslösning') && normalized.includes('villkor'))
  );
};

const findVisiblePaymentSolutionDialog = async (page: Page): Promise<Locator | null> => {
  const bodyText = await readPageText(page);
  if (!hasPaymentSolutionModalText(bodyText)) {
    return null;
  }

  const dialogCollections = [
    page.getByRole('dialog'),
    page.locator(PAYMENT_SOLUTION_MODAL_CONTAINER_SELECTOR),
  ];

  for (const dialogs of dialogCollections) {
    const dialogCount = await dialogs.count().catch(() => 0);
    for (let index = 0; index < dialogCount; index += 1) {
      const candidate = dialogs.nth(index);
      const visible = await candidate.isVisible({ timeout: 250 }).catch(() => false);
      if (!visible) continue;
      const dialogText = await candidate.innerText({ timeout: 500 }).catch(() => '');
      if (hasPaymentSolutionModalText(dialogText)) {
        return candidate;
      }
    }
  }

  const pageWithText = paymentSolutionTextPageSchema.safeParse(page);
  if (!pageWithText.success) {
    return null;
  }

  const heading = (pageWithText.data as Page)
    .getByText(/Tradera'?s payment solution|Traderas betalningslösning|betalningslösning/i)
    .first();
  const headingVisible = await heading.isVisible({ timeout: 250 }).catch(() => false);
  if (!headingVisible) {
    return null;
  }

  const headingContainerCandidates = [
    heading
      .locator(
        'xpath=ancestor-or-self::*[@role="dialog" or @aria-modal="true" or self::dialog][1]'
      )
      .first(),
    heading
      .locator(
        'xpath=ancestor-or-self::*[(contains(normalize-space(.), "Continue") or contains(normalize-space(.), "Fortsätt"))][1]'
      )
      .first(),
    heading
      .locator(
        'xpath=ancestor-or-self::*[contains(@class, "modal") or contains(@class, "Modal") or contains(@class, "dialog") or contains(@class, "Dialog") or contains(@class, "sheet") or contains(@class, "Sheet") or contains(@class, "drawer") or contains(@class, "Drawer") or contains(@class, "popover") or contains(@class, "Popover")][1]'
      )
      .first(),
  ];

  for (const candidate of headingContainerCandidates) {
    const candidateVisible = await candidate.isVisible({ timeout: 250 }).catch(() => false);
    if (!candidateVisible) continue;

    const textContent = await candidate.innerText({ timeout: 500 }).catch(() => '');
    if (hasPaymentSolutionModalText(textContent)) {
      return candidate;
    }
  }

  return heading;
};

const findPaymentSolutionTermsCheckbox = async (dialog: Locator): Promise<Locator | null> => {
  for (const label of PAYMENT_SOLUTION_TERMS_LABELS) {
    const labelPattern = new RegExp(escapeRegExp(label), 'i');
    for (const role of ['checkbox', 'switch'] as const) {
      const candidate = dialog
        .getByRole(role, { name: labelPattern })
        .first();
      const visible = await candidate.isVisible({ timeout: 250 }).catch(() => false);
      if (visible) return candidate;
    }

    const dialogWithLocator = nestedLocatorSchema.safeParse(dialog);
    if (!dialogWithLocator.success) continue;

    const escapedText = label.replace(/"/g, '\\"');
    const labeledCheckbox = (dialogWithLocator.data as Locator)
      .locator(
        `xpath=.//*[contains(normalize-space(.), "${ 
          escapedText 
          }")]/following::*[self::input[@type="checkbox"] or @role="checkbox" or @role="switch"][1]`
      )
      .first();
    const labeledCheckboxVisible = await labeledCheckbox
      .isVisible({ timeout: 250 })
      .catch(() => false);
    if (labeledCheckboxVisible) return labeledCheckbox;
  }

  const dialogText = await dialog.innerText({ timeout: 500 }).catch(() => '');
  if (normalizeText(dialogText).length <= 3000) {
    const fallback = dialog.getByRole('checkbox').first();
    const fallbackVisible = await fallback.isVisible({ timeout: 250 }).catch(() => false);
    if (fallbackVisible) return fallback;
  }

  return null;
};

const findPaymentSolutionContinueButton = async (dialog: Locator): Promise<Locator | null> => {
  for (const label of PAYMENT_SOLUTION_MODAL_CONTINUE_LABELS) {
    const exactCandidate = dialog
      .getByRole('button', { name: new RegExp(`^${escapeRegExp(label)}$`, 'i') })
      .first();
    const exactVisible = await exactCandidate.isVisible({ timeout: 250 }).catch(() => false);
    if (exactVisible) return exactCandidate;

    const partialCandidate = dialog
      .getByRole('button', { name: new RegExp(escapeRegExp(label), 'i') })
      .first();
    const partialVisible = await partialCandidate.isVisible({ timeout: 250 }).catch(() => false);
    if (partialVisible) return partialCandidate;

    const dialogWithLocator = nestedLocatorSchema.safeParse(dialog);
    if (!dialogWithLocator.success) continue;

    const escapedText = label.replace(/"/g, '\\"');
    const textButton = (dialogWithLocator.data as Locator)
      .locator(
        `xpath=.//*[self::button or self::a or @role="button" or @tabindex][normalize-space(.)="${ 
          escapedText 
          }" or contains(normalize-space(.), "${ 
          escapedText 
          }")]`
      )
      .first();
    const textButtonVisible = await textButton.isVisible({ timeout: 250 }).catch(() => false);
    if (textButtonVisible) return textButton;
  }

  return null;
};

const isPaymentSolutionTermsChecked = async (checkbox: Locator): Promise<boolean> => {
  const checked = await checkbox.isChecked({ timeout: 500 }).catch(() => null);
  if (checked !== null) return checked;

  const ariaChecked = await checkbox.getAttribute('aria-checked', { timeout: 500 }).catch(
    () => null
  );
  if (ariaChecked === 'true') return true;
  if (ariaChecked === 'false') return false;

  return false;
};

const setPaymentSolutionTermsChecked = async (checkbox: Locator): Promise<boolean> => {
  if (await isPaymentSolutionTermsChecked(checkbox)) {
    return true;
  }

  const attempts = [
    () => checkbox.check({ timeout: 2_000 }),
    () => checkbox.click({ timeout: 2_000 }),
    () =>
      checkbox.evaluate((element) => {
        if (element instanceof HTMLElement) {
          element.click();
        }
      }),
    async () => {
      await checkbox.focus({ timeout: 2_000 }).catch(() => undefined);
      await checkbox.press('Space', { timeout: 2_000 });
    },
  ];

  for (const attempt of attempts) {
    await attempt().catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 75));
    if (await isPaymentSolutionTermsChecked(checkbox)) {
      return true;
    }
  }

  return false;
};

const waitForPaymentSolutionDialogToClose = async (
  dialog: Locator,
  timeoutMs = 1_500
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const visible = await dialog.isVisible({ timeout: 250 }).catch(() => false);
    if (!visible) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 75));
  }

  return !(await dialog.isVisible({ timeout: 250 }).catch(() => false));
};

const clickPaymentSolutionContinueButton = async (
  dialog: Locator,
  continueButton: Locator
): Promise<boolean> => {
  const attempts = [
    () => continueButton.click({ timeout: 2_000 }),
    () =>
      continueButton.evaluate((element) => {
        if (element instanceof HTMLElement) {
          element.click();
        }
      }),
    async () => {
      await continueButton.focus({ timeout: 2_000 }).catch(() => undefined);
      await continueButton.press('Enter', { timeout: 2_000 });
    },
  ];

  for (const attempt of attempts) {
    await attempt().catch(() => undefined);
    if (await waitForPaymentSolutionDialogToClose(dialog)) {
      return true;
    }
  }

  return false;
};

const waitBriefly = async (page: Page, timeoutMs: number): Promise<void> => {
  const pageWithTimer = pageTimerSchema.safeParse(page);
  if (pageWithTimer.success) {
    await (pageWithTimer.data as Page & { waitForTimeout: (timeoutMs: number) => Promise<void> })
      .waitForTimeout(timeoutMs)
      .catch(() => undefined);
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
};

const acceptPaymentSolutionTermsIfPresent = async (
  page: Page,
  timeoutMs = 5_000
): Promise<boolean> => {
  if (!hasPaymentSolutionModalLocatorSupport(page)) {
    return false;
  }

  const deadline = Date.now() + timeoutMs;
  let dialog: Locator | null = null;

  while (Date.now() < deadline) {
    dialog = await findVisiblePaymentSolutionDialog(page);
    if (dialog) {
      break;
    }
    await waitBriefly(page, 150);
  }

  dialog ??= await findVisiblePaymentSolutionDialog(page);
  if (!dialog) return false;

  const checkbox = await findPaymentSolutionTermsCheckbox(dialog);
  if (!checkbox) {
    throw internalError(
      'FAIL_PUBLISH_VALIDATION: Tradera payment solution terms checkbox was not found.'
    );
  }

  const checked = await setPaymentSolutionTermsChecked(checkbox);
  if (!checked) {
    throw internalError(
      'FAIL_PUBLISH_VALIDATION: Tradera payment solution terms checkbox could not be acknowledged.'
    );
  }

  const continueButton = await findPaymentSolutionContinueButton(dialog);
  if (!continueButton) {
    throw internalError(
      'FAIL_PUBLISH_VALIDATION: Tradera payment solution continue button was not found.'
    );
  }

  const dismissed = await clickPaymentSolutionContinueButton(dialog, continueButton);
  if (!dismissed) {
    throw internalError(
      'FAIL_MODAL_DISMISS: Tradera payment solution modal could not be dismissed.'
    );
  }

  return true;
};

const buildListingFormUrlWithCategoryId = (
  listingFormUrl: string,
  categoryId: string | null
): string => {
  const normalizedListingFormUrl = normalizeTraderaListingFormUrl(listingFormUrl);
  if (!categoryId) {
    return normalizedListingFormUrl;
  }

  const url = new URL(normalizedListingFormUrl);
  url.searchParams.set('categoryId', categoryId);
  return url.toString();
};

const buildStandardExecutionTracker = async (): Promise<StepTracker> =>
  StepTracker.fromSteps(await buildResolvedActionSteps('tradera_standard_list'));

const resolveStandardFailedStepId = ({
  authLoginAttempted,
  normalizedError,
  tracker,
}: {
  authLoginAttempted: boolean;
  normalizedError: string;
  tracker: StepTracker;
}): string => {
  const trackedSteps = tracker.getSteps();
  const trackedFailureId =
    trackedSteps.find((step) => step.status === 'error')?.id ??
    trackedSteps.find((step) => step.status === 'running')?.id;
  if (trackedFailureId !== undefined) {
    return trackedFailureId;
  }

  if (normalizedError.includes('FAIL_SELL_PAGE_INVALID')) {
    return 'sell_page_open';
  }

  if (normalizedError.includes('AUTH')) {
    return authLoginAttempted ? 'auth_login' : 'auth_check';
  }

  if (normalizedError.includes('PRICE_RESOLUTION')) {
    return 'resolve_price';
  }

  if (normalizedError.includes('PRODUCT NOT FOUND')) {
    return 'load_product';
  }

  if (
    normalizedError.includes('FAIL_PUBLISH_VERIFICATION') ||
    normalizedError.includes('EXTERNAL LISTING ID')
  ) {
    return 'publish_verify';
  }

  if (
    normalizedError.includes('PUBLISH') ||
    normalizedError.includes('SUBMISSION')
  ) {
    return 'publish';
  }

  if (normalizedError.includes('DESCRIPTION')) {
    return 'description_fill';
  }

  if (normalizedError.includes('PRICE_SET')) {
    return 'price_set';
  }

  if (normalizedError.includes('TITLE')) {
    return 'title_fill';
  }

  return 'sell_page_open';
};

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
  const targetListingCurrencyCode = resolveTraderaListingPriceCurrencyCode(systemSettings);
  let tracker: StepTracker | null = null;
  let pricingMetadata: Record<string, unknown> | null = null;
  let authLoginAttempted = false;
  let listingEditorUrl = listingFormUrl;
  let mappedCategoryExternalId: string | null = null;
  let mappedCategoryPath: string | null = null;
  let categoryMappingReason: string | null = null;
  let categoryMatchScope: string | null = null;
  let categoryInternalCategoryId: string | null = null;
  let categoryMappingSourceConnectionId: string | null = null;
  let categoryMappingRecoveredFromAnotherConnection: boolean | null = null;
  const executionState: {
    completedAt: string | null;
    externalListingId: string | null;
    paymentSolutionTermsAccepted: boolean;
    retryAfterPaymentSolutionTerms: boolean;
  } = {
    completedAt: null,
    externalListingId: null,
    paymentSolutionTermsAccepted: false,
    retryAfterPaymentSolutionTerms: false,
  };
  return runPlaywrightConnectionNativeTask({
    connection,
    runtimeActionKey: 'tradera_standard_list',
    instance: createTraderaStandardListingPlaywrightInstance({
      connectionId: connection.id,
      integrationId: connection.integrationId,
      listingId: listing.id,
    }),
    requestedBrowserMode: STANDARD_REQUESTED_BROWSER_MODE,
    execute: async (session) => {
      const { context, page } = session;
      tracker = await buildStandardExecutionTracker();
      tracker.succeed('browser_preparation', 'Browser settings were prepared.');
      tracker.succeed('browser_open', 'Browser was opened successfully.');
      tracker.start('auth_check', 'Checking whether the stored Tradera session is still valid.');

      let product: ProductWithImages | null = null;
      let listingDraft: {
        title: string;
        description: string;
        priceValue: string;
      } | null = null;
      let formControlsPromise: Promise<{
        titleInput: Locator;
        descriptionInput: Locator;
        priceInput: Locator;
        submitButton: Locator;
      }> | null = null;

      const resolveFormControls = async (): Promise<{
        titleInput: Locator;
        descriptionInput: Locator;
        priceInput: Locator;
        submitButton: Locator;
      }> => {
        if (formControlsPromise) {
          return formControlsPromise;
        }

        formControlsPromise = (async () => {
          const [titleInput, descriptionInput, priceInput, submitButton] = await Promise.all([
            findVisibleLocator(page, TITLE_SELECTORS),
            findVisibleLocator(page, DESCRIPTION_SELECTORS),
            findVisibleLocator(page, PRICE_SELECTORS),
            findVisibleLocator(page, SUBMIT_SELECTORS),
          ]);

          if (!titleInput || !descriptionInput || !priceInput || !submitButton) {
            throw internalError(
              'FAIL_SELL_PAGE_INVALID: Unable to locate one or more Tradera standard listing form controls.',
              {
                hasTitle: Boolean(titleInput),
                hasDescription: Boolean(descriptionInput),
                hasPrice: Boolean(priceInput),
                hasSubmit: Boolean(submitButton),
              }
            );
          }

          return {
            titleInput,
            descriptionInput,
            priceInput,
            submitButton,
          };
        })();

        return formControlsPromise;
      };

      const ensureProductLoaded = async (): Promise<ProductWithImages> => {
        if (product) {
          return product;
        }

        const productRepository = await getProductRepository();
        const loadedProduct = await productRepository.getProductById(listing.productId);
        if (!loadedProduct) {
          throw notFoundError('Product not found', { productId: listing.productId });
        }

        product = loadedProduct;
        return loadedProduct;
      };

      if (connection.traderaCategoryStrategy !== 'top_suggested') {
        const loadedProduct = await ensureProductLoaded();
        const categoryMapping = await resolveTraderaCategoryMappingResolutionForProduct({
          connectionId: connection.id,
          product: loadedProduct,
        });
        mappedCategoryExternalId = categoryMapping.mapping?.externalCategoryId ?? null;
        mappedCategoryPath =
          categoryMapping.mapping?.externalCategoryPath ??
          categoryMapping.mapping?.externalCategoryName ??
          null;
        categoryMappingReason = categoryMapping.reason;
        categoryMatchScope = categoryMapping.matchScope;
        categoryInternalCategoryId = categoryMapping.internalCategoryId;
        categoryMappingSourceConnectionId =
          categoryMapping.mapping?.sourceConnectionId ?? null;
        categoryMappingRecoveredFromAnotherConnection =
          categoryMappingSourceConnectionId !== null &&
          categoryMappingSourceConnectionId !== connection.id;
        assertTraderaCategoryMappingReady({
          categoryMapping,
          product: loadedProduct,
          connection,
        });
      }

      listingEditorUrl = buildListingFormUrlWithCategoryId(listingFormUrl, mappedCategoryExternalId);

      await ensureLoggedIn(page, connection, listingEditorUrl, {
        inputBehavior: session.runtime.settings,
        onStatus: (update: TraderaEnsureLoggedInStatusUpdate) => {
          switch (update.status) {
            case 'opening_session_check':
            case 'waiting_for_session_check':
              tracker?.start('auth_check', update.message);
              break;
            case 'stored_session_accepted':
              tracker?.succeed('auth_check', update.message);
              break;
            case 'stored_session_rejected':
              tracker?.succeed('auth_check', 'Stored Tradera session needed login recovery.');
              authLoginAttempted = true;
              tracker?.start('auth_login', update.message);
              break;
            case 'opening_login':
            case 'waiting_for_login_entry':
            case 'waiting_for_login_controls':
            case 'submitting_login':
            case 'requesting_email_verification_code':
            case 'waiting_for_email_verification_code':
            case 'submitting_email_verification_code':
            case 'waiting_for_post_login':
              authLoginAttempted = true;
              tracker?.start('auth_login', update.message);
              break;
            case 'opening_listing_form':
            case 'waiting_for_listing_form':
              tracker?.start('sell_page_open', update.message);
              break;
          }
        },
      });

      if (tracker.getStatus('auth_check') !== 'success') {
        tracker.succeed('auth_check', 'Stored Tradera session was accepted.');
      }

      if (authLoginAttempted) {
        tracker.succeed('auth_login', 'Automated login succeeded.');
      } else {
        tracker.skip(
          'auth_login',
          'Stored session was already valid; login was not needed.'
        );
      }
      tracker.skip(
        'auth_manual',
        'Manual login is not used in the standard Tradera browser flow.'
      );
      tracker.succeed(
        'cookie_accept',
        'Cookie consent was handled during session validation.'
      );
      tracker.succeed('sell_page_open', 'The Tradera listing editor became ready.');
      if (await acceptPaymentSolutionTermsIfPresent(page, 0)) {
        executionState.paymentSolutionTermsAccepted = true;
      }

      const sequencer = new TraderaSequencer({
        page,
        tracker,
        actionKey: 'tradera_standard_list',
        emit: () => undefined,
        helpers: {
          loadProduct: async () => {
            await ensureProductLoaded();
          },
          resolvePrice: async () => {
            if (!product) {
              throw createPlaywrightNativeTaskInternalError(
                'FAIL_PRICE_RESOLUTION: Product data must be loaded before resolving the Tradera price.',
                {
                  session,
                  additional: {
                    mode: 'standard',
                    listingFormUrl: listingEditorUrl,
                    productId: listing.productId,
                  },
                }
              );
            }

            const priceResolution = await resolveTraderaListingPriceForProduct({
              product,
              targetCurrencyCode: targetListingCurrencyCode,
            });
            pricingMetadata = buildTraderaPricingMetadata(priceResolution);
            if (
              priceResolution.listingPrice === null ||
              !priceResolution.resolvedToTargetCurrency ||
              toTrimmedString(priceResolution.listingCurrencyCode).toUpperCase() !==
                targetListingCurrencyCode
            ) {
              throw badRequestError(
                buildTraderaListingPriceResolutionFailureMessage(
                  targetListingCurrencyCode
                ),
                {
                  mode: 'standard',
                  listingFormUrl: listingEditorUrl,
                  ...pricingMetadata,
                }
              );
            }

            const resolvedCopy = resolveMarketplaceAwareProductCopy({
              product,
              integrationId: listing.integrationId,
              preferredLocales: ['en', 'pl', 'de'],
            });
            listingDraft = {
              title: resolvedCopy.title,
              description: buildTraderaListingDescription({
                rawDescription: resolvedCopy.description,
                fallbackTitle: resolvedCopy.title,
                baseProductId: product.baseProductId ?? product.id,
                sku: product.sku,
              }),
              priceValue: formatTraderaListingPriceInputValue(
                priceResolution.listingPrice,
                priceResolution.listingCurrencyCode
              ),
            };
          },
          fillTitle: async () => {
            if (!listingDraft) {
              throw internalError(
                'FAIL_STANDARD_LISTING_DATA: Listing data must be prepared before filling the title.'
              );
            }

            const { titleInput } = await resolveFormControls();
            await titleInput.fill(listingDraft.title);
          },
          fillDescription: async () => {
            if (!listingDraft) {
              throw internalError(
                'FAIL_STANDARD_LISTING_DATA: Listing data must be prepared before filling the description.'
              );
            }

            const { descriptionInput } = await resolveFormControls();
            await descriptionInput.fill(listingDraft.description);
          },
          fillPrice: async () => {
            if (!listingDraft) {
              throw internalError(
                'FAIL_STANDARD_LISTING_DATA: Listing data must be prepared before filling the price.'
              );
            }

            const { priceInput } = await resolveFormControls();
            await priceInput.fill(listingDraft.priceValue);
          },
          publish: async () => {
            const { submitButton } = await resolveFormControls();
            if (await acceptPaymentSolutionTermsIfPresent(page, 0)) {
              executionState.paymentSolutionTermsAccepted = true;
            }

            const waitForPublishNavigation = (): Promise<unknown> =>
              page
                .waitForNavigation({
                  waitUntil: 'domcontentloaded',
                  timeout: 30_000,
                })
                .catch(() => null);

            const navigationAfterClick = waitForPublishNavigation();
            await submitButton.click();

            const paymentSolutionAccepted = await Promise.race([
              acceptPaymentSolutionTermsIfPresent(page),
              navigationAfterClick.then(() => false),
            ]);
            if (paymentSolutionAccepted) {
              executionState.paymentSolutionTermsAccepted = true;
              executionState.retryAfterPaymentSolutionTerms = true;
              await Promise.allSettled([
                navigationAfterClick,
                waitForPublishNavigation(),
                submitButton.click(),
              ]);
            } else {
              await navigationAfterClick;
            }
          },
          verifyPublish: () => {
            executionState.externalListingId = extractExternalListingId(page.url());
            if (executionState.externalListingId === null) {
              throw internalError(
                'FAIL_PUBLISH_VERIFICATION: Failed to capture external listing ID after submission.'
              );
            }
            return Promise.resolve();
          },
          persistSession: async () => {
            const nextStorageState = await context.storageState();
            executionState.completedAt = new Date().toISOString();
            await persistPlaywrightConnectionStorageState({
              connectionId: connection.id,
              storageState: nextStorageState,
              updatedAt: executionState.completedAt,
              repo: await getIntegrationRepository(),
            });
          },
        },
      });
      await sequencer.run();

      if (executionState.externalListingId === null) {
        throw internalError(
          'FAIL_PUBLISH_VERIFICATION: Failed to capture external listing ID after submission.'
        );
      }
      const resolvedCompletedAt =
        executionState.completedAt ?? new Date().toISOString();

      return buildPlaywrightNativeTaskResult({
        session,
        externalListingId: executionState.externalListingId,
        listingUrl: buildCanonicalTraderaListingUrl(
          executionState.externalListingId
        ),
        completedAt: resolvedCompletedAt,
        metadata: {
          mode: 'standard',
          listingFormUrl: listingEditorUrl,
          categoryId: mappedCategoryExternalId,
          categoryPath: mappedCategoryPath,
          categorySource: mappedCategoryExternalId ? 'categoryMapper' : null,
          categoryMappingReason,
          categoryMatchScope,
          categoryInternalCategoryId,
          categoryMappingSourceConnectionId,
          categoryMappingRecoveredFromAnotherConnection,
          completedAt: resolvedCompletedAt,
          paymentSolutionTermsAccepted: executionState.paymentSolutionTermsAccepted,
          retryAfterPaymentSolutionTerms: executionState.retryAfterPaymentSolutionTerms,
          executionSteps: tracker.getSteps(),
          ...pricingMetadata,
        },
      });
    },
    buildErrorAdditional: async ({ error, session }) => {
      const activeTracker = tracker ?? (await buildStandardExecutionTracker());
      const errorId = `tradera-browser-standard-${Date.now()}`;
      const debugArtifacts = await captureTraderaListingDebugArtifacts(session.page, errorId, action);
      const authState = await readTraderaAuthState(session.page).catch(() => null);

      const errorMessage = errorMessageSchema.catch('Browser listing failed').parse(error);
      const normalizedError = errorMessage.toUpperCase();
      const errorMeta = errorMetaSchema.catch({}).parse(error);
      const failedStepId = resolveStandardFailedStepId({
        authLoginAttempted,
        normalizedError,
        tracker: activeTracker,
      });
      if (activeTracker.getStatus(failedStepId) !== 'error') {
        activeTracker.fail(failedStepId, errorMessage);
      }
      activeTracker.skipRemaining(
        'Not reached because an earlier step failed.',
        failedStepId
      );

      return {
        mode: 'standard',
        listingFormUrl: listingEditorUrl,
        categoryId: mappedCategoryExternalId,
        categoryPath: mappedCategoryPath,
        categorySource: mappedCategoryExternalId ? 'categoryMapper' : null,
        categoryMappingReason,
        categoryMatchScope,
        categoryInternalCategoryId,
        categoryMappingSourceConnectionId,
        categoryMappingRecoveredFromAnotherConnection,
        paymentSolutionTermsAccepted: executionState.paymentSolutionTermsAccepted,
        retryAfterPaymentSolutionTerms: executionState.retryAfterPaymentSolutionTerms,
        executionSteps: activeTracker.getSteps(),
        ...(pricingMetadata ?? {}),
        debugArtifacts,
        authState,
        authFailureMeta: errorMeta.meta ?? null,
        errorId,
      };
    },
    getErrorMessage: (error) =>
      errorMessageSchema.catch('Browser listing failed').parse(error),
  });
};
