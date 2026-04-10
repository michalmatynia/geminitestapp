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
  buildPlaywrightListingLastExecutionRecord,
  buildPlaywrightListingProviderRecord,
  buildPlaywrightScriptListingMetadata,
  buildPlaywrightServiceListingFailure,
  buildPlaywrightServiceListingSuccess,
  type PlaywrightServiceListingExecutionBase,
  runPlaywrightProgrammableListingForConnection,
} from '@/features/playwright/server';

export type { PlaywrightListingJobInput };

export type PlaywrightListingExecutionResult = PlaywrightServiceListingExecutionBase & {
  expiresAt: Date | null;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

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

const buildPlaywrightHistoryFields = (
  browserMode: string | null | undefined
): string[] | null => {
  const normalizedBrowserMode =
    typeof browserMode === 'string' && browserMode.trim().length > 0 ? browserMode.trim() : null;
  if (!normalizedBrowserMode) return null;
  return [`browser_mode:${normalizedBrowserMode}`];
};

export const runPlaywrightListing = async (
  input: PlaywrightListingJobInput
): Promise<PlaywrightListingExecutionResult> => {
  const requestedBrowserMode = resolveRequestedBrowserMode(input.browserMode);
  try {
    const resolvedListing = await findProductListingByIdAcrossProviders(input.listingId);
    if (!resolvedListing) {
      return buildPlaywrightServiceListingFailure({
        error: `Listing not found: ${input.listingId}`,
        errorCategory: 'NOT_FOUND',
        extra: {
          expiresAt: null,
        },
      });
    }

    const { listing } = resolvedListing;
    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(listing.connectionId);
    if (!connection) {
      return buildPlaywrightServiceListingFailure({
        error: `Connection not found: ${listing.connectionId}`,
        errorCategory: 'NOT_FOUND',
        extra: {
          expiresAt: null,
        },
      });
    }

    const integration = await integrationRepo.getIntegrationById(connection.integrationId);
    if (!integration) {
      return buildPlaywrightServiceListingFailure({
        error: `Integration not found: ${connection.integrationId}`,
        errorCategory: 'NOT_FOUND',
        extra: {
          expiresAt: null,
        },
      });
    }

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

    return buildPlaywrightServiceListingFailure({
      error: error instanceof Error ? error.message : 'Programmable Playwright listing failed.',
      errorCategory: 'EXECUTION_FAILED',
      metadata: {
        requestedBrowserMode,
      },
      extra: {
        expiresAt: null,
      },
    });
  }
};

export const processPlaywrightListingJob = async (input: PlaywrightListingJobInput): Promise<void> => {
  const result = await runPlaywrightListing(input);
  const resolved = await findProductListingByIdAcrossProviders(input.listingId);

  if (!resolved) {
    if (!result.ok) {
      throw new Error(result.error ?? `Listing not found: ${input.listingId}`);
    }
    return;
  }

  const now = new Date();
  const previousMarketplaceData = toRecord(resolved.listing.marketplaceData);
  const requestedBrowserMode = resolveRequestedBrowserMode(input.browserMode);
  const effectiveBrowserMode =
    typeof result.metadata?.['browserMode'] === 'string' ? result.metadata['browserMode'] : null;
  const historyFields = buildPlaywrightHistoryFields(effectiveBrowserMode ?? requestedBrowserMode);
  const lastExecution = buildPlaywrightListingLastExecutionRecord({
    executedAt: now,
    result,
    requestId: input.jobId ?? null,
    includeOutcomeFields: false,
    metadata: {
      runId:
        typeof result.metadata?.['runId'] === 'string'
          ? result.metadata['runId']
          : null,
      browserMode: effectiveBrowserMode,
      requestedBrowserMode,
      publishVerified:
        typeof result.metadata?.['publishVerified'] === 'boolean'
          ? result.metadata['publishVerified']
          : null,
      rawResult: result.metadata?.['rawResult'] ?? null,
    },
    extra: {
      errorCategory: result.errorCategory,
    },
  });
  const playwrightData = buildPlaywrightListingProviderRecord({
    existingMarketplaceData: previousMarketplaceData,
    providerKey: 'playwright',
    result,
    lastExecution,
  });
  const marketplaceData = {
    ...previousMarketplaceData,
    marketplace: 'playwright-programmable',
    listingUrl: result.listingUrl,
    playwright: playwrightData,
  };

  if (result.ok) {
    await resolved.repository.updateListingStatus(input.listingId, 'active');
    await resolved.repository.updateListing(input.listingId, {
      externalListingId: result.externalListingId ?? null,
      listedAt: now,
      expiresAt: result.expiresAt ?? null,
      lastStatusCheckAt: now,
      failureReason: null,
      marketplaceData,
    });
    await resolved.repository.appendExportHistory(input.listingId, {
      exportedAt: now,
      status: 'active',
      externalListingId: result.externalListingId ?? null,
      expiresAt: result.expiresAt ?? null,
      failureReason: null,
      relist: input.action === 'relist',
      requestId: input.jobId ?? null,
      fields: historyFields,
    });
    return;
  }

  await resolved.repository.updateListingStatus(input.listingId, 'failed');
  await resolved.repository.updateListing(input.listingId, {
    lastStatusCheckAt: now,
    failureReason: result.error ?? 'Programmable Playwright listing failed.',
    marketplaceData,
  });
  await resolved.repository.appendExportHistory(input.listingId, {
    exportedAt: now,
    status: 'failed',
    externalListingId: null,
    expiresAt: null,
    failureReason: result.error ?? 'Programmable Playwright listing failed.',
    relist: input.action === 'relist',
    requestId: input.jobId ?? null,
    fields: historyFields,
  });
  throw new Error(result.error ?? 'Programmable Playwright listing failed.');
};
