import 'server-only';

import { getProductListingRepository } from '@/features/integrations/server';
import { integrationService } from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/services/base-token-resolver';
import { fetchBaseProductDetails } from '@/features/integrations/services/imports/base-client';
import { extractBaseImageUrls } from '@/features/integrations/services/imports/base-mapper';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import type {
  ProductListingExportEvent,
  ProductListingRepository,
  ProductListing,
} from '@/shared/contracts/integrations';
import type { ProductRepository, ProductRecord } from '@/shared/contracts/products';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { BASE_INTEGRATION_SLUGS } from '@/features/integrations/constants/slugs';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

const LISTINGS_COLLECTION = 'product_listings';

type BaseListingSyncInfo = {
  id: string;
  productId: string;
  connectionId: string;
  externalListingId: string | null;
  inventoryId: string | null;
  exportHistory?: ProductListingExportEvent[] | null;
};

const mergeImageLinks = (existing: string[], incoming: string[]): string[] => {
  const merged = [...existing];
  incoming.forEach((url: string, index: number) => {
    if (!url) return;
    merged[index] = url;
  });
  const seen = new Set<string>();
  return merged.filter((url: string) => {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
};

export const listBaseListingsForSync = async (): Promise<BaseListingSyncInfo[]> => {
  const provider = await getProductDataProvider();
  if (provider === 'mongodb') {
    const db = await getMongoDb();
    const integrations = await db
      .collection<{ _id: string; slug: string }>('integrations')
      .find({ slug: { $in: Array.from(BASE_INTEGRATION_SLUGS) } }, { projection: { _id: 1 } })
      .toArray();
    const integrationIds = integrations.map((entry: { _id: string }) => entry._id);
    if (!integrationIds.length) return [];
    const listings = await db
      .collection<BaseListingSyncInfo>(LISTINGS_COLLECTION)
      .find({ integrationId: { $in: integrationIds } })
      .toArray();
    return listings.map((listing) => ({
      id: listing.id ?? listing._id,
      productId: listing.productId,
      connectionId: listing.connectionId,
      externalListingId: listing.externalListingId ?? null,
      inventoryId: listing.inventoryId ?? null,
      exportHistory: listing.exportHistory ?? null,
    }));
  }

  const listings = await prisma.productListing.findMany({
    where: { integration: { slug: { in: Array.from(BASE_INTEGRATION_SLUGS) } } },
    select: {
      id: true,
      productId: true,
      connectionId: true,
      externalListingId: true,
      inventoryId: true,
      exportHistory: true,
    },
  });

  return listings.map((listing) => ({
    id: listing.id,
    productId: listing.productId,
    connectionId: listing.connectionId,
    externalListingId: listing.externalListingId ?? null,
    inventoryId: listing.inventoryId ?? null,
    exportHistory: (listing.exportHistory ?? null) as unknown as ProductListingExportEvent[] | null,
  }));
};

export const syncBaseImagesForListing = async (
  listingId: string,
  productId: string,
  inventoryIdOverride?: string | null
): Promise<{ productId: string; listingId: string; count: number; added: number }> => {
  try {
    const productRepo: ProductRepository = await getProductRepository();
    const product: ProductRecord | null = await productRepo.getProductById(productId);
    if (!product) {
      throw notFoundError('Product not found', { productId });
    }

    const listingRepo: ProductListingRepository = await getProductListingRepository();
    const listing: ProductListing | null = await listingRepo.getListingById(listingId);

    if (listing?.productId !== productId) {
      throw notFoundError('Listing not found', { listingId, productId });
    }

    let inventoryId =
      inventoryIdOverride ||
      listing.inventoryId ||
      listing.exportHistory
        ?.slice()
        .reverse()
        .find((event: ProductListingExportEvent) => event.inventoryId)?.inventoryId ||
      null;

    if (!inventoryId) {
      const connectionForInventory = await integrationService.getConnectionById(
        listing.connectionId
      );
      if (connectionForInventory?.baseLastInventoryId) {
        inventoryId = connectionForInventory.baseLastInventoryId;
      }
    }

    if (!inventoryId) {
      throw badRequestError(
        'Missing inventoryId for Base.com sync. Please set an inventory ID in the connection settings or provide one manually.'
      );
    }

    const baseProductId = listing.externalListingId || product.baseProductId;
    if (!baseProductId) {
      throw badRequestError('Missing Base.com product id for image sync.');
    }

    const connection = await integrationService.getConnectionById(listing.connectionId);
    if (!connection) {
      throw notFoundError('Connection not found', {
        connectionId: listing.connectionId,
      });
    }

    const tokenResolution = resolveBaseConnectionToken({
      baseApiToken: connection.baseApiToken,
    });
    if (!tokenResolution.token) {
      throw badRequestError(
        tokenResolution.error ?? 'Base.com API token not found in connection.',
        {
          connectionId: listing.connectionId,
        }
      );
    }
    const token = tokenResolution.token;

    const records = await fetchBaseProductDetails(token, inventoryId, [baseProductId]);
    if (!records.length) {
      throw notFoundError('Base.com product not found', { baseProductId, inventoryId });
    }

    const urls = extractBaseImageUrls(records[0] ?? {}).filter(Boolean);
    if (urls.length === 0) {
      throw badRequestError('No image URLs found in Base.com product data.');
    }

    const existingLinks = Array.isArray(product.imageLinks) ? product.imageLinks : [];
    const nextLinks = mergeImageLinks(existingLinks, urls);
    await productRepo.updateProduct(productId, { imageLinks: nextLinks });

    return {
      productId,
      listingId,
      count: nextLinks.length,
      added: urls.length,
    };
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'base-image-sync',
      action: 'syncBaseImagesForListing',
      listingId,
      productId,
    });
    throw error;
  }
};
