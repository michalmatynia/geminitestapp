import 'server-only';

/* eslint-disable complexity, max-lines, max-lines-per-function, no-await-in-loop, require-atomic-updates */

import type { Document } from 'mongodb';

import {
  checkBaseSkuExists,
  fetchBaseInventories,
  getExportDefaultConnectionId,
  getExportDefaultInventoryId,
  getIntegrationRepository,
  getProductListingRepository,
  listingExistsAcrossProviders,
  resolveBaseConnectionToken,
} from '@/features/integrations/server';
import { isCanonicalBaseIntegrationSlug } from '@/features/integrations/services/base-listing-canonicalization';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { ListingBadgesPayload } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { getMongoDb } from '@/shared/lib/db/product-mongo-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type BaseSkuLookupContext = {
  integrationId: string;
  connectionId: string;
  inventoryId: string;
  token: string;
};

type BaseSkuCacheEntry = {
  exists: boolean;
  productId: string | null;
  expiresAt: number;
};

type BaseListingScope = {
  connectionId: string | null;
  inventoryId: string | null;
};

const SKU_CACHE_TTL_MS = 10 * 60 * 1000;
const CONTEXT_CACHE_TTL_MS = 60 * 1000;
const MAX_REMOTE_LOOKUPS_PER_REQUEST = 60;
const REMOTE_LOOKUP_CONCURRENCY = 4;
const PRODUCT_LISTINGS_COLLECTION = 'product_listings';

let contextCache:
  | {
      value: BaseSkuLookupContext | null;
      expiresAt: number;
    }
  | null = null;
const skuCheckCache = new Map<string, BaseSkuCacheEntry>();

const normalizeString = (value: string | null | undefined): string => (value ?? '').trim();

const normalizeStatus = (value: string | null | undefined): string =>
  normalizeString(value).toLowerCase();

const hasBaseBadge = (payload: ListingBadgesPayload, productId: string): boolean =>
  normalizeStatus(payload[productId]?.base).length > 0;

const readCachedSkuCheck = (
  connectionId: string,
  inventoryId: string,
  sku: string
): BaseSkuCacheEntry | null => {
  const key = `${connectionId}:${inventoryId}:${sku}`;
  const cached = skuCheckCache.get(key);
  if (cached === undefined) return null;
  if (cached.expiresAt <= Date.now()) {
    skuCheckCache.delete(key);
    return null;
  }
  return cached;
};

const writeCachedSkuCheck = (
  connectionId: string,
  inventoryId: string,
  sku: string,
  value: Omit<BaseSkuCacheEntry, 'expiresAt'>
): void => {
  const key = `${connectionId}:${inventoryId}:${sku}`;
  skuCheckCache.set(key, {
    ...value,
    expiresAt: Date.now() + SKU_CACHE_TTL_MS,
  });
};

const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = [];
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(concurrency, 1), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      for (;;) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= items.length) return;
        results[index] = await mapper(items[index] as T);
      }
    })
  );

  return results;
};

const findMostCommonBaseListingScope = async (
  integrationId: string,
  connectionIds: readonly string[]
): Promise<BaseListingScope | null> => {
  try {
    const db = await getMongoDb();
    const match: Document = {
      integrationId,
      connectionId: { $in: connectionIds },
    };
    const rows = await db
      .collection(PRODUCT_LISTINGS_COLLECTION)
      .aggregate<{ _id: BaseListingScope; count: number }>([
        { $match: match },
        {
          $group: {
            _id: {
              connectionId: '$connectionId',
              inventoryId: '$inventoryId',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ])
      .toArray();
    return rows[0]?._id ?? null;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'base-sku-badge-fallback',
      action: 'findMostCommonBaseListingScope',
    });
    return null;
  }
};

const resolveConnectionCandidates = (
  connections: IntegrationConnectionRecord[],
  defaultConnectionId: string,
  scopeConnectionId: string
): IntegrationConnectionRecord[] => {
  const candidates = [
    connections.find((connection) => connection.id === defaultConnectionId),
    connections.find((connection) => connection.id === scopeConnectionId),
    ...connections.filter(
      (connection) =>
        connection.enabled !== false && normalizeString(connection.baseApiToken).length > 0
    ),
    ...connections.filter((connection) => normalizeString(connection.baseApiToken).length > 0),
    ...connections.filter((connection) => connection.enabled !== false),
    ...connections,
  ];
  const seen = new Set<string>();
  return candidates.filter((connection): connection is IntegrationConnectionRecord => {
    const connectionId = normalizeString(connection?.id);
    if (connectionId.length === 0 || seen.has(connectionId)) return false;
    seen.add(connectionId);
    return true;
  });
};

const resolveConnectionWithToken = (
  candidates: IntegrationConnectionRecord[]
): { connection: IntegrationConnectionRecord; token: string } | null => {
  for (const connection of candidates) {
    const tokenResolution = resolveBaseConnectionToken(connection);
    const token = normalizeString(tokenResolution.token);
    if (token.length > 0) {
      return { connection, token };
    }
  }
  return null;
};

const resolveFallbackInventoryId = async (
  token: string,
  connection: IntegrationConnectionRecord,
  scopeInventoryId: string
): Promise<string> => {
  const configuredInventoryId = normalizeString(await getExportDefaultInventoryId());
  if (configuredInventoryId.length > 0) return configuredInventoryId;

  const connectionInventoryId = normalizeString(connection.baseLastInventoryId);
  if (connectionInventoryId.length > 0) return connectionInventoryId;

  if (scopeInventoryId.length > 0) return scopeInventoryId;

  try {
    const inventories = await fetchBaseInventories(token);
    return normalizeString(inventories[0]?.id);
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'base-sku-badge-fallback',
      action: 'resolveFallbackInventoryId',
    });
    return '';
  }
};

const resolveBaseSkuLookupContext = async (): Promise<BaseSkuLookupContext | null> => {
  if (contextCache !== null && contextCache.expiresAt > Date.now()) {
    return contextCache.value;
  }

  const integrationRepository = getIntegrationRepository();
  const integrations = await integrationRepository.listIntegrations();
  const baseIntegration = integrations.find((integration) =>
    isCanonicalBaseIntegrationSlug(integration.slug)
  );
  if (!baseIntegration || normalizeString(baseIntegration.id).length === 0) {
    contextCache = { value: null, expiresAt: Date.now() + CONTEXT_CACHE_TTL_MS };
    return null;
  }

  const connections = await integrationRepository.listConnections(baseIntegration.id);
  if (connections.length === 0) {
    contextCache = { value: null, expiresAt: Date.now() + CONTEXT_CACHE_TTL_MS };
    return null;
  }

  const connectionIds = connections
    .map((connection) => normalizeString(connection.id))
    .filter((connectionId) => connectionId.length > 0);
  const scope = await findMostCommonBaseListingScope(baseIntegration.id, connectionIds);
  const defaultConnectionId = normalizeString(await getExportDefaultConnectionId());
  const scopeConnectionId = normalizeString(scope?.connectionId);
  const connectionWithToken = resolveConnectionWithToken(
    resolveConnectionCandidates(connections, defaultConnectionId, scopeConnectionId)
  );
  if (connectionWithToken === null) {
    contextCache = { value: null, expiresAt: Date.now() + CONTEXT_CACHE_TTL_MS };
    return null;
  }

  const inventoryId = await resolveFallbackInventoryId(
    connectionWithToken.token,
    connectionWithToken.connection,
    normalizeString(scope?.inventoryId)
  );
  const value =
    inventoryId.length > 0
      ? {
          integrationId: baseIntegration.id,
          connectionId: connectionWithToken.connection.id,
          inventoryId,
          token: connectionWithToken.token,
        }
      : null;

  contextCache = { value, expiresAt: Date.now() + CONTEXT_CACHE_TTL_MS };
  return value;
};

const backfillBaseLink = async (
  product: ProductWithImages,
  context: BaseSkuLookupContext,
  externalBaseProductId: string
): Promise<void> => {
  if (externalBaseProductId.length === 0) return;

  try {
    const [productRepository, listingRepository] = await Promise.all([
      getProductRepository(),
      getProductListingRepository(),
    ]);
    if (normalizeString(product.baseProductId).length === 0) {
      await productRepository.updateProduct(product.id, { baseProductId: externalBaseProductId });
    }

    const listingExists = await listingExistsAcrossProviders(product.id, context.connectionId);
    if (!listingExists) {
      await listingRepository.createListing({
        productId: product.id,
        integrationId: context.integrationId,
        connectionId: context.connectionId,
        status: 'active',
        externalListingId: externalBaseProductId,
        inventoryId: context.inventoryId,
        marketplaceData: {
          source: 'base-sku-badge-fallback',
          marketplace: 'base',
        },
      });
    }
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'base-sku-badge-fallback',
      action: 'backfillBaseLink',
      productId: product.id,
      externalBaseProductId,
    });
  }
};

const checkRemoteBaseSku = async (
  product: ProductWithImages,
  context: BaseSkuLookupContext
): Promise<{ productId: string; externalBaseProductId: string | null } | null> => {
  const sku = normalizeString(product.sku);
  if (sku.length === 0) return null;

  const cached = readCachedSkuCheck(context.connectionId, context.inventoryId, sku);
  if (cached !== null) {
    if (cached.exists && cached.productId !== null) {
      await backfillBaseLink(product, context, cached.productId);
    }
    return cached.exists
      ? { productId: product.id, externalBaseProductId: cached.productId }
      : null;
  }

  const result = await checkBaseSkuExists(context.token, context.inventoryId, sku);
  const normalizedExternalBaseProductId = normalizeString(result.productId);
  const externalBaseProductId =
    normalizedExternalBaseProductId.length > 0 ? normalizedExternalBaseProductId : null;
  writeCachedSkuCheck(context.connectionId, context.inventoryId, sku, {
    exists: result.exists,
    productId: externalBaseProductId,
  });

  if (!result.exists) return null;
  if (externalBaseProductId !== null) {
    await backfillBaseLink(product, context, externalBaseProductId);
  }
  return { productId: product.id, externalBaseProductId };
};

export const applyRemoteBaseSkuBadgeFallback = async (
  payload: ListingBadgesPayload,
  requestedProductIds: readonly string[]
): Promise<ListingBadgesPayload> => {
  const missingBaseProductIds = Array.from(
    new Set(
      requestedProductIds
        .map((productId) => normalizeString(productId))
        .filter((productId) => productId.length > 0 && hasBaseBadge(payload, productId) === false)
    )
  ).slice(0, MAX_REMOTE_LOOKUPS_PER_REQUEST);
  if (missingBaseProductIds.length === 0) return payload;

  try {
    const context = await resolveBaseSkuLookupContext();
    if (context === null) return payload;

    const productRepository = await getProductRepository();
    const products = (
      await Promise.all(
        missingBaseProductIds.map((productId) =>
          productRepository.getProductById(productId).catch((error) => {
            void ErrorSystem.captureException(error, {
              service: 'base-sku-badge-fallback',
              action: 'getProductById',
              productId,
            });
            return null;
          })
        )
      )
    ).filter((product): product is ProductWithImages => product !== null);

    const matches = (
      await mapWithConcurrency(products, REMOTE_LOOKUP_CONCURRENCY, (product) =>
        checkRemoteBaseSku(product, context).catch((error) => {
          void ErrorSystem.captureException(error, {
            service: 'base-sku-badge-fallback',
            action: 'checkRemoteBaseSku',
            productId: product.id,
          });
          return null;
        })
      )
    ).filter(
      (match): match is { productId: string; externalBaseProductId: string | null } =>
        match !== null
    );

    if (matches.length === 0) return payload;

    const nextPayload: ListingBadgesPayload = { ...payload };
    matches.forEach((match) => {
      nextPayload[match.productId] = {
        ...(nextPayload[match.productId] ?? {}),
        base: 'active',
      };
    });
    return nextPayload;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'base-sku-badge-fallback',
      action: 'applyRemoteBaseSkuBadgeFallback',
    });
    void logSystemEvent({
      level: 'warn',
      source: 'base-sku-badge-fallback',
      message: 'Failed to resolve remote Base.com SKU badges.',
      error,
    });
    return payload;
  }
};

export const clearBaseSkuBadgeFallbackCaches = (): void => {
  contextCache = null;
  skuCheckCache.clear();
};
