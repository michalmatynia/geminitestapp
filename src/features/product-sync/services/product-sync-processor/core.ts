import {
  checkBaseSkuExists,
  getExportDefaultConnectionId,
  getIntegrationRepository,
  getProductListingRepository,
  findProductListingByProductAndConnectionAcrossProviders,
  resolveBaseConnectionToken,
  callBaseApi,
  fetchBaseProductDetails,
} from '@/server/integrations';
import type {
  ProductSyncProfile,
  UpdateProductInput,
} from '@/shared/contracts/product-sync';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';

import {
  toTrimmedString,
} from './utils';
import {
  BASE_INTEGRATION_SLUGS,
  BASE_DETAILS_BATCH_SIZE,
} from './constants';
import type {
  BaseConnectionContext,
  LinkedProductSyncResult,
  BaseSyncResolvedTarget,
  ResolvedProductSyncTarget,
} from './types';
import {
  resolveBaseParameterSyncValues,
} from './parameter-normalization';
import {
  buildLinkedProductSyncPlan,
} from './plan';

export const resolveBaseConnectionContext = async (
  profile: ProductSyncProfile
): Promise<BaseConnectionContext> => {
  const integrationRepo = await getIntegrationRepository();
  const connection = integrationRepo.getConnectionById(profile.connectionId);
  if (connection === null) {
    throw new Error('Configured Base connection does not exist.');
  }

  const integration = integrationRepo.getIntegrationById(connection.integrationId);
  if (
    integration === null ||
    !BASE_INTEGRATION_SLUGS.has(toTrimmedString(integration.slug).toLowerCase())
  ) {
    throw new Error('Selected connection is not a Base.com integration.');
  }

  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });
  if (tokenResolution.token === null) {
    throw new Error(tokenResolution.error ?? 'No Base API token configured.');
  }

  return {
    integrationId: integration.id,
    connectionId: connection.id,
    connectionName: toTrimmedString(connection.name) !== '' ? toTrimmedString(connection.name) : null,
    inventoryId: profile.inventoryId,
    token: tokenResolution.token,
  };
};

export const fetchBaseDetailsMap = async (
  token: string,
  inventoryId: string,
  baseProductIds: string[]
): Promise<Map<string, Record<string, unknown>>> => {
  const uniqueIds = Array.from(
    new Set(
      baseProductIds.map((id: string) => toTrimmedString(id)).filter((id: string) => id.length > 0)
    )
  );

  const batches = [];
  for (let offset = 0; offset < uniqueIds.length; offset += BASE_DETAILS_BATCH_SIZE) {
    batches.push(uniqueIds.slice(offset, offset + BASE_DETAILS_BATCH_SIZE));
  }
  const results = await Promise.all(
    batches.map((batch) => fetchBaseProductDetails(token, inventoryId, batch))
  );

  const map = new Map<string, Record<string, unknown>>();
  results.forEach((records) => {
    records.forEach((record: Record<string, unknown>) => {
      const baseProductId = toTrimmedString(record['base_product_id']);
      const productId = toTrimmedString(record['product_id']);
      const recordId = toTrimmedString(record['id']);
      
      let id = baseProductId;
      if (id === '') {
        id = productId !== '' ? productId : recordId;
      }

      if (id !== '') {
        map.set(id, record);
      }
    });
  });

  return map;
};

export const resolveLinkedBaseSyncTarget = async (input: {
  product: ProductWithImages;
  connectionId: string;
}): Promise<BaseSyncResolvedTarget> => {
  const persistedBaseProductId = toTrimmedString(input.product.baseProductId);
  if (persistedBaseProductId !== '') {
    return {
      baseProductId: persistedBaseProductId,
      linkedVia: 'product',
    };
  }

  const listingLink = await findProductListingByProductAndConnectionAcrossProviders(
    input.product.id,
    input.connectionId
  );
  const listingBaseProductId = toTrimmedString(listingLink?.listing.externalListingId);

  if (listingBaseProductId !== '') {
    return {
      baseProductId: listingBaseProductId,
      linkedVia: 'listing',
    };
  }

  return {
    baseProductId: null,
    linkedVia: 'none',
  };
};

export const resolveBackfillBaseProductId = async (input: {
  product: ProductWithImages;
  token: string;
  inventoryId: string;
}): Promise<string | null> => {
  const persistedBaseProductId = toTrimmedString(input.product.baseProductId);
  if (persistedBaseProductId !== '') {
    return persistedBaseProductId;
  }

  if (toTrimmedString(input.product.importSource).toLowerCase() !== 'base') {
    return null;
  }

  const sku = toTrimmedString(input.product.sku);
  if (sku === '') {
    return null;
  }

  const skuLookup = await checkBaseSkuExists(input.token, input.inventoryId, sku);
  return toTrimmedString(skuLookup.productId) !== '' ? toTrimmedString(skuLookup.productId) : null;
};

export const resolveManualBaseSyncTarget = async (input: {
  product: ProductWithImages;
  connectionId: string;
  token: string;
  inventoryId: string;
}): Promise<BaseSyncResolvedTarget> => {
  const linkedTarget = await resolveLinkedBaseSyncTarget({
    product: input.product,
    connectionId: input.connectionId,
  });
  if (linkedTarget.baseProductId !== null) {
    return linkedTarget;
  }

  const backfilledBaseProductId = await resolveBackfillBaseProductId({
    product: input.product,
    token: input.token,
    inventoryId: input.inventoryId,
  });
  if (backfilledBaseProductId !== null) {
    return {
      baseProductId: backfilledBaseProductId,
      linkedVia: 'sku_backfill',
    };
  }

  return linkedTarget;
};

export const resolveBatchProductSyncTargets = async (input: {
  products: ProductWithImages[];
  connectionId: string;
  token: string;
  inventoryId: string;
}): Promise<ResolvedProductSyncTarget[]> => {
  const resolvedTargets: ResolvedProductSyncTarget[] = [];

  for (const product of input.products) {
    const target = await resolveManualBaseSyncTarget({
      product,
      connectionId: input.connectionId,
      token: input.token,
      inventoryId: input.inventoryId,
    });
    if (target.baseProductId === null) continue;
    resolvedTargets.push({ product, target });
  }

  return resolvedTargets;
};

export const ensureBaseListingLink = async (input: {
  productId: string;
  baseProductId: string;
  integrationId: string;
  connectionId: string;
  inventoryId: string;
  source: string;
}): Promise<'created' | 'updated' | 'none'> => {
  const existing = await findProductListingByProductAndConnectionAcrossProviders(
    input.productId,
    input.connectionId
  );

  const marketplaceDataPatch = {
    source: input.source,
    marketplace: 'base',
  } as const;

  if (existing !== null) {
    let changed = false;
    if (existing.listing.externalListingId !== input.baseProductId) {
      await existing.repository.updateListingExternalId(existing.listing.id, input.baseProductId);
      changed = true;
    }
    if ((existing.listing.inventoryId ?? '') !== input.inventoryId) {
      await existing.repository.updateListingInventoryId(existing.listing.id, input.inventoryId);
      changed = true;
    }
    if (toTrimmedString(existing.listing.status).toLowerCase() !== 'active') {
      await existing.repository.updateListingStatus(existing.listing.id, 'active');
      changed = true;
    }
    await existing.repository.updateListing(existing.listing.id, {
      marketplaceData: {
        ...(existing.listing.marketplaceData ?? {}),
        ...marketplaceDataPatch,
      },
    });
    return changed ? 'updated' : 'none';
  }

  const listingRepository = await getProductListingRepository();
  await listingRepository.createListing({
    productId: input.productId,
    integrationId: input.integrationId,
    connectionId: input.connectionId,
    status: 'active',
    externalListingId: input.baseProductId,
    inventoryId: input.inventoryId,
    marketplaceData: marketplaceDataPatch,
  });
  return 'created';
};

export const syncSingleLinkedProduct = async (input: {
  product: ProductWithImages;
  baseProductId: string;
  baseRecord: Record<string, unknown> | null;
  profile: ProductSyncProfile;
  integrationId: string;
  connectionId: string;
  inventoryId: string;
  token: string;
}): Promise<LinkedProductSyncResult> => {
  const baseProductId = toTrimmedString(input.baseProductId);
  if (baseProductId === '') {
    return {
      status: 'skipped',
      localChanges: [],
      baseChanges: [],
      message: 'Product has no Base product ID.',
      errorMessage: null,
    };
  }

  if (input.baseRecord === null) {
    return {
      status: 'failed',
      localChanges: [],
      baseChanges: [],
      message: null,
      errorMessage: `Base product ${baseProductId} not found in inventory ${input.inventoryId}.`,
    };
  }

  const resolvedBaseParameterValues = await resolveBaseParameterSyncValues({
    product: input.product,
    profile: input.profile,
    baseRecord: input.baseRecord,
    connectionId: input.connectionId,
    inventoryId: input.inventoryId,
    persistLinkMap: true,
  });
  const plan = buildLinkedProductSyncPlan({
    product: input.product,
    baseRecord: input.baseRecord,
    profile: input.profile,
    baseProductId,
    persistBaseProductId: toTrimmedString(input.product.baseProductId) === '',
    resolvedBaseParameterValues,
  });
  const { localPatch, basePayload, localChanges, baseChanges } = plan;

  if (localChanges.length === 0 && baseChanges.length === 0) {
    await ensureBaseListingLink({
      productId: input.product.id,
      baseProductId,
      integrationId: input.integrationId,
      connectionId: input.connectionId,
      inventoryId: input.inventoryId,
      source: 'product-sync',
    });

    return {
      status: 'skipped',
      localChanges: [],
      baseChanges: [],
      message: 'No field changes detected.',
      errorMessage: null,
    };
  }

  const productRepository = await getProductRepository();

  if (Object.keys(localPatch).length > 0) {
    const updated = await productRepository.updateProduct(
      input.product.id,
      localPatch as UpdateProductInput
    );
    if (!updated) {
      return {
        status: 'failed',
        localChanges,
        baseChanges,
        message: null,
        errorMessage: `Product ${input.product.id} was not found for local update.`,
      };
    }
  }

  if (Object.keys(basePayload).length > 0) {
    // Base updates existing inventory products via addInventoryProduct when product_id is provided.
    await callBaseApi(input.token, 'addInventoryProduct', {
      inventory_id: input.inventoryId,
      product_id: baseProductId,
      ...basePayload,
    });
  }

  await ensureBaseListingLink({
    productId: input.product.id,
    baseProductId,
    integrationId: input.integrationId,
    connectionId: input.connectionId,
    inventoryId: input.inventoryId,
    source: 'product-sync',
  });

  return {
    status: 'success',
    localChanges,
    baseChanges,
    message: 'Synchronized successfully.',
    errorMessage: null,
  };
};

export const runBaseListingBackfill = async (options?: {
  connectionId?: string;
  inventoryId?: string;
  catalogId?: string | null;
  limit?: number;
  source?: string;
}): Promise<{
  scanned: number;
  created: number;
  updated: number;
  unchanged: number;
}> => {
  const integrationRepo = await getIntegrationRepository();
  const integrations = await integrationRepo.listIntegrations();
  const baseIntegration = integrations.find((integration) =>
    BASE_INTEGRATION_SLUGS.has(toTrimmedString(integration.slug).toLowerCase())
  );

  if (baseIntegration == null) {
    throw new Error('Base.com integration is not configured.');
  }

  const connections = await integrationRepo.listConnections(baseIntegration.id);
  if (connections.length === 0) {
    throw new Error('No Base.com connection found.');
  }

  const preferredConnectionId =
    toTrimmedString(options?.connectionId) !== '' ? toTrimmedString(options?.connectionId) : toTrimmedString(getExportDefaultConnectionId());

  const connection =
    (preferredConnectionId !== ''
      ? connections.find((entry) => entry.id === preferredConnectionId)
      : null) ??
    connections.find((entry) => entry.baseApiToken !== null && entry.baseApiToken !== undefined && entry.baseApiToken !== '') ??
    connections[0];

  if (connection === null) {
    throw new Error('No usable Base.com connection found.');
  }

  const inventoryId =
    toTrimmedString(options?.inventoryId) !== '' ? toTrimmedString(options?.inventoryId) : toTrimmedString(connection.baseLastInventoryId);

  if (inventoryId === '') {
    throw new Error('Inventory ID is required for link backfill.');
  }

  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });

  const productRepository = await getProductRepository();
  const pageSize = 200;
  const limit =
    typeof options?.limit === 'number' && Number.isFinite(options.limit) && options.limit > 0
      ? Math.floor(options.limit)
      : Number.POSITIVE_INFINITY;

  let page = 1;
  let scanned = 0;
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  while (scanned < limit) {
    const products = await productRepository.getProducts({
      page,
      pageSize,
      ...(toTrimmedString(options?.catalogId) !== ''
        ? { catalogId: toTrimmedString(options?.catalogId) }
        : {}),
    });

    if (products.length === 0) break;

    const resolvedProducts = await Promise.all(
      products.map(async (product) => {
        const baseProductId = toTrimmedString(product.baseProductId);
        
        let resolvedBaseProductId: string | null = null;
        if (baseProductId !== '') {
          resolvedBaseProductId = baseProductId;
        } else if (tokenResolution.token !== null) {
          resolvedBaseProductId = await resolveBackfillBaseProductId({
            product,
            token: tokenResolution.token,
            inventoryId,
          });
        }

        return { product, persistedBaseProductId: baseProductId, resolvedBaseProductId };
      })
    );

    for (const { product, persistedBaseProductId, resolvedBaseProductId } of resolvedProducts) {
      if (scanned >= limit) break;
      if (resolvedBaseProductId === null) continue;
      scanned += 1;

      if (persistedBaseProductId === '') {
        await productRepository.updateProduct(product.id, {
          baseProductId: resolvedBaseProductId,
        });
      }

      const result = await ensureBaseListingLink({
        productId: product.id,
        baseProductId: resolvedBaseProductId,
        integrationId: baseIntegration.id,
        connectionId: connection.id,
        inventoryId,
        source: toTrimmedString(options?.source) !== '' ? toTrimmedString(options?.source) : 'base-link-backfill',
      });

      if (result === 'created') {
        created += 1;
      } else if (result === 'updated') {
        updated += 1;
      } else {
        unchanged += 1;
      }
    }

    if (products.length < pageSize) break;
    page += 1;
  }

  return {
    scanned,
    created,
    updated,
    unchanged,
  };
};
