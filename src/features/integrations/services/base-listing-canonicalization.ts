import 'server-only';

import {
  findProductListingByIdAcrossProviders,
  getExportDefaultConnectionId,
  getExportDefaultInventoryId,
  getIntegrationRepository,
  getProductListingRepository,
  listProductListingsByProductIdAcrossProviders,
  listingExistsAcrossProviders,
} from '@/features/integrations/server';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import type { ListingBadgesPayload, ProductListingWithDetails } from '@/shared/contracts/integrations/listings';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const BASE_CANONICAL_INTEGRATION_SLUGS = new Set(['base', 'base-com', 'baselinker']);

export const isCanonicalBaseIntegrationSlug = (value: string | null | undefined): boolean =>
  BASE_CANONICAL_INTEGRATION_SLUGS.has((value ?? '').trim().toLowerCase());

const normalizeString = (value: string | null | undefined): string => (value ?? '').trim();

type BaseListingLinkContext = {
  integrationId: string;
  connectionId: string;
  inventoryId: string | null;
};

const resolveBaseListingLinkContext = async (): Promise<BaseListingLinkContext | null> => {
  const integrationRepo = await getIntegrationRepository();
  const integrations = await integrationRepo.listIntegrations();
  const baseIntegration = integrations.find((integration) =>
    isCanonicalBaseIntegrationSlug(integration.slug)
  );
  if (!baseIntegration) return null;

  const connections = await integrationRepo.listConnections(baseIntegration.id);
  if (connections.length === 0) return null;

  const defaultConnectionId = normalizeString(await getExportDefaultConnectionId());
  const preferredConnection =
    (defaultConnectionId
      ? connections.find((connection) => connection.id === defaultConnectionId)
      : null) ??
    connections.find((connection) => Boolean(connection.baseApiToken)) ??
    connections[0] ??
    null;
  if (!preferredConnection?.id) return null;

  const defaultInventoryId = normalizeString(await getExportDefaultInventoryId());
  return {
    integrationId: baseIntegration.id,
    connectionId: preferredConnection.id,
    inventoryId: defaultInventoryId || null,
  };
};

const resolveCanonicalBaseExternalListingId = (
  listings: ProductListingWithDetails[]
): string | null => {
  const ids = Array.from(
    new Set(
      listings
        .filter((listing) => isCanonicalBaseIntegrationSlug(listing.integration.slug))
        .map((listing) => normalizeString(listing.externalListingId))
        .filter((value) => value.length > 0)
    )
  );

  return ids.length === 1 ? (ids[0] ?? null) : null;
};

const syncBaseListingsWithProductId = async (
  productId: string,
  normalizedBaseProductId: string,
  listings: ProductListingWithDetails[]
): Promise<ProductListingWithDetails[]> => {
  if (!normalizedBaseProductId) {
    return listings;
  }

  const baseListingsWithoutExternalId = listings.filter(
    (listing) =>
      isCanonicalBaseIntegrationSlug(listing.integration.slug) &&
      normalizeString(listing.externalListingId).length === 0
  );
  if (baseListingsWithoutExternalId.length === 0) {
    return listings;
  }

  await Promise.all(
    baseListingsWithoutExternalId.map(async (listing) => {
      const resolved = await findProductListingByIdAcrossProviders(listing.id);
      if (!resolved) {
        return;
      }

      await resolved.repository.updateListingExternalId(listing.id, normalizedBaseProductId);
      if (normalizeString(resolved.listing.status).length === 0) {
        await resolved.repository.updateListingStatus(listing.id, 'active');
      }
    })
  );

  return listProductListingsByProductIdAcrossProviders(productId);
};

const backfillBaseListingIfMissing = async (
  productId: string,
  normalizedBaseProductId: string,
  listings: ProductListingWithDetails[]
): Promise<ProductListingWithDetails[]> => {
  if (!normalizedBaseProductId) {
    return listings;
  }
  if (listings.some((listing) => isCanonicalBaseIntegrationSlug(listing.integration.slug))) {
    return listings;
  }

  const linkContext = await resolveBaseListingLinkContext();
  if (!linkContext) {
    return listings;
  }

  const existsForConnection = await listingExistsAcrossProviders(productId, linkContext.connectionId);
  if (existsForConnection) {
    return listings;
  }

  const listingRepo = await getProductListingRepository();
  await listingRepo.createListing({
    productId,
    integrationId: linkContext.integrationId,
    connectionId: linkContext.connectionId,
    status: 'active',
    externalListingId: normalizedBaseProductId,
    inventoryId: linkContext.inventoryId,
    marketplaceData: {
      source: 'base-import-backfill',
      marketplace: 'base',
    },
  });

  return listProductListingsByProductIdAcrossProviders(productId);
};

export const listCanonicalBaseProductListings = async (
  productId: string
): Promise<ProductListingWithDetails[]> => {
  const productRepo = await getProductRepository();
  const product = await productRepo.getProductById(productId);
  let listings = await listProductListingsByProductIdAcrossProviders(productId);

  const persistedBaseProductId = normalizeString(product?.baseProductId);
  const listingDerivedBaseProductId = resolveCanonicalBaseExternalListingId(listings) ?? '';
  const canonicalBaseProductId = persistedBaseProductId || listingDerivedBaseProductId;

  if (!persistedBaseProductId && listingDerivedBaseProductId) {
    await productRepo.updateProduct(productId, { baseProductId: listingDerivedBaseProductId }).catch(
      (error) => {
        void ErrorSystem.captureException(error);
      }
    );
  }

  if (!canonicalBaseProductId) {
    return listings;
  }

  listings = await syncBaseListingsWithProductId(productId, canonicalBaseProductId, listings);
  return backfillBaseListingIfMissing(productId, canonicalBaseProductId, listings);
};

export const applyCanonicalBaseBadgeFallback = async (
  payload: ListingBadgesPayload,
  requestedProductIds: readonly string[]
): Promise<ListingBadgesPayload> => {
  const normalizedRequestedProductIds = Array.from(
    new Set(requestedProductIds.map((productId) => normalizeString(productId)).filter(Boolean))
  );
  if (normalizedRequestedProductIds.length === 0) {
    return payload;
  }

  const missingBaseProductIds = normalizedRequestedProductIds.filter((productId) => {
    const currentStatus = normalizeString(payload[productId]?.base);
    return currentStatus.length === 0;
  });
  if (missingBaseProductIds.length === 0) {
    return payload;
  }

  const productRepo = await getProductRepository();
  const products = await Promise.all(
    missingBaseProductIds.map((productId) =>
      productRepo.getProductById(productId).catch((error) => {
        void ErrorSystem.captureException(error);
        return null;
      })
    )
  );

  let changed = false;
  const nextPayload: ListingBadgesPayload = { ...payload };

  products.forEach((product, index) => {
    const productId = missingBaseProductIds[index];
    if (!productId || normalizeString(product?.baseProductId).length === 0) {
      return;
    }

    nextPayload[productId] = {
      ...(nextPayload[productId] ?? {}),
      base: 'active',
    };
    changed = true;
  });

  return changed ? nextPayload : payload;
};
