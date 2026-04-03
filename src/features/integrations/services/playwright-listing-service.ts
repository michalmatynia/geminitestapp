import 'server-only';

import { isPlaywrightProgrammableSlug } from '@/features/integrations/constants/slugs';
import {
  decryptSecret,
  findProductListingByIdAcrossProviders,
  getIntegrationRepository,
} from '@/features/integrations/server';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import type {
  IntegrationConnectionRecord,
  PlaywrightRelistBrowserMode,
  PlaywrightListingJobInput,
  ProductListing,
} from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';
import { notFoundError } from '@/shared/errors/app-error';
import {
  resolveAppBaseUrl,
  toAbsoluteUrl,
} from '@/shared/lib/files/services/storage/file-storage-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { runPlaywrightListingScript } from './playwright-listing/runner';

export type { PlaywrightListingJobInput };

export type PlaywrightListingExecutionResult = {
  ok: boolean;
  externalListingId: string | null;
  listingUrl: string | null;
  expiresAt: Date | null;
  error: string | null;
  errorCategory: string | null;
  metadata?: Record<string, unknown>;
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

const resolvePrimaryTitle = (product: ProductWithImages): string =>
  product.name_en ||
  product.name_pl ||
  product.name_de ||
  product.sku ||
  `Product ${product.id}`;

const resolvePrimaryDescription = (product: ProductWithImages, fallbackTitle: string): string =>
  product.description_en || product.description_pl || product.description_de || fallbackTitle;

export const buildPlaywrightListingInput = ({
  product,
  listing,
  connection,
}: {
  product: ProductWithImages;
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
}): Record<string, unknown> => {
  const title = resolvePrimaryTitle(product);
  const description = resolvePrimaryDescription(product, title);
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

const ensureProgrammablePlaywrightConnection = (connection: IntegrationConnectionRecord): string => {
  const script = connection.playwrightListingScript?.trim();
  if (!script) {
    throw new Error('This connection does not have a Playwright listing script configured.');
  }
  return script;
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
      return {
        ok: false,
        externalListingId: null,
        listingUrl: null,
        expiresAt: null,
        error: `Listing not found: ${input.listingId}`,
        errorCategory: 'NOT_FOUND',
      };
    }

    const { listing } = resolvedListing;
    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(listing.connectionId);
    if (!connection) {
      return {
        ok: false,
        externalListingId: null,
        listingUrl: null,
        expiresAt: null,
        error: `Connection not found: ${listing.connectionId}`,
        errorCategory: 'NOT_FOUND',
      };
    }

    const integration = await integrationRepo.getIntegrationById(connection.integrationId);
    if (!integration) {
      return {
        ok: false,
        externalListingId: null,
        listingUrl: null,
        expiresAt: null,
        error: `Integration not found: ${connection.integrationId}`,
        errorCategory: 'NOT_FOUND',
      };
    }

    if (!isPlaywrightProgrammableSlug(integration.slug)) {
      return {
        ok: false,
        externalListingId: null,
        listingUrl: null,
        expiresAt: null,
        error: `Integration ${integration.slug} does not support programmable Playwright listings.`,
        errorCategory: 'UNSUPPORTED_INTEGRATION',
      };
    }

    const productRepository = await getProductRepository();
    const product = await productRepository.getProductById(listing.productId);
    if (!product) {
      throw notFoundError('Product not found', { productId: listing.productId });
    }

    const script = ensureProgrammablePlaywrightConnection(connection);
    const result = await runPlaywrightListingScript({
      script,
      input: buildPlaywrightListingInput({ product, listing, connection }),
      connection,
      browserMode: requestedBrowserMode,
    });

    const expiresAt =
      typeof result.expiresAt === 'string' && result.expiresAt.trim()
        ? new Date(result.expiresAt)
        : null;

    return {
      ok: true,
      externalListingId: result.externalListingId,
      listingUrl: result.listingUrl,
      expiresAt:
        expiresAt && Number.isFinite(expiresAt.getTime()) ? expiresAt : null,
      error: null,
      errorCategory: null,
      metadata: {
        runId: result.runId,
        browserMode: result.effectiveBrowserMode,
        requestedBrowserMode,
        publishVerified: result.publishVerified,
        rawResult: result.rawResult,
      },
    };
  } catch (error: unknown) {
    void ErrorSystem.captureException(error, {
      service: 'playwright-programmable-listing',
      listingId: input.listingId,
    });

    return {
      ok: false,
      externalListingId: null,
      listingUrl: null,
      expiresAt: null,
      error: error instanceof Error ? error.message : 'Programmable Playwright listing failed.',
      errorCategory: 'EXECUTION_FAILED',
      metadata: {
        requestedBrowserMode,
      },
    };
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
  const previousPlaywrightData = toRecord(previousMarketplaceData['playwright']);
  const requestedBrowserMode = resolveRequestedBrowserMode(input.browserMode);
  const effectiveBrowserMode =
    typeof result.metadata?.['browserMode'] === 'string' ? result.metadata['browserMode'] : null;
  const historyFields = buildPlaywrightHistoryFields(effectiveBrowserMode ?? requestedBrowserMode);
  const marketplaceData = {
    ...previousMarketplaceData,
    marketplace: 'playwright-programmable',
    listingUrl: result.listingUrl,
    playwright: {
      ...previousPlaywrightData,
      pendingExecution: null,
      lastErrorCategory: result.ok ? null : result.errorCategory,
      lastExecution: {
        executedAt: now.toISOString(),
        requestId: input.jobId ?? null,
        errorCategory: result.errorCategory,
        metadata: {
          runId:
            typeof result.metadata?.['runId'] === 'string'
              ? result.metadata['runId']
              : null,
          browserMode:
            effectiveBrowserMode,
          requestedBrowserMode,
          publishVerified:
            typeof result.metadata?.['publishVerified'] === 'boolean'
              ? result.metadata['publishVerified']
              : null,
          rawResult: result.metadata?.['rawResult'] ?? null,
        },
      },
    },
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
