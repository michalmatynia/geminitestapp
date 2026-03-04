import 'server-only';

import { NextRequest } from 'next/server';

import {
  withApiVersioning,
  createVersionedResponse,
  StandardErrors,
  withErrorHandling,
} from '@/features/products/api/server';
import type { ApiVersion } from '@/features/products/api/server';
import { CachedProductService } from '@/features/products/performance';
import { withSecurity } from '@/features/products/security';

// Versioned products API handler
async function productsHandler(req: NextRequest, version: ApiVersion): Promise<Response> {
  const { searchParams } = new URL(req.url);

  switch (req.method) {
    case 'GET':
      return await handleGetProducts(req, version, searchParams);
    case 'POST':
      return await handleCreateProduct(req, version);
    default:
      return StandardErrors.invalidRequest(`Method ${req.method} not allowed`)
        .withMeta(version, '/api/v2/products', req.method)
        .toResponse(405);
  }
}

async function handleGetProducts(
  _req: NextRequest,
  version: ApiVersion,
  searchParams: URLSearchParams
): Promise<Response> {
  const filters = Object.fromEntries(searchParams.entries());
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  const [products, total] = await Promise.all([
    CachedProductService.getProducts({
      ...filters,
      page,
      limit,
    }),
    CachedProductService.getProductCount({
      ...filters,
    }),
  ]);

  if (!products || (products.length === 0 && page === 1)) {
    return StandardErrors.notFound('Products')
      .withMeta(version, '/api/v2/products', 'GET')
      .toResponse(404);
  }

  const responseData = {
    products,
    pagination: {
      page,
      limit,
      total,
      hasNext: products.length === limit,
    },
  };

  return createVersionedResponse(responseData, version);
}

async function handleCreateProduct(req: NextRequest, version: ApiVersion): Promise<Response> {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      return StandardErrors.invalidRequest('Content-Type must be application/json')
        .withMeta(version, '/api/v2/products', 'POST')
        .toResponse(400);
    }

    const body = (await req.json()) as Record<string, unknown>;
    const sku = typeof body['sku'] === 'string' ? body['sku'] : null;

    if (!sku) {
      return StandardErrors.validationError([
        { field: 'sku', message: 'SKU is required', code: 'REQUIRED_FIELD' },
      ])
        .withMeta(version, '/api/v2/products', 'POST')
        .toResponse(400);
    }

    const existing = await CachedProductService.getProductBySku(sku);
    if (existing) {
      return StandardErrors.duplicateResource('sku', sku)
        .withMeta(version, '/api/v2/products', 'POST')
        .toResponse(409);
    }

    const product = {
      id: crypto.randomUUID(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    CachedProductService.invalidateAll();

    return createVersionedResponse(product, version, 201);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return StandardErrors.invalidRequest('Invalid JSON in request body')
        .withMeta(version, '/api/v2/products', 'POST')
        .toResponse(400);
    }
    throw error;
  }
}

export const ProductsV2GET = withSecurity(withErrorHandling(withApiVersioning(productsHandler)), {
  rateLimiter: 'api',
});

export const ProductsV2POST = withSecurity(withErrorHandling(withApiVersioning(productsHandler)), {
  rateLimiter: 'productCreate',
  enableInputSanitization: true,
});
