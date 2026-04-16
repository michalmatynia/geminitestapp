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
import { internalError, notFoundError } from '@/shared/errors/app-error';
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
import { resolveTraderaListingPriceForProduct } from './price';
import { buildTraderaPricingMetadata } from './pricing-metadata';
import { buildTraderaListingDescription } from './description';
import type { TraderaExecutionStep } from '@/shared/contracts/integrations/listings';

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
  const createStep = (id: string, label: string): TraderaExecutionStep => ({
    id,
    label,
    status: 'pending',
    message: null,
  });
  const executionSteps: TraderaExecutionStep[] = [
    createStep('browser_preparation', 'Browser preparation'),
    createStep('browser_open', 'Open browser'),
    createStep('cookie_accept', 'Accept cookies'),
    createStep('auth_check', 'Validate Tradera session'),
    createStep('auth_login', 'Automated login'),
    createStep('auth_manual', 'Complete manual Tradera login'),
    createStep('sell_page_open', 'Open listing editor'),
    createStep('load_product', 'Load product data'),
    createStep('resolve_price', 'Resolve listing price'),
    createStep('title_fill', 'Enter title'),
    createStep('description_fill', 'Enter description'),
    createStep('price_set', 'Set price'),
    createStep(
      'publish',
      action === 'sync' ? 'Save listing changes' : 'Publish listing'
    ),
    createStep(
      'publish_verify',
      action === 'sync' ? 'Verify saved listing' : 'Verify published listing'
    ),
    createStep('browser_close', 'Close browser'),
  ];
  const markStep = (
    stepId: string,
    patch: Partial<Pick<TraderaExecutionStep, 'status' | 'message'>>
  ): void => {
    const target = executionSteps.find((step) => step.id === stepId);
    if (!target) return;
    if (patch.status) {
      target.status = patch.status;
    }
    if (patch.message !== undefined) {
      target.message = patch.message ?? null;
    }
  };
  const getStepStatus = (stepId: string): TraderaExecutionStep['status'] | null =>
    executionSteps.find((step) => step.id === stepId)?.status ?? null;
  let lastStartedStepId: string | null = null;
  const startStep = (stepId: string, message: string): void => {
    lastStartedStepId = stepId;
    markStep(stepId, {
      status: 'running',
      message,
    });
  };
  const succeedStep = (stepId: string, message: string): void => {
    markStep(stepId, {
      status: 'success',
      message,
    });
  };
  const markRemainingStepsSkipped = (stepId: string, message: string): void => {
    const failedIndex = executionSteps.findIndex((step) => step.id === stepId);
    if (failedIndex === -1) return;
    for (const step of executionSteps.slice(failedIndex + 1)) {
      if (step.status === 'pending') {
        step.status = 'skipped';
        step.message = message;
      }
    }
  };
  const listingFormUrl = normalizeTraderaListingFormUrl(systemSettings.listingFormUrl);
  let pricingMetadata: Record<string, unknown> | null = null;
  let authLoginAttempted = false;
  return runPlaywrightConnectionNativeTask({
    connection,
    instance: createTraderaStandardListingPlaywrightInstance({
      connectionId: connection.id,
      integrationId: connection.integrationId,
      listingId: listing.id,
    }),
    requestedBrowserMode: STANDARD_REQUESTED_BROWSER_MODE,
    execute: async (session) => {
      const { context, page } = session;
      succeedStep('browser_preparation', 'Browser settings were prepared.');
      succeedStep('browser_open', 'Browser was opened successfully.');
      startStep('auth_check', 'Checking whether the stored Tradera session is still valid.');
      await ensureLoggedIn(page, connection, listingFormUrl, {
        onStatus: (update: TraderaEnsureLoggedInStatusUpdate) => {
          switch (update.status) {
            case 'opening_session_check':
            case 'waiting_for_session_check':
              startStep('auth_check', update.message);
              break;
            case 'stored_session_accepted':
              succeedStep('auth_check', update.message);
              break;
            case 'stored_session_rejected':
              succeedStep('auth_check', 'Stored Tradera session needed login recovery.');
              authLoginAttempted = true;
              startStep('auth_login', update.message);
              break;
            case 'opening_login':
            case 'waiting_for_login_entry':
            case 'waiting_for_login_controls':
            case 'submitting_login':
            case 'waiting_for_post_login':
              authLoginAttempted = true;
              startStep('auth_login', update.message);
              break;
            case 'opening_listing_form':
            case 'waiting_for_listing_form':
              startStep('sell_page_open', update.message);
              break;
          }
        },
      });
      if (getStepStatus('auth_check') !== 'success') {
        succeedStep('auth_check', 'Stored Tradera session was accepted.');
      }
      markStep('auth_login', {
        status: authLoginAttempted ? 'success' : 'skipped',
        message: authLoginAttempted
          ? 'Automated login succeeded.'
          : 'Stored session was already valid; login was not needed.',
      });
      markStep('auth_manual', {
        status: 'skipped',
        message: 'Manual login is not used in the standard Tradera browser flow.',
      });
      succeedStep('cookie_accept', 'Cookie consent was handled during session validation.');
      succeedStep('sell_page_open', 'The Tradera listing editor became ready.');

      startStep('load_product', 'Loading the linked product record.');
      const productRepository = await getProductRepository();
      const product = await productRepository.getProductById(listing.productId);
      if (!product) {
        throw notFoundError('Product not found', { productId: listing.productId });
      }
      succeedStep('load_product', 'Loaded product data for the listing.');

      startStep('resolve_price', 'Resolving the Tradera listing price in EUR.');
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
              listingFormUrl,
              ...pricingMetadata,
            },
          }
        );
      }
      succeedStep('resolve_price', 'Resolved a Tradera listing price in EUR.');

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

      startStep('title_fill', 'Entering the Tradera listing title.');
      await titleInput.fill(title);
      succeedStep('title_fill', 'Title was entered.');
      startStep('description_fill', 'Entering the Tradera listing description.');
      await descriptionInput.fill(description);
      succeedStep('description_fill', 'Description was entered.');
      startStep('price_set', 'Setting the Tradera price.');
      await priceInput.fill(priceValue);
      succeedStep('price_set', 'Price was set.');

      startStep(
        'publish',
        action === 'sync'
          ? 'Submitting the Tradera listing update.'
          : 'Submitting the Tradera listing form.'
      );
      await Promise.allSettled([
        page.waitForNavigation({
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        }),
        submitButton.click(),
      ]);
      succeedStep('publish', 'The publish action was submitted successfully.');
      startStep(
        'publish_verify',
        action === 'sync'
          ? 'Verifying the saved Tradera listing.'
          : 'Verifying the published Tradera listing.'
      );

      const externalListingId = extractExternalListingId(page.url());
      if (!externalListingId) {
        throw internalError(
          'FAIL_PUBLISH_VERIFICATION: Failed to capture external listing ID after submission.'
        );
      }

      const nextStorageState = await context.storageState();
      const completedAt = new Date().toISOString();
      await persistPlaywrightConnectionStorageState({
        connectionId: connection.id,
        storageState: nextStorageState,
        updatedAt: completedAt,
        repo: await getIntegrationRepository(),
      });
      succeedStep('publish_verify', 'The listing was published and verified successfully.');
      succeedStep('browser_close', 'Browser was closed.');

      return buildPlaywrightNativeTaskResult({
        session,
        externalListingId,
        listingUrl: buildCanonicalTraderaListingUrl(externalListingId),
        completedAt,
        metadata: {
          mode: 'standard',
          listingFormUrl,
          completedAt,
          executionSteps,
          ...pricingMetadata,
        },
      });
    },
    buildErrorAdditional: async ({ error, session }) => {
      const errorId = `tradera-browser-standard-${Date.now()}`;
      const debugArtifacts = await captureTraderaListingDebugArtifacts(session.page, errorId, action);
      const authState = await readTraderaAuthState(session.page).catch(() => null);

      const errorMessage =
        error instanceof Error ? error.message : 'Browser listing failed';
      const normalizedError = errorMessage.toUpperCase();
      const failedStepId =
        normalizedError.includes('FAIL_SELL_PAGE_INVALID')
          ? 'sell_page_open'
          : normalizedError.includes('AUTH')
            ? authLoginAttempted
              ? 'auth_login'
              : 'auth_check'
          : normalizedError.includes('PRICE_RESOLUTION')
            ? 'resolve_price'
          : normalizedError.includes('PRODUCT NOT FOUND')
            ? 'load_product'
          : normalizedError.includes('FAIL_PUBLISH_VERIFICATION') ||
              normalizedError.includes('EXTERNAL LISTING ID')
            ? 'publish_verify'
          : normalizedError.includes('PUBLISH') ||
              normalizedError.includes('SUBMISSION')
            ? 'publish'
          : normalizedError.includes('DESCRIPTION')
            ? 'description_fill'
          : normalizedError.includes('PRICE_SET')
            ? 'price_set'
          : normalizedError.includes('TITLE')
            ? 'title_fill'
          : lastStartedStepId
            ? lastStartedStepId
            : 'sell_page_open';
      markStep(failedStepId, {
        status: 'error',
        message: errorMessage,
      });
      markRemainingStepsSkipped(failedStepId, 'Not reached because an earlier step failed.');

      return {
        mode: 'standard',
        listingFormUrl,
        executionSteps,
        ...(pricingMetadata ?? {}),
        debugArtifacts,
        authState,
        authFailureMeta:
          error && typeof error === 'object' && 'meta' in error
            ? (error as { meta?: unknown }).meta ?? null
            : null,
        errorId,
      };
    },
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : 'Browser listing failed',
  });
};
