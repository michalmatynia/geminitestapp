import 'server-only';

import { isPlaywrightProgrammableSlug } from '@/features/integrations/constants/slugs';
import {
  decryptSecret,
  findProductListingByIdAcrossProviders,
  getIntegrationRepository,
} from '@/features/integrations/server';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { PlaywrightRelistBrowserMode, ProductListing } from '@/shared/contracts/integrations/listings';
import type { PlaywrightListingJobInput } from '@/shared/contracts/integrations/tradera';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { notFoundError } from '@/shared/errors/app-error';
import {
  resolveAppBaseUrl,
  toAbsoluteUrl,
} from '@/shared/lib/files/services/storage/file-storage-service';
import { resolveMarketplaceAwareProductCopy } from '@/shared/lib/products/utils/marketplace-content-overrides';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  buildPlaywrightProgrammableListingProcessArtifacts,
  buildPlaywrightScriptListingMetadata,
  buildPlaywrightServiceListingCaughtFailure,
  buildPlaywrightServiceListingFailure,
  buildPlaywrightServiceListingMissingContextFailure,
  buildPlaywrightServiceListingSuccess,
  finalizePlaywrightStandardListingJobOutcome,
  resolvePlaywrightListingPersistenceContextAfterRun,
  resolvePlaywrightListingRunContext,
  type PlaywrightServiceListingExecutionBase,
  runPlaywrightProgrammableListingForConnection,
} from '@/features/playwright/server';

export type { PlaywrightListingJobInput };

export type PlaywrightListingExecutionResult = PlaywrightServiceListingExecutionBase & {
  expiresAt: Date | null;
};

const resolveProductImageUrls = (product: ProductWithImages): string[] => {
  const urls = new Set<string>();

  (product.imageLinks ?? []).forEach((value) => {
    const trimmed = value.trim();
    if (trimmed) urls.add(trimmed);
  });

  (product.images ?? []).forEach((image) => {
    const candidates = [
      image.imageFile?.publicUrl,
      image.imageFile?.url,
      image.imageFile?.thumbnailUrl,
      image.imageFile?.filepath,
    ];
    candidates.forEach((candidate) => {
      const trimmed = typeof candidate === 'string' ? candidate.trim() : '';
      if (trimmed) urls.add(trimmed);
    });
  });

  return Array.from(urls);
};

export const buildPlaywrightListingInput = ({
  product,
  listing,
  connection,
}: {
  product: ProductWithImages;
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
}): Record<string, unknown> => {
  const { title, description } = resolveMarketplaceAwareProductCopy({
    product,
    integrationId: listing.integrationId,
    preferredLocales: ['en', 'pl', 'de'],
  });
  const appBaseUrl = resolveAppBaseUrl();
  const images = resolveProductImageUrls(product).map((u) => toAbsoluteUrl(u, appBaseUrl));
  // Credentials passed in-memory only — never written to disk or job queue
  const username = connection.username ?? null;
  const password = connection.password ? decryptSecret(connection.password) : null;

  return {
    productId: product.id,
    listingId: listing.id,
    integrationId: listing.integrationId,
    connectionId: listing.connectionId,
    baseProductId: product.baseProductId ?? product.id,
    title,
    description,
    price: typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : null,
    sku: product.sku ?? null,
    ean: product.ean ?? null,
    gtin: product.gtin ?? null,
    asin: product.asin ?? null,
    images,
    imageUrls: images,
    username,
    password,
    appBaseUrl,
    bundle: product,
    product,
    entityJson: JSON.stringify(product),
  };
};

const resolveRequestedBrowserMode = (
  browserMode: PlaywrightRelistBrowserMode | undefined
): PlaywrightRelistBrowserMode => browserMode ?? 'connection_default';

export const runPlaywrightListing = async (
  input: PlaywrightListingJobInput
): Promise<PlaywrightListingExecutionResult> => {
  const requestedBrowserMode = resolveRequestedBrowserMode(input.browserMode);
  try {
    const integrationRepository = await getIntegrationRepository();
    const runContext = await resolvePlaywrightListingRunContext({
      listingId: input.listingId,
      includeIntegration: true,
      dependencies: {
        findListingById: findProductListingByIdAcrossProviders,
        getConnectionById: integrationRepository.getConnectionById.bind(integrationRepository),
        getIntegrationById: integrationRepository.getIntegrationById.bind(integrationRepository),
      },
    });
    if (!runContext.ok) {
      return buildPlaywrightServiceListingMissingContextFailure({
        context: runContext,
        extra: {
          expiresAt: null,
        },
      });
    }

    const { listing, connection, integration } = runContext;

    if (!isPlaywrightProgrammableSlug(integration.slug)) {
      return buildPlaywrightServiceListingFailure({
        error: `Integration ${integration.slug} does not support programmable Playwright listings.`,
        errorCategory: 'UNSUPPORTED_INTEGRATION',
        extra: {
          expiresAt: null,
        },
      });
    }

    const productRepository = await getProductRepository();
    const product = await productRepository.getProductById(listing.productId);
    if (!product) {
      throw notFoundError('Product not found', { productId: listing.productId });
    }

    const result = await runPlaywrightProgrammableListingForConnection({
      connection,
      input: buildPlaywrightListingInput({ product, listing, connection }),
      browserMode: requestedBrowserMode,
    });

    const expiresAt =
      typeof result.expiresAt === 'string' && result.expiresAt.trim()
        ? new Date(result.expiresAt)
        : null;

    return buildPlaywrightServiceListingSuccess({
      externalListingId: result.externalListingId,
      listingUrl: result.listingUrl,
      metadata: {
        ...buildPlaywrightScriptListingMetadata({
          result,
          requestedBrowserMode,
        }),
      },
      extra: {
        expiresAt: expiresAt && Number.isFinite(expiresAt.getTime()) ? expiresAt : null,
      },
    });
  } catch (error: unknown) {
    void ErrorSystem.captureException(error, {
      service: 'playwright-programmable-listing',
      listingId: input.listingId,
    });

    return buildPlaywrightServiceListingCaughtFailure({
      error,
      errorMessage:
        error instanceof Error ? error.message : 'Programmable Playwright listing failed.',
      errorCategory: 'EXECUTION_FAILED',
      metadata: {
        requestedBrowserMode,
      },
      extra: {
        expiresAt: null,
      },
      includeAppErrorMetadata: false,
    });
  }
};

export const processPlaywrightListingJob = async (input: PlaywrightListingJobInput): Promise<void> => {
  const result = await runPlaywrightListing(input);
  const persistenceContext = await resolvePlaywrightListingPersistenceContextAfterRun({
    listingId: input.listingId,
    result,
    dependencies: {
      findListingById: findProductListingByIdAcrossProviders,
    },
    missingErrorMessage: `Listing not found: ${input.listingId}`,
  });
  if (!persistenceContext) {
    return;
  }

  const now = new Date();
  const { listing, repository } = persistenceContext;
  const requestedBrowserMode = resolveRequestedBrowserMode(input.browserMode);
  const { historyFields, marketplaceData } = buildPlaywrightProgrammableListingProcessArtifacts({
    executedAt: now,
    existingMarketplaceData: listing.marketplaceData,
    result,
    requestId: input.jobId ?? null,
    requestedBrowserMode,
  });

  if (result.ok) {
    await finalizePlaywrightStandardListingJobOutcome({
      repository,
      listingId: input.listingId,
      result,
      at: now,
      marketplaceData,
      relist: input.action === 'relist',
      requestId: input.jobId ?? null,
      historyFields,
      success: {
        transitionStatus: 'active',
        historyStatus: 'active',
        expiresAt: result.expiresAt ?? null,
        updateExtra: {
          listedAt: now,
          expiresAt: result.expiresAt ?? null,
        },
      },
      failure: {
        transitionStatus: 'failed',
        historyStatus: 'failed',
        failureReason: 'Programmable Playwright listing failed.',
      },
    });
    return;
  }

  await finalizePlaywrightStandardListingJobOutcome({
    repository,
    listingId: input.listingId,
    result,
    at: now,
    marketplaceData,
    relist: input.action === 'relist',
    requestId: input.jobId ?? null,
    historyFields,
    success: {
      transitionStatus: 'active',
      historyStatus: 'active',
      expiresAt: result.expiresAt ?? null,
      updateExtra: {
        listedAt: now,
        expiresAt: result.expiresAt ?? null,
      },
    },
    failure: {
      transitionStatus: 'failed',
      historyStatus: 'failed',
      failureReason: 'Programmable Playwright listing failed.',
    },
  });
};
