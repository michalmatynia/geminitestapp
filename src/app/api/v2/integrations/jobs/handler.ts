import { type NextRequest, NextResponse } from 'next/server';
import { type ObjectId, type Document, type Filter } from 'mongodb';

import { getProductListingRepository } from '@/features/integrations/server';
import type { ListingJob, ProductJob } from '@/shared/contracts/integrations/domain';
import type { ProductListing } from '@/shared/contracts/integrations/listings';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  buildLookupValues,
  integrationCollectionName,
  normalizeLookupId,
  productCollectionName,
} from '@/shared/lib/products/services/product-repository/mongo-product-repository.helpers';

type ProductJobDocument = {
  _id?: string | ObjectId;
  id?: string;
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
  sku?: string | null;
};

type IntegrationLookupDocument = {
  _id?: string | ObjectId;
  id?: string;
  name?: string | null;
  slug?: string | null;
};

type ConnectionLookupDocument = {
  _id?: string | ObjectId;
  id?: string;
  name?: string | null;
};

const INTEGRATION_CONNECTIONS_COLLECTION = 'integration_connections';

const mapLookupDocuments = <TDoc extends { _id?: string | ObjectId; id?: string }>(
  docs: TDoc[]
): Map<string, TDoc> => {
  const map = new Map<string, TDoc>();
  docs.forEach((doc) => {
    const normalizedId = typeof doc.id === 'string' ? doc.id.trim() : '';
    if (normalizedId) {
      map.set(normalizedId, doc);
    }
    const normalizedMongoId = normalizeLookupId((doc as Document)['_id']);
    if (normalizedMongoId) {
      map.set(normalizedMongoId, doc);
    }
  });
  return map;
};

const groupListingsByProductId = (
  listings: ProductListing[],
  integrationsById: Map<string, IntegrationLookupDocument>,
  connectionsById: Map<string, ConnectionLookupDocument>
): Map<string, ListingJob[]> => {
  const byProductId = new Map<string, ListingJob[]>();

  listings.forEach((listing) => {
    const integration = integrationsById.get(listing.integrationId);
    const connection = connectionsById.get(listing.connectionId);
    const current = byProductId.get(listing.productId) ?? [];
    current.push({
      id: listing.id,
      productId: listing.productId,
      integrationId: listing.integrationId,
      integrationName: integration?.name?.trim() || 'Unknown',
      integrationSlug: integration?.slug?.trim() || 'unknown',
      connectionId: listing.connectionId,
      connectionName: connection?.name?.trim() || 'Unknown',
      status: listing.status,
      externalListingId: listing.externalListingId,
      inventoryId: listing.inventoryId ?? null,
      listedAt: listing.listedAt,
      expiresAt: listing.expiresAt ?? null,
      nextRelistAt: listing.nextRelistAt ?? null,
      relistAttempts: listing.relistAttempts ?? 0,
      lastRelistedAt: listing.lastRelistedAt ?? null,
      lastStatusCheckAt: listing.lastStatusCheckAt ?? null,
      relistPolicy: listing.relistPolicy ?? null,
      marketplaceData: listing.marketplaceData ?? null,
      failureReason: listing.failureReason ?? null,
      exportHistory: listing.exportHistory ?? null,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
    });
    byProductId.set(listing.productId, current);
  });

  return byProductId;
};

const buildProductLookupMap = async (productIds: string[]): Promise<Map<string, ProductJobDocument>> => {
  if (productIds.length === 0) {
    return new Map();
  }

  const mongo = await getMongoDb();
  const lookupValues = buildLookupValues(productIds);
  const docs = await mongo
    .collection<ProductJobDocument>(productCollectionName)
    .find(
      { $or: [{ id: { $in: productIds } }, { _id: { $in: lookupValues } }] } as Filter<ProductJobDocument>,
      {
        projection: {
          _id: 1,
          id: 1,
          name_en: 1,
          name_pl: 1,
          name_de: 1,
          sku: 1,
        },
      }
    )
    .toArray();

  const map = new Map<string, ProductJobDocument>();
  docs.forEach((doc) => {
    const keys = new Set<string>();
    const normalizedId = typeof doc.id === 'string' ? doc.id.trim() : '';
    if (normalizedId) {
      keys.add(normalizedId);
    }
    const normalizedMongoId = normalizeLookupId((doc as Document)['_id']);
    if (normalizedMongoId) {
      keys.add(normalizedMongoId);
    }

    keys.forEach((key) => {
      map.set(key, doc);
    });
  });

  return map;
};

/**
 * GET /api/v2/integrations/jobs
 * Fetches all product listing jobs with product details
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const listingRepo = await getProductListingRepository();

  const allListings = await listingRepo.listAllListings();
  const productIds = Array.from(new Set(allListings.map((listing) => listing.productId))).filter(Boolean);
  const [productListings, productsById, mongo] = await Promise.all([
    listingRepo.getListingsByProductIds(productIds),
    buildProductLookupMap(productIds),
    getMongoDb(),
  ]);
  const integrationIds = Array.from(
    new Set(productListings.map((listing) => listing.integrationId).filter(Boolean))
  );
  const connectionIds = Array.from(
    new Set(productListings.map((listing) => listing.connectionId).filter(Boolean))
  );
  const [integrations, connections] = await Promise.all([
    integrationIds.length > 0
      ? mongo
          .collection<IntegrationLookupDocument>(integrationCollectionName)
          .find(
            { $or: [{ id: { $in: integrationIds } }, { _id: { $in: buildLookupValues(integrationIds) } }] } as Filter<IntegrationLookupDocument>,
            { projection: { _id: 1, id: 1, name: 1, slug: 1 } }
          )
          .toArray()
      : Promise.resolve([]),
    connectionIds.length > 0
      ? mongo
          .collection<ConnectionLookupDocument>(INTEGRATION_CONNECTIONS_COLLECTION)
          .find(
            { $or: [{ id: { $in: connectionIds } }, { _id: { $in: buildLookupValues(connectionIds) } }] } as Filter<ConnectionLookupDocument>,
            { projection: { _id: 1, id: 1, name: 1 } }
          )
          .toArray()
      : Promise.resolve([]),
  ]);

  const listingsByProductId = groupListingsByProductId(
    productListings,
    mapLookupDocuments(integrations),
    mapLookupDocuments(connections)
  );
  const jobsWithListings: ProductJob[] = productIds
    .map((productId) => {
      const product = productsById.get(productId) ?? null;
      const listings = listingsByProductId.get(productId) ?? [];

      return {
        productId,
        productName: product?.name_en || product?.name_pl || product?.name_de || 'Unknown',
        productSku: product?.sku ?? null,
        listings,
      };
    })
    .filter((job) => job.listings.length > 0);

  return NextResponse.json(jobsWithListings, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
