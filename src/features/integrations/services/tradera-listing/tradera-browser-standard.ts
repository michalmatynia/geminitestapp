import { normalizeTraderaListingFormUrl, TraderaSystemSettings } from '@/features/integrations/constants/tradera';
import {
  openPlaywrightConnectionPageSession,
  persistPlaywrightConnectionStorageState,
} from '@/features/playwright/server';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { BrowserListingResultDto, ProductListing } from '@/shared/contracts/integrations/listings';
import { internalError, isAppError, notFoundError } from '@/shared/errors/app-error';
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
  const executionSteps: TraderaExecutionStep[] = [
    {
      id: 'auth',
      label: 'Validate Tradera session',
      status: 'pending',
      message: null,
    },
    {
      id: 'load_product',
      label: 'Load product data',
      status: 'pending',
      message: null,
    },
    {
      id: 'resolve_price',
      label: 'Resolve listing price',
      status: 'pending',
      message: null,
    },
    {
      id: 'fill_form',
      label: 'Fill listing form',
      status: 'pending',
      message: null,
    },
    {
      id: 'publish',
      label: action === 'sync' ? 'Save and verify listing' : 'Publish and verify listing',
      status: 'pending',
      message: null,
    },
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
  const session = await openPlaywrightConnectionPageSession({
    connection,
  });
  const { runtime, context, page } = session;
  const playwrightSettings = runtime.settings;
  const effectiveHeadless = playwrightSettings.headless;
  const effectiveBrowserMode = effectiveHeadless ? 'headless' : 'headed';
  let pricingMetadata: Record<string, unknown> | null = null;
  try {
    markStep('auth', {
      status: 'running',
      message: 'Checking whether the stored Tradera session is still valid.',
    });
    await ensureLoggedIn(page, connection, listingFormUrl);
    markStep('auth', {
      status: 'success',
      message: 'Stored Tradera session was accepted.',
    });

    markStep('load_product', {
      status: 'running',
      message: 'Loading the linked product record.',
    });
    const productRepository = await getProductRepository();
    const product = await productRepository.getProductById(listing.productId);
    if (!product) {
        throw notFoundError('Product not found', { productId: listing.productId });
    }
    markStep('load_product', {
      status: 'success',
      message: 'Loaded product data for the listing.',
    });

    markStep('resolve_price', {
      status: 'running',
      message: 'Resolving the Tradera listing price in EUR.',
    });
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
    markStep('resolve_price', {
      status: 'success',
      message: 'Resolved a Tradera listing price in EUR.',
    });

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

    markStep('fill_form', {
      status: 'running',
      message: 'Filling the standard Tradera listing form.',
    });
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
    markStep('fill_form', {
      status: 'success',
      message: 'Filled the title, description, and price fields.',
    });

    markStep('publish', {
      status: 'running',
      message: 'Submitting the Tradera listing form.',
    });
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
    const completedAt = new Date().toISOString();
    await persistPlaywrightConnectionStorageState({
      connectionId: connection.id,
      storageState: nextStorageState,
      updatedAt: completedAt,
    });
    markStep('publish', {
      status: 'success',
      message: 'The listing was published and verified successfully.',
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
        executionSteps,
        ...pricingMetadata,
      },
    };
  } catch (error: unknown) {
    const errorId = `tradera-browser-standard-${Date.now()}`;
    const debugArtifacts = await captureTraderaListingDebugArtifacts(page, errorId, action);
    const authState = await readTraderaAuthState(page).catch(() => null);

    const errorMessage =
      error instanceof Error ? error.message : 'Browser listing failed';
    const normalizedError = errorMessage.toUpperCase();
    const failedStepId =
      normalizedError.includes('AUTH')
        ? 'auth'
        : normalizedError.includes('PRICE')
          ? 'resolve_price'
          : normalizedError.includes('PRODUCT NOT FOUND')
            ? 'load_product'
            : normalizedError.includes('EXTERNAL LISTING ID') ||
                normalizedError.includes('SUBMISSION') ||
                normalizedError.includes('PUBLISH')
              ? 'publish'
              : 'fill_form';
    markStep(failedStepId, {
      status: 'error',
      message: errorMessage,
    });
    markRemainingStepsSkipped(failedStepId, 'Not reached because an earlier step failed.');

    if (isAppError(error)) {
      error.meta = {
        ...error.meta,
        mode: 'standard',
        browserMode: effectiveBrowserMode,
        requestedBrowserMode: STANDARD_REQUESTED_BROWSER_MODE,
        listingFormUrl,
        executionSteps,
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
      executionSteps,
      ...(pricingMetadata ?? {}),
      debugArtifacts,
      authState,
      errorId,
    });
  } finally {
    await session.close();
  }
};
