import { 
  callBaseApi, 
} from './core';
import { 
  extractProductIds, 
  extractProducts, 
  toStringId 
} from '../base-client-parsers';
import { 
  BaseProductRecord, 
  BaseApiResponse 
} from '@/shared/contracts/integrations';

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
    } catch {
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
          } catch {
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
      } catch {
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
    try {
      const { logSystemError } = await import('@/shared/lib/observability/system-logger');
      await logSystemError({
        message: '[base-client] Error checking SKU existence',
        error,
        source: 'base-client',
        context: { action: 'checkBaseSkuExists', sku },
      });
    } catch (logError) {
      const { logger } = await import('@/shared/utils/logger');
      logger.error('[base-client] Error checking SKU existence (and logging failed):', logError, {
        originalError: error,
        sku,
      });
    }
    return { exists: false };
  }
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
