import { BaseProductRecord, BaseApiResponse } from '@/shared/contracts/integrations/base-api';

import { callBaseApi } from './core';
import { extractProductIds, extractProducts, toStringId } from '../base-client-parsers';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export async function fetchBaseProductIds(token: string, inventoryId: string): Promise<string[]> {
  const candidates = [
    {
      method: 'getInventoryProductsList',
      paramKey: 'inventory_id',
    },
    {
      method: 'getProductsList',
      paramKey: 'storage_id',
    },
  ];

  for (const candidate of candidates) {
    try {
      const payload = await callBaseApi(token, candidate.method, {
        [candidate.paramKey]: inventoryId,
      });
      const ids = extractProductIds(payload);
      if (ids.length > 0) return ids;
    } catch (error) {
      logClientError(error);
    
      // Continue to next candidate
    }
  }
  return [];
}

export async function fetchBaseProductDetails(
  token: string,
  inventoryId: string,
  productIds: string[]
): Promise<BaseProductRecord[]> {
  if (productIds.length === 0) return [];

  const BATCH_SIZE = 100;
  const CONCURRENCY = 3;
  const chunks: string[][] = [];
  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    chunks.push(productIds.slice(i, i + BATCH_SIZE));
  }

  const candidates = [
    {
      method: 'getInventoryProductsData',
      paramKey: 'inventory_id',
    },
    {
      method: 'getProductsData',
      paramKey: 'storage_id',
    },
  ];

  const results: BaseProductRecord[] = [];

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      batch.map(async (chunk) => {
        for (const candidate of candidates) {
          try {
            const payload = await callBaseApi(token, candidate.method, {
              [candidate.paramKey]: inventoryId,
              products: chunk,
            });
            const products = extractProducts(payload);
            if (products.length > 0) return products;
          } catch (error) {
            logClientError(error);
          
            // Continue
          }
        }
        return [];
      })
    );
    results.push(...chunkResults.flat());
  }

  return results;
}

export async function fetchBaseProducts(
  token: string,
  inventoryId: string,
  limit?: number
): Promise<BaseProductRecord[]> {
  const ids = await fetchBaseProductIds(token, inventoryId);
  const targetIds = typeof limit === 'number' && limit > 0 ? ids.slice(0, limit) : ids;

  if (targetIds.length === 0) return [];

  return fetchBaseProductDetails(token, inventoryId, targetIds);
}

export async function checkBaseSkuExists(
  token: string,
  inventoryId: string,
  sku: string
): Promise<{ exists: boolean; productId?: string }> {
  try {
    const candidates = [
      {
        method: 'getInventoryProductsList',
        paramKey: 'inventory_id',
      },
      {
        method: 'getProductsList',
        paramKey: 'storage_id',
      },
    ];

    for (const candidate of candidates) {
      try {
        const payload = await callBaseApi(token, candidate.method, {
          [candidate.paramKey]: inventoryId,
          filter_sku: sku,
        });
        const ids = extractProductIds(payload);
        if (ids.length > 0) {
          const details = await fetchBaseProductDetails(token, inventoryId, ids);
          const match = details.find((p: BaseProductRecord) => {
            const pSku = p['sku'] ?? p['SKU'] ?? p['Sku'];
            return typeof pSku === 'string' && pSku.toLowerCase() === sku.toLowerCase();
          });
          if (match) {
            const productId = toStringId(match['product_id'] ?? match['id']);
            return productId ? { exists: true, productId } : { exists: true };
          }
        }
      } catch (error) {
        logClientError(error);
      
        // Filter might not be supported, continue
      }
    }

    const allIds = await fetchBaseProductIds(token, inventoryId);
    if (allIds.length === 0) return { exists: false };

    const batchSize = 100;
    for (let i = 0; i < allIds.length; i += batchSize) {
      const batch = allIds.slice(i, i + batchSize);
      const products = await fetchBaseProductDetails(token, inventoryId, batch);
      const match = products.find((p: BaseProductRecord) => {
        const pSku = p['sku'] ?? p['SKU'] ?? p['Sku'];
        return typeof pSku === 'string' && pSku.toLowerCase() === sku.toLowerCase();
      });
      if (match) {
        const productId = toStringId(match['product_id'] ?? match['id']);
        return productId ? { exists: true, productId } : { exists: true };
      }
    }

    return { exists: false };
  } catch (error: unknown) {
    logClientError(error);
    try {
      const { logSystemError } = await import('@/shared/lib/observability/system-logger');
      await logSystemError({
        message: '[base-client] Error checking SKU existence',
        error,
        source: 'base-client',
        context: { action: 'checkBaseSkuExists', sku },
      });
    } catch (logError) {
      logClientError(logError);
      const { logger } = await import('@/shared/utils/logger');
      logger.error('[base-client] Error checking SKU existence (and logging failed):', logError, {
        originalError: error,
        sku,
      });
    }
    return { exists: false };
  }
}

/**
 * Fetch a single product's full detail from Base.com.
 * Tries dedicated single-product endpoints first (richer data), then falls back to batch methods.
 * Returns null if the product cannot be found via any supported method.
 */
export async function fetchBaseProductById(
  token: string,
  inventoryId: string,
  productId: string
): Promise<BaseProductRecord | null> {
  // Try dedicated single-product endpoints first — they may return extended attributes
  const singleCandidates = [
    { method: 'getInventoryProductDetails', paramKey: 'inventory_id' },
    { method: 'getProductDetails', paramKey: 'storage_id' },
  ];

  for (const candidate of singleCandidates) {
    try {
      const payload = await callBaseApi(token, candidate.method, {
        [candidate.paramKey]: inventoryId,
        product_id: productId,
      });
      const products = extractProducts(payload);
      if (products.length > 0) return products[0] ?? null;
      // Some endpoints wrap single product directly rather than in an array
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const directId =
          toStringId(payload['product_id']) ?? toStringId(payload['id']) ?? toStringId(payload['base_product_id']);
        if (directId) return payload;
      }
    } catch (error) {
      logClientError(error);
      // Continue to next candidate
    }
  }

  // Fall back to batch endpoints with a single-item list
  const batchCandidates = [
    { method: 'getInventoryProductsData', paramKey: 'inventory_id' },
    { method: 'getProductsData', paramKey: 'storage_id' },
  ];

  for (const candidate of batchCandidates) {
    try {
      const payload = await callBaseApi(token, candidate.method, {
        [candidate.paramKey]: inventoryId,
        products: [productId],
      });
      const products = extractProducts(payload);
      if (products.length > 0) return products[0] ?? null;
    } catch (error) {
      logClientError(error);
      // Continue to next candidate
    }
  }
  return null;
}

/** Returns true if a product record is considered sparse (no name or description in any language). */
export function isBaseProductRecordSparse(record: BaseProductRecord): boolean {
  const hasName =
    typeof record['name'] === 'string' && record['name'].trim().length > 0 ||
    typeof record['name_pl'] === 'string' && record['name_pl'].trim().length > 0 ||
    typeof record['name_en'] === 'string' && record['name_en'].trim().length > 0 ||
    typeof record['title'] === 'string' && record['title'].trim().length > 0;
  return !hasName;
}

export async function deleteBaseProduct(
  token: string,
  inventoryId: string,
  productId: string
): Promise<BaseApiResponse> {
  return callBaseApi(token, 'deleteInventoryProduct', {
    inventory_id: inventoryId,
    product_id: productId,
  });
}
