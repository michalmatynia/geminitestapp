import 'server-only';

import { SCRAPED_SOURCE_INTEGRATION_SLUG, isScrapedSourceIntegrationSlug } from '@/features/integrations/constants/slugs';
import { getIntegrationRepository, getProductListingRepository } from '@/features/integrations/server';
import type { ProductListingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ProductScrapedSourceActionResponse } from '@/shared/contracts/products/scraped-source';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { badRequestError, isAppError, notFoundError } from '@/shared/errors/app-error';
import { productService } from '@/shared/lib/products/services/productService';

export const SCRAPED_SOURCE_INTEGRATION_NAME = 'Scraped Source';
export const STATUS_CHECK_TIMEOUT_MS = 12_000;

export type ScrapedProductSource = { product: ProductWithImages; sourceUrl: string; host: string };
export type ScrapedSourceListingContext = ScrapedProductSource & {
  listing: ProductListingWithDetails;
};
export type ScrapedSourceStatus = 'active' | 'unavailable' | 'check_failed';

type MarketplaceDataInput = ScrapedProductSource & {
  status: string;
  checkedAt?: string | null;
  httpStatus?: number | null;
};

type ResponseInput = {
  productId: string;
  listingId: string | null;
  status: string;
  sourceUrl: string | null;
  checkedAt?: string | null;
  runId?: string | null;
  actionRunUrl?: string | null;
  message: string;
};

export type PersistStatusInput = {
  status: string;
  checkedAt: string;
  httpStatus: number | null;
};

export const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const resolveSourceUrl = (product: ProductWithImages): { sourceUrl: string; host: string } => {
  const rawSourceUrl = normalizeString(product.supplierLink);
  if (rawSourceUrl.length === 0) {
    throw badRequestError('Scraped product does not have a supplier/source URL.', {
      productId: product.id,
    });
  }
  try {
    const url = new URL(rawSourceUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw badRequestError('Scraped product source URL must use http or https.', {
        productId: product.id,
        sourceUrl: rawSourceUrl,
      });
    }
    return { sourceUrl: url.toString(), host: url.host };
  } catch (error) {
    if (isAppError(error)) throw error;
    throw badRequestError('Scraped product source URL is invalid.', {
      productId: product.id,
      sourceUrl: rawSourceUrl,
    });
  }
};

const ensureScrapedProduct = async (productId: string): Promise<ScrapedProductSource> => {
  const product = await productService.getProductById(productId);
  if (product === null) {
    throw notFoundError(`Product not found: ${productId}`, { productId });
  }
  if (product.importSource !== 'scrape') {
    throw badRequestError('This action is only available for scraped products.', {
      productId,
      importSource: product.importSource ?? null,
    });
  }
  const { sourceUrl, host } = resolveSourceUrl(product);
  return { product, sourceUrl, host };
};

const resolveConnectionName = (product: ProductWithImages, host: string): string => {
  const supplierName = normalizeString(product.supplierName);
  return supplierName.length > 0 ? supplierName : host;
};

const isScrapedSourceListing = (listing: ProductListingWithDetails): boolean => {
  if (isScrapedSourceIntegrationSlug(listing.integration.slug)) return true;
  const marketplaceData = listing.marketplaceData;
  if (marketplaceData === null || typeof marketplaceData !== 'object') return false;
  const record = marketplaceData;
  return (
    normalizeString(record['marketplace']).toLowerCase() === SCRAPED_SOURCE_INTEGRATION_SLUG ||
    normalizeString(record['source']).toLowerCase().includes('scrape') ||
    (record['scrapedSource'] !== null &&
      typeof record['scrapedSource'] === 'object' &&
      Array.isArray(record['scrapedSource']) === false)
  );
};

export const buildMarketplaceData = ({
  product,
  sourceUrl,
  host,
  status,
  checkedAt,
  httpStatus,
}: MarketplaceDataInput): Record<string, unknown> => ({
  marketplace: SCRAPED_SOURCE_INTEGRATION_SLUG,
  source: 'scraped-source',
  scrapedSource: {
    sourceUrl,
    host,
    supplierName:
      normalizeString(product.supplierName).length > 0
        ? normalizeString(product.supplierName)
        : null,
    status,
    checkedAt: checkedAt ?? null,
    httpStatus: httpStatus ?? null,
  },
});

export const ensureScrapedSourceListing = async (
  productId: string,
  status: string = 'linked'
): Promise<ScrapedSourceListingContext> => {
  const { product, sourceUrl, host } = await ensureScrapedProduct(productId);
  const integrationRepository = getIntegrationRepository();
  const listingRepository = await getProductListingRepository();
  const integration = await integrationRepository.upsertIntegration({
    name: SCRAPED_SOURCE_INTEGRATION_NAME,
    slug: SCRAPED_SOURCE_INTEGRATION_SLUG,
  });
  const connectionName = resolveConnectionName(product, host);
  const connections = await integrationRepository.listConnections(integration.id);
  const existingConnection = connections.find(
    (connection) => normalizeString(connection.name).toLowerCase() === connectionName.toLowerCase()
  );
  const connection =
    existingConnection ??
    (await integrationRepository.createConnection(integration.id, {
      name: connectionName,
      sourceHost: host,
      source: 'scraped-source',
    }));
  const listings = await listingRepository.getListingsByProductId(product.id);
  const existingListing = listings.find(isScrapedSourceListing);
  const marketplaceData = buildMarketplaceData({ product, sourceUrl, host, status });
  if (existingListing !== undefined) {
    await listingRepository.updateListing(existingListing.id, {
      status,
      externalListingId: sourceUrl,
      marketplaceData,
    });
    return {
      product,
      sourceUrl,
      host,
      listing: { ...existingListing, status, externalListingId: sourceUrl, marketplaceData },
    };
  }
  const listing = await listingRepository.createListing({
    productId: product.id,
    integrationId: integration.id,
    connectionId: connection.id,
    externalListingId: sourceUrl,
    inventoryId: null,
    status,
    marketplaceData,
    exportHistory: [
      {
        status: 'success',
        exportedAt: new Date().toISOString(),
        externalListingId: sourceUrl,
        fields: ['scraped-source-link', host],
      },
    ],
  });
  return { product, sourceUrl, host, listing };
};

export const responseFor = ({
  productId,
  listingId,
  status,
  sourceUrl,
  checkedAt,
  runId,
  actionRunUrl,
  message,
}: ResponseInput): ProductScrapedSourceActionResponse => ({
  productId,
  listingId,
  status,
  sourceUrl,
  checkedAt: checkedAt ?? null,
  runId: runId ?? null,
  actionRunUrl: actionRunUrl ?? null,
  message,
});

export const resolveStatusCheckStatus = (httpStatus: number): ScrapedSourceStatus => {
  if (httpStatus === 404 || httpStatus === 410) return 'unavailable';
  if (httpStatus < 400) return 'active';
  return 'check_failed';
};

export const resolveStatusCheckMessage = (status: ScrapedSourceStatus): string => {
  if (status === 'active') return 'Scraped source page is reachable.';
  if (status === 'unavailable') return 'Scraped source page is no longer available.';
  return 'Scraped source page returned an error status.';
};

export const persistScrapedSourceStatus = async (
  context: ScrapedSourceListingContext,
  input: PersistStatusInput
): Promise<void> => {
  const listingRepository = await getProductListingRepository();
  await listingRepository.updateListing(context.listing.id, {
    status: input.status,
    lastStatusCheckAt: input.checkedAt,
    marketplaceData: buildMarketplaceData({
      product: context.product,
      sourceUrl: context.sourceUrl,
      host: context.host,
      status: input.status,
      checkedAt: input.checkedAt,
      httpStatus: input.httpStatus,
    }),
  });
};
