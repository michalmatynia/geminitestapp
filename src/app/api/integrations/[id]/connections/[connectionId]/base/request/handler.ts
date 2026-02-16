

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getIntegrationRepository } from '@/features/integrations/server';
import { callBaseApi, fetchBaseProducts } from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/services/base-token-resolver';
import { parseJsonBody } from '@/features/products/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const normalizeParameters = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const requestSchema = z
  .object({
    method: z.string().trim().min(1),
    parameters: z.record(z.string(), z['unknown']()).optional()
  })
  .passthrough();

/**
 * POST /api/integrations/[id]/connections/[connectionId]/base/request
 * Proxy Base.com API requests using the stored token.
 */
export async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string; connectionId: string }): Promise<Response> {
  const { id, connectionId } = params;
  if (!id || !connectionId) {
    throw badRequestError('Integration id and connection id are required');
  }
  const parsed = await parseJsonBody(_req, requestSchema, {
    logPrefix: 'integrations.base.request.POST'
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { method } = parsed.data;
  const parameters = normalizeParameters(parsed.data.parameters);

  const repo = await getIntegrationRepository();
  const integration = await repo.getIntegrationById(id);
  if (integration?.slug !== 'baselinker') {
    throw notFoundError('Base.com integration not found.', { integrationId: id });
  }

  const connection = await repo.getConnectionByIdAndIntegration(
    connectionId,
    id
  );
  if (!connection) {
    throw notFoundError('Connection not found.', { connectionId });
  }

  const tokenResolution = resolveBaseConnectionToken(connection);
  if (!tokenResolution.token) {
    throw badRequestError(tokenResolution.error ?? 'No Base API token configured.');
  }
  const baseToken = tokenResolution.token;

  const isOrdersLogRequest = method === 'getOrdersLog';
  if (method === 'getInventoryProductsDetailed') {
    const inventoryValue = parameters['inventory_id'];
    const inventoryId =
      typeof inventoryValue === 'string'
        ? inventoryValue.trim()
        : typeof inventoryValue === 'number'
          ? String(inventoryValue)
          : '';
    if (!inventoryId || inventoryId === '0') {
      throw badRequestError('inventory_id is required.');
    }
    const limitRaw = parameters['limit'];
    const limit =
      typeof limitRaw === 'number' && Number.isFinite(limitRaw)
        ? limitRaw
        : typeof limitRaw === 'string'
          ? Number(limitRaw)
          : undefined;
    const products = await fetchBaseProducts(baseToken, inventoryId, limit);
    return NextResponse.json({
      data: { products, count: products.length, inventoryId }
    });
  }

  if (method === 'getInventoryProductDetailed') {
    const inventoryValue = parameters['inventory_id'];
    const inventoryId =
      typeof inventoryValue === 'string'
        ? inventoryValue.trim()
        : typeof inventoryValue === 'number'
          ? String(inventoryValue)
          : '';
    if (!inventoryId || inventoryId === '0') {
      throw badRequestError('inventory_id is required.');
    }
    const productValue = parameters['product_id'] ?? parameters['id'];
    const productId =
      typeof productValue === 'string'
        ? productValue.trim()
        : typeof productValue === 'number'
          ? String(productValue)
          : '';
    if (!productId) {
      throw badRequestError('product_id is required.');
    }
    const payload = await callBaseApi(baseToken, 'getInventoryProductsData', {
      inventory_id: inventoryId,
      products: [productId]
    });
    const rawProducts = (payload as { products?: unknown }).products;
    let product: unknown = null;
    if (Array.isArray(rawProducts)) {
      product =
        rawProducts.find((entry) => {
          if (!entry || typeof entry !== 'object') return false;
          const record = entry as Record<string, unknown>;
          return (
            record['product_id'] === productId ||
            record['id'] === productId ||
            record['base_product_id'] === productId
          );
        }) ?? rawProducts[0];
    } else if (rawProducts && typeof rawProducts === 'object') {
      const recordMap = rawProducts as Record<string, unknown>;
      product =
        recordMap[productId] ??
        recordMap[Number(productId) as unknown as keyof typeof recordMap] ??
        Object.values(recordMap)[0] ??
        null;
    }
    return NextResponse.json({
      data: {
        product: product ?? null,
        inventoryId,
        productId
      }
    });
  }

  const methodCandidates = isOrdersLogRequest
    ? ['getOrdersLog', 'getOrdersLogs', 'getOrdersHistory', 'getOrdersChanges']
    : [method];
  let payload: unknown;
  let lastError: Error | null = null;
  let sawUnknownMethod = false;
  for (const candidate of methodCandidates) {
    try {
      payload = await callBaseApi(baseToken, candidate, parameters);
      lastError = null;
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.toLowerCase().includes('unknown method')) {
        sawUnknownMethod = true;
        lastError = error instanceof Error ? error : new Error(message);
        continue;
      }
      throw error;
    }
  }
  if (!payload && isOrdersLogRequest && sawUnknownMethod) {
    payload = await callBaseApi(baseToken, 'getOrders', parameters);
  }
  if (!payload) {
    throw lastError ?? new Error('Base API request failed.');
  }

  return NextResponse.json({ data: payload });
}
