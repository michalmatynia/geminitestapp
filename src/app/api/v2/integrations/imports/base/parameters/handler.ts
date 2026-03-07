import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getIntegrationRepository } from '@/features/integrations/server';
import { callBaseApi } from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/server';
import { getImportParameterCache, setImportParameterCache } from '@/features/integrations/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const optionalIdSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}, z.string().trim().min(1).optional());

const requestSchema = z.object({
  inventoryId: optionalIdSchema,
  productId: optionalIdSchema,
  connectionId: optionalIdSchema,
  sampleSize: z.coerce.number().int().positive().max(20).optional(),
  clearOnly: z.boolean().optional(),
});

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

const toStringId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const extractProductIdFromRecord = (record: Record<string, unknown>): string | null =>
  toStringId(record['product_id']) ??
  toStringId(record['id']) ??
  toStringId(record['base_product_id']);

const normalizeProductId = (value: unknown): string => toStringId(value)?.trim() ?? '';

const extractProductIdsFromListPayload = (payload: unknown, limit: number): string[] => {
  const ids: string[] = [];
  const seen = new Set<string>();
  const push = (value: unknown): void => {
    const normalized = normalizeProductId(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    ids.push(normalized);
  };

  const products = (payload as { products?: unknown })?.products;
  if (Array.isArray(products)) {
    for (const entry of products) {
      if (ids.length >= limit) break;
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        push(extractProductIdFromRecord(entry as Record<string, unknown>));
      } else {
        push(entry);
      }
    }
    return ids;
  }

  if (products && typeof products === 'object') {
    Object.entries(products as Record<string, unknown>).forEach(([key, value]) => {
      if (ids.length >= limit) return;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const record = value as Record<string, unknown>;
        push(extractProductIdFromRecord(record) ?? key);
      } else {
        push(value ?? key);
      }
    });
  }

  return ids;
};

type ProductRecordMatch = {
  record: Record<string, unknown>;
  productId: string | null;
};

const extractProductRecords = (
  payload: unknown,
  requestedProductIds: string[]
): ProductRecordMatch[] => {
  const products = (payload as { products?: unknown })?.products;
  const requestedNormalized = requestedProductIds
    .map((id: string) => normalizeProductId(id))
    .filter((id: string): boolean => id.length > 0);
  const requestedSet = new Set(requestedNormalized);
  const matchedById = new Map<string, ProductRecordMatch>();
  const fallback: ProductRecordMatch[] = [];

  const addCandidate = (record: Record<string, unknown>, idHint?: string | null): void => {
    const resolvedId = normalizeProductId(extractProductIdFromRecord(record) ?? idHint);
    const candidate: ProductRecordMatch = {
      record,
      productId: resolvedId || null,
    };
    if (resolvedId && requestedSet.has(resolvedId)) {
      if (!matchedById.has(resolvedId)) {
        matchedById.set(resolvedId, candidate);
      }
      return;
    }
    fallback.push(candidate);
  };

  if (Array.isArray(products)) {
    products.forEach((entry: unknown, index: number) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
      const idHint = requestedNormalized[index] ?? null;
      addCandidate(entry as Record<string, unknown>, idHint);
    });
  } else if (products && typeof products === 'object') {
    Object.entries(products as Record<string, unknown>).forEach(
      ([key, value]: [string, unknown]) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return;
        addCandidate(value as Record<string, unknown>, key);
      }
    );
  }

  const ordered: ProductRecordMatch[] = [];
  const usedIds = new Set<string>();
  requestedNormalized.forEach((id: string) => {
    const matched = matchedById.get(id);
    if (!matched) return;
    if (matched.productId) {
      usedIds.add(matched.productId);
    }
    ordered.push(matched);
  });
  fallback.forEach((candidate: ProductRecordMatch) => {
    const candidateId = candidate.productId?.trim() ?? '';
    if (candidateId && usedIds.has(candidateId)) return;
    if (candidateId) {
      usedIds.add(candidateId);
    }
    ordered.push(candidate);
  });
  return ordered;
};

const extractProductRecord = (
  payload: unknown,
  productId: string
): Record<string, unknown> | null => {
  const products = (payload as { products?: unknown })?.products;
  if (Array.isArray(products)) {
    return (
      (products.find((entry: unknown) => {
        if (!entry || typeof entry !== 'object') return false;
        const record = entry as Record<string, unknown>;
        return (
          record['product_id'] === productId ||
          record['id'] === productId ||
          record['base_product_id'] === productId
        );
      }) as Record<string, unknown> | undefined) ??
      (products[0] as Record<string, unknown> | undefined) ??
      null
    );
  }
  if (products && typeof products === 'object') {
    const recordMap = products as Record<string, unknown>;
    return (recordMap[productId] ??
      recordMap[Number(productId) as unknown as keyof typeof recordMap] ??
      Object.values(recordMap)[0]) as Record<string, unknown> | null;
  }
  return null;
};

const collectKeysFromObject = (value: unknown, keys: Set<string>) => {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((entry: unknown) => collectKeysFromObject(entry, keys));
    return;
  }
  Object.keys(value as Record<string, unknown>).forEach((key: string) => {
    if (key) keys.add(key);
  });
};

const collectPrefixedKeys = (
  value: unknown,
  prefix: string,
  keys: Set<string>,
  depth: number,
  maxDepth: number
) => {
  if (!value || typeof value !== 'object') return;
  if (depth > maxDepth) return;
  if (Array.isArray(value)) {
    value.forEach((entry: unknown, index: number) => {
      const nextPrefix = `${prefix}.${index}`;
      keys.add(nextPrefix);
      collectPrefixedKeys(entry, nextPrefix, keys, depth + 1, maxDepth);
    });
    return;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]: [string, unknown]) => {
    const nextPrefix = `${prefix}.${key}`;
    keys.add(nextPrefix);
    collectPrefixedKeys(entry, nextPrefix, keys, depth + 1, maxDepth);
  });
};

const resolveValueByPath = (record: Record<string, unknown>, path: string): unknown => {
  if (!path) return null;
  const parts = path.split('.');
  let current: unknown = record;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const toPreviewValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    return value.length > 120 ? `${value.slice(0, 117)}...` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const joined = value
      .slice(0, 4)
      .map((entry: unknown) => toPreviewValue(entry))
      .filter(Boolean)
      .join(', ');
    return joined ? (value.length > 4 ? `${joined}, ...` : joined) : null;
  }
  if (typeof value === 'object') {
    try {
      const stringified = JSON.stringify(value);
      return stringified.length > 160 ? `${stringified.slice(0, 157)}...` : stringified;
    } catch {
      return null;
    }
  }
  return null;
};

const collectParameterKeys = (product: Record<string, unknown>) => {
  const keys = new Set<string>();
  // Explicitly add common identifiers
  keys.add('product_id');
  keys.add('inventory_id');
  keys.add('id');
  keys.add('ean');
  keys.add('sku');

  const parameterBuckets = [
    product['parameters'],
    product['params'],
    product['attributes'],
    product['features'],
    product['text_fields'],
    (product['text_fields'] as Record<string, unknown> | undefined)?.['features'],
    (product['text_fields'] as Record<string, unknown> | undefined)?.['features|en'],
  ];
  for (const bucket of parameterBuckets) {
    if (!bucket) continue;
    if (Array.isArray(bucket)) {
      for (const entry of bucket) {
        if (!entry || typeof entry !== 'object') continue;
        const record = entry as Record<string, unknown>;
        const name =
          record['name'] ??
          record['parameter'] ??
          record['code'] ??
          record['label'] ??
          record['title'];
        const id =
          record['id'] ?? record['parameter_id'] ?? record['param_id'] ?? record['attribute_id'];
        if (typeof name === 'string' && name.trim()) {
          keys.add(name.trim());
        }
        if (typeof id === 'string' && id.trim()) {
          keys.add(id.trim());
        }
      }
      continue;
    }
    if (typeof bucket === 'object') {
      collectKeysFromObject(bucket, keys);
    }
  }

  if (product['text_fields']) {
    collectPrefixedKeys(product['text_fields'], 'text_fields', keys, 0, 2);
  }
  if (product['images']) {
    collectPrefixedKeys(product['images'], 'images', keys, 0, 1);
  }
  if (product['links']) {
    collectPrefixedKeys(product['links'], 'links', keys, 0, 2);
  }
  if (product['prices']) {
    collectPrefixedKeys(product['prices'], 'prices', keys, 0, 1);
  }
  if (product['stock']) {
    collectPrefixedKeys(product['stock'], 'stock', keys, 0, 1);
  }
  if (product['locations']) {
    collectPrefixedKeys(product['locations'], 'locations', keys, 0, 1);
  }
  const sortedKeys = Array.from(keys).sort((a, b) => a.localeCompare(b));
  const values: Record<string, string> = {};
  for (const key of sortedKeys) {
    const directValue = product[key] ?? resolveValueByPath(product, key);
    const fallbackBuckets = [
      product['parameters'],
      product['params'],
      product['attributes'],
      product['features'],
      product['text_fields'],
      (product['text_fields'] as Record<string, unknown> | undefined)?.['features'],
      (product['text_fields'] as Record<string, unknown> | undefined)?.['features|en'],
    ];
    let resolved = directValue;
    if (resolved === undefined) {
      for (const bucket of fallbackBuckets) {
        if (!bucket) continue;
        if (Array.isArray(bucket)) {
          for (const entry of bucket) {
            if (!entry || typeof entry !== 'object') continue;
            const record = entry as Record<string, unknown>;
            const name =
              record['name'] ??
              record['parameter'] ??
              record['code'] ??
              record['label'] ??
              record['title'];
            const id =
              record['id'] ??
              record['parameter_id'] ??
              record['param_id'] ??
              record['attribute_id'];
            if (name === key || id === key) {
              resolved =
                record['value'] ??
                record['values'] ??
                record['value_id'] ??
                record['label'] ??
                record['text'];
              break;
            }
          }
        } else if (typeof bucket === 'object' && key in bucket) {
          resolved = (bucket as Record<string, unknown>)[key];
        }
        if (resolved !== undefined) break;
      }
    }
    const preview = toPreviewValue(resolved);
    if (preview) values[key] = preview;
  }
  return { keys: sortedKeys, values };
};

const mergeCollectedParameterKeys = (
  products: Record<string, unknown>[]
): { keys: string[]; values: Record<string, string> } => {
  const keySet = new Set<string>();
  const valuesByKey = new Map<string, string>();
  products.forEach((product: Record<string, unknown>) => {
    const collected = collectParameterKeys(product);
    collected.keys.forEach((key: string) => {
      keySet.add(key);
    });
    Object.entries(collected.values).forEach(([key, value]: [string, string]) => {
      if (!value) return;
      if (!valuesByKey.has(key)) {
        valuesByKey.set(key, value);
      }
    });
  });
  const keys = Array.from(keySet).sort((a, b) => a.localeCompare(b));
  const values: Record<string, string> = {};
  keys.forEach((key: string) => {
    const value = valuesByKey.get(key);
    if (value) {
      values[key] = value;
    }
  });
  return { keys, values };
};

export async function postBaseImportParametersHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(req, requestSchema, {
    logPrefix: 'imports.base.parameters.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;

  if (data.clearOnly) {
    await setImportParameterCache({
      inventoryId: null,
      productId: null,
      keys: [],
      values: {},
    });
    return NextResponse.json({ ok: true });
  }

  if (!data.inventoryId) {
    throw badRequestError('Inventory ID is required.');
  }
  const normalizedConnectionId = data.connectionId?.trim() ?? '';
  if (!normalizedConnectionId) {
    throw badRequestError('Base.com connection is required.');
  }

  const integrationRepo = await getIntegrationRepository();
  const integrations = await integrationRepo.listIntegrations();
  const baseIntegration = integrations.find((integration: (typeof integrations)[number]) =>
    BASE_INTEGRATION_SLUGS.has((integration.slug ?? '').trim().toLowerCase())
  );
  if (!baseIntegration) {
    throw notFoundError('Base integration not found.');
  }

  const connections = await integrationRepo.listConnections(baseIntegration.id);
  const connection = connections.find(
    (entry: (typeof connections)[number]) => entry.id === normalizedConnectionId
  );
  if (!connection) {
    throw badRequestError('Selected Base.com connection was not found.');
  }
  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });
  const token = tokenResolution.token;
  if (!token) {
    throw badRequestError(
      tokenResolution.error ?? 'No Base API token configured. Password token fallback is disabled.'
    );
  }
  const requestedSampleSize = data.sampleSize ?? 8;
  const sampleSize = Math.min(Math.max(1, requestedSampleSize), 20);
  const productIds: string[] = data.productId
    ? [data.productId]
    : extractProductIdsFromListPayload(
      await callBaseApi(token, 'getInventoryProductsList', {
        inventory_id: data.inventoryId,
        limit: sampleSize,
      }),
      sampleSize
    );
  if (productIds.length === 0) {
    throw notFoundError('No products found in selected inventory.', {
      inventoryId: data.inventoryId,
    });
  }

  const payload = await callBaseApi(token, 'getInventoryProductsData', {
    inventory_id: data.inventoryId,
    products: productIds,
  });
  const explicitProductId = data.productId?.trim() ?? '';
  const matchedProducts = explicitProductId
    ? (() => {
      const product = extractProductRecord(payload, explicitProductId);
      return product ? [{ record: product, productId: explicitProductId }] : [];
    })()
    : extractProductRecords(payload, productIds);

  if (matchedProducts.length === 0) {
    throw notFoundError('Product not found in response.', {
      productId: data.productId ?? productIds[0] ?? null,
      inventoryId: data.inventoryId,
    });
  }

  const normalizedProducts = matchedProducts.map(
    (entry: ProductRecordMatch, index: number): Record<string, unknown> => {
      const product = { ...entry.record };
      const resolvedProductId =
        normalizeProductId(entry.productId) ||
        normalizeProductId(productIds[index]) ||
        normalizeProductId(data.productId) ||
        null;
      if (data.inventoryId && !product['inventory_id']) {
        product['inventory_id'] = data.inventoryId;
      }
      if (resolvedProductId) {
        if (!product['product_id']) {
          product['product_id'] = resolvedProductId;
        }
        if (!product['id']) {
          product['id'] = resolvedProductId;
        }
      }
      return product;
    }
  );

  const { keys, values } = mergeCollectedParameterKeys(normalizedProducts);
  const sampleProductId =
    normalizeProductId(data.productId) || normalizeProductId(productIds[0]) || null;

  try {
    await setImportParameterCache({
      inventoryId: data.inventoryId,
      productId: sampleProductId,
      keys,
      values,
    });
  } catch (cacheError) {
    void ErrorSystem.captureException(cacheError, {
      service: 'api/integrations/imports/base/parameters',
      inventoryId: data.inventoryId,
      productId: sampleProductId,
    });
  }

  return NextResponse.json({
    inventoryId: data.inventoryId,
    productId: sampleProductId,
    keys,
    values,
  });
}

export async function getBaseImportParametersHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const cache = await getImportParameterCache();
  return NextResponse.json(
    cache
      ? {
        inventoryId: cache.inventoryId,
        productId: cache.productId,
        keys: cache.keys,
        values: cache.values,
      }
      : { keys: [], values: {} }
  );
}
