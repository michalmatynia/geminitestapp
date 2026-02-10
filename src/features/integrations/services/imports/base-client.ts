import 'server-only';

import { withTransientRecovery } from '@/features/observability/server';
import { externalServiceError } from '@/shared/errors/app-error';

type BaseApiResponse = {
  status?: string;
  error_code?: string;
  error_message?: string;
  [key: string]: unknown;
};

export type BaseInventory = {
  id: string;
  name: string;
};

export type BaseWarehouse = {
  id: string;
  name: string;
  typedId?: string;
};

export type BaseProducer = {
  id: string;
  name: string;
};

export type BaseTag = {
  id: string;
  name: string;
};

export type BaseProductRecord = Record<string, unknown>;

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

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>);
  }
  return [];
};

const toStringId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const normalizeBaseParentId = (value: unknown): string | null => {
  const parentId = toStringId(value);
  if (!parentId) return null;
  if (parentId === '0') return null;
  return parentId;
};

const extractProducerList = (payload: BaseApiResponse): BaseProducer[] => {
  const candidates = [
    payload['manufacturers'],
    payload['producers'],
    payload['producer_list'],
    payload['producers_list'],
    (payload['data'] as Record<string, unknown> | undefined)?.['manufacturers'],
    (payload['data'] as Record<string, unknown> | undefined)?.['producers'],
    (payload['data'] as Record<string, unknown> | undefined)?.['producer_list'],
    (payload['data'] as Record<string, unknown> | undefined)?.['producers_list'],
  ];
  const raw = candidates.map(toArray).find((list: unknown[]) => list.length > 0) ?? [];
  return raw
    .map((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const id =
        toStringId(record['manufacturer_id']) ??
        toStringId(record['producer_id']) ??
        toStringId(record['id']);
      if (!id) return null;
      const name =
        (typeof record['name'] === 'string' && record['name'].trim()) ||
        (typeof record['producer_name'] === 'string' && record['producer_name'].trim()) ||
        (typeof record['manufacturer_name'] === 'string' && record['manufacturer_name'].trim()) ||
        id;
      return { id, name };
    })
    .filter((entry: BaseProducer | null): entry is BaseProducer => Boolean(entry));
};

const extractTagList = (payload: BaseApiResponse): BaseTag[] => {
  const candidates = [
    payload['tags'],
    payload['tag_list'],
    payload['labels'],
    (payload['data'] as Record<string, unknown> | undefined)?.['tags'],
    (payload['data'] as Record<string, unknown> | undefined)?.['tag_list'],
    (payload['data'] as Record<string, unknown> | undefined)?.['labels'],
  ];
  const raw = candidates.map(toArray).find((list: unknown[]) => list.length > 0) ?? [];
  return raw
    .map((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const id =
        toStringId(record['tag_id']) ??
        toStringId(record['id']) ??
        toStringId(record['label_id']);
      if (!id) return null;
      const name =
        (typeof record['name'] === 'string' && record['name'].trim()) ||
        (typeof record['tag'] === 'string' && record['tag'].trim()) ||
        (typeof record['label'] === 'string' && record['label'].trim()) ||
        id;
      return { id, name };
    })
    .filter((entry: BaseTag | null): entry is BaseTag => Boolean(entry));
};

const extractInventoryList = (payload: BaseApiResponse): BaseInventory[] => {
  const candidates = [
    payload['inventories'],
    payload['inventory'],
    payload['storages'],
    payload['storage'],
    (payload['data'] as Record<string, unknown> | undefined)?.['inventories'],
    (payload['data'] as Record<string, unknown> | undefined)?.['storages'],
  ];
  const raw = candidates.map(toArray).find((list: unknown[]) => list.length > 0) ?? [];
  return raw
    .map((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const id =
        toStringId(record['inventory_id']) ??
        toStringId(record['storage_id']) ??
        toStringId(record['id']);
      if (!id) return null;
      const name =
        (typeof record['name'] === 'string' && record['name'].trim()) ||
        (typeof record['label'] === 'string' && record['label'].trim()) ||
        id;
      return { id, name };
    })
    .filter((entry: BaseInventory | null): entry is BaseInventory => Boolean(entry));
};

const extractWarehouseList = (payload: BaseApiResponse): BaseWarehouse[] => {
  const candidates = [
    payload['warehouses'],
    payload['warehouse'],
    (payload['data'] as Record<string, unknown> | undefined)?.['warehouses'],
  ];
  const raw = candidates.map(toArray).find((list: unknown[]) => list.length > 0) ?? [];
  return raw.reduce<BaseWarehouse[]>((acc: BaseWarehouse[], entry: unknown) => {
    if (!entry || typeof entry !== 'object') return acc;
    const record = entry as Record<string, unknown>;
    const id =
      toStringId(record['warehouse_id']) ??
      toStringId(record['id']) ??
      toStringId(record['storage_id']);
    if (!id) return acc;
    const type =
      typeof record['warehouse_type'] === 'string' && record['warehouse_type'].trim()
        ? record['warehouse_type'].trim().toLowerCase()
        : null;
    const typedId =
      type && !id.startsWith(`${type}_`) ? `${type}_${id}` : type ? id : undefined;
    const name =
      (typeof record['name'] === 'string' && record['name'].trim()) ||
      (typeof record['label'] === 'string' && record['label'].trim()) ||
      id;
    acc.push(typedId ? { id, name, typedId } : { id, name });
    return acc;
  }, []);
};

const extractProductIds = (payload: BaseApiResponse): string[] => {
  const rawProducts =
    payload['products'] ??
    payload['items'] ??
    (payload['data'] as Record<string, unknown> | undefined)?.['products'] ??
    (payload['data'] as Record<string, unknown> | undefined)?.['items'];
  const ids = new Set<string>();
  if (Array.isArray(rawProducts)) {
    for (const entry of rawProducts as unknown[]) {
      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        const id =
          toStringId(record['product_id']) ??
          toStringId(record['id']) ??
          toStringId(record['base_product_id']);
        if (id) ids.add(id);
      } else {
        const id = toStringId(entry);
        if (id) ids.add(id);
      }
    }
  } else if (rawProducts && typeof rawProducts === 'object') {
    for (const [key, value] of Object.entries(
      rawProducts as Record<string, unknown>
    )) {
      const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
      const id =
        record?.['product_id'] ??
        record?.['id'] ??
        record?.['base_product_id'] ??
        key;
      const resolved = toStringId(id);
      if (resolved) ids.add(resolved);
    }
  }
  return Array.from(ids);
};

const extractProducts = (payload: BaseApiResponse): BaseProductRecord[] => {
  const rawProducts =
    payload['products'] ??
    payload['items'] ??
    (payload['data'] as Record<string, unknown> | undefined)?.['products'] ??
    (payload['data'] as Record<string, unknown> | undefined)?.['items'];

  if (Array.isArray(rawProducts)) {
    return rawProducts.map((entry: unknown) => {
      if (entry && typeof entry === 'object') {
        return { ...(entry as Record<string, unknown>) };
      }
      const id = toStringId(entry);
      return id ? { id } : {};
    });
  }

  if (rawProducts && typeof rawProducts === 'object') {
    return Object.entries(rawProducts as Record<string, unknown>).map(
      ([key, value]: [string, unknown]) => {
        if (value && typeof value === 'object') {
          const record = value as Record<string, unknown>;
          return {
            product_id: record['product_id'] ?? key,
            id: record['id'] ?? key,
            ...record,
          };
        }
        const id = toStringId(value) ?? key;
        return id ? { id } : {};
      }
    );
  }

  return [];
};

type BaseApiCallOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
};

const isProductWriteMethod = (method: string): boolean =>
  method === 'addInventoryProduct' || method === 'updateInventoryProduct';

const isNonIdempotentProductWriteMethod = (method: string): boolean =>
  method === 'addInventoryProduct';

const hasImagePayload = (parameters: Record<string, unknown>): boolean => {
  const images = parameters['images'];
  if (Array.isArray(images)) return images.length > 0;
  if (images && typeof images === 'object') return Object.keys(images).length > 0;
  return false;
};

const estimatePayloadSizeBytes = (parameters: Record<string, unknown>): number => {
  try {
    return Buffer.byteLength(JSON.stringify(parameters), 'utf8');
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
    (isNonIdempotentProductWriteMethod(method)
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

  let payload: BaseApiResponse | null = null;
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

  for (const candidate of candidates) {
    try {
      const payload = await callBaseApi(token, candidate.method, {
        [candidate.paramKey]: inventoryId,
        products: productIds,
      });
      const products = extractProducts(payload);
      if (products.length > 0) return products;
    } catch {
      // Continue
    }
  }
  return [];
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
      console.error('[base-client] Error checking SKU existence (and logging failed):', error, logError);
    }
    // On error, assume SKU doesn't exist to avoid blocking export
    return { exists: false };
  }
}

type FetchBaseProducersOptions = {
  inventoryId?: string | null;
};

const dedupeProducers = (producers: BaseProducer[]): BaseProducer[] => {
  const byId = new Map<string, BaseProducer>();
  for (const producer of producers) {
    if (!producer.id) continue;
    if (!byId.has(producer.id)) {
      byId.set(producer.id, producer);
    }
  }
  return Array.from(byId.values());
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

const dedupeTags = (tags: BaseTag[]): BaseTag[] => {
  const byId = new Map<string, BaseTag>();
  for (const tag of tags) {
    if (!tag.id) continue;
    if (!byId.has(tag.id)) {
      byId.set(tag.id, tag);
    }
  }
  return Array.from(byId.values());
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

export type BaseCategory = {
  id: string;
  name: string;
  parentId: string | null;
};

type FetchBaseCategoriesOptions = {
  inventoryId?: string | null;
};

const dedupeCategories = (categories: BaseCategory[]): BaseCategory[] => {
  const byId = new Map<string, BaseCategory>();
  for (const category of categories) {
    if (!category.id) continue;
    if (!byId.has(category.id)) {
      byId.set(category.id, category);
    }
  }
  return Array.from(byId.values());
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
  const preferredInventoryId =
    typeof options?.inventoryId === 'string' ? options.inventoryId.trim() : '';

  const singlePassInventoryIds: string[] = [];
  if (preferredInventoryId && preferredInventoryId !== '0') {
    singlePassInventoryIds.push(preferredInventoryId);
  }

  // First attempt without inventory_id for connectors returning global category trees.
  try {
    const payload = await callBaseApi(token, 'getInventoryCategories', {});
    const categories = fetchBaseCategoriesFromPayload(payload);
    if (categories.length > 0) return dedupeCategories(categories);
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
      if (categories.length > 0) return dedupeCategories(categories);
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
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

  if (aggregated.length > 0) {
    return dedupeCategories(aggregated);
  }

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

function fetchBaseCategoriesFromPayload(payload: BaseApiResponse): BaseCategory[] {
  const rawCategories =
    payload['categories'] ??
    (payload['data'] as Record<string, unknown> | undefined)?.['categories'] ??
    payload;

  if (rawCategories && typeof rawCategories === 'object' && !Array.isArray(rawCategories)) {
    return Object.entries(rawCategories as Record<string, unknown>)
      .filter(([key]: [string, unknown]) => key !== 'status' && key !== 'error_code' && key !== 'error_message')
      .map(([key, value]: [string, unknown]) => {
        const cat = value as Record<string, unknown>;
        const id = toStringId(cat['category_id']) ?? toStringId(cat['id']) ?? key;
        const name =
          (typeof cat['name'] === 'string' && cat['name'].trim()) ||
          (typeof cat['label'] === 'string' && cat['label'].trim()) ||
          id;
        const parentId = normalizeBaseParentId(cat['parent_id'] ?? cat['parent_category_id']);
        return { id, name, parentId };
      });
  }

  if (Array.isArray(rawCategories)) {
    return rawCategories.map((cat: Record<string, unknown>) => {
      const id = toStringId(cat['category_id']) ?? toStringId(cat['id']) ?? '';
      const name =
        (typeof cat['name'] === 'string' && cat['name'].trim()) ||
        (typeof cat['label'] === 'string' && cat['label'].trim()) ||
        id;
      const parentId = normalizeBaseParentId(cat['parent_id'] ?? cat['parent_category_id']);
      return { id, name, parentId };
    });
  }

  return [];
}
