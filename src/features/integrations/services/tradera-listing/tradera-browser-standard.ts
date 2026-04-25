import type { Locator } from 'playwright';

import { normalizeTraderaListingFormUrl, type TraderaSystemSettings } from '@/features/integrations/constants/tradera';
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
import { internalError, notFoundError } from '@/shared/errors/app-error';
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
import { resolveTraderaListingPriceForProduct } from './price';
import { buildTraderaPricingMetadata } from './pricing-metadata';
import { buildTraderaListingDescription } from './description';

const STANDARD_REQUESTED_BROWSER_MODE = 'connection_default';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

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
  let tracker: StepTracker | null = null;
  let pricingMetadata: Record<string, unknown> | null = null;
  let authLoginAttempted = false;
  let listingEditorUrl = listingFormUrl;
  let mappedCategoryExternalId: string | null = null;
  let mappedCategoryPath: string | null = null;
  let categoryMappingReason: string | null = null;
  let categoryMatchScope: string | null = null;
  let categoryInternalCategoryId: string | null = null;
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
      const executionState: {
        completedAt: string | null;
        externalListingId: string | null;
      } = {
        completedAt: null,
        externalListingId: null,
      };
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
              targetCurrencyCode: 'EUR',
            });
            pricingMetadata = buildTraderaPricingMetadata(priceResolution);
            if (
              priceResolution.listingPrice === null ||
              !priceResolution.resolvedToTargetCurrency ||
              toTrimmedString(priceResolution.listingCurrencyCode).toUpperCase() !== 'EUR'
            ) {
              throw createPlaywrightNativeTaskInternalError(
                'FAIL_PRICE_RESOLUTION: Tradera listing price could not be resolved to EUR.',
                {
                  session,
                  additional: {
                    mode: 'standard',
                    listingFormUrl: listingEditorUrl,
                    ...pricingMetadata,
                  },
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
              priceValue: String(priceResolution.listingPrice),
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
            await Promise.allSettled([
              page.waitForNavigation({
                waitUntil: 'domcontentloaded',
                timeout: 30_000,
              }),
              submitButton.click(),
            ]);
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
          completedAt: resolvedCompletedAt,
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

      const errorMessage =
        error instanceof Error ? error.message : 'Browser listing failed';
      const normalizedError = errorMessage.toUpperCase();
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
        executionSteps: activeTracker.getSteps(),
        ...(pricingMetadata ?? {}),
        debugArtifacts,
        authState,
        authFailureMeta:
          error !== null && typeof error === 'object' && 'meta' in error
            ? (error as { meta?: unknown }).meta ?? null
            : null,
        errorId,
      };
    },
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : 'Browser listing failed',
  });
};
