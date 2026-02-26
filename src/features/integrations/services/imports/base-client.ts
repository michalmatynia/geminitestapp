import 'server-only';

import { withTransientRecovery } from '@/features/observability/server';
import { externalServiceError } from '@/shared/errors/app-error';

import {
  dedupeCategories,
  dedupeProducers,
  dedupeTags,
  extractInventoryList,
  extractProducerList,
  extractProductIds,
  extractProducts,
  extractTagList,
  extractWarehouseList,
  fetchBaseCategoriesFromPayload,
  toStringId,
} from './base-client-parsers';
import type { 
  BaseApiResponse,
  BaseCategory,
  BaseInventory,
  BaseProducer,
  BaseProductRecord,
  BaseTag,
  BaseWarehouse,
} from '@/shared/contracts/integrations';

export type {
  BaseCategory,
  BaseInventory,
  BaseProducer,
  BaseProductRecord,
  BaseTag,
  BaseWarehouse,
  BaseApiResponse,
};

export type BaseApiRawResult = {
  ok: boolean;
  statusCode: number;
  payload: BaseApiResponse | null;
  error?: string;
};

const DEFAULT_BASE_API_URL = 'https://api.baselinker.com/connector.php';
const DEFAULT_BASE_API_TIMEOUT_MS = 12000;
const DEFAULT_BASE_API_PRODUCT_WRITE_TIMEOUT_MS = 30000;
const DEFAULT_BASE_API_IMAGE_TIMEOUT_MS = 90000;
const DEFAULT_BASE_API_LARGE_PAYLOAD_BYTES = 250_000;

const toPositiveIntOrFallback = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const BASE_API_TIMEOUT_MS = toPositiveIntOrFallback(
  process.env['BASE_API_TIMEOUT_MS'],
  DEFAULT_BASE_API_TIMEOUT_MS
);
const BASE_API_PRODUCT_WRITE_TIMEOUT_MS = toPositiveIntOrFallback(
  process.env['BASE_API_PRODUCT_WRITE_TIMEOUT_MS'],
  DEFAULT_BASE_API_PRODUCT_WRITE_TIMEOUT_MS
);
const BASE_API_IMAGE_TIMEOUT_MS = toPositiveIntOrFallback(
  process.env['BASE_API_IMAGE_TIMEOUT_MS'],
  DEFAULT_BASE_API_IMAGE_TIMEOUT_MS
);
const BASE_API_LARGE_PAYLOAD_BYTES = toPositiveIntOrFallback(
  process.env['BASE_API_LARGE_PAYLOAD_BYTES'],
  DEFAULT_BASE_API_LARGE_PAYLOAD_BYTES
);

const buildBaseApiUrl = (): string => {
  const raw = process.env['BASE_API_URL'] || DEFAULT_BASE_API_URL;
  if (raw.includes('connector.php')) return raw;
  return `${raw.replace(/\/$/, '')}/connector.php`;
};

type BaseApiCallOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
};

const isProductWriteMethod = (method: string): boolean =>
  method === 'addInventoryProduct' || method === 'updateInventoryProduct';

const hasProductIdentifier = (parameters: Record<string, unknown>): boolean => {
  const value = parameters['product_id'];
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  return value.trim().length > 0;
};

const isNonIdempotentProductWriteCall = (
  method: string,
  parameters: Record<string, unknown>
): boolean => method === 'addInventoryProduct' && !hasProductIdentifier(parameters);

const hasImagePayload = (parameters: Record<string, unknown>): boolean => {
  const images = parameters['images'];
  if (Array.isArray(images)) return images.length > 0;
  if (images && typeof images === 'object') return Object.keys(images).length > 0;
  return false;
};

const estimatePayloadSizeBytes = (parameters: Record<string, unknown>): number => {
  try {
    // Faster estimation: sum lengths of string values and counts of keys
    // This is a heuristic but much faster than JSON.stringify for large objects
    let total = 0;
    for (const key in parameters) {
      if (!Object.prototype.hasOwnProperty.call(parameters, key)) continue;
      total += key.length + 4; // overhead for key
      const val = parameters[key];
      if (typeof val === 'string') total += val.length;
      else if (typeof val === 'number') total += 8;
      else if (typeof val === 'boolean') total += 4;
      else if (val && typeof val === 'object') {
        // Fallback for complex nested objects, but keep it shallow or limited
        total += 100; 
      }
    }
    return total;
  } catch {
    return 0;
  }
};

const resolveBaseApiTimeoutMs = (
  method: string,
  parameters: Record<string, unknown>,
  options?: BaseApiCallOptions
): number => {
  if (
    typeof options?.timeoutMs === 'number' &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
  ) {
    return Math.round(options.timeoutMs);
  }

  if (!isProductWriteMethod(method)) {
    return BASE_API_TIMEOUT_MS;
  }

  if (hasImagePayload(parameters)) {
    return BASE_API_IMAGE_TIMEOUT_MS;
  }

  const payloadBytes = estimatePayloadSizeBytes(parameters);
  if (payloadBytes >= BASE_API_LARGE_PAYLOAD_BYTES) {
    return Math.max(BASE_API_PRODUCT_WRITE_TIMEOUT_MS, BASE_API_IMAGE_TIMEOUT_MS);
  }

  return BASE_API_PRODUCT_WRITE_TIMEOUT_MS;
};

export async function callBaseApi(
  token: string,
  method: string,
  parameters: Record<string, unknown> = {},
  options?: BaseApiCallOptions
): Promise<BaseApiResponse> {
  const timeoutMs = resolveBaseApiTimeoutMs(method, parameters, options);
  const maxAttempts =
    options?.maxAttempts ??
    (isNonIdempotentProductWriteCall(method, parameters)
      ? 1
      : isProductWriteMethod(method) || hasImagePayload(parameters)
        ? 2
        : 3);
  const endpoint = buildBaseApiUrl();
  const body = new URLSearchParams({
    token,
    method,
    parameters: JSON.stringify(parameters),
  });
  const response = await withTransientRecovery(
    async (): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          signal: controller.signal,
        });
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw externalServiceError(
            `Base API request timed out after ${timeoutMs}ms.`,
            { method, timeoutMs },
            { retryable: true }
          );
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
      if (!res.ok) {
        const retryable = res.status >= 500 || res.status === 408 || res.status === 429;
        const retryAfterHeader = res.headers.get('retry-after');
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined;
        throw externalServiceError(
          `Base API request failed (${res.status}).`,
          { status: res.status, method },
          {
            retryable,
            ...(retryAfterMs && Number.isFinite(retryAfterMs) ? { retryAfterMs } : {}),
          }
        );
      }
      return res;
    },
    {
      source: 'base-api',
      circuitId: 'base-api',
      retry: {
        maxAttempts,
        initialDelayMs: 800,
        maxDelayMs: 8000,
        timeoutMs: timeoutMs + 2000,
      },
    }
  );
  const payload = (await response.json()) as BaseApiResponse;
  if (payload.status === 'ERROR') {
    const message =
      (typeof payload.error_message === 'string' && payload.error_message) ||
      (typeof payload.error_code === 'string' && payload.error_code) ||
      'Base API error.';
    throw externalServiceError(message, {
      method,
      errorCode: payload.error_code,
    });
  }
  return payload;
}

export async function callBaseApiRaw(
  token: string,
  method: string,
  parameters: Record<string, unknown> = {}
): Promise<BaseApiRawResult> {
  const endpoint = buildBaseApiUrl();
  const body = new URLSearchParams({
    token,
    method,
    parameters: JSON.stringify(parameters),
  });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  let payload: BaseApiResponse;
  try {
    payload = (await response.json()) as BaseApiResponse;
  
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid JSON payload.';
    return {
      ok: false,
      statusCode: response.status,
      payload: null,
      error: message,
    };
  }

  const apiError =
    payload?.status === 'ERROR'
      ? (typeof payload.error_message === 'string' && payload.error_message) ||
        (typeof payload.error_code === 'string' && payload.error_code) ||
        'Base API error.'
      : undefined;

  return {
    ok: response.ok && !apiError,
    statusCode: response.status,
    payload,
    ...(apiError ? { error: apiError } : {}),
  };
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

export async function fetchBaseInventories(token: string): Promise<BaseInventory[]> {
  const methods = ['getInventories', 'getInventory', 'getInventoryList'];
  let lastError: Error | null = null;
  for (const method of methods) {
    try {
      const payload = await callBaseApi(token, method);
      const inventories = extractInventoryList(payload);
      if (inventories.length > 0) {
        return inventories;
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }
  if (lastError) {
    throw lastError;
  }
  return [];
}

export async function fetchBaseInventoriesDebug(token: string): Promise<BaseApiRawResult & { inventories: BaseInventory[]; method: string; parameters: Record<string, unknown> }> {
  const methods = ['getInventories', 'getInventory', 'getInventoryList'];
  let lastResult: BaseApiRawResult | null = null;
  for (const method of methods) {
    const result = await callBaseApiRaw(token, method);
    lastResult = result;
    const inventories = result.payload ? extractInventoryList(result.payload) : [];
    if (inventories.length > 0) {
      return {
        ...result,
        method,
        parameters: {},
        inventories,
      };
    }
  }
  return {
    ...(lastResult ?? {
      ok: false,
      statusCode: 500,
      payload: null,
      error: 'No inventory response.',
    }),
    method: methods[0] as string,
    parameters: {},
    inventories: [],
  };
}

export async function fetchBaseWarehouses(token: string, inventoryId: string): Promise<BaseWarehouse[]> {
  const methods = ['getInventoryWarehouses'];
  let lastError: Error | null = null;
  for (const method of methods) {
    try {
      const payload = await callBaseApi(token, method, {
        inventory_id: inventoryId,
      });
      const warehouses = extractWarehouseList(payload);
      if (warehouses.length > 0) {
        return warehouses;
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }
  if (lastError) {
    throw lastError;
  }
  return [];
}

export async function fetchBaseWarehousesDebug(token: string, inventoryId: string): Promise<BaseApiRawResult & { warehouses: BaseWarehouse[]; method: string; parameters: Record<string, unknown> }> {
  const method = 'getInventoryWarehouses';
  const parameters = { inventory_id: inventoryId };
  const result = await callBaseApiRaw(token, method, parameters);
  const warehouses = result.payload ? extractWarehouseList(result.payload) : [];
  return {
    ...result,
    method,
    parameters,
    warehouses,
  };
}

export async function fetchBaseAllWarehouses(token: string): Promise<BaseWarehouse[]> {
  const methods = ['getWarehouses'];
  let lastError: Error | null = null;
  for (const method of methods) {
    try {
      const payload = await callBaseApi(token, method);
      const warehouses = extractWarehouseList(payload);
      if (warehouses.length > 0) {
        return warehouses;
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }
  if (lastError) {
    throw lastError;
  }
  return [];
}

export async function fetchBaseAllWarehousesDebug(token: string): Promise<BaseApiRawResult & { warehouses: BaseWarehouse[]; method: string; parameters: Record<string, unknown> }> {
  const method = 'getWarehouses';
  const parameters = {};
  const result = await callBaseApiRaw(token, method, parameters);
  const warehouses = result.payload ? extractWarehouseList(result.payload) : [];
  return {
    ...result,
    method,
    parameters,
    warehouses,
  };
}

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
  
  // Process chunks with limited concurrency
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
  const targetIds =
    typeof limit === 'number' && limit > 0 ? ids.slice(0, limit) : ids;

  if (targetIds.length === 0) return [];

  return fetchBaseProductDetails(token, inventoryId, targetIds);
}

/**
 * Check if a SKU already exists in a Base.com inventory
 * Returns the product ID if found, null otherwise
 */
export async function checkBaseSkuExists(
  token: string,
  inventoryId: string,
  sku: string
): Promise<{ exists: boolean; productId?: string }> {
  try {
    // Use getInventoryProductsData with filter parameter if available
    // Otherwise fetch all and filter locally
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
        // Try with filter first (some API versions support this)
        const payload = await callBaseApi(token, candidate.method, {
          [candidate.paramKey]: inventoryId,
          filter_sku: sku,
        });
        const ids = extractProductIds(payload);
        if (ids.length > 0) {
          // Verify by fetching details
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

    // Fallback: Fetch all products and check SKU locally (expensive but reliable)
    const allIds = await fetchBaseProductIds(token, inventoryId);
    if (allIds.length === 0) return { exists: false };

    // Fetch in batches to avoid timeout
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
      const { logSystemError } = await import('@/features/observability/server');
      await logSystemError({ 
        message: '[base-client] Error checking SKU existence',
        error,
        source: 'base-client',
        context: { action: 'checkBaseSkuExists', sku }
      });
    } catch (logError) {
      const { logger } = await import('@/shared/utils/logger');
      logger.error('[base-client] Error checking SKU existence (and logging failed):', logError, { originalError: error, sku });
    }
    // On error, assume SKU doesn't exist to avoid blocking export
    return { exists: false };
  }
}

type FetchBaseProducersOptions = {
  inventoryId?: string | null;
};

/**
 * Fetches producer/manufacturer entries from Base.com inventory.
 */
export async function fetchBaseProducers(
  token: string,
  options?: FetchBaseProducersOptions
): Promise<BaseProducer[]> {
  let lastError: Error | null = null;
  const preferredInventoryId =
    typeof options?.inventoryId === 'string' ? options.inventoryId.trim() : '';

  const singlePassCalls: Array<{ method: string; parameters: Record<string, unknown> }> = [];
  if (preferredInventoryId && preferredInventoryId !== '0') {
    singlePassCalls.push({
      method: 'getInventoryManufacturers',
      parameters: { inventory_id: preferredInventoryId },
    });
    singlePassCalls.push({
      method: 'getManufacturers',
      parameters: { inventory_id: preferredInventoryId },
    });
  }
  singlePassCalls.push(
    { method: 'getInventoryManufacturers', parameters: {} },
    { method: 'getManufacturers', parameters: {} },
    { method: 'getProducers', parameters: {} }
  );

  for (const call of singlePassCalls) {
    try {
      const payload = await callBaseApi(token, call.method, call.parameters);
      const producers = extractProducerList(payload);
      if (producers.length > 0) {
        return dedupeProducers(producers);
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }

  const aggregated: BaseProducer[] = [];
  let inventoryIds: string[] = [];
  try {
    const inventories = await fetchBaseInventories(token);
    inventoryIds = inventories
      .map((inventory: BaseInventory): string => inventory.id)
      .filter((id: string): boolean => Boolean(id?.trim()));
  } catch (error: unknown) {
    lastError = error instanceof Error ? error : new Error('Base API error.');
  }

  const visitedInventoryIds = new Set<string>();
  if (preferredInventoryId && preferredInventoryId !== '0') {
    visitedInventoryIds.add(preferredInventoryId);
  }

  for (const inventoryId of inventoryIds) {
    if (visitedInventoryIds.has(inventoryId)) continue;
    visitedInventoryIds.add(inventoryId);
    try {
      const payload = await callBaseApi(token, 'getInventoryManufacturers', {
        inventory_id: inventoryId,
      });
      const producers = extractProducerList(payload);
      if (producers.length > 0) {
        aggregated.push(...producers);
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }

  if (aggregated.length > 0) {
    return dedupeProducers(aggregated);
  }

  if (lastError) throw lastError;
  return [];
}

type FetchBaseTagsOptions = {
  inventoryId?: string | null;
};

/**
 * Fetches tags/labels from Base.com inventory.
 */
export async function fetchBaseTags(
  token: string,
  options?: FetchBaseTagsOptions
): Promise<BaseTag[]> {
  let lastError: Error | null = null;
  const preferredInventoryId =
    typeof options?.inventoryId === 'string' ? options.inventoryId.trim() : '';

  const singlePassCalls: Array<{ method: string; parameters: Record<string, unknown> }> = [];
  if (preferredInventoryId && preferredInventoryId !== '0') {
    singlePassCalls.push(
      { method: 'getInventoryTags', parameters: { inventory_id: preferredInventoryId } },
      { method: 'getTags', parameters: { inventory_id: preferredInventoryId } }
    );
  }
  singlePassCalls.push(
    { method: 'getInventoryTags', parameters: {} },
    { method: 'getTags', parameters: {} },
    { method: 'getLabels', parameters: {} }
  );

  for (const call of singlePassCalls) {
    try {
      const payload = await callBaseApi(token, call.method, call.parameters);
      const tags = extractTagList(payload);
      if (tags.length > 0) {
        return dedupeTags(tags);
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }

  const aggregated: BaseTag[] = [];
  let inventoryIds: string[] = [];
  try {
    const inventories = await fetchBaseInventories(token);
    inventoryIds = inventories
      .map((inventory: BaseInventory): string => inventory.id)
      .filter((id: string): boolean => Boolean(id?.trim()));
  } catch (error: unknown) {
    lastError = error instanceof Error ? error : new Error('Base API error.');
  }

  const visitedInventoryIds = new Set<string>();
  if (preferredInventoryId && preferredInventoryId !== '0') {
    visitedInventoryIds.add(preferredInventoryId);
  }

  for (const inventoryId of inventoryIds) {
    if (visitedInventoryIds.has(inventoryId)) continue;
    visitedInventoryIds.add(inventoryId);
    try {
      const payload = await callBaseApi(token, 'getInventoryTags', {
        inventory_id: inventoryId,
      });
      const tags = extractTagList(payload);
      if (tags.length > 0) {
        aggregated.push(...tags);
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }

  if (aggregated.length > 0) {
    return dedupeTags(aggregated);
  }

  if (lastError) throw lastError;
  return [];
}

type FetchBaseCategoriesOptions = {
  inventoryId?: string | null;
};

const hasCategoryHierarchy = (categories: BaseCategory[]): boolean =>
  categories.some((category: BaseCategory): boolean => Boolean(category.parentId));

const scoreCategories = (
  categories: BaseCategory[],
): { total: number; withParent: number } => {
  const withParent = categories.reduce(
    (count: number, category: BaseCategory): number =>
      count + (category.parentId ? 1 : 0),
    0
  );
  return {
    total: categories.length,
    withParent,
  };
};

const isBetterCategoryCandidate = (
  candidate: BaseCategory[],
  currentBest: BaseCategory[],
): boolean => {
  const candidateScore = scoreCategories(candidate);
  const bestScore = scoreCategories(currentBest);
  if (candidateScore.withParent !== bestScore.withParent) {
    return candidateScore.withParent > bestScore.withParent;
  }
  return candidateScore.total > bestScore.total;
};

/**
 * Fetches categories from Base.com inventory.
 * Tries global categories first, then inventory-scoped categories when required.
 */
export async function fetchBaseCategories(
  token: string,
  options?: FetchBaseCategoriesOptions
): Promise<BaseCategory[]> {
  let lastError: Error | null = null;
  let bestCategories: BaseCategory[] = [];
  const preferredInventoryId =
    typeof options?.inventoryId === 'string' ? options.inventoryId.trim() : '';

  const singlePassInventoryIds: string[] = [];
  if (preferredInventoryId && preferredInventoryId !== '0') {
    singlePassInventoryIds.push(preferredInventoryId);
  }

  const considerCandidate = (categories: BaseCategory[]): void => {
    const deduped = dedupeCategories(categories);
    if (deduped.length === 0) return;
    if (
      bestCategories.length === 0
      || isBetterCategoryCandidate(deduped, bestCategories)
    ) {
      bestCategories = deduped;
    }
  };

  // First attempt without inventory_id for connectors returning global category trees.
  try {
    const payload = await callBaseApi(token, 'getInventoryCategories', {});
    const categories = fetchBaseCategoriesFromPayload(payload);
    considerCandidate(categories);
  } catch (error: unknown) {
    lastError = error instanceof Error ? error : new Error('Base API error.');
  }

  // Then try with preferred inventory_id (if present).
  for (const inventoryId of singlePassInventoryIds) {
    try {
      const payload = await callBaseApi(token, 'getInventoryCategories', {
        inventory_id: inventoryId,
      });
      const categories = fetchBaseCategoriesFromPayload(payload);
      considerCandidate(categories);
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }

  if (hasCategoryHierarchy(bestCategories)) {
    return bestCategories;
  }

  // Final fallback: load inventories and aggregate category trees across each one.
  const aggregated: BaseCategory[] = [];
  let inventoryIds: string[] = [];
  try {
    const inventories = await fetchBaseInventories(token);
    inventoryIds = inventories
      .map((inventory: BaseInventory): string => inventory.id)
      .filter((id: string): boolean => Boolean(id?.trim()));
  } catch (error: unknown) {
    lastError = error instanceof Error ? error : new Error('Base API error.');
  }

  const seenInventoryIds = new Set<string>(singlePassInventoryIds);
  for (const inventoryId of inventoryIds) {
    if (seenInventoryIds.has(inventoryId)) continue;
    seenInventoryIds.add(inventoryId);
    try {
      const payload = await callBaseApi(token, 'getInventoryCategories', {
        inventory_id: inventoryId,
      });
      const categories = fetchBaseCategoriesFromPayload(payload);
      if (categories.length > 0) {
        aggregated.push(...categories);
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }

  considerCandidate(aggregated);
  if (bestCategories.length > 0) return bestCategories;

  if (lastError) throw lastError;
  return [];
}

/**
 * Fetches categories with debug information.
 */
export async function fetchBaseCategoriesDebug(token: string): Promise<BaseApiRawResult & { categories: BaseCategory[]; method: string; parameters: Record<string, unknown> }> {
  const method = 'getInventoryCategories';
  const parameters = {};
  const result = await callBaseApiRaw(token, method, parameters);
  const categories = result.payload ? fetchBaseCategoriesFromPayload(result.payload) : [];
  return {
    ...result,
    method,
    parameters,
    categories,
  };
}
